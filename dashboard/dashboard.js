// Extended Dashboard Main JavaScript File
class DashboardManager {
  constructor() {
    this.charts = {};
    this.updateInterval = 5000; // Update every 5 seconds
    this.newsUpdateInterval = 30000; // Update news every 30 seconds
    this.dataEndpoints = {
      systemStatus: '../data/raw/system_status.json',
      realtimeResults: '../data/raw/realtime_results.json',
      monitoringData: '../data/raw/monitoring_dashboard.json',
      newsData: '../data/raw/news_data.csv',
      stockData: '../data/raw/training_features.csv',
    };

    this.newsCache = [];
    this.sourceFiles = {};

    this.init();
  }

  async init() {
    // Wait for Chart.js to be available
    await this.waitForChartJS();
    
    await this.setupCharts();
    this.startRealTimeUpdates();
    this.loadInitialData();
    this.setupEventListeners();

    // Initialize extended features
    this.initializeExtensions();
    this.updateAPIStatusDisplay(); // Add API status display
    
    // Ensure all charts are properly rendered with delay
    setTimeout(() => {
      this.refreshAllCharts();
    }, 2000);
  }

  /**
   * Force refresh all dashboard charts
   */
  async refreshAllCharts() {
    console.log('[DASHBOARD DEBUG] Force refreshing all charts...');
    
    try {
      // Destroy existing charts first
      Object.values(this.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      this.charts = {};
      
      // Recreate all charts
      await this.setupCharts();
      console.log('[DASHBOARD DEBUG] All charts refreshed successfully');
    } catch (error) {
      console.error('[DASHBOARD DEBUG] Error refreshing charts:', error);
    }
  }

  // Wait for Chart.js library to be available
  async waitForChartJS() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    while (typeof Chart === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof Chart === 'undefined') {
      console.error('Chart.js library failed to load');
      return false;
    }
    
    console.log('[DASHBOARD DEBUG] Chart.js is available');
    return true;
  }

  // Initialize extensions
  initializeExtensions() {
    console.log('[DASHBOARD DEBUG] Initializing extensions...');
    console.log(
      '[DASHBOARD DEBUG] DashboardExtensions available:',
      typeof DashboardExtensions !== 'undefined'
    );

    if (typeof DashboardExtensions !== 'undefined') {
      try {
        console.log(
          '[DASHBOARD DEBUG] Creating DashboardExtensions instance...'
        );
        this.extensions = new DashboardExtensions(this);
        console.log(
          '[DASHBOARD DEBUG] DashboardExtensions instance created:',
          this.extensions
        );

        // Set global reference for router access
        window.dashboard = this;
        console.log(
          '[DASHBOARD DEBUG] window.dashboard set to:',
          window.dashboard
        );

        this.extensions.init();
        console.log(
          '[DASHBOARD DEBUG] DashboardExtensions initialized successfully'
        );
      } catch (error) {
        console.error(
          '[DASHBOARD DEBUG] Error initializing DashboardExtensions:',
          error
        );
      }
    } else {
      console.error(
        '[DASHBOARD DEBUG] DashboardExtensions class not found. Make sure dashboard-extended.js is loaded first.'
      );
    }
  }

