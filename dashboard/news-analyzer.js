// 실시간 뉴스 분석 시스템
class RealTimeNewsAnalyzer {
    constructor() {
        this.apiKey = null; // NewsAPI 키
        this.updateInterval = 300000; // 5분마다 업데이트
        this.newsCache = [];
        this.sentimentAnalyzer = new SentimentAnalyzer();
        this.updateTimer = null;
        
        this.newsAPIs = {
            newsapi: 'https://newsapi.org/v2/everything',
            alphaVantage: 'https://www.alphavantage.co/query',
            financialModeling: 'https://financialmodelingprep.com/api/v3/stock_news'
        };
        
        this.init();
    }

    init() {
        this.loadAPIKeys();
        this.loadLlmEnhancedFeatures(); // LLM 특징 로드
        this.startRealTimeUpdates();
    }

    // API 키 로드 (환경변수나 설정에서)
    loadAPIKeys() {
        // 실제 환경에서는 환경변수에서 로드
        this.apiKey = localStorage.getItem('newsapi_key') || 
                     process?.env?.NEWS_API_KEY || 
                     null;
    }

    // LLM으로 강화된 특징 데이터 로드
    async loadLlmEnhancedFeatures() {
        try {
            const response = await fetch('../data/processed/llm_enhanced_features.csv');
            const text = await response.text();
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(header => header.trim());
            
            this.llmFeatures = lines.slice(1).filter(line => line.trim() !== '').map(line => {
                const values = line.split(',').map(value => value.trim());
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });
                // 숫자형 데이터 변환
                obj.llm_sentiment_score = parseFloat(obj.llm_sentiment_score);
                obj.uncertainty_score = parseFloat(obj.uncertainty_score);
                return obj;
            });
            console.log(`LLM 강화 특징 ${this.llmFeatures.length}개 로드 완료.`);
        } catch (error) {
            console.warn('LLM 강화 특징 로드 실패:', error);
            this.llmFeatures = [];
        }
    }

    // 실시간 뉴스 수집 시작
    startRealTimeUpdates() {
        this.collectNews();
        
        this.updateTimer = setInterval(() => {
            this.collectNews();
        }, this.updateInterval);
    }

    // 뉴스 수집 중단
    stopRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    // 실시간 뉴스 수집
    async collectNews() {
        console.log('실시간 뉴스 수집 시작...');
        
        try {
            let newsArticles = [];
            
            // 여러 소스에서 뉴스 수집
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
                    console.warn(`뉴스 소스 ${index + 1} 수집 실패:`, result.reason);
                }
            });
            
            if (newsArticles.length > 0) {
                // 뉴스 분석 및 필터링
                const analyzedNews = await this.analyzeNews(newsArticles);
                
                // 중요도별 정렬
                const sortedNews = this.sortByImportance(analyzedNews);
                
                // 캐시 업데이트
                this.newsCache = sortedNews.slice(0, 50); // 최신 50개만 유지
                
                console.log(`${this.newsCache.length}개의 뉴스를 수집하고 분석했습니다.`);
                
                // 대시보드 업데이트 이벤트 발생
                this.notifyDashboard();
                
            } else {
                console.log('수집된 뉴스가 없습니다. 기본 데이터를 사용합니다.');
                this.newsCache = this.generateFallbackNews();
            }
            
        } catch (error) {
            console.error('뉴스 수집 중 오류 발생:', error);
            this.newsCache = this.generateFallbackNews();
        }
    }

    // NewsAPI에서 뉴스 수집
    async collectFromNewsAPI() {
        if (!this.apiKey) {
            console.log('NewsAPI 키가 없습니다. 공개 RSS 피드를 사용합니다.');
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
            throw new Error(`NewsAPI 오류: ${response.status}`);
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

    // RSS 피드에서 뉴스 수집 (NewsAPI 대안)
    async collectFromRSSFeeds() {
        const rssFeeds = [
            'https://feeds.reuters.com/reuters/businessNews',
            'https://feeds.bloomberg.com/markets/news.rss',
            'https://www.cnbc.com/id/100003114/device/rss/rss.html'
        ];
        
        let allNews = [];
        
        for (const feed of rssFeeds) {
            try {
                // CORS 문제로 인해 실제 환경에서는 프록시 서버 필요
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
                console.warn(`RSS 피드 ${feed} 수집 실패:`, error);
            }
        }
        
        return allNews;
    }

    // 금융 API에서 뉴스 수집
    async collectFromFinancialAPIs() {
        const financialNews = [];
        
        // Yahoo Finance RSS (무료)
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
            console.warn('Yahoo Finance 뉴스 수집 실패:', error);
        }
        
        return financialNews;
    }

    // 뉴스 분석 (감정 분석, 중요도 계산)
    async analyzeNews(newsArticles) {
        const analyzedNews = [];
        
        for (const article of newsArticles) {
            try {
                // LLM 강화 특징 찾기
                const llmFeature = this.llmFeatures.find(
                    (feature) => feature.title === article.title && feature.date === new Date(article.publishedAt).toISOString().split('T')[0]
                );

                let sentimentLabel = 'neutral';
                let sentimentScore = 0;
                let eventCategory = this.categorizeNews(article.title + ' ' + article.content); // 기본 분류

                if (llmFeature) {
                    // LLM 기반 감성 점수 사용
                    sentimentScore = llmFeature.llm_sentiment_score;
                    if (sentimentScore > 0.2) sentimentLabel = 'positive';
                    else if (sentimentScore < -0.2) sentimentLabel = 'negative';
                    else sentimentLabel = 'neutral';

                    // LLM 기반 시장 감성 및 이벤트 카테고리 사용
                    if (llmFeature.market_sentiment) {
                        article.marketSentiment = llmFeature.market_sentiment;
                    }
                    if (llmFeature.event_category) {
                        eventCategory = llmFeature.event_category;
                    }
                } else {
                    // LLM 특징이 없으면 기존 감성 분석 사용
                    const sentiment = this.sentimentAnalyzer.analyze(
                        article.title + ' ' + article.content
                    );
                    sentimentLabel = sentiment.label;
                    sentimentScore = sentiment.score;
                }
                
                // 중요도 점수 계산
                const importance = this.calculateImportance(article, llmFeature); // llmFeature 전달
                
                // 주식 관련성 분석
                const stockRelevance = this.analyzeStockRelevance(article);
                
                // 키워드 추출
                const keywords = this.extractKeywords(article.title + ' ' + article.content);
                
                analyzedNews.push({
                    ...article,
                    sentiment: sentimentLabel,
                    sentimentScore: sentimentScore,
                    confidence: llmFeature ? 1.0 : 0.5, // LLM 특징이 있으면 높은 신뢰도
                    importance,
                    stockRelevance,
                    keywords,
                    category: eventCategory, // LLM 기반 카테고리 사용
                    analyzedAt: new Date().toISOString()
                });
                
            } catch (error) {
                console.warn('뉴스 분석 실패:', article.title, error);
                
                // 기본값으로 추가
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

    // 뉴스 중요도별 정렬
    sortByImportance(newsArray) {
        return newsArray.sort((a, b) => {
            // 중요도, 최신성, 감정 강도를 종합하여 정렬
            const scoreA = a.importance * 0.4 + 
                          this.getRecencyScore(a.publishedAt) * 0.3 + 
                          Math.abs(a.sentimentScore) * 0.3;
            
            const scoreB = b.importance * 0.4 + 
                          this.getRecencyScore(b.publishedAt) * 0.3 + 
                          Math.abs(b.sentimentScore) * 0.3;
            
            return scoreB - scoreA;
        });
    }

    // 뉴스 중요도 계산
    calculateImportance(article, llmFeature) { // llmFeature 인자 추가
        let score = 0.5; // 기본 점수
        
        const text = (article.title + ' ' + article.content).toLowerCase();
        
        // LLM 기반 중요도 가중치 추가
        if (llmFeature) {
            // 불확실성 점수가 낮을수록 중요도 높임
            score += (1 - llmFeature.uncertainty_score) * 0.2; 
            // 시장 감성에 따른 중요도
            if (llmFeature.market_sentiment === 'Bullish' || llmFeature.market_sentiment === 'Bearish') {
                score += 0.1; // 강세 또는 약세 뉴스는 더 중요
            }
            // 특정 이벤트 카테고리에 따른 중요도
            if (llmFeature.event_category === 'M&A' || llmFeature.event_category === 'Financials') {
                score += 0.15;
            }
        }

        // 중요 키워드 가중치
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
        
        // 키워드 매칭으로 중요도 증가
        for (const [keyword, weight] of Object.entries(importantKeywords)) {
            if (text.includes(keyword)) {
                score += weight;
            }
        }
        
        // 소스 신뢰도
        const sourceWeights = {
            'Reuters': 0.1,
            'Bloomberg': 0.1,
            'Wall Street Journal': 0.1,
            'CNBC': 0.08,
            'Financial Times': 0.1,
            'Yahoo Finance': 0.05
        };
        
        score += sourceWeights[article.source] || 0;
        
        // 최신성 (24시간 이내 뉴스는 보너스)
        const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
            score += 0.1 * (1 - hoursAgo / 24);
        }
        
        return Math.min(1.0, Math.max(0.0, score));
    }

    // 주식 관련성 분석
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

    // 키워드 추출
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

    // 뉴스 카테고리 분류
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

    // 유틸리티 메서드들
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

    // 대시보드에 업데이트 알림
    notifyDashboard() {
        // 커스텀 이벤트 발생
        window.dispatchEvent(new CustomEvent('newsUpdate', {
            detail: {
                news: this.newsCache,
                timestamp: new Date().toISOString()
            }
        }));
    }

    // 폴백 뉴스 생성 (API 실패시 사용)
    generateFallbackNews() {
        const fallbackNews = [
            {
                id: 'fallback-1',
                title: '주요 증시 지수 상승세 지속',
                content: '오늘 주요 증시 지수들이 전반적인 상승세를 보이며 투자자들의 긍정적인 반응을 얻고 있습니다.',
                sentiment: 'positive',
                sentimentScore: 0.6,
                source: 'Market Watch',
                publishedAt: new Date(Date.now() - 1800000).toISOString(), // 30분 전
                category: 'market',
                importance: 0.7,
                stockRelevance: 0.9
            },
            {
                id: 'fallback-2',
                title: 'Fed 금리 정책 관련 발언 주목',
                content: '연방준비제도 관계자의 최근 발언이 시장의 관심을 끌고 있으며, 향후 금리 정책에 대한 힌트를 제공하고 있습니다.',
                sentiment: 'neutral',
                sentimentScore: 0.1,
                source: 'Financial News',
                publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1시간 전
                category: 'economy',
                importance: 0.8,
                stockRelevance: 0.7
            }
        ];
        
        return fallbackNews;
    }

    // 뉴스 요약 생성
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
        
        // 전체적인 시장 영향 평가
        const avgSentiment = this.newsCache.reduce((sum, news) => sum + news.sentimentScore, 0) / this.newsCache.length;
        const marketImpact = avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral';
        
        // 주요 트렌드 키워드
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

    // 공개 메서드들
    getLatestNews(limit = 20) {
        return this.newsCache.slice(0, limit);
    }

    getNewsByCategory(category) {
        return this.newsCache.filter(news => news.category === category);
    }

    getNewsBySentiment(sentiment) {
        return this.newsCache.filter(news => news.sentiment === sentiment);
    }

    // 설정 메서드
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

// 간단한 감정 분석기
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

// 전역 뉴스 분석기 인스턴스
window.newsAnalyzer = new RealTimeNewsAnalyzer();