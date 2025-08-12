/**
 * Application Controller Module
 * Main application orchestrator that manages all modules and pages
 */
class ApplicationController {
  constructor() {
    this.moduleManager = window.ModuleManager;
    this.modules = {};
    this.pageControllers = new Map();
    this.currentPage = null;
    this.initialized = false;
    
    this.bindEvents();
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) {
      console.warn('[APP CONTROLLER] Already initialized');
      return;
    }

    try {
      console.log('[APP CONTROLLER] Starting initialization...');
      
      // Load core modules first
      await this.loadCoreModules();
      
      // Initialize page controllers
      await this.initializePageControllers();
      
      // Setup global event listeners
      this.setupGlobalEvents();
      
      // Setup router integration
      this.setupRouterIntegration();
      
      // Initialize default page
      await this.navigateToDefaultPage();
      
      this.initialized = true;
      console.log('[APP CONTROLLER] Initialization complete');
      
      // Emit ready event
      this.modules.EventBus?.emit('app:ready');
      
    } catch (error) {
      console.error('[APP CONTROLLER] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load core modules in dependency order
   */
  async loadCoreModules() {
    console.log('[APP CONTROLLER] Loading core modules...');
    
    // Load modules in dependency order
    const moduleLoadOrder = [
      'EventBus',
      'DataService', 
      'APIManager',
      'ChartManager'
    ];

    for (const moduleName of moduleLoadOrder) {
      try {
        const module = await this.moduleManager.load(moduleName);
        this.modules[moduleName] = module;
        console.log(`[APP CONTROLLER] Loaded module: ${moduleName}`);
      } catch (error) {
        console.error(`[APP CONTROLLER] Failed to load module ${moduleName}:`, error);
        throw error;
      }
    }

    // Enable debug mode for EventBus in development
    if (window.location.hostname === 'localhost') {
      this.modules.EventBus?.setDebugMode(true);
    }
  }

  /**
   * Initialize page controllers
   */
  async initializePageControllers() {
    console.log('[APP CONTROLLER] Initializing page controllers...');
    
    const pageControllerConfigs = [
      { name: 'DashboardPageController', pageId: 'dashboard' },
      { name: 'NewsPageController', pageId: 'news' },
      // Add more page controllers as needed
    ];

    for (const config of pageControllerConfigs) {
      try {
        const ControllerClass = await this.moduleManager.load(config.name);
        const controller = new ControllerClass(this.modules);
        
        await controller.init();
        this.pageControllers.set(config.pageId, controller);
        
        console.log(`[APP CONTROLLER] Initialized page controller: ${config.pageId}`);
        
      } catch (error) {
        console.error(`[APP CONTROLLER] Failed to initialize ${config.name}:`, error);
        // Continue with other controllers
      }
    }
  }

  /**
   * Setup global application events
   */
  setupGlobalEvents() {
    const eventBus = this.modules.EventBus;
    if (!eventBus) return;

    // Handle page navigation
    eventBus.on('page:navigate', this.handlePageNavigation.bind(this), { priority: 100 });
    
    // Handle data updates
    eventBus.on('data:updated', this.handleDataUpdate.bind(this));
    
    // Handle errors
    eventBus.on('error', this.handleError.bind(this));
    
    // Handle window resize
    window.addEventListener('resize', () => {
      eventBus.emit('window:resize');
      this.modules.ChartManager?.resizeAllCharts();
    });
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      eventBus.emit('app:visibility-change', { visible: !document.hidden });
    });
    
    console.log('[APP CONTROLLER] Global events setup complete');
  }

  /**
   * Setup integration with existing router
   */
  setupRouterIntegration() {
    // Check if router exists
    if (window.router && typeof window.router.navigateTo === 'function') {
      // Override router navigation to emit events
      const originalNavigateTo = window.router.navigateTo;
      
      window.router.navigateTo = (page, addToHistory = true) => {
        const fromPage = this.currentPage;
        this.modules.EventBus?.emit('page:navigate', { toPage: page, fromPage });
        return originalNavigateTo.call(window.router, page, addToHistory);
      };
      
      console.log('[APP CONTROLLER] Router integration setup complete');
    }
  }

