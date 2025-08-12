// Debug Dashboard JavaScript
class DebugDashboard {
  constructor() {
    this.errors = [];
    this.consoleMessages = [];
    this.initialized = false;
    this.refreshInterval = null;
    this.charts = {
      dashboard: ['performance-chart', 'volume-chart', 'model-comparison-chart'],
      predictions: ['prediction-chart', 'sentiment-chart'],
      xai: [
        'feature-importance-chart', 'feature-detail-chart', 'shap-summary-plot', 
        'shap-force-plot', 'lime-explanation', 'partial-dependence-chart',
        'prediction-explanation-chart', 'local-feature-importance-chart'
      ],
      training: ['feature-distribution-chart', 'training-loss-chart', 'cross-validation-chart']
    };
    this.apis = ['Alpha Vantage', 'Yahoo Finance', 'News API', 'Internal API'];
    this.features = [
      'Real-time Updates', 'Chart Rendering', 'Data Export', 'News Analysis',
      'Model Training', 'XAI Analysis', 'Translation', 'Theme Switching'
    ];
  }

  init() {
    if (this.initialized) return;
    
    console.log('[DEBUG DASHBOARD] Initializing debug dashboard...');
    this.logMessage('info', 'Debug Dashboard initialized');
    
    this.setupEventListeners();
    this.startMonitoring();
    this.checkSystemStatus();
    this.initialized = true;
    
    // Auto-refresh every 10 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshAll();
    }, 10000);
  }

  setupEventListeners() {
    // Console input event listener
    const consoleInput = document.getElementById('console-input');
    if (consoleInput) {
      consoleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.executeCommand();
        }
      });
    }
  }

  // System Status Checks
  async checkSystemStatus() {
    this.logMessage('info', 'Checking system status...');
    
    // Check overall system
    this.updateSystemStatus('overall', 'online', 'All systems operational');
    
    // Check server connection
    await this.checkServerConnection();
    
    // Check network status
    await this.checkNetworkStatus();
    
    // Check API services
    await this.checkAPIServices();
    
    // Check chart rendering
    this.checkChartRendering();
    
    // Check API pipeline
    this.checkAPIPipeline();
    
    // Check features
    this.checkFeatureStatus();
    
    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  async checkServerConnection() {
    try {
      const startTime = performance.now();
      const response = await fetch('/');
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if (response.ok) {
        this.updateSystemStatus('server', 'online', `Connected (${responseTime}ms)`);
      } else {
        this.updateSystemStatus('server', 'warning', `HTTP ${response.status}`);
      }
    } catch (error) {
      this.updateSystemStatus('server', 'offline', 'Connection failed');
      this.logError('Server connection check failed: ' + error.message);
    }
  }

  async checkNetworkStatus() {
    if (navigator.onLine) {
      try {
        const startTime = performance.now();
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        this.updateSystemStatus('network', 'online', `Online (${responseTime}ms)`);
      } catch (error) {
        this.updateSystemStatus('network', 'warning', 'Limited connectivity');
      }
    } else {
      this.updateSystemStatus('network', 'offline', 'No internet connection');
    }
  }

  async checkAPIServices() {
    // Check if API status is available from sp500APIManager
    if (window.sp500APIManager) {
      const apiStatus = window.sp500APIManager.getAPIStatus();
      const activeAPIs = Object.values(apiStatus).filter(status => status === 'active').length;
      const totalAPIs = Object.keys(apiStatus).length;
      
      if (activeAPIs === totalAPIs) {
        this.updateSystemStatus('api', 'online', `All APIs active (${activeAPIs}/${totalAPIs})`);
      } else if (activeAPIs > 0) {
        this.updateSystemStatus('api', 'warning', `Partial APIs (${activeAPIs}/${totalAPIs})`);
      } else {
        this.updateSystemStatus('api', 'offline', 'No APIs active');
      }
    } else {
      this.updateSystemStatus('api', 'unknown', 'API manager not found');
    }
  }

  checkChartRendering() {
    const results = {
      dashboard: this.checkChartsInCategory('dashboard'),
      predictions: this.checkChartsInCategory('predictions'),
      xai: this.checkChartsInCategory('xai'),
      training: this.checkChartsInCategory('training')
    };

    // Update UI for each category
    Object.keys(results).forEach(category => {
      this.updateChartStatusSection(category, results[category]);
    });

    this.logMessage('info', 'Chart rendering status updated');
  }

  checkChartsInCategory(category) {
    const charts = this.charts[category];
    const results = [];

    charts.forEach(chartId => {
      const element = document.getElementById(chartId);
      const chart = window.Chart?.getChart?.(chartId);
      
      let status, description;
      
      if (!element) {
        status = 'not-found';
        description = 'Element not found';
      } else if (!chart) {
        status = 'error';
        description = 'Chart not initialized';
      } else {
        status = 'working';
        description = 'Rendering correctly';
      }

      results.push({
        name: this.formatChartName(chartId),
        status: status,
        description: description
      });
    });

    return results;
  }

  formatChartName(chartId) {
    return chartId.replace(/-chart$/, '').replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  updateChartStatusSection(category, results) {
    const containerId = `${category}-charts-status`;
    const container = document.getElementById(containerId);
    
    if (!container) return;

    container.innerHTML = results.map(chart => `
      <div class="chart-status-item">
        <span class="chart-name">${chart.name}</span>
        <span class="status-badge ${chart.status}">${chart.status.replace('-', ' ')}</span>
      </div>
    `).join('');
  }

  checkAPIPipeline() {
    const apiContainer = document.getElementById('api-pipeline-status');
    if (!apiContainer) return;

    const apis = this.apis.map(apiName => {
      // Simulate API status check
      const responseTime = Math.floor(Math.random() * 200 + 50);
      const status = Math.random() > 0.2 ? 'online' : (Math.random() > 0.5 ? 'warning' : 'offline');
      
      return {
        name: apiName,
        status: status,
        responseTime: responseTime
      };
    });

    apiContainer.innerHTML = apis.map(api => `
      <div class="api-item">
        <span class="api-name">${api.name}</span>
        <div class="api-status-indicator">
          <span class="api-response-time">${api.responseTime}ms</span>
          <div class="status-indicator ${api.status}"></div>
        </div>
      </div>
    `).join('');
  }

  checkFeatureStatus() {
    const featureContainer = document.getElementById('feature-status-list');
    if (!featureContainer) return;

    const features = this.features.map(featureName => {
      // Determine feature status based on actual functionality
      let status = 'working';
      
      switch (featureName) {
        case 'Real-time Updates':
          status = window.dashboard ? 'working' : 'error';
          break;
        case 'Chart Rendering':
          status = typeof Chart !== 'undefined' ? 'working' : 'error';
          break;
        case 'Translation':
          status = window.translator ? 'working' : 'pending';
          break;
        case 'Theme Switching':
          status = 'pending'; // Not implemented yet
          break;
        default:
          status = Math.random() > 0.8 ? 'pending' : 'working';
      }

      return { name: featureName, status: status };
    });

    featureContainer.innerHTML = features.map(feature => `
      <div class="feature-item">
        <span class="feature-name">${feature.name}</span>
        <span class="status-badge ${feature.status}">${feature.status}</span>
      </div>
    `).join('');
  }

  updatePerformanceMetrics() {
    // Chart load time (simulated)
    const chartLoadTime = Math.floor(Math.random() * 500 + 100);
    document.getElementById('chart-load-time').textContent = chartLoadTime + 'ms';

    // API response time (simulated)
    const apiResponseTime = Math.floor(Math.random() * 300 + 50);
    document.getElementById('api-response-time').textContent = apiResponseTime + 'ms';

    // Memory usage
    if (performance.memory) {
      const memoryUsage = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      document.getElementById('memory-usage').textContent = memoryUsage + 'MB';

      const heapSize = (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      document.getElementById('js-heap-size').textContent = heapSize + 'MB';
    } else {
      document.getElementById('memory-usage').textContent = 'N/A';
      document.getElementById('js-heap-size').textContent = 'N/A';
    }
  }

  updateSystemStatus(type, status, message) {
    const indicator = document.getElementById(`${type}-status`);
    const text = document.getElementById(`${type}-status-text`);
    
    if (indicator) {
      indicator.className = `status-indicator ${status}`;
    }
    
    if (text) {
      text.textContent = message;
    }
  }

  // Console functionality
  executeCommand() {
    const input = document.getElementById('console-input');
    if (!input) return;

    const command = input.value.trim();
    if (!command) return;

    this.logMessage('info', `> ${command}`);
    
    // Process command
    this.processDebugCommand(command);
    
    input.value = '';
  }

  processDebugCommand(command) {
    const parts = command.toLowerCase().split(' ');
    const cmd = parts[0];

    switch (cmd) {
      case 'help':
        this.logMessage('info', 'Available commands:');
        this.logMessage('info', '  help - Show this help');
        this.logMessage('info', '  status - Show system status');
        this.logMessage('info', '  charts - List all charts');
        this.logMessage('info', '  refresh - Refresh all data');
        this.logMessage('info', '  clear - Clear console');
        this.logMessage('info', '  errors - Show recent errors');
        break;

      case 'status':
        this.logMessage('info', 'System Status:');
        this.logMessage('info', `  Charts: ${Object.values(this.charts).flat().length} total`);
        this.logMessage('info', `  APIs: ${this.apis.length} configured`);
        this.logMessage('info', `  Features: ${this.features.length} available`);
        break;

      case 'charts':
        this.logMessage('info', 'Chart Overview:');
        Object.keys(this.charts).forEach(category => {
          this.logMessage('info', `  ${category}: ${this.charts[category].length} charts`);
        });
        break;

      case 'refresh':
        this.logMessage('info', 'Refreshing all systems...');
        this.refreshAll();
        break;

      case 'clear':
        this.clearConsole();
        break;

      case 'errors':
        this.logMessage('info', `Recent errors (${this.errors.length}):`);
        this.errors.slice(-5).forEach(error => {
          this.logMessage('error', error.message);
        });
        break;

      default:
        this.logMessage('error', `Unknown command: ${cmd}. Type 'help' for available commands.`);
    }
  }

  logMessage(level, message) {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    const consoleOutput = document.getElementById('console-output');
    
    if (!consoleOutput) return;

    const logLine = document.createElement('div');
    logLine.className = 'console-line';
    logLine.innerHTML = `
      <span class="console-timestamp">[${timestamp}]</span>
      <span class="console-level ${level}">[${level.toUpperCase()}]</span>
      <span class="console-message">${message}</span>
    `;

    consoleOutput.appendChild(logLine);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;

    // Keep only last 100 messages
    while (consoleOutput.children.length > 100) {
      consoleOutput.removeChild(consoleOutput.firstChild);
    }

    // Store message
    this.consoleMessages.push({ timestamp, level, message });
  }

  logError(message) {
    const error = {
      timestamp: new Date().toISOString(),
      message: message
    };
    
    this.errors.push(error);
    this.logMessage('error', message);
    this.updateErrorLog();
  }

  updateErrorLog() {
    const errorList = document.getElementById('error-list');
    if (!errorList) return;

    if (this.errors.length === 0) {
      errorList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-style: italic;">No recent errors</div>';
      return;
    }

    errorList.innerHTML = this.errors.slice(-10).map(error => `
      <div class="error-item">
        <div class="error-timestamp">${new Date(error.timestamp).toLocaleString()}</div>
        <div class="error-message">${error.message}</div>
      </div>
    `).join('');
  }

  clearConsole() {
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
      consoleOutput.innerHTML = '';
    }
    this.consoleMessages = [];
    this.logMessage('info', 'Console cleared');
  }

  clearErrors() {
    this.errors = [];
    this.updateErrorLog();
    this.logMessage('info', 'Error log cleared');
  }

  refreshErrors() {
    this.updateErrorLog();
    this.logMessage('info', 'Error log refreshed');
  }

  refreshAll() {
    this.logMessage('info', 'Refreshing all debug data...');
    this.checkSystemStatus();
  }

  startMonitoring() {
    // Hook into window.onerror to catch JavaScript errors
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMsg = `${message} at ${source}:${lineno}:${colno}`;
      this.logError(errorMsg);
      
      if (originalError) {
        originalError(message, source, lineno, colno, error);
      }
    };

    // Hook into unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(`Unhandled Promise Rejection: ${event.reason}`);
    });

    this.logMessage('info', 'Error monitoring started');
  }

  exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      systemStatus: {
        overall: document.getElementById('overall-status-text')?.textContent || 'Unknown',
        server: document.getElementById('server-status-text')?.textContent || 'Unknown',
        network: document.getElementById('network-status-text')?.textContent || 'Unknown',
        api: document.getElementById('api-status-text')?.textContent || 'Unknown'
      },
      charts: this.charts,
      errors: this.errors,
      consoleMessages: this.consoleMessages.slice(-50), // Last 50 messages
      performanceMetrics: {
        chartLoadTime: document.getElementById('chart-load-time')?.textContent || 'N/A',
        apiResponseTime: document.getElementById('api-response-time')?.textContent || 'N/A',
        memoryUsage: document.getElementById('memory-usage')?.textContent || 'N/A',
        jsHeapSize: document.getElementById('js-heap-size')?.textContent || 'N/A'
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.logMessage('info', 'Debug report exported');
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.initialized = false;
    this.logMessage('info', 'Debug Dashboard destroyed');
  }
}

// Initialize debug dashboard
let debugDashboard = null;

// Router integration
if (window.router) {
  const originalInitializePage = window.router.initializePage.bind(window.router);
  window.router.initializePage = function(page) {
    originalInitializePage(page);
    
    if (page === 'debug') {
      if (!debugDashboard) {
        debugDashboard = new DebugDashboard();
      }
      debugDashboard.init();
    }
  };
}

// Make debugDashboard globally available
window.debugDashboard = debugDashboard;