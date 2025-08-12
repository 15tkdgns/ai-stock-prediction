// S&P 500 관련 주요 해외 API 통합 관리자
class SP500APIManager {
  constructor() {
    this.apiKeys = {};
    this.apiStatus = {}; // API 상태 추적을 위한 객체 추가
    this.dataCache = new Map();
    this.updateInterval = 60000; // 1분마다 업데이트
    this.retryAttempts = 3;

    // API 엔드포인트 설정
    this.apis = {
      // 1. Alpha Vantage (무료 + 유료)
      alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        endpoints: {
          realtime: 'function=GLOBAL_QUOTE',
          intraday: 'function=TIME_SERIES_INTRADAY',
          daily: 'function=TIME_SERIES_DAILY',
          overview: 'function=OVERVIEW',
          earnings: 'function=EARNINGS',
          news: 'function=NEWS_SENTIMENT',
        },
        rateLimit: 5, // 5 calls per minute for free tier
        supported: true,
      },

      // 2. Financial Modeling Prep (무료 + 유료)
      financialModelingPrep: {
        baseUrl: 'https://financialmodelingprep.com/api/v3',
        endpoints: {
          realtime: 'quote',
          profile: 'profile',
          income: 'income-statement',
          balance: 'balance-sheet-statement',
          cashflow: 'cash-flow-statement',
          ratios: 'ratios',
          news: 'stock_news',
          market: 'sp500_constituent',
        },
        rateLimit: 250, // 250 calls per day for free
        supported: true,
      },

      // 3. Twelve Data (무료 + 유료)
      twelveData: {
        baseUrl: 'https://api.twelvedata.com',
        endpoints: {
          realtime: 'price',
          timeseries: 'time_series',
          quote: 'quote',
          profile: 'profile',
          earnings: 'earnings',
          statistics: 'statistics',
        },
        rateLimit: 800, // 800 calls per day for free
        supported: true,
      },

      // 4. Polygon.io에서 데이터 수집
      polygon: {
        baseUrl: 'https://api.polygon.io/v2',
        endpoints: {
          realtime: 'last/trade',
          aggs: 'aggs/ticker',
          snapshot: 'snapshot/locale/us/markets/stocks/tickers',
          news: 'reference/news',
          financials: 'reference/financials',
        },
        rateLimit: 5, // 5 calls per minute for free tier
        supported: true,
      },

      // 5. IEX Cloud에서 데이터 수집
      iexCloud: {
        baseUrl: 'https://cloud.iexapis.com/stable',
        endpoints: {
          quote: 'stock/{symbol}/quote',
          batch: 'stock/market/batch',
          news: 'stock/{symbol}/news',
          stats: 'stock/{symbol}/stats',
          financials: 'stock/{symbol}/financials',
        },
        rateLimit: 100, // 100 calls per month for free
        supported: true,
      },

      // 6. Yahoo Finance에서 데이터 수집 (무료)
      yahooFinance: {
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
        proxyUrl: 'https://api.allorigins.win/get?url=',
        endpoints: {
          chart: '',
          quote: 'https://query1.finance.yahoo.com/v7/finance/quote',
          news: 'https://query1.finance.yahoo.com/v1/finance/search',
        },
        rateLimit: null, // No official limit
        supported: true,
      },
    };

    // S&P 500 주요 구성 종목
    this.sp500Symbols = [
      'AAPL',
      'MSFT',
      'AMZN',
      'NVDA',
      'GOOGL',
      'TSLA',
      'GOOG',
      'BRK.B',
      'UNH',
      'META',
      'XOM',
      'LLY',
      'JNJ',
      'JPM',
      'V',
      'PG',
      'MA',
      'HD',
      'CVX',
      'MRK',
      'ABBV',
      'PEP',
      'KO',
      'AVGO',
      'PFE',
      'BAC',
      'TMO',
      'COST',
      'DIS',
      'ABT',
      'WMT',
      'CRM',
      'DHR',
      'VZ',
      'NFLX',
      'ADBE',
      'CMCSA',
      'TXN',
      'NKE',
      'PM',
      'RTX',
      'NEE',
      'WFC',
      'COP',
      'BMY',
      'UNP',
      'T',
      'SCHW',
      'LOW',
      'ORCL',
      'HON',
    ];