  /**
   * Handle page navigation events
   */
  async handlePageNavigation({ toPage, fromPage }) {
    console.log(`[APP CONTROLLER] Page navigation: ${fromPage} -> ${toPage}`);
    
    try {
      // Deactivate current page controller
      if (fromPage && this.pageControllers.has(fromPage)) {
        await this.pageControllers.get(fromPage).deactivate();
      }
      
      // Activate new page controller
      if (toPage && this.pageControllers.has(toPage)) {
        await this.pageControllers.get(toPage).activate();
      }
      
      this.currentPage = toPage;
      
      // Emit page changed event
      this.modules.EventBus?.emit('page:changed', { currentPage: toPage, previousPage: fromPage });
      
    } catch (error) {
      console.error('[APP CONTROLLER] Page navigation error:', error);
    }
  }

  /**
   * Handle global data updates
   */
  handleDataUpdate({ dataKey, data, error }) {
    if (error) {
      console.error(`[APP CONTROLLER] Data update error for ${dataKey}:`, error);
      return;
    }
    
    console.log(`[APP CONTROLLER] Data updated: ${dataKey}`);
    
    // Emit to all page controllers
    this.pageControllers.forEach(controller => {
      if (controller.isActive) {
        controller.onDataChange(dataKey, data);
      }
    });
  }

  /**
   * Handle global errors
   */
  handleError({ source, error, context }) {
    console.error(`[APP CONTROLLER] Error from ${source}:`, error);
    
    // Could implement error reporting, user notification, etc.
    // For now, just log it
    
    // Emit error notification event
    this.modules.EventBus?.emit('error:notify', { source, error, context });
  }

  /**
   * Navigate to default page
   */
  async navigateToDefaultPage() {
    const defaultPage = 'dashboard';
    
    // Check current URL hash
    const currentHash = window.location.hash.replace('#', '');
    const targetPage = currentHash || defaultPage;
    
    if (window.router && typeof window.router.navigateTo === 'function') {
      window.router.navigateTo(targetPage, false);
    } else {
      // Fallback navigation
      await this.handlePageNavigation({ toPage: targetPage, fromPage: null });
    }
  }

  /**
   * Refresh current page
   */
  async refreshCurrentPage() {
    if (this.currentPage && this.pageControllers.has(this.currentPage)) {
      await this.pageControllers.get(this.currentPage).refresh();
    }
  }

  /**
   * Get application statistics
   */
  getApplicationStats() {
    const stats = {
      initialized: this.initialized,
      currentPage: this.currentPage,
      pageControllers: Array.from(this.pageControllers.keys()),
      modules: Object.keys(this.modules)
    };

    // Add module-specific stats
    if (this.modules.EventBus) {
      stats.eventBus = this.modules.EventBus.getStats();
    }
    
    if (this.modules.DataService) {
      stats.dataService = this.modules.DataService.getCacheStats();
    }
    
    if (this.modules.ChartManager) {
      stats.chartManager = this.modules.ChartManager.getStats();
    }
    
    if (this.modules.APIManager) {
      stats.apiManager = this.modules.APIManager.getStats();
    }

    return stats;
  }

  /**
   * Enable or disable debug mode for all modules
   */
  setDebugMode(enabled) {
    console.log(`[APP CONTROLLER] Setting debug mode: ${enabled}`);
    
    // Enable debug for EventBus
    this.modules.EventBus?.setDebugMode(enabled);
    
    // Could enable debug for other modules too
    
    this.modules.EventBus?.emit('debug:mode-changed', { enabled });
  }

  /**
   * Bind global events
   */
  bindEvents() {
    // Handle unload for cleanup
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Handle errors
    window.addEventListener('error', (event) => {
      this.modules.EventBus?.emit('error', {
        source: 'window',
        error: event.error,
        context: { filename: event.filename, lineno: event.lineno }
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.modules.EventBus?.emit('error', {
        source: 'promise',
        error: event.reason,
        context: { promise: event.promise }
      });
    });
  }

  /**
   * Cleanup application
   */
  async cleanup() {
    console.log('[APP CONTROLLER] Starting cleanup...');
    
    try {
      // Cleanup page controllers
      for (const controller of this.pageControllers.values()) {
        await controller.cleanup();
      }
      this.pageControllers.clear();
      
      // Cleanup modules
      await this.moduleManager.cleanup();
      
      this.initialized = false;
      console.log('[APP CONTROLLER] Cleanup complete');
      
    } catch (error) {
      console.error('[APP CONTROLLER] Cleanup error:', error);
    }
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Wait for ModuleManager to be available
    if (!window.ModuleManager) {
      console.error('ModuleManager not found! Make sure to load ModuleManager.js first.');
      return;
    }

    // Create and initialize application
    window.app = new ApplicationController();
    await window.app.init();
    
    console.log('🚀 Application initialized successfully!');
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
});

// Export for manual initialization if needed
window.ApplicationController = ApplicationController;