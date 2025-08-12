/**
 * Module Management System
 * Central module loader and dependency injection system
 */
class ModuleManager {
  constructor() {
    this.modules = new Map();
    this.dependencies = new Map();
    this.loadOrder = [];
  }

  /**
   * Register a module with its dependencies
   * @param {string} name - Module name
   * @param {Function|Object} module - Module constructor or object
   * @param {string[]} deps - Dependencies array
   */
  register(name, module, deps = []) {
    this.modules.set(name, {
      module,
      dependencies: deps,
      instance: null,
      loaded: false
    });
    
    // Store reverse dependencies for cleanup
    deps.forEach(dep => {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, []);
      }
      this.dependencies.get(dep).push(name);
    });
  }

  /**
   * Load a module and its dependencies
   * @param {string} name - Module name
   * @returns {Promise<any>} - Module instance
   */
  async load(name) {
    if (!this.modules.has(name)) {
      throw new Error(`Module '${name}' not found`);
    }

    const moduleInfo = this.modules.get(name);
    if (moduleInfo.loaded) {
      return moduleInfo.instance;
    }

    // Load dependencies first
    const depInstances = {};
    for (const dep of moduleInfo.dependencies) {
      depInstances[dep] = await this.load(dep);
    }

    try {
      // Create module instance
      let instance;
      if (typeof moduleInfo.module === 'function') {
        instance = new moduleInfo.module(depInstances);
      } else {
        instance = moduleInfo.module;
        if (instance.init && typeof instance.init === 'function') {
          await instance.init(depInstances);
        }
      }

      moduleInfo.instance = instance;
      moduleInfo.loaded = true;
      this.loadOrder.push(name);

      console.log(`[MODULE] Loaded: ${name}`);
      return instance;

    } catch (error) {
      console.error(`[MODULE] Failed to load ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get a loaded module instance
   * @param {string} name - Module name
   * @returns {any} - Module instance
   */
  get(name) {
    const moduleInfo = this.modules.get(name);
    if (!moduleInfo || !moduleInfo.loaded) {
      console.warn(`[MODULE] Module '${name}' not loaded`);
      return null;
    }
    return moduleInfo.instance;
  }

  /**
   * Load all registered modules
   * @returns {Promise<void>}
   */
  async loadAll() {
    const moduleNames = Array.from(this.modules.keys());
    for (const name of moduleNames) {
      if (!this.modules.get(name).loaded) {
        await this.load(name);
      }
    }
  }

  /**
   * Cleanup and unload modules in reverse order
   */
  async cleanup() {
    for (let i = this.loadOrder.length - 1; i >= 0; i--) {
      const name = this.loadOrder[i];
      const moduleInfo = this.modules.get(name);
      
      if (moduleInfo.instance && typeof moduleInfo.instance.cleanup === 'function') {
        try {
          await moduleInfo.instance.cleanup();
          console.log(`[MODULE] Cleaned up: ${name}`);
        } catch (error) {
          console.error(`[MODULE] Cleanup failed for ${name}:`, error);
        }
      }
      
      moduleInfo.instance = null;
      moduleInfo.loaded = false;
    }
    
    this.loadOrder = [];
  }

  /**
   * Get module loading statistics
   * @returns {Object} - Loading stats
   */
  getStats() {
    const total = this.modules.size;
    const loaded = Array.from(this.modules.values()).filter(m => m.loaded).length;
    const failed = total - loaded;

    return {
      total,
      loaded,
      failed,
      loadOrder: [...this.loadOrder]
    };
  }
}

// Global module manager instance
window.ModuleManager = window.ModuleManager || new ModuleManager();