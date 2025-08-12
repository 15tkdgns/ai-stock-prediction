/**
 * Page Controller Module
 * Base controller for page-specific functionality
 */
class PageController {
  constructor(pageId, dependencies) {
    this.pageId = pageId;
    this.eventBus = dependencies.EventBus;
    this.dataService = dependencies.DataService;
    this.chartManager = dependencies.ChartManager;
    this.apiManager = dependencies.APIManager;
    
    this.isActive = false;
    this.charts = new Map();
    this.subscriptions = [];
    this.intervals = [];
    
    this.bindMethods();
  }

  /**
   * Bind methods to preserve 'this' context
   */
  bindMethods() {
    this.activate = this.activate.bind(this);
    this.deactivate = this.deactivate.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  /**
   * Initialize the page controller
   */
  async init() {
    console.log(`[PAGE CONTROLLER] Initializing: ${this.pageId}`);
    
    // Subscribe to page navigation events
    this.subscriptions.push(
      this.eventBus.on('page:navigate', this.onPageNavigate.bind(this))
    );

    // Subscribe to data updates
    this.subscriptions.push(
      this.eventBus.on('data:updated', this.onDataUpdated.bind(this))
    );

    await this.onInit();
  }

  /**
   * Override in child classes for custom initialization
   */
  async onInit() {
    // To be implemented by child classes
  }

  /**
   * Activate the page (when navigated to)
   */
  async activate() {
    if (this.isActive) return;
    
    console.log(`[PAGE CONTROLLER] Activating: ${this.pageId}`);
    this.isActive = true;
    
    await this.onActivate();
    
    this.eventBus.emit('page:activated', { pageId: this.pageId });
  }

  /**
   * Override in child classes for custom activation logic
   */
  async onActivate() {
    // To be implemented by child classes
  }

  /**
   * Deactivate the page (when navigating away)
   */
  async deactivate() {
    if (!this.isActive) return;
    
    console.log(`[PAGE CONTROLLER] Deactivating: ${this.pageId}`);
    this.isActive = false;
    
    // Clear intervals
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals = [];
    
    await this.onDeactivate();
    
    this.eventBus.emit('page:deactivated', { pageId: this.pageId });
  }

  /**
   * Override in child classes for custom deactivation logic
   */
  async onDeactivate() {
    // To be implemented by child classes
  }

  /**
   * Refresh page data and charts
   */
  async refresh() {
    if (!this.isActive) return;
    
    console.log(`[PAGE CONTROLLER] Refreshing: ${this.pageId}`);
    
    try {
      await this.onRefresh();
      this.eventBus.emit('page:refreshed', { pageId: this.pageId });
    } catch (error) {
      console.error(`[PAGE CONTROLLER] Refresh failed for ${this.pageId}:`, error);
      this.eventBus.emit('page:error', { pageId: this.pageId, error });
    }
  }

  /**
   * Override in child classes for custom refresh logic
   */
  async onRefresh() {
    // To be implemented by child classes
  }

  /**
   * Handle page navigation events
   */
  onPageNavigate({ toPage, fromPage }) {
    if (toPage === this.pageId) {
      this.activate();
    } else if (fromPage === this.pageId) {
      this.deactivate();
    }
  }

  /**
   * Handle data update events
   */
  onDataUpdated({ dataKey, data }) {
    if (this.isActive) {
      this.onDataChange(dataKey, data);
    }
  }

  /**
   * Override in child classes to handle data changes
   */
  onDataChange(dataKey, data) {
    // To be implemented by child classes
  }

  /**
   * Create a chart with automatic management
   * @param {string} elementId - Chart element ID
   * @param {Object} config - Chart configuration
   * @param {Object} options - Additional options
   */
  createChart(elementId, config, options = {}) {
    const chart = this.chartManager.createChart(elementId, config, options);
    if (chart) {
      this.charts.set(elementId, chart);
    }
    return chart;
  }

  /**
   * Update a managed chart
   * @param {string} elementId - Chart element ID
   * @param {Object} newData - New chart data
   */
  updateChart(elementId, newData) {
    this.chartManager.updateChart(elementId, newData);
  }

  /**
   * Setup automatic data polling
   * @param {string} dataKey - Data key to poll
   * @param {Function} callback - Callback function
   * @param {number} interval - Polling interval in ms
   */
  setupDataPolling(dataKey, callback, interval = 5000) {
    if (!this.dataService) return;

    const unsubscribe = this.dataService.subscribe(dataKey, callback, interval);
    this.subscriptions.push(unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Set up periodic refresh
   * @param {number} interval - Refresh interval in ms
   */
  setupAutoRefresh(interval = 30000) {
    const intervalId = setInterval(this.refresh, interval);
    this.intervals.push(intervalId);
    
    return intervalId;
  }

  /**
   * Add event listener with automatic cleanup
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} options - Options
   */
  addEventListener(event, callback, options = {}) {
    const unsubscribe = this.eventBus.on(event, callback, options);
    this.subscriptions.push(unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Show loading state
   * @param {string} containerId - Container element ID
   */
  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      `;
    }
  }

  /**
   * Show error state
   * @param {string} containerId - Container element ID
   * @param {Error} error - Error object
   */
  showError(containerId, error) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <p>⚠️ Error loading data</p>
          <small>${error.message}</small>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Get page element
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null} - Element or null
   */
  getElement(selector) {
    const pageElement = document.getElementById(`page-${this.pageId}`);
    return pageElement ? pageElement.querySelector(selector) : null;
  }

  /**
   * Get all page elements matching selector
   * @param {string} selector - CSS selector
   * @returns {NodeList} - Elements
   */
  getElements(selector) {
    const pageElement = document.getElementById(`page-${this.pageId}`);
    return pageElement ? pageElement.querySelectorAll(selector) : [];
  }

  /**
   * Cleanup method
   */
  cleanup() {
    console.log(`[PAGE CONTROLLER] Cleaning up: ${this.pageId}`);
    
    // Unsubscribe from all events
    this.subscriptions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.subscriptions = [];

    // Clear intervals
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals = [];

    // Destroy charts
    this.charts.forEach((chart, elementId) => {
      this.chartManager.destroyChart(elementId);
    });
    this.charts.clear();

    this.isActive = false;
  }
}

/**
 * Dashboard Page Controller
 */
class DashboardPageController extends PageController {
  constructor(dependencies) {
    super('dashboard', dependencies);
    this.updateInterval = 5000;
  }

  async onInit() {
    await this.setupCharts();
  }

  async onActivate() {
    await this.loadData();
    this.setupAutoRefresh(this.updateInterval);
  }

  async onRefresh() {
    await this.updateAllCharts();
  }

  async setupCharts() {
    // Performance chart
    this.createChart('performance-chart', {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Model Accuracy',
          data: [],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)'
        }]
      }
    });

    // Volume chart
    this.createChart('volume-chart', {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Trading Volume',
          data: [],
          backgroundColor: '#e74c3c'
        }]
      }
    });
  }

  async loadData() {
    try {
      const { data } = await this.dataService.fetchBatch([
        'systemStatus',
        'realtimeResults'
      ]);

      if (data.systemStatus) {
        this.updateSystemStatus(data.systemStatus);
      }

      if (data.realtimeResults) {
        this.updatePerformanceChart(data.realtimeResults);
      }

    } catch (error) {
      console.error('[DASHBOARD] Data loading failed:', error);
    }
  }

  async updateAllCharts() {
    await this.loadData();
  }

  updateSystemStatus(data) {
    // Update system status display
    const statusElements = this.getElements('.status-indicator');
    // Implementation specific to system status
  }

  updatePerformanceChart(data) {
    if (data.accuracy) {
      const chartData = {
        labels: ['Current'],
        datasets: [{
          label: 'Model Accuracy',
          data: [data.accuracy],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)'
        }]
      };
      
      this.updateChart('performance-chart', chartData);
    }
  }
}

/**
 * News Page Controller
 */
class NewsPageController extends PageController {
  constructor(dependencies) {
    super('news', dependencies);
    this.newsCache = [];
    this.newsUpdateInterval = 30000;
  }

  async onInit() {
    this.setupNewsDisplay();
  }

  async onActivate() {
    await this.loadNews();
    this.setupAutoRefresh(this.newsUpdateInterval);
  }

  async onRefresh() {
    await this.loadNews();
  }

  setupNewsDisplay() {
    // Setup news display elements
    const newsContainer = this.getElement('.news-container');
    if (newsContainer) {
      newsContainer.innerHTML = '<div class="news-loading">Loading news...</div>';
    }
  }

  async loadNews() {
    try {
      this.showLoading('news-container');
      
      const feeds = [
        'https://feeds.bloomberg.com/markets/news.rss',
        'https://www.cnbc.com/id/100003114/device/rss/rss.html'
      ];

      const results = await this.apiManager.fetchRSSFeeds(feeds);
      const allNews = results
        .filter(r => r.success)
        .flatMap(r => r.data);

      this.newsCache = allNews;
      this.displayNews(allNews);

    } catch (error) {
      this.showError('news-container', error);
    }
  }

  displayNews(newsItems) {
    const container = this.getElement('.news-container');
    if (!container) return;

    container.innerHTML = newsItems.map(item => `
      <div class="news-item">
        <h3><a href="${item.url}" target="_blank">${item.title}</a></h3>
        <p>${item.content}</p>
        <small>${item.source} - ${new Date(item.publishedAt).toLocaleString()}</small>
      </div>
    `).join('');
  }
}

// Register modules
if (window.ModuleManager) {
  window.ModuleManager.register('PageController', PageController);
  window.ModuleManager.register('DashboardPageController', DashboardPageController, [
    'EventBus', 'DataService', 'ChartManager', 'APIManager'
  ]);
  window.ModuleManager.register('NewsPageController', NewsPageController, [
    'EventBus', 'DataService', 'ChartManager', 'APIManager'
  ]);
}