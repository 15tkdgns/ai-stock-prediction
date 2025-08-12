/**
 * API Manager Module
 * Centralized API handling with caching, retries, and rate limiting
 */
class APIManager {
  constructor(dependencies) {
    this.eventBus = dependencies.EventBus;
    this.cache = new Map();
    this.rateLimits = new Map();
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponential: true
    };
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    this.endpoints = {
      news: {
        rss: [
          'https://feeds.bloomberg.com/markets/news.rss',
          'https://www.cnbc.com/id/100003114/device/rss/rss.html',
          'https://news.google.com/rss?hl=en&gl=US&ceid=US:en'
        ],
        proxy: 'http://localhost:8090/proxy/rss'
      },
      stock: {
        data: '../data/raw/stock_data.json',
        realtime: '../data/raw/realtime_results.json'
      }
    };
  }

  /**
   * Make HTTP request with retries and caching
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<any>} - Response data
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      cache = true,
      cacheTimeout = 30000,
      retry = true,
      timeout = 10000
    } = options;

    const cacheKey = this.getCacheKey(url, method, body);

    // Check cache first
    if (cache && method === 'GET') {
      const cached = this.getFromCache(cacheKey, cacheTimeout);
      if (cached) {
        console.log(`[API MANAGER] Cache hit: ${url}`);
        return cached;
      }
    }

    // Check rate limits
    if (!this.checkRateLimit(url)) {
      throw new Error(`Rate limit exceeded for: ${url}`);
    }

    const requestOptions = {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(timeout)
    };

    let lastError;
    const maxAttempts = retry ? this.retryConfig.maxAttempts : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[API MANAGER] Request attempt ${attempt}/${maxAttempts}: ${url}`);
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let data;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType.includes('text/')) {
          data = await response.text();
        } else {
          data = await response.blob();
        }

        // Cache successful GET requests
        if (cache && method === 'GET') {
          this.setCache(cacheKey, data);
        }

        // Update rate limit tracking
        this.updateRateLimit(url);

        // Emit success event
        this.eventBus?.emit('api:success', { url, method, attempt, data });

        console.log(`[API MANAGER] Request successful: ${url}`);
        return data;

      } catch (error) {
        lastError = error;
        console.warn(`[API MANAGER] Attempt ${attempt} failed for ${url}:`, error.message);

        // Don't retry on certain errors
        if (error.name === 'AbortError' || error.message.includes('404') || error.message.includes('403')) {
          break;
        }

        // Wait before retry
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          await this.delay(delay);
        }
      }
    }

    // All attempts failed
    this.eventBus?.emit('api:error', { url, method, error: lastError, attempts: maxAttempts });
    console.error(`[API MANAGER] Request failed after ${maxAttempts} attempts: ${url}`, lastError);
    throw lastError;
  }

  /**
   * Fetch RSS feeds with fallback proxy
   * @param {string|Array} feeds - RSS feed URLs
   * @returns {Promise<Array>} - Parsed RSS data
   */
  async fetchRSSFeeds(feeds) {
    const feedUrls = Array.isArray(feeds) ? feeds : [feeds];
    const results = [];

    for (const feedUrl of feedUrls) {
      try {
        // Try local proxy first
        const proxyUrl = `${this.endpoints.news.proxy}?url=${encodeURIComponent(feedUrl)}`;
        let xmlContent;

        try {
          const response = await this.request(proxyUrl, { timeout: 5000 });
          const contentType = response.headers?.get?.('content-type') || '';
          
          if (contentType.includes('application/xml')) {
            xmlContent = response;
          } else {
            // Fallback to external proxy
            const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
            const fallbackData = await this.request(fallbackUrl, { cache: false });
            xmlContent = fallbackData.contents;
          }
        } catch (proxyError) {
          console.warn(`[API MANAGER] Proxy failed for ${feedUrl}, trying fallback:`, proxyError);
          
          // Fallback to external proxy
          const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
          const fallbackData = await this.request(fallbackUrl, { cache: false });
          xmlContent = fallbackData.contents;
        }

        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const items = Array.from(xmlDoc.querySelectorAll('item'));

        const feedData = items.slice(0, 10).map(item => ({
          id: this.generateNewsId(item.querySelector('link')?.textContent),
          title: item.querySelector('title')?.textContent || '',
          content: item.querySelector('description')?.textContent || '',
          source: this.getSourceFromFeed(feedUrl),
          url: item.querySelector('link')?.textContent || '',
          publishedAt: new Date(item.querySelector('pubDate')?.textContent).toISOString(),
          category: this.categorizeNews(item.querySelector('title')?.textContent || '')
        }));

        results.push({ feedUrl, data: feedData, success: true });
        console.log(`[API MANAGER] Successfully fetched RSS: ${feedUrl} (${feedData.length} items)`);

      } catch (error) {
        results.push({ feedUrl, error: error.message, success: false });
        console.error(`[API MANAGER] Failed to fetch RSS: ${feedUrl}`, error);
      }
    }

    const successful = results.filter(r => r.success);
    console.log(`[API MANAGER] RSS fetch completed: ${successful.length}/${results.length} successful`);

    return results;
  }

  /**
   * Batch API requests
   * @param {Array} requests - Array of request configurations
   * @returns {Promise<Array>} - Array of results
   */
  async batchRequest(requests) {
    const promises = requests.map(async ({ url, options = {}, id = url }) => {
      try {
        const data = await this.request(url, options);
        return { id, url, data, success: true };
      } catch (error) {
        return { id, url, error: error.message, success: false };
      }
    });

    const results = await Promise.allSettled(promises);
    const resolved = results.map(result => 
      result.status === 'fulfilled' ? result.value : { error: result.reason, success: false }
    );

    const successful = resolved.filter(r => r.success);
    console.log(`[API MANAGER] Batch request completed: ${successful.length}/${requests.length} successful`);

    return resolved;
  }

  /**
   * Generate cache key
   * @param {string} url - Request URL
   * @param {string} method - HTTP method
   * @param {any} body - Request body
   * @returns {string} - Cache key
   */
  getCacheKey(url, method, body) {
    const bodyHash = body ? btoa(JSON.stringify(body)).slice(0, 8) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @param {number} timeout - Cache timeout in ms
   * @returns {any|null} - Cached data or null
   */
  getFromCache(key, timeout) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > timeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old cache entries (keep last 100)
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < 20; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Check rate limit for URL
   * @param {string} url - URL to check
   * @returns {boolean} - Whether request is allowed
   */
  checkRateLimit(url) {
    const domain = new URL(url).hostname;
    const limit = this.rateLimits.get(domain);
    
    if (!limit) return true;
    
    const now = Date.now();
    const windowStart = now - limit.window;
    
    limit.requests = limit.requests.filter(time => time > windowStart);
    
    return limit.requests.length < limit.max;
  }

  /**
   * Update rate limit tracking
   * @param {string} url - URL that was requested
   */
  updateRateLimit(url) {
    const domain = new URL(url).hostname;
    
    if (!this.rateLimits.has(domain)) {
      this.rateLimits.set(domain, {
        requests: [],
        max: 60, // requests per window
        window: 60000 // 1 minute window
      });
    }
    
    const limit = this.rateLimits.get(domain);
    limit.requests.push(Date.now());
  }

  /**
   * Calculate retry delay
   * @param {number} attempt - Current attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const { baseDelay, maxDelay, exponential } = this.retryConfig;
    
    let delay = exponential 
      ? Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
      : baseDelay;
      
    // Add jitter
    delay += Math.random() * 1000;
    
    return delay;
  }

  /**
   * Utility methods
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateNewsId(url) {
    return btoa(url || Math.random().toString()).slice(0, 12);
  }

  getSourceFromFeed(feedUrl) {
    if (feedUrl.includes('bloomberg')) return 'Bloomberg';
    if (feedUrl.includes('cnbc')) return 'CNBC';
    if (feedUrl.includes('reuters')) return 'Reuters';
    if (feedUrl.includes('google')) return 'Google News';
    return 'Unknown';
  }

  categorizeNews(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('market') || lowerTitle.includes('stock')) return 'market';
    if (lowerTitle.includes('economy') || lowerTitle.includes('economic')) return 'economy';
    if (lowerTitle.includes('tech') || lowerTitle.includes('technology')) return 'technology';
    return 'general';
  }

  /**
   * Clear cache
   * @param {string} pattern - Optional pattern to match keys
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    
    console.log(`[API MANAGER] Cache cleared ${pattern ? `(pattern: ${pattern})` : '(all)'}`);
  }

  /**
   * Get API statistics
   * @returns {Object} - API statistics
   */
  getStats() {
    const rateLimitStats = {};
    this.rateLimits.forEach((limit, domain) => {
      rateLimitStats[domain] = {
        currentRequests: limit.requests.length,
        maxRequests: limit.max,
        windowMs: limit.window
      };
    });

    return {
      cacheSize: this.cache.size,
      rateLimits: rateLimitStats,
      endpoints: Object.keys(this.endpoints)
    };
  }

  /**
   * Cleanup method
   */
  cleanup() {
    this.clearCache();
    this.rateLimits.clear();
    console.log('[API MANAGER] Cleaned up');
  }
}

// Register module
if (window.ModuleManager) {
  window.ModuleManager.register('APIManager', APIManager, ['EventBus']);
}