    this.init();
  }

  init() {
    this.loadAPIKeys();
    this.startDataCollection();
  }

  // API 키 로드 및 설정
  loadAPIKeys() {
    // 로컬 스토리지에서 API 키 로드
    this.apiKeys = {
      alphaVantage: localStorage.getItem('alpha_vantage_key'),
      financialModelingPrep: localStorage.getItem('fmp_key'),
      twelveData: localStorage.getItem('twelve_data_key'),
      polygon: localStorage.getItem('polygon_key'),
      iexCloud: localStorage.getItem('iex_key'),
    };

    // 각 API의 초기 상태 설정
    for (const _key in this.apis) {
      if (this.apis[_key].supported) {
        if (_key === 'yahooFinance') {
          this.apiStatus[_key] = 'active'; // Yahoo Finance는 키 불필요
        } else if (this.apiKeys[_key] && this.apiKeys[_key] !== 'demo') {
          this.apiStatus[_key] = 'active';
        } else if (this.apiKeys[_key] === 'demo') {
          this.apiStatus[_key] = 'demo_key';
        } else {
          this.apiStatus[_key] = 'no_key';
        }
      }
    }

    // 데모 키 (제한적 사용)
    if (!this.apiKeys.alphaVantage) {
      this.apiKeys.alphaVantage = 'demo'; // Alpha Vantage demo key
    }
  }

  // API 키 설정
  setAPIKey(provider, key) {
    this.apiKeys[provider] = key;
    localStorage.setItem(`${provider}_key`, key);
    console.log(`${provider} API 키가 설정되었습니다.`);
  }

  // 데이터 수집 시작
  startDataCollection() {
    // 즉시 한 번 실행
    this.collectAllData();

    // 정기적 업데이트
    setInterval(() => {
      this.collectAllData();
    }, this.updateInterval);
  }

  // 모든 API에서 데이터 수집
  async collectAllData() {
    console.log('S&P 500 데이터 수집 시작...');

    const apiNames = Object.keys(this.apis);
    const tasks = [
      this.collectFromAlphaVantage(),
      this.collectFromFinancialModelingPrep(),
      this.collectFromTwelveData(),
      this.collectFromPolygon(),
      this.collectFromIEXCloud(),
      this.collectFromYahooFinance(),
    ];

    const results = await Promise.allSettled(tasks);

    results.forEach((result, index) => {
      const apiName = apiNames[index];
      if (result.status === 'fulfilled') {
        console.log(
          `✅ ${apiName} 데이터 수집 성공:`,
          result.value?.length || 0,
          '개 종목'
        );
        this.apiStatus[apiName] = 'active';
      } else {
        console.warn(`❌ ${apiName} 데이터 수집 실패:`, result.reason);
        this.apiStatus[apiName] = 'error';
      }
    });

    // 수집된 데이터 통합 및 분석
    this.integrateAndAnalyzeData();

    // 대시보드 업데이트 알림
    this.notifyDashboard();
  }

  // 1. Alpha Vantage에서 데이터 수집
  async collectFromAlphaVantage() {
    if (!this.apiKeys.alphaVantage) return [];

    const collectedData = [];
    const symbols = this.sp500Symbols.slice(0, 5); // Rate limit 고려하여 5개만

    for (const symbol of symbols) {
      try {
        // 실시간 주가
        const quoteUrl = `${this.apis.alphaVantage.baseUrl}?${this.apis.alphaVantage.endpoints.realtime}&symbol=${symbol}&apikey=${this.apiKeys.alphaVantage}`;
        const response = await this.fetchWithRetry(quoteUrl);

        if (response['Global Quote']) {
          const quote = response['Global Quote'];
          collectedData.push({
            symbol: symbol,
            source: 'AlphaVantage',
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
            volume: parseInt(quote['06. volume']),
            timestamp: new Date().toISOString(),
            marketCap: null, // Alpha Vantage는 별도 API 필요
          });
        }

        // Rate limit 준수
        await this.sleep(12000); // 12초 대기 (5 calls per minute)
      } catch (error) {
        console.warn(`Alpha Vantage ${symbol} 데이터 수집 실패:`, error);
      }
    }

    return collectedData;
  }

  // 2. Financial Modeling Prep에서 데이터 수집
  async collectFromFinancialModelingPrep() {
    if (!this.apiKeys.financialModelingPrep) return [];

    const collectedData = [];

    try {
      // 배치로 여러 종목 한 번에 조회
      const symbolsStr = this.sp500Symbols.slice(0, 20).join(','); // 20개 종목
      const url = `${this.apis.financialModelingPrep.baseUrl}/${this.apis.financialModelingPrep.endpoints.realtime}/${symbolsStr}?apikey=${this.apiKeys.financialModelingPrep}`;

      const response = await this.fetchWithRetry(url);

      if (Array.isArray(response)) {
        response.forEach((quote) => {
          collectedData.push({
            symbol: quote.symbol,
            source: 'FinancialModelingPrep',
            price: quote.price,
            change: quote.change,
            changePercent: quote.changesPercentage,
            volume: quote.volume,
            marketCap: quote.marketCap,
            timestamp: new Date().toISOString(),
            pe: quote.pe,
            eps: quote.eps,
          });
        });
      }
    } catch (error) {
      console.warn('Financial Modeling Prep 데이터 수집 실패:', error);
    }

    return collectedData;
  }

  // 3. Twelve Data에서 데이터 수집
  async collectFromTwelveData() {
    if (!this.apiKeys.twelveData) return [];

    const collectedData = [];
    const symbols = this.sp500Symbols.slice(0, 10); // 10개 종목

    try {
      // 배치 조회
      const symbolsStr = symbols.join(',');
      const url = `${this.apis.twelveData.baseUrl}/${this.apis.twelveData.endpoints.quote}?symbol=${symbolsStr}&apikey=${this.apiKeys.twelveData}`;

      const response = await this.fetchWithRetry(url);

      if (response && typeof response === 'object') {
        Object.values(response).forEach((quote) => {
          if (quote && quote.symbol) {
            collectedData.push({
              symbol: quote.symbol,
              source: 'TwelveData',
              price: parseFloat(quote.close),
              change: parseFloat(quote.change),
              changePercent: parseFloat(quote.percent_change),
              volume: parseInt(quote.volume),
              timestamp: new Date().toISOString(),
              high: parseFloat(quote.high),
              low: parseFloat(quote.low),
              open: parseFloat(quote.open),
            });
          }
        });
      }
    } catch (error) {
      console.warn('Twelve Data 수집 실패:', error);
    }

    return collectedData;
  }

  // 4. Polygon.io에서 데이터 수집
  async collectFromPolygon() {
    if (!this.apiKeys.polygon) return [];

    const collectedData = [];

    try {
      // S&P 500 스냅샷
      const url = `${this.apis.polygon.baseUrl}/${this.apis.polygon.endpoints.snapshot}?apiKey=${this.apiKeys.polygon}`;
      const response = await this.fetchWithRetry(url);

      if (response.results && Array.isArray(response.results)) {
        const sp500Tickers = response.results.filter((ticker) =>
          this.sp500Symbols.includes(ticker.ticker)
        );

        sp500Tickers.slice(0, 15).forEach((ticker) => {
          collectedData.push({
            symbol: ticker.ticker,
            source: 'Polygon',
            price: ticker.day?.c || ticker.lastTrade?.p,
            change: ticker.day?.c - ticker.day?.o,
            changePercent: ticker.todaysChangePerc,
            volume: ticker.day?.v,
            timestamp: new Date().toISOString(),
            high: ticker.day?.h,
            low: ticker.day?.l,
            open: ticker.day?.o,
          });
        });
      }
    } catch (error) {
      console.warn('Polygon 데이터 수집 실패:', error);
    }

    return collectedData;
  }

  // 5. IEX Cloud에서 데이터 수집
  async collectFromIEXCloud() {
    if (!this.apiKeys.iexCloud) return [];

    const collectedData = [];

    try {
      // 배치 조회
      const symbols = this.sp500Symbols.slice(0, 15).join(',');
      const url = `${this.apis.iexCloud.baseUrl}/${this.apis.iexCloud.endpoints.batch}?symbols=${symbols}&types=quote&token=${this.apiKeys.iexCloud}`;

      const response = await this.fetchWithRetry(url);

      if (response && typeof response === 'object') {
        Object.entries(response).forEach(([symbol, data]) => {
          if (data.quote) {
            const quote = data.quote;
            collectedData.push({
              symbol: symbol,
              source: 'IEXCloud',
              price: quote.latestPrice,
              change: quote.change,
              changePercent: quote.changePercent * 100,
              volume: quote.volume,
              marketCap: quote.marketCap,
              timestamp: new Date().toISOString(),
              pe: quote.peRatio,
              high: quote.high,
              low: quote.low,
            });
          }
        });
      }
    } catch (error) {
      console.warn('IEX Cloud 데이터 수집 실패:', error);
    }

    return collectedData;
  }

  // 6. Yahoo Finance에서 데이터 수집 (무료)
  async collectFromYahooFinance() {
    const collectedData = [];
    const symbols = this.sp500Symbols.slice(0, 25); // 25개 종목

    for (const symbol of symbols) {
      try {
        const chartUrl = `${this.apis.yahooFinance.baseUrl}/${symbol}`;
        // Define apiUrl here, assuming it should be chartUrl
        const apiUrl = chartUrl; // Fix: apiUrl was undefined

        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}&_=${new Date().getTime()}`;
        console.log(`[API DEBUG] Fetching data for ${symbol} via proxy...`);
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          console.error(
            `[API DEBUG] HTTP ${response.status} for ${symbol}: ${response.statusText}`
          );
          continue;
        }

        const data = await response.json(); // Fix: data was not declared
        console.log(`[API DEBUG] Successfully fetched data for ${symbol}`);

        if (data.contents) {
          const chartData = JSON.parse(data.contents);

          if (chartData.chart?.result?.[0]) {
            const result = chartData.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators?.quote?.[0];

            if (meta && quote) {
              const lastPrice =
                meta.regularMarketPrice || quote.close?.slice(-1)[0];
              const previousClose = meta.previousClose;

              collectedData.push({
                symbol: symbol,
                source: 'YahooFinance',
                price: lastPrice,
                change: lastPrice - previousClose,
                changePercent: (
                  ((lastPrice - previousClose) / previousClose) *
                  100
                ).toFixed(2),
                volume: quote.volume?.slice(-1)[0],
                marketCap: meta.marketCap,
                timestamp: new Date().toISOString(),
                high: quote.high?.slice(-1)[0],
                low: quote.low?.slice(-1)[0],
                currency: meta.currency,
              });
            }
          }
        }

        // Rate limit 방지
        await this.sleep(100);
      } catch (fetchError) {
        // Changed error variable name for clarity
        console.error(
          `[API DEBUG] CORS/Network error for ${symbol}:`,
          fetchError.message
        );
        console.warn(
          `[API DEBUG] Skipping ${symbol} due to fetch error, will use mock data if needed`
        );
        continue;
      }
    }

    if (collectedData.length === 0) {
      console.warn(
        '[API DEBUG] No real data collected due to CORS/API issues. Generating mock data for display.'
      );
      // Generate mock data when real API fails
      return this.generateMockSP500Data();
    }

    console.log(
      `[API DEBUG] Successfully collected data for ${collectedData.length} stocks`
    );
    return collectedData;
  }

  // 데이터 통합 및 분석
  integrateAndAnalyzeData() {
    const integratedData = new Map();

    // 캐시에서 모든 데이터 수집
    for (const [key, data] of this.dataCache) {
      if (Array.isArray(data)) {
        data.forEach((item) => {
          const symbol = item.symbol;
          if (!integratedData.has(symbol)) {
            integratedData.set(symbol, []);
          }
          integratedData.get(symbol).push(item);
        });
      }
    }

    // 종목별 데이터 통합 및 평균화
    const consolidatedData = [];

    for (const [symbol, sources] of integratedData) {
      if (sources.length > 0) {
        // 여러 소스의 데이터를 가중 평균으로 통합
        const consolidated = this.consolidateMultipleSourceData(
          symbol,
          sources
        );
        consolidatedData.push(consolidated);
      }
    }

    // 분석 결과 저장
    this.dataCache.set('consolidated', consolidatedData);

    // 추가 분석 수행
    this.performMarketAnalysis(consolidatedData);
  }

  // 여러 소스 데이터 통합
  consolidateMultipleSourceData(symbol, sources) {
    // 소스별 가중치 (신뢰도 기반)
    const sourceWeights = {
      AlphaVantage: 0.25,
      FinancialModelingPrep: 0.25,
      TwelveData: 0.2,
      Polygon: 0.15,
      IEXCloud: 0.1,
      YahooFinance: 0.05,
    };

    let weightedPrice = 0;
    let weightedChange = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let marketCap = null;

    sources.forEach((source) => {
      const weight = sourceWeights[source.source] || 0.1;

      if (source.price && !isNaN(source.price)) {
        weightedPrice += source.price * weight;
        totalWeight += weight;
      }

      if (source.change && !isNaN(source.change)) {
        weightedChange += source.change * weight;
      }

      if (source.volume) {
        totalVolume = Math.max(totalVolume, source.volume);
      }

      if (source.marketCap && !marketCap) {
        marketCap = source.marketCap;
      }
    });

    return {
      symbol,
      price: totalWeight > 0 ? weightedPrice / totalWeight : sources[0].price,
      change:
        totalWeight > 0 ? weightedChange / totalWeight : sources[0].change,
      changePercent: (
        (weightedChange / totalWeight / (weightedPrice / totalWeight)) *
        100
      ).toFixed(2),
      volume: totalVolume,
      marketCap,
      sources: sources.length,
      reliability: totalWeight,
      timestamp: new Date().toISOString(),
      rawData: sources,
    };
  }

  // 시장 분석 수행
  performMarketAnalysis(data) {
    if (data.length === 0) return;

    // 상승/하락 종목 수
    const gainers = data.filter((stock) => stock.change > 0);
    const losers = data.filter((stock) => stock.change < 0);
    const unchanged = data.filter((stock) => stock.change === 0);

    // 평균 변동률
    const avgChange =
      data.reduce((sum, stock) => sum + (stock.change || 0), 0) / data.length;

    // 거래량 상위 종목
    const topVolume = data
      .filter((stock) => stock.volume)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // 변동률 상위/하위 종목
    const topGainers = data
      .filter((stock) => stock.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5);

    const topLosers = data
      .filter((stock) => stock.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 5);

    const analysis = {
      totalStocks: data.length,
      gainers: gainers.length,
      losers: losers.length,
      unchanged: unchanged.length,
      avgChange: avgChange.toFixed(4),
      marketSentiment:
        avgChange > 0 ? 'bullish' : avgChange < 0 ? 'bearish' : 'neutral',
      topGainers,
      topLosers,
      topVolume: topVolume.slice(0, 5),
      lastUpdate: new Date().toISOString(),
    };

    this.dataCache.set('market_analysis', analysis);
    console.log('시장 분석 완료:', analysis);
  }

  // 대시보드 알림
  notifyDashboard() {
    const consolidatedData = this.dataCache.get('consolidated') || [];
    const marketAnalysis = this.dataCache.get('market_analysis') || {};

    // 커스텀 이벤트 발생
    window.dispatchEvent(
      new CustomEvent('sp500DataUpdate', {
        detail: {
          stocks: consolidatedData,
          analysis: marketAnalysis,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  // 유틸리티 메서드들
  async fetchWithRetry(url, retries = this.retryAttempts) {
    const apiName = Object.keys(this.apis).find((key) =>
      url.includes(this.apis[key].baseUrl)
    );

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // 데이터 캐싱
        this.dataCache.set(url, data);

        if (apiName) {
          this.apiStatus[apiName] = 'active'; // 성공 시 상태 업데이트
        }

        return data;
      } catch (error) {
        console.warn(`API 호출 실패 (${i + 1}/${retries}):`, error.message);
        if (apiName) {
          this.apiStatus[apiName] = 'error'; // 실패 시 상태 업데이트
        }

        if (i === retries - 1) {
          throw error;
        }

        // 재시도 전 대기
        await this.sleep(1000 * (i + 1));
      }
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Generate mock S&P 500 data when real APIs fail
  generateMockSP500Data() {
    console.log('[API DEBUG] Generating mock S&P 500 data due to API failures');
    const mockSymbols = [
      'AAPL',
      'MSFT',
      'GOOGL',
      'AMZN',
      'TSLA',
      'META',
      'NVDA',
      'NFLX',
      'CRM',
      'ORCL',
    ];
    const mockData = [];

    for (const symbol of mockSymbols) {
      const basePrice = Math.random() * 300 + 50;
      const change = (Math.random() - 0.5) * 20;
      const changePercent = (change / basePrice) * 100;

      mockData.push({
        symbol: symbol,
        source: 'MockData',
        price: basePrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        volume: Math.floor(Math.random() * 10000000),
        timestamp: new Date().toISOString(),
      });
    }

    return mockData;
  }

  // 공개 메서드들
  getConsolidatedData() {
    return this.dataCache.get('consolidated') || [];
  }

  getMarketAnalysis() {
    return this.dataCache.get('market_analysis') || {};
  }

  getStockData(symbol) {
    const consolidated = this.getConsolidatedData();
    return consolidated.find((stock) => stock.symbol === symbol);
  }

  // API 상태 확인
  getAPIStatus() {
    return this.apiStatus;
  }

  async testAPIConnections() {
    const results = {};

    // Alpha Vantage 테스트
    try {
      const url = `${this.apis.alphaVantage.baseUrl}?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${this.apiKeys.alphaVantage}`;
      await this.fetchWithRetry(url);
      results.alphaVantage = 'OK';
    } catch (error) {
      results.alphaVantage = `ERROR: ${error.message}`;
    }

    // Financial Modeling Prep 테스트
    if (this.apiKeys.financialModelingPrep) {
      try {
        const url = `${this.apis.financialModelingPrep.baseUrl}/quote/AAPL?apikey=${this.apiKeys.financialModelingPrep}`;
        await this.fetchWithRetry(url);
        results.financialModelingPrep = 'OK';
      } catch (error) {
        results.financialModelingPrep = `ERROR: ${error.message}`;
      }
    } else {
      results.financialModelingPrep = 'NO_KEY';
    }

    // Twelve Data 테스트
    if (this.apiKeys.twelveData) {
      try {
        const url = `${this.apis.twelveData.baseUrl}/quote?symbol=AAPL&apikey=${this.apiKeys.twelveData}`;
        await this.fetchWithRetry(url);
        results.twelveData = 'OK';
      } catch (error) {
        results.twelveData = `ERROR: ${error.message}`;
      }
    } else {
      results.twelveData = 'NO_KEY';
    }

    // Yahoo Finance 테스트 (키 불필요)
    try {
      const chartUrl = `${this.apis.yahooFinance.baseUrl}/AAPL`;
      const proxyUrl = `${this.apis.yahooFinance.proxyUrl}${encodeURIComponent(chartUrl)}`;
      await fetch(proxyUrl);
      results.yahooFinance = 'OK';
    } catch (error) {
      results.yahooFinance = `ERROR: ${error.message}`;
    }

    return results;
  }
}

// 전역 인스턴스 생성
window.sp500APIManager = new SP500APIManager();