  // Common chart settings (improved label readability)
  getCommonChartOptions(chartType = 'line') {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 25,
          bottom: 25,
          left: 15,
          right: 15,
        },
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12,
            },
          },
        },
      },
    };

    if (chartType === 'line' || chartType === 'bar') {
      baseOptions.scales = {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: 11,
            },
          },
          title: {
            display: true,
            font: {
              size: 12,
              weight: 'bold',
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 11,
            },
          },
          title: {
            display: true,
            font: {
              size: 12,
              weight: 'bold',
            },
          },
        },
      };
    }

    return baseOptions;
  }

  // Update API status display
  updateAPIStatusDisplay() {
    if (!window.sp500APIManager) {
      console.warn('sp500APIManager not yet initialized.');
      return;
    }
    const apiStatus = window.sp500APIManager.getAPIStatus();
    const container = document.getElementById('api-status-container');
    if (!container) {
      // Silently return if element doesn't exist (removed from sidebar)
      return;
    }

    let html = '<h3>API Status</h3><div class="api-status-grid">';
    for (const apiName in apiStatus) {
      const status = apiStatus[apiName];
      let statusClass = '';
      let statusText = '';
      switch (status) {
        case 'active':
          statusClass = 'status-dot online';
          statusText = 'Active';
          break;
        case 'error':
          statusClass = 'status-dot offline';
          statusText = 'Error';
          break;
        case 'no_key':
          statusClass = 'status-dot warning';
          statusText = 'No Key';
          break;
        case 'demo_key':
          statusClass = 'status-dot warning';
          statusText = 'Demo Key';
          break;
        default:
          statusClass = 'status-dot unknown';
          statusText = 'Unknown';
      }
      html += `
                <div class="api-status-item">
                    <span class="api-name">${apiName}</span>
                    <span class="${statusClass}"></span>
                    <span class="api-status-text">${statusText}</span>
                </div>
            `;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // Initial data load
  async loadInitialData() {
    try {
      await this.updateSystemStatus();
      await this.updateRealtimePredictions();
      this.updateLastUpdateTime();
    } catch (error) {
      console.error('Initial data load failed:', error);
      this.showErrorState();
    }
  }

  // Update system status (using common functions)
  async updateSystemStatus() {
    try {
      const data = await window.commonFunctions.loadData(
        this.dataEndpoints.systemStatus,
        this.generateMockSystemStatus(),
        { timeout: 3000, retries: 1 }
      );
      this.updateSystemMetrics(data);
    } catch (error) {
      console.error('System status update failed:', error);
      this.updateSystemMetrics(this.generateMockSystemStatus());
    }
  }

  // Update system metrics
  updateSystemMetrics(data) {
    document.getElementById('model-accuracy').textContent = data.model_accuracy
      ? `${data.model_accuracy}%`
      : `${(85 + Math.random() * 10).toFixed(1)}%`;

    document.getElementById('processing-speed').textContent =
      data.processing_speed
        ? data.processing_speed
        : `${(15 + Math.random() * 10).toFixed(1)}`;

    document.getElementById('active-models').textContent =
      data.active_models || Math.floor(3 + Math.random() * 2);

    document.getElementById('data-sources').textContent =
      data.data_sources || Math.floor(5 + Math.random() * 3);

    // Display system status
    const statusElement = document.getElementById('system-status');
    if (data.status === 'online' || !data.status) {
      statusElement.className = 'status-dot online';
    } else {
      statusElement.className = 'status-dot offline';
    }
  }

  // Update real-time prediction results (using common functions)
  async updateRealtimePredictions() {
    try {
      const data = await window.commonFunctions.loadData(
        this.dataEndpoints.realtimeResults,
        this.generateMockPredictions(),
        { timeout: 3000, retries: 1 }
      );
      this.updatePredictionsDisplay(data);
    } catch (error) {
      console.error('Real-time predictions update failed:', error);
      this.updatePredictionsDisplay(this.generateMockPredictions());
    }
  }

  // Update prediction results display
  updatePredictionsDisplay(data) {
    const container = document.querySelector('.predictions-container');

    if (data.predictions && Array.isArray(data.predictions)) {
      container.innerHTML = data.predictions
        .slice(0, 5)
        .map(
          (pred) => `
                <div class="prediction-item">
                    <span class="stock-symbol">${pred.symbol}</span>
                    <span class="prediction-direction ${pred.direction}">${pred.change}</span>
                    <span class="confidence">Confidence: ${pred.confidence}%</span>
                </div>
            `
        )
        .join('');
    }
  }

  // Chart setup
  async setupCharts() {
    console.log('[DASHBOARD DEBUG] Starting chart setup...');
    console.log('[DASHBOARD DEBUG] Chart.js available:', typeof Chart !== 'undefined');
    
    await this.setupPerformanceChart();
    await this.setupVolumeChart();
    await this.setupModelComparisonChart();
    
    console.log('[DASHBOARD DEBUG] Chart setup completed. Charts:', Object.keys(this.charts));
  }

  // Performance trend chart (using common functions)
  async setupPerformanceChart() {
    console.log('[DASHBOARD DEBUG] Setting up performance chart...');
    
    try {
      let chartData;
      
      try {
        // Try to use real model performance data
        const response = await fetch('../data/raw/model_performance.json');
        const realData = await response.json();
        
        const models = Object.keys(realData);
        const testAccuracies = models.map(model => (realData[model].test_accuracy * 100).toFixed(1));
        
        chartData = {
          labels: models.map(model => model.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())),
          datasets: [
            {
              label: 'Test Accuracy (%)',
              data: testAccuracies,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderWidth: 3,
              fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#667eea',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
        ],
      };
      } catch (error) {
        console.warn('Failed to load real performance data, using mock data:', error);
        const timeLabels = window.commonFunctions.generateTimeLabels(24, 'hours', 'HH:mm');
        const performanceData = window.commonFunctions.generateMockData('performance', 24, {
          min: 75, max: 100, variation: 0.05
        });
        
        chartData = {
          labels: timeLabels,
          datasets: [
            {
              label: 'Model Accuracy (%)',
              data: performanceData,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#667eea',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            },
          ],
        };
      }

      const customOptions = {
        scales: {
          y: {
            beginAtZero: false,
            min: 75,
            max: 100,
            ticks: {
              callback: function (value) {
                return value + '%';
              },
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
          x: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
        interaction: {
          intersect: false,
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
      };

      this.charts.performance = window.commonFunctions.createChart(
        'performance-chart', 'line', chartData, customOptions
      );
      
      console.log('[DASHBOARD DEBUG] Performance chart created successfully');
    } catch (error) {
      console.error('[DASHBOARD DEBUG] Error creating performance chart:', error);
    }
  }

  // Trading volume chart (using real data)
  async setupVolumeChart() {
    let volumeData;
    try {
      // Load real volume data from stock files
      const stockFiles = ['MMM', 'AOS', 'ABT', 'ABBV', 'ACN', 'ADBE', 'AMD'];
      const volumePromises = stockFiles.map(async (symbol) => {
        try {
          const response = await fetch(`../data/raw/stock_${symbol}.csv`);
          const csvText = await response.text();
          const lines = csvText.split('\n').filter(line => line.trim());
          if (lines.length > 1) {
            const lastLine = lines[lines.length - 1].split(',');
            const volume = parseInt(lastLine[5]) / 1000000; // Convert to millions
            return { symbol, volume: parseFloat(volume.toFixed(1)) };
          }
          return { symbol, volume: 0 };
        } catch {
          return { symbol, volume: Math.random() * 10 + 1 }; // Fallback
        }
      });
      
      const volumeDataArray = await Promise.all(volumePromises);
      volumeData = {
        labels: volumeDataArray.map(item => item.symbol),
        data: volumeDataArray.map(item => item.volume),
      };
    } catch (error) {
      console.warn('Failed to load real volume data, using mock data:', error);
      const volumeDataArray = window.commonFunctions.generateMockData('volume', 7);
      volumeData = {
        labels: volumeDataArray.map(item => item.symbol),
        data: volumeDataArray.map(item => parseFloat(item.volume)),
      };
    }

    const chartData = {
      labels: volumeData.labels,
      datasets: [
        {
          label: 'Volume (Millions)',
          data: volumeData.data,
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(52, 152, 219, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(231, 76, 60, 0.8)',
            'rgba(155, 89, 182, 0.8)',
          ],
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };

    const customOptions = {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value + 'M';
            },
          },
        },
      },
    };

    this.charts.volume = window.commonFunctions.createChart(
      'volume-chart', 'bar', chartData, customOptions
    );

    // Updates XAI selection menu based on volume data.
    this.updateXaiStockSelector(volumeData);

    // Update volume analysis information
    this.updateVolumeAnalysis(volumeData);
  }

  /**
   * Updates the XAI stock selection dropdown menu based on volume data.
   * @param {object} volumeData - Volume chart data ({labels: string[], data: number[]})
   */
  updateXaiStockSelector(volumeData) {
    const xaiStockSelector = document.getElementById('xai-stock-selector');
    if (!xaiStockSelector) return;

    // Select top 5 stocks based on volume.
    const top5Stocks = volumeData.labels
      .map((label, index) => ({
        symbol: label,
        volume: volumeData.data[index],
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    xaiStockSelector.innerHTML = top5Stocks
      .map(
        (stock) => `<option value="${stock.symbol}">${stock.symbol}</option>`
      )
      .join('');

    // Since the dropdown has changed, re-render the analysis for the first item.
    if (top5Stocks.length > 0) {
      this.handleXaiStockChange(top5Stocks[0].symbol);
    }
  }

  /**
   * Updates volume analysis information.
   * @param {object} volumeData - 거래량 데이터
   */
  updateVolumeAnalysis(volumeData) {
    const totalVolume = volumeData.data.reduce((sum, vol) => sum + vol, 0);
    const avgVolume = totalVolume / volumeData.data.length;
    const maxVolume = Math.max(...volumeData.data);
    const maxVolumeStock =
      volumeData.labels[volumeData.data.indexOf(maxVolume)];

    // Unusual volume detected (over 1.5x average)
    const abnormalVolumes = volumeData.data
      .map((vol, index) => ({ symbol: volumeData.labels[index], volume: vol }))
      .filter((item) => item.volume > avgVolume * 1.5);

    // Update HTML
    document.getElementById('total-volume').textContent =
      totalVolume.toFixed(1) + 'M';
    document.getElementById('avg-volume').textContent =
      avgVolume.toFixed(1) + 'M';
    document.getElementById('max-volume').textContent =
      `${maxVolumeStock} (${maxVolume}M)`;

    const volumeAlertsElement = document.getElementById('volume-alerts');
    if (abnormalVolumes.length > 0) {
      volumeAlertsElement.textContent = `${abnormalVolumes.length} cases (${abnormalVolumes.map((item) => item.symbol).join(', ')})`;
      volumeAlertsElement.classList.add('alert');
    } else {
      volumeAlertsElement.textContent = 'None';
      volumeAlertsElement.classList.remove('alert');
    }
  }

  // Model comparison chart
  async setupModelComparisonChart() {
    const element = document.getElementById('model-comparison-chart');
    if (!element) {
      console.warn('Model comparison chart element not found');
      return;
    }
    const ctx = element.getContext('2d');
    this.charts.modelComparison = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Accuracy', 'Speed', 'Stability', 'Scalability', 'Efficiency'],
        datasets: [
          {
            label: 'Random Forest',
            data: [100, 90, 80, 75, 85], // Real test accuracy: 100%
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.2)',
            borderWidth: 2,
          },
          {
            label: 'Gradient Boosting',
            data: [100, 75, 85, 80, 80], // Real test accuracy: 100%
            borderColor: '#764ba2',
            backgroundColor: 'rgba(118, 75, 162, 0.2)',
            borderWidth: 2,
          },
          {
            label: 'LSTM',
            data: [98.3, 70, 90, 85, 75], // Real test accuracy: 98.3%
            borderColor: '#f39c12',
            backgroundColor: 'rgba(243, 156, 18, 0.2)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  // Start real-time updates
  startRealTimeUpdates() {
    setInterval(async () => {
      await this.updateSystemStatus();
      await this.updateRealtimePredictions();
      await this.updateSP500Data(); // Add real-time S&P 500 updates
      await this.updateNewsData(); // Add real-time news updates
      await this.updateEnhancedPerformanceMetrics(); // Add enhanced performance monitoring
      this.updateCharts();
      this.updateLastUpdateTime();
    }, this.updateInterval);
  }

  // Enhanced real-time performance monitoring
  async updateEnhancedPerformanceMetrics() {
    try {
      // Collect performance data from multiple sources
      const performanceData = {};
      
      // Model performance from training data
      try {
        const modelResponse = await fetch('../data/raw/model_performance.json');
        const modelData = await modelResponse.json();
        performanceData.models = modelData;
      } catch (e) {
        console.warn('[PERFORMANCE] Model data not available');
      }
      
      // System status
      try {
        const systemResponse = await fetch('../data/raw/system_status.json');
        const systemData = await systemResponse.json();
        performanceData.system = systemData.performance_metrics;
      } catch (e) {
        console.warn('[PERFORMANCE] System data not available');
      }
      
      // Real-time results
      try {
        const realtimeResponse = await fetch('../data/raw/realtime_results.json');
        const realtimeData = await realtimeResponse.json();
        performanceData.realtime = realtimeData.model_performance;
      } catch (e) {
        console.warn('[PERFORMANCE] Realtime data not available');
      }
      
      // Update performance display
      this.updatePerformanceDisplay(performanceData);
      
      // Update model comparison with real-time data
      this.updateModelComparisonWithRealData(performanceData);
      
    } catch (error) {
      console.warn('[PERFORMANCE] Failed to update enhanced metrics:', error);
    }
  }

  // Update performance display with comprehensive metrics
  updatePerformanceDisplay(performanceData) {
    const container = document.getElementById('performance-metrics-container');
    if (container) {
      let html = '<h4>📈 Real-time Performance Metrics</h4>';
      
      if (performanceData.system) {
        html += `
          <div class="metric-grid">
            <div class="metric-item">
              <span class="metric-label">Total Predictions:</span>
              <span class="metric-value">${performanceData.system.total_predictions || 'N/A'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Accuracy Rate:</span>
              <span class="metric-value">${performanceData.system.accuracy_rate || 'N/A'}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Avg Response Time:</span>
              <span class="metric-value">${performanceData.system.avg_response_time || 'N/A'}s</span>
            </div>
          </div>
        `;
      }
      
      if (performanceData.realtime) {
        html += '<h5>Model Performance (Real-time)</h5>';
        html += '<div class="model-metrics">';
        Object.entries(performanceData.realtime).forEach(([metric, value]) => {
          html += `
            <div class="metric-item">
              <span class="metric-label">${metric.replace('_', ' ').toUpperCase()}:</span>
              <span class="metric-value">${(value * 100).toFixed(2)}%</span>
            </div>
          `;
        });
        html += '</div>';
      }
      
      container.innerHTML = html;
    }
  }

  // Update model comparison chart with real-time data
  updateModelComparisonWithRealData(performanceData) {
    if (this.charts.modelComparison && performanceData.models) {
      try {
        const models = Object.keys(performanceData.models);
        const datasets = models.map((model, index) => {
          const colors = ['#667eea', '#764ba2', '#ff8a80'][index] || '#667eea';
          const bgColors = ['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)', 'rgba(255, 138, 128, 0.2)'][index] || 'rgba(102, 126, 234, 0.2)';
          
          const testAccuracy = Math.round(performanceData.models[model].test_accuracy * 100);
          
          return {
            label: `${model.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} (Real Performance)`,
            data: [testAccuracy, 85, 80, 75, 80], // Real accuracy + mock other metrics
            borderColor: colors,
            backgroundColor: bgColors,
            borderWidth: 2,
          };
        });
        
        this.charts.modelComparison.data.datasets = datasets;
        this.charts.modelComparison.update('none');
        console.log('[PERFORMANCE] Model comparison updated with real-time data');
      } catch (error) {
        console.warn('[PERFORMANCE] Failed to update model comparison:', error);
      }
    }
  }

  // Update news data from NewsAnalyzer
  async updateNewsData() {
    try {
      // Check if NewsAnalyzer is available and has collected data
      if (typeof window.newsAnalyzer !== 'undefined' && window.newsAnalyzer.newsCache) {
        const newsData = window.newsAnalyzer.newsCache;
        
        if (newsData.length > 0) {
          console.log('[DASHBOARD DEBUG] Updating with real news data:', newsData.length, 'articles');
          
          // Update news sentiment chart if available
          if (typeof this.updateNewsSentimentChart === 'function') {
            this.updateNewsSentimentChart(newsData);
          }
          
          // Notify extensions about news data
          if (this.extensions && typeof this.extensions.updateNewsData === 'function') {
            this.extensions.updateNewsData(newsData);
          }
          
          // Update latest news display
          this.updateLatestNewsDisplay(newsData.slice(0, 5));
        }
      }
    } catch (error) {
      console.warn('[DASHBOARD DEBUG] Failed to update news data:', error);
    }
  }

  // Update latest news display
  updateLatestNewsDisplay(latestNews) {
    const newsContainer = document.getElementById('latest-news-container');
    if (newsContainer && latestNews.length > 0) {
      const newsHtml = latestNews.map(news => `
        <div class="news-item">
          <div class="news-title">${news.title || 'No title'}</div>
          <div class="news-summary">${(news.content || news.summary || '').substring(0, 100)}...</div>
          <div class="news-meta">
            <span class="news-source">${news.source || 'Unknown'}</span>
            <span class="news-sentiment sentiment-${news.sentiment || 'neutral'}">${news.sentiment || 'neutral'}</span>
            <span class="news-time">${this.formatTime(news.timestamp || news.publishedAt)}</span>
          </div>
        </div>
      `).join('');
      
      newsContainer.innerHTML = `
        <h4>📰 Latest Market News (Real-time)</h4>
        ${newsHtml}
      `;
    }
  }

  // Format time for display
  formatTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid time';
    }
  }

  // Update S&P 500 real-time data
  async updateSP500Data() {
    try {
      // Check if SP500ApiManager is available
      if (typeof window.sp500ApiManager !== 'undefined' && window.sp500ApiManager.collectedData) {
        const sp500Data = window.sp500ApiManager.collectedData;
        
        if (sp500Data.length > 0) {
          console.log('[DASHBOARD DEBUG] Updating charts with real S&P 500 data:', sp500Data.length, 'stocks');
          
          // Update volume chart with real S&P 500 data
          const volumeData = {
            labels: sp500Data.slice(0, 7).map(item => item.symbol),
            data: sp500Data.slice(0, 7).map(item => parseFloat((item.volume / 1000000).toFixed(1)))
          };
          
          const chartData = {
            labels: volumeData.labels,
            datasets: [{
              label: 'Real-time Volume (Millions)',
              data: volumeData.data,
              backgroundColor: [
                'rgba(102, 126, 234, 0.8)',
                'rgba(118, 75, 162, 0.8)',
                'rgba(52, 152, 219, 0.8)',
                'rgba(46, 204, 113, 0.8)',
                'rgba(241, 196, 15, 0.8)',
                'rgba(231, 76, 60, 0.8)',
                'rgba(155, 89, 182, 0.8)',
              ],
              borderColor: 'rgba(255, 255, 255, 0.8)',
              borderWidth: 2,
              borderRadius: 8,
            }],
          };
          
          if (this.charts.volume) {
            this.charts.volume.data = chartData;
            this.charts.volume.update('none');
            console.log('[DASHBOARD DEBUG] Volume chart updated with real S&P 500 data');
          }
          
          // Update XAI stock selector with real data
          this.updateXaiStockSelector(volumeData);
          
          // Update volume analysis with real data
          this.updateVolumeAnalysis(volumeData);
        }
      }
    } catch (error) {
      console.warn('[DASHBOARD DEBUG] Failed to update S&P 500 data:', error);
    }
  }

  // Update chart data
  updateCharts() {
    console.log('[DASHBOARD DEBUG] Updating all charts...');
    
    // Update performance chart
    if (this.charts.performance) {
      try {
        const currentTime = new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        });
        
        const newAccuracy = 87 + Math.sin(Date.now() / 100000) * 3 + (Math.random() - 0.5) * 2;
        const boundedAccuracy = Math.max(82, Math.min(96, newAccuracy));
        
        // Shift data and add new point
        this.charts.performance.data.labels.push(currentTime);
        this.charts.performance.data.labels.shift();
        
        this.charts.performance.data.datasets[0].data.push(parseFloat(boundedAccuracy.toFixed(2)));
        this.charts.performance.data.datasets[0].data.shift();
        
        this.charts.performance.update('none');
        console.log('[DASHBOARD DEBUG] Performance chart updated with new accuracy:', boundedAccuracy.toFixed(2));
      } catch (error) {
        console.error('[DASHBOARD DEBUG] Error updating performance chart:', error);
      }
    } else {
      console.warn('[DASHBOARD DEBUG] Performance chart not available for update');
    }

    // Update volume chart (occasionally)
    if (this.charts.volume && Math.random() > 0.8) {
      try {
        this.charts.volume.data.datasets[0].data =
          this.charts.volume.data.datasets[0].data.map(
            (val) => Math.max(10, val + (Math.random() - 0.5) * 8)
          );
        this.charts.volume.update('none');
        console.log('[DASHBOARD DEBUG] Volume chart updated');
      } catch (error) {
        console.error('[DASHBOARD DEBUG] Error updating volume chart:', error);
      }
    }
    
    console.log('[DASHBOARD DEBUG] Chart update completed');
  }

  // Generate time labels (deprecated - use commonFunctions.generateTimeLabels)
  generateTimeLabels(hours) {
    console.warn('[DASHBOARD] generateTimeLabels is deprecated, use commonFunctions.generateTimeLabels');
    return window.commonFunctions.generateTimeLabels(hours, 'hours', 'HH:mm');
  }

  // Generate performance data (deprecated - use commonFunctions.generateMockData)
  generatePerformanceData(points) {
    console.warn('[DASHBOARD] generatePerformanceData is deprecated, use commonFunctions.generateMockData');
    return window.commonFunctions.generateMockData('performance', points, {
      min: 82, max: 96, variation: 0.1
    });
  }

  // Display last update time
  updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('ko-KR', { hour12: false });
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = `Last Updated: ${timeString} KST`;
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // Display detailed information when widget is clicked
    document.querySelectorAll('.widget').forEach((widget) => {
      widget.addEventListener('click', (_e) => {
        if (!_e.target.closest('canvas')) {
          this.showWidgetDetails(widget);
        }
      });
    });

    // Refresh button (header click)
    document
      .querySelector('.content-header h1')
      .addEventListener('click', () => {
        this.refreshAllData();
      });

    // News update event listener
    window.addEventListener('newsUpdate', (event) => {
      if (
        this.extensions &&
        typeof this.extensions.updateLlmAnalysisSummary === 'function'
      ) {
        this.extensions.updateLlmAnalysisSummary();
      }
    });

    // Mobile menu toggle button event listener
    // Controls the function to open and close the sidebar in mobile view.
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    let touchStartX = 0;

    const openSidebar = () => {
      sidebar.classList.add('open');
      mainContent.classList.add('shifted');
    };

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      mainContent.classList.remove('shifted');
    };

    if (mobileMenuToggle && sidebar && mainContent) {
      mobileMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });

      // Close sidebar when a sidebar menu item is clicked (only works in mobile environment)
      sidebar.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            closeSidebar();
          }
        });
      });

      // Close sidebar when main content is clicked
      mainContent.addEventListener('click', () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
          closeSidebar();
        }
      });

      // Close sidebar by swiping from sidebar (optimized with passive listeners)
      sidebar.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      sidebar.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) {
          // Swipe more than 50px to the left
          closeSidebar();
        }
      }, { passive: true });
    }

    // XAI page stock selection event listener
    const xaiStockSelector = document.getElementById('xai-stock-selector');
    if (xaiStockSelector) {
      xaiStockSelector.addEventListener('change', (event) => {
        this.handleXaiStockChange(event.target.value);
      });
      // Load data with default value on initial load
      this.handleXaiStockChange(xaiStockSelector.value);
    }

    // Delegate event listeners for dynamic content (news)
    document
      .querySelector('.page-content')
      .addEventListener('click', (event) => {
        const newsItem = event.target.closest('.news-item');

        if (newsItem) {
          // Navigate to news analysis page when news item is clicked
          this.navigateToPage('news');
        }
      });
  }

  /**
   * Helper function to navigate to a specific page and activate its menu
   * @param {string} pageId - ID of the page to navigate to (e.g., 'news')
   */
  navigateToPage(pageId) {
    // Hide all pages and remove active class
    document
      .querySelectorAll('.page')
      .forEach((p) => p.classList.remove('active'));
    document
      .querySelectorAll('.nav-link')
      .forEach((l) => l.classList.remove('active'));

    // Activate target page and link
    document.getElementById(`page-${pageId}`).classList.add('active');
    const navLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (navLink) {
      navLink.classList.add('active');
      document.getElementById('page-title').textContent = navLink.textContent;
    }
  }

  // Handle XAI stock change
  handleXaiStockChange(stockSymbol) {
    console.log(`[XAI DEBUG] Selected stock for XAI analysis: ${stockSymbol}`);
    console.log(`[XAI DEBUG] Extensions object:`, this.extensions);
    console.log(`[XAI DEBUG] Extensions type:`, typeof this.extensions);

    if (this.extensions) {
      console.log(
        `[XAI DEBUG] Extensions available, checking renderLocalXaiAnalysis method...`
      );
      console.log(
        `[XAI DEBUG] renderLocalXaiAnalysis type:`,
        typeof this.extensions.renderLocalXaiAnalysis
      );

      if (typeof this.extensions.renderLocalXaiAnalysis === 'function') {
        console.log(
          `[XAI DEBUG] Calling renderLocalXaiAnalysis for ${stockSymbol}`
        );
        this.extensions.renderLocalXaiAnalysis(stockSymbol);
      } else {
        console.error(
          `[XAI DEBUG] renderLocalXaiAnalysis is not a function:`,
          this.extensions.renderLocalXaiAnalysis
        );
      }
    } else {
      console.error(
        `[XAI DEBUG] Extensions not available. This indicates the DashboardExtensions class was not loaded or instantiated properly.`
      );
      console.error(
        `[XAI DEBUG] Make sure dashboard-extended.js is loaded before dashboard.js`
      );
    }
  }

  // Display widget details
  showWidgetDetails(_widget) {
    // Remove click message - no action
    return;
  }

  // Refresh all data
  async refreshAllData() {
    console.log('[DASHBOARD DEBUG] Refreshing all data and charts...');
    await this.loadInitialData();
    this.updateCharts();
    
    // Also refresh the main dashboard charts
    await this.refreshAllCharts();
  }

  // Display error state
  showErrorState() {
    const systemStatusElement = document.getElementById('system-status');
    if (systemStatusElement) {
      systemStatusElement.className = 'status-dot offline';
    }
    
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = 'Update Failed';
    }

    // Display default metrics
    const modelAccuracy = document.getElementById('model-accuracy');
    if (modelAccuracy) modelAccuracy.textContent = '--';
    
    const processingSpeed = document.getElementById('processing-speed');
    if (processingSpeed) processingSpeed.textContent = '--';
    
    const activeModels = document.getElementById('active-models');
    if (activeModels) activeModels.textContent = '--';
    
    const dataSources = document.getElementById('data-sources');
    if (dataSources) dataSources.textContent = '--';
  }

  // Mock data generation functions
  generateMockSystemStatus() {
    return {
      model_accuracy: (85 + Math.random() * 10).toFixed(1),
      processing_speed: (15 + Math.random() * 10).toFixed(1),
      active_models: Math.floor(3 + Math.random() * 2),
      data_sources: Math.floor(5 + Math.random() * 3),
      status: 'online',
    };
  }

  generateMockPredictions() {
    const stocks = [
      'AAPL',
      'GOOGL',
      'MSFT',
      'AMZN',
      'TSLA',
      'META',
      'NVDA',
      'CRM',
      'ORCL',
    ];
    const predictions = [];

    for (let i = 0; i < 5; i++) {
      const isUp = Math.random() > 0.5;
      const change = (Math.random() * 3).toFixed(1);
      predictions.push({
        symbol: stocks[Math.floor(Math.random() * stocks.length)],
        direction: isUp ? 'up' : 'down',
        change: isUp ? `↗ +${change}%` : `↘ -${change}%`,
        confidence: Math.floor(75 + Math.random() * 20),
      });
    }

    return { predictions };
  }

  // Show notification message to user
  showNotification(message, type = 'info') {
    console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

    // Add to page
    let notificationContainer = document.getElementById(
      'notification-container'
    );
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'notification-container';
      notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
      document.body.appendChild(notificationContainer);
    }

    notificationContainer.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  // Refresh XAI Data - Direct method
  refreshXAIData() {
    console.log('[DASHBOARD DEBUG] refreshXAIData called directly');

    if (
      this.extensions &&
      typeof this.extensions.refreshXAIData === 'function'
    ) {
      console.log('[DASHBOARD DEBUG] Calling extensions.refreshXAIData');
      this.extensions.refreshXAIData();
    } else {
      console.error(
        '[DASHBOARD DEBUG] Extensions or refreshXAIData not available'
      );
      console.log('[DASHBOARD DEBUG] Extensions:', this.extensions);

      // Show error notification
      this.showNotification('XAI refresh functionality not available', 'error');
    }
  }
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DASHBOARD DEBUG] DOM Content Loaded event fired');
  const dashboard = new DashboardManager();
  window.dashboard = dashboard; // 디버깅용
  
  // 수동 차트 테스트 함수 추가
  window.testPerformanceChart = () => {
    console.log('[DASHBOARD DEBUG] Manual test - checking performance chart element...');
    const element = document.getElementById('performance-chart');
    console.log('[DASHBOARD DEBUG] Element found:', !!element);
    if (element) {
      console.log('[DASHBOARD DEBUG] Element dimensions:', {
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        computedStyle: window.getComputedStyle(element).display
      });
    }
  };
  
  // 5초 후 자동으로 테스트 실행
  setTimeout(() => {
    console.log('[DASHBOARD DEBUG] Auto-testing chart after 5 seconds...');
    if (window.testPerformanceChart) {
      window.testPerformanceChart();
    }
  }, 5000);
});

// 웹소켓이나 Server-Sent Events 지원 (선택사항)
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
class RealTimeConnection {
  constructor(dashboardManager) {
    this.dashboard = dashboardManager;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
  }

  connect() {
    // WebSocket 연결 시도 (실제 서버가 있을 때)
    try {
      this.ws = new WebSocket('ws://localhost:8080/dashboard');
      this.setupWebSocketHandlers();
    } catch (error) {
      console.log(
        'WebSocket server connection failed, operating in polling mode'
      );
    }
  }

  setupWebSocketHandlers() {
    this.ws.onopen = () => {
      console.log('Real-time connection successful');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealTimeData(data);
    };

    this.ws.onclose = () => {
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  }

  handleRealTimeData(data) {
    switch (data.type) {
      case 'system_status':
        this.dashboard.updateSystemMetrics(data.payload);
        break;
      case 'predictions':
        this.dashboard.updatePredictionsDisplay(data.payload);
        break;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectInterval);
    }
  }
}
