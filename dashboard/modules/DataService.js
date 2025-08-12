/**
 * Data Service Module
 * Centralized data fetching and caching system
 */
class DataService {
  constructor() {
    this.cache = new Map();
    this.endpoints = {
      systemStatus: '../data/raw/system_status.json',
      realtimeResults: '../data/raw/realtime_results.json',
      monitoringData: '../data/raw/monitoring_dashboard.json',
      newsData: '../data/raw/news_data.csv',
      stockData: '../data/raw/training_features.csv',
    };
    
    this.cacheTimeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Fetch data with caching and retry logic
   * @param {string} key - Data key
   * @param {string} url - Optional custom URL
   * @returns {Promise<any>} - Data
   */
  async fetchData(key, url = null) {
    const endpoint = url || this.endpoints[key];
    if (!endpoint) {
      throw new Error(`Unknown data endpoint: ${key}`);
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log(`[DATA SERVICE] Cache hit for: ${key}`);
      return cached.data;
    }

    console.log(`[DATA SERVICE] Fetching: ${key} from ${endpoint}`);

    // Fetch with retry logic
    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });

        console.log(`[DATA SERVICE] Successfully fetched: ${key}`);
        return data;

      } catch (error) {
        lastError = error;
        console.warn(`[DATA SERVICE] Attempt ${attempt} failed for ${key}:`, error);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    // All attempts failed
    console.error(`[DATA SERVICE] Failed to fetch ${key} after ${this.retryAttempts} attempts:`, lastError);
    throw lastError;
  }

  /**
   * Batch fetch multiple data sources
   * @param {string[]} keys - Array of data keys
   * @returns {Promise<Object>} - Object with all data
   */
  async fetchBatch(keys) {
    const promises = keys.map(key => 
      this.fetchData(key).then(data => ({ key, data })).catch(error => ({ key, error }))
    );

    const results = await Promise.all(promises);
    const data = {};
    const errors = {};

    results.forEach(result => {
      if (result.error) {
        errors[result.key] = result.error;
      } else {
        data[result.key] = result.data;
      }
    });

    if (Object.keys(errors).length > 0) {
      console.warn('[DATA SERVICE] Batch fetch had errors:', errors);
    }

    return { data, errors };
  }

  /**
   * Clear cache for specific key or all keys
   * @param {string} key - Optional specific key
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
      console.log(`[DATA SERVICE] Cleared cache for: ${key}`);
    } else {
      this.cache.clear();
      console.log('[DATA SERVICE] Cleared all cache');
    }
  }

  /**
   * Subscribe to data changes with polling
   * @param {string} key - Data key
   * @param {Function} callback - Callback function
   * @param {number} interval - Polling interval in ms
   * @returns {Function} - Unsubscribe function
   */
  subscribe(key, callback, interval = 5000) {
    let isActive = true;
    let lastData = null;

    const poll = async () => {
      if (!isActive) return;

      try {
        const data = await this.fetchData(key);
        if (JSON.stringify(data) !== JSON.stringify(lastData)) {
          lastData = data;
          callback(data, null);
        }
      } catch (error) {
        callback(null, error);
      }

      if (isActive) {
        setTimeout(poll, interval);
      }
    };

    // Start polling
    poll();

    // Return unsubscribe function
    return () => {
      isActive = false;
      console.log(`[DATA SERVICE] Unsubscribed from: ${key}`);
    };
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    const entries = Array.from(this.cache.entries());
    const totalSize = entries.length;
    const validEntries = entries.filter(([, value]) => 
      (Date.now() - value.timestamp) < this.cacheTimeout
    );

    return {
      totalEntries: totalSize,
      validEntries: validEntries.length,
      expiredEntries: totalSize - validEntries.length,
      cacheHitRate: validEntries.length / Math.max(totalSize, 1)
    };
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup method
   */
  cleanup() {
    this.clearCache();
    console.log('[DATA SERVICE] Cleaned up');
  }
}

// Register module
if (window.ModuleManager) {
  window.ModuleManager.register('DataService', DataService);
}