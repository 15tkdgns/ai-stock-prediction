// Real-time News Analysis System
class RealTimeNewsAnalyzer {
    constructor() {
        this.apiKey = localStorage.getItem('newsapi_key') || '21e8dba1ab28429f9fd3b3943977afb0'; // NewsAPI Key
        if (!this.apiKey) {
            console.warn('NewsAPI key not set. Using public RSS feeds.');
            this.apiKey = null; // Set to null if no key to use public RSS feeds
        }
        this.updateInterval = 300000; // 5분마다 업데이트
        this.newsCache = [];
        this.sentimentAnalyzer = new SentimentAnalyzer();
        this.updateTimer = null;
        
        this.newsAPIs = {
            newsapi: 'https://newsapi.org/v2/everything',
            alphaVantage: 'https://www.alphavantage.co/query',
            financialModeling: 'https://financialmodelingprep.com/api/v3/stock_news'
        };
        
        this.loadLlmEnhancedFeatures(); // Load LLM features
        this.startRealTimeUpdates();
    }

    async loadLlmEnhancedFeatures() {
        try {
            const response = await fetch('../data/processed/llm_enhanced_features.csv');
            const text = await response.text();
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(header => header.trim());
            
            this.llmFeatures = lines.slice(1).filter(line => line.trim() !== '').map(line => {
                const values = line[0].split(',').map(value => value.trim());
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });
                // 숫자형 데이터 변환
                obj.llm_sentiment_score = parseFloat(obj.llm_sentiment_score);
                obj.uncertainty_score = parseFloat(obj.uncertainty_score);
                return obj;
            });
            console.log(`LLM enhanced features loaded: ${this.llmFeatures.length} items.`);
        } catch (error) {
            console.warn('LLM enhanced features load failed:', error);
            this.llmFeatures = [];
        }
    }

    // Start real-time news collection
    startRealTimeUpdates() {
        this.collectNews();
        
        this.updateTimer = setInterval(() => {
            this.collectNews();
        }, this.updateInterval);
    }

    // Stop news collection
    stopRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    // Real-time news collection
    async collectNews() {
        console.log('Starting real-time news collection...');
        
        try {
            let newsArticles = [];
            
            // Collect news from multiple sources
            const sources = [
                this.collectFromNewsAPI(),
                this.collectFromRSSFeeds(),
                this.collectFromFinancialAPIs()
            ];
            
            const results = await Promise.allSettled(sources);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    newsArticles = newsArticles.concat(result.value || []);
                } else {
                    console.warn(`News source ${index + 1} collection failed:`, result.reason);
                }
            });
            
            if (newsArticles.length > 0) {
                // Analyze and filter news
                const analyzedNews = await this.analyzeNews(newsArticles);
                
                // Sort by importance
                const sortedNews = this.sortByImportance(analyzedNews);
                
                // Update cache
                this.newsCache = sortedNews.slice(0, 50); // Keep only the latest 50
                
                console.log(`${this.newsCache.length} news articles collected and analyzed.`);
                
                // Trigger dashboard update event
                this.notifyDashboard();
                
            } else {
                console.log('No news collected. Using fallback data.');
                this.newsCache = this.generateFallbackNews();
            }
            
        } catch (error) {
            console.error('Error during news collection:', error);
            this.newsCache = this.generateFallbackNews();
        }
    }

    // Collect news from NewsAPI
    async collectFromNewsAPI() {
        if (!this.apiKey) {
            console.log('No NewsAPI key. Using public RSS feeds.');
            return [];
        }

        const params = new URLSearchParams({
            apiKey: this.apiKey,
            q: 'stock market finance economy trading investment',
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 20,
            sources: 'reuters,bloomberg,cnbc,financial-times,the-wall-street-journal'
        });

        const response = await fetch(`${this.newsAPIs.newsapi}?${params}`);
        
        if (!response.ok) {
            throw new Error(`NewsAPI Error: ${response.status}`);
        }

        const data = await response.json();
        
        return data.articles?.map(article => ({
            id: this.generateNewsId(article.url),
            title: article.title,
            content: article.description || article.content || '',
            source: article.source.name,
            url: article.url,
            publishedAt: new Date(article.publishedAt).toISOString(),
            imageUrl: article.urlToImage,
            category: this.categorizeNews(article.title + ' ' + article.description)
        })) || [];
    }

    // Collect news from RSS feeds (NewsAPI alternative)
    async collectFromRSSFeeds() {
        const rssFeeds = [
            // 'https://feeds.reuters.com/reuters/businessNews', // Reuters feed often returns 400 Bad Request via proxy
            'https://news.google.com/rss?hl=en&gl=US&ceid=US:en', // Google News (English)
            'https://feeds.bloomberg.com/markets/news.rss',
            'https://www.cnbc.com/id/100003114/device/rss/rss.html'
        ];
        
        let allNews = [];
        
        for (const feed of rssFeeds) {
            try {
                // Proxy server needed in real environment due to CORS issues
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed)}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();
                
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
                
                const items = Array.from(xmlDoc.querySelectorAll('item'));
                
                const feedNews = items.slice(0, 10).map(item => ({
                    id: this.generateNewsId(item.querySelector('link')?.textContent),
                    title: item.querySelector('title')?.textContent || '',
                    content: item.querySelector('description')?.textContent || '',
                    source: this.getSourceFromFeed(feed),
                    url: item.querySelector('link')?.textContent || '',
                    publishedAt: new Date(item.querySelector('pubDate')?.textContent).toISOString(),
                    category: this.categorizeNews(item.querySelector('title')?.textContent + ' ' + item.querySelector('description')?.textContent)
                }));
                
                allNews = allNews.concat(feedNews);
                
            } catch (error) {
                console.warn(`RSS feed ${feed} collection failed:`, error);
            }
        }
        
        return allNews;
    }

    // Collect news from financial APIs
    async collectFromFinancialAPIs() {
        const financialNews = [];
        
        // Yahoo Finance RSS (Free)
        try {
            const yahooRss = 'https://feeds.finance.yahoo.com/rss/2.0/headline';
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooRss)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
            
            const items = Array.from(xmlDoc.querySelectorAll('item'));
            
            const yahooNews = items.slice(0, 15).map(item => ({
                id: this.generateNewsId(item.querySelector('link')?.textContent),
                title: item.querySelector('title')?.textContent || '',
                content: item.querySelector('description')?.textContent || '',
                source: 'Yahoo Finance',
                url: item.querySelector('link')?.textContent || '',
                publishedAt: new Date(item.querySelector('pubDate')?.textContent).toISOString(),
                category: 'finance'
            }));
            
            financialNews.push(...yahooNews);
            
        } catch (error) {
            console.warn('Yahoo Finance news collection failed:', error);
        }
        
        return financialNews;
    }

    // Analyze news (sentiment analysis, importance calculation)
    async analyzeNews(newsArticles) {
        const analyzedNews = [];
        
        for (const article of newsArticles) {
            try {
                // Find LLM enhanced features
                const llmFeature = this.llmFeatures.find(
                    (feature) => feature.title === article.title && feature.date === new Date(article.publishedAt).toISOString().split('T')[0]
                );

                let sentimentLabel = 'neutral';
                let sentimentScore = 0;
                let eventCategory = this.categorizeNews(article.title + ' ' + article.content); // Default classification

                if (llmFeature) {
                    // Use LLM-based sentiment score
                    sentimentScore = llmFeature.llm_sentiment_score;
                    if (sentimentScore > 0.2) sentimentLabel = 'positive';
                    else if (sentimentScore < -0.2) sentimentLabel = 'negative';
                    else sentimentLabel = 'neutral';

                    // Use LLM-based market sentiment and event category
                    if (llmFeature.market_sentiment) {
                        article.marketSentiment = llmFeature.market_sentiment;
                    }
                    if (llmFeature.event_category) {
                        eventCategory = llmFeature.event_category;
                    }
                } else {
                    // Use existing sentiment analysis if no LLM features
                    const sentiment = this.sentimentAnalyzer.analyze(
                        article.title + ' ' + article.content
                    );
                    sentimentLabel = sentiment.label;
                    sentimentScore = sentiment.score;
                }
                
                // Calculate importance score
                const importance = this.calculateImportance(article, llmFeature); // Pass llmFeature
                
                // Analyze stock relevance
                const stockRelevance = this.analyzeStockRelevance(article);
                
                // Extract keywords
                const keywords = this.extractKeywords(article.title + ' ' + article.content);
                
                analyzedNews.push({
                    ...article,
                    sentiment: sentimentLabel,
                    sentimentScore: sentimentScore,
                    confidence: llmFeature ? 1.0 : 0.5, // Higher confidence if LLM features are present
                    importance,
                    stockRelevance,
                    keywords,
                    category: eventCategory, // Use LLM-based category
                    analyzedAt: new Date().toISOString()
                });
                
            } catch (error) {
                console.warn('News analysis failed:', article.title, error);
                
                // Add with default values
                analyzedNews.push({
                    ...article,
                    sentiment: 'neutral',
                    sentimentScore: 0,
                    confidence: 0.5,
                    importance: 0.5,
                    stockRelevance: 0.3,
                    keywords: [],
                    analyzedAt: new Date().toISOString()
                });
            }
        }
        
        return analyzedNews;
    }

    // Sort news by importance
    sortByImportance(newsArray) {
        return newsArray.sort((a, b) => {
            // Sort by importance, recency, and sentiment intensity combined
            const scoreA = a.importance * 0.4 + 
                          this.getRecencyScore(a.publishedAt) * 0.3 + 
                          Math.abs(a.sentimentScore) * 0.3;
            
            const scoreB = b.importance * 0.4 + 
                          this.getRecencyScore(b.publishedAt) * 0.3 + 
                          Math.abs(b.sentimentScore) * 0.3;
            
            return scoreB - scoreA;
        });
    }

    // Calculate news importance
    calculateImportance(article, llmFeature) { // Add llmFeature argument
        let score = 0.5; // Base score
        
        const text = (article.title + ' ' + article.content).toLowerCase();
        
        // Add LLM-based importance weight
        if (llmFeature) {
            // Increase importance if uncertainty score is low
            score += (1 - llmFeature.uncertainty_score) * 0.2; 
            // Importance based on market sentiment
            if (llmFeature.market_sentiment === 'Bullish' || llmFeature.market_sentiment === 'Bearish') {
                score += 0.1; // Bullish or bearish news is more important
            }
            // Importance based on specific event category
            if (llmFeature.event_category === 'M&A' || llmFeature.event_category === 'Financials') {
                score += 0.15;
            }
        }

        // Important keyword weights
        const importantKeywords = {
            'fed': 0.3,
            'federal reserve': 0.3,
            'interest rate': 0.25,
            'inflation': 0.2,
            'earnings': 0.2,
            'gdp': 0.25,
            'unemployment': 0.2,
            'apple': 0.15,
            'microsoft': 0.15,
            'tesla': 0.15,
            'amazon': 0.15,
            'google': 0.15,
            'stock market': 0.2,
            'nasdaq': 0.15,
            'dow jones': 0.15,
            's&p 500': 0.15,
            'merger': 0.2,
            'acquisition': 0.2,
            'ipo': 0.2,
            'dividend': 0.15
        };
        
        // Increase importance by keyword matching
        for (const [keyword, weight] of Object.entries(importantKeywords)) {
            if (text.includes(keyword)) {
                score += weight;
            }
        }
        
        // Source credibility
        const sourceWeights = {
            'Reuters': 0.1,
            'Bloomberg': 0.1,
            'Wall Street Journal': 0.1,
            'CNBC': 0.08,
            'Financial Times': 0.1,
            'Yahoo Finance': 0.05
        };
        
        score += sourceWeights[article.source] || 0;
        
        // Recency (bonus for news within 24 hours)
        const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
            score += 0.1 * (1 - hoursAgo / 24);
        }
        
        return Math.min(1.0, Math.max(0.0, score));
    }

    // Analyze stock relevance
    analyzeStockRelevance(article) {
        const text = (article.title + ' ' + article.content).toLowerCase();
        
        const stockKeywords = [
            'stock', 'share', 'equity', 'market', 'trading', 'investor',
            'portfolio', 'nasdaq', 'dow', 's&p', 'bull', 'bear',
            'earnings', 'revenue', 'profit', 'dividend', 'ipo'
        ];
        
        const matches = stockKeywords.filter(keyword => text.includes(keyword));
        return Math.min(1.0, matches.length * 0.1);
    }

    // Extract keywords
    extractKeywords(text) {
        const words = text.toLowerCase()
            .replace(/[^a-zA-Z\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        const stopWords = new Set([
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
            'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day',
            'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now',
            'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its',
            'let', 'put', 'say', 'she', 'too', 'use'
        ]);
        
        const wordCount = {};
        words.forEach(word => {
            if (!stopWords.has(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });
        
        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    // Categorize news
    categorizeNews(text) {
        const categories = {
            'market': ['market', 'trading', 'nasdaq', 'dow', 's&p'],
            'economy': ['inflation', 'gdp', 'unemployment', 'recession', 'growth'],
            'company': ['earnings', 'revenue', 'merger', 'acquisition', 'ipo'],
            'crypto': ['bitcoin', 'cryptocurrency', 'blockchain', 'ethereum'],
            'tech': ['technology', 'software', 'ai', 'artificial intelligence'],
            'energy': ['oil', 'gas', 'renewable', 'energy']
        };
        
        const lowerText = text.toLowerCase();
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    // Utility methods
    generateNewsId(url) {
        return url ? btoa(url).substring(0, 16) : Math.random().toString(36).substring(2, 15);
    }

    getSourceFromFeed(feedUrl) {
        if (feedUrl.includes('reuters')) return 'Reuters';
        if (feedUrl.includes('bloomberg')) return 'Bloomberg';
        if (feedUrl.includes('cnbc')) return 'CNBC';
        return 'RSS Feed';
    }

    getRecencyScore(publishedAt) {
        const hoursAgo = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
        return Math.max(0, 1 - hoursAgo / 72); // 72시간 이내 뉴스에 점수 부여
    }

    // Notify dashboard of updates
    notifyDashboard() {
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('newsUpdate', {
            detail: {
                news: this.newsCache,
                timestamp: new Date().toISOString()
            }
        }));
    }

    // Generate fallback news (used if API fails)
    generateFallbackNews() {
        const fallbackNews = [
            {
                id: 'fallback-1',
                title: 'Major Stock Indices Continue to Rise',
                content: 'Major stock indices showed an overall upward trend today, receiving positive reactions from investors.',
                sentiment: 'positive',
                sentimentScore: 0.6,
                source: 'Market Watch',
                publishedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
                category: 'market',
                importance: 0.7,
                stockRelevance: 0.9
            },
            {
                id: 'fallback-2',
                title: 'Fed Interest Rate Policy Remarks Noted',
                content: 'Recent remarks from Federal Reserve officials are drawing market attention, providing hints about future interest rate policy.',
                sentiment: 'neutral',
                sentimentScore: 0.1,
                source: 'Financial News',
                publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                category: 'economy',
                importance: 0.8,
                stockRelevance: 0.7
            }
        ];
        
        return fallbackNews;
    }

    // Generate news summary
    generateNewsSummary() {
        if (this.newsCache.length === 0) {
            return {
                totalNews: 0,
                sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
                topCategories: [],
                marketImpact: 'neutral',
                keyTrends: []
            };
        }
        
        const sentimentBreakdown = this.newsCache.reduce((acc, news) => {
            acc[news.sentiment] = (acc[news.sentiment] || 0) + 1;
            return acc;
        }, {});
        
        const categoryBreakdown = this.newsCache.reduce((acc, news) => {
            acc[news.category] = (acc[news.category] || 0) + 1;
            return acc;
        }, {});
        
        const topCategories = Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
        
        // Evaluate overall market impact
        const avgSentiment = this.newsCache.reduce((sum, news) => sum + news.sentimentScore, 0) / this.newsCache.length;
        const marketImpact = avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral';
        
        // Key trend keywords
        const allKeywords = this.newsCache.flatMap(news => news.keywords || []);
        const keywordCounts = allKeywords.reduce((acc, keyword) => {
            acc[keyword] = (acc[keyword] || 0) + 1;
            return acc;
        }, {});
        
        const keyTrends = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));
        
        return {
            totalNews: this.newsCache.length,
            sentimentBreakdown,
            topCategories,
            marketImpact,
            keyTrends,
            lastUpdate: new Date().toISOString()
        };
    }

    // Public methods
    getLatestNews(limit = 20) {
        return this.newsCache.slice(0, limit);
    }

    getNewsByCategory(category) {
        return this.newsCache.filter(news => news.category === category);
    }

    getNewsBySentiment(sentiment) {
        return this.newsCache.filter(news => news.sentiment === sentiment);
    }

    // Configuration methods
    setAPIKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('newsapi_key', apiKey);
    }

    setUpdateInterval(intervalMs) {
        this.updateInterval = intervalMs;
        
        // 타이머 재시작
        this.stopRealTimeUpdates();
        this.startRealTimeUpdates();
    }
}

// Simple Sentiment Analyzer
class SentimentAnalyzer {
    constructor() {
        this.positiveWords = [
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'rise', 'gain', 'profit', 'growth', 'increase', 'up', 'bull',
            'success', 'win', 'positive', 'strong', 'high', 'boost'
        ];
        
        this.negativeWords = [
            'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor',
            'fall', 'drop', 'loss', 'decline', 'decrease', 'down', 'bear',
            'fail', 'lose', 'negative', 'weak', 'low', 'crash', 'collapse'
        ];
    }

    analyze(text) {
        const words = text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        words.forEach(word => {
            if (this.positiveWords.includes(word)) positiveCount++;
            if (this.negativeWords.includes(word)) negativeCount++;
        });
        
        const totalSentimentWords = positiveCount + negativeCount;
        
        if (totalSentimentWords === 0) {
            return { label: 'neutral', score: 0, confidence: 0.3 };
        }
        
        const score = (positiveCount - negativeCount) / totalSentimentWords;
        const confidence = Math.min(1.0, totalSentimentWords / 10);
        
        let label;
        if (score > 0.2) label = 'positive';
        else if (score < -0.2) label = 'negative';
        else label = 'neutral';
        
        return { label, score, confidence };
    }
}

// Global news analyzer instance
window.newsAnalyzer = new RealTimeNewsAnalyzer();