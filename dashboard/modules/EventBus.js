/**
 * Event Bus Module
 * Centralized event management system for decoupled communication
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.debugMode = false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} options - Options object
   * @returns {Function} - Unsubscribe function
   */
  on(event, callback, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = {
      callback,
      context: options.context || null,
      priority: options.priority || 0
    };

    this.listeners.get(event).push(listener);

    // Sort by priority (higher priority first)
    this.listeners.get(event).sort((a, b) => b.priority - a.priority);

    if (this.debugMode) {
      console.log(`[EVENT BUS] Subscribed to '${event}' (${this.listeners.get(event).length} total listeners)`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} options - Options object
   * @returns {Function} - Unsubscribe function
   */
  once(event, callback, options = {}) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }

    const listener = {
      callback,
      context: options.context || null,
      priority: options.priority || 0
    };

    this.onceListeners.get(event).push(listener);
    this.onceListeners.get(event).sort((a, b) => b.priority - a.priority);

    if (this.debugMode) {
      console.log(`[EVENT BUS] Subscribed once to '${event}'`);
    }

    // Return unsubscribe function
    return () => this.offOnce(event, callback);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @param {Object} options - Emit options
   */
  emit(event, data = null, options = {}) {
    const { async = false, timeout = 5000 } = options;

    if (this.debugMode) {
      console.log(`[EVENT BUS] Emitting '${event}' with data:`, data);
    }

    // Handle regular listeners
    const listeners = this.listeners.get(event) || [];
    
    // Handle once listeners
    const onceListeners = this.onceListeners.get(event) || [];
    if (onceListeners.length > 0) {
      this.onceListeners.delete(event); // Remove once listeners after execution
    }

    const allListeners = [...listeners, ...onceListeners];

    if (allListeners.length === 0) {
      if (this.debugMode) {
        console.log(`[EVENT BUS] No listeners for '${event}'`);
      }
      return Promise.resolve();
    }

    if (async) {
      return this.executeListenersAsync(allListeners, event, data, timeout);
    } else {
      return this.executeListenersSync(allListeners, event, data);
    }
  }

  /**
   * Execute listeners synchronously
   * @param {Array} listeners - Array of listener objects
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  executeListenersSync(listeners, event, data) {
    const results = [];
    const errors = [];

    listeners.forEach((listener, index) => {
      try {
        const result = listener.context 
          ? listener.callback.call(listener.context, data, event)
          : listener.callback(data, event);
        
        results.push({ index, result });
      } catch (error) {
        console.error(`[EVENT BUS] Error in listener for '${event}':`, error);
        errors.push({ index, error });
      }
    });

    return Promise.resolve({ results, errors });
  }

  /**
   * Execute listeners asynchronously
   * @param {Array} listeners - Array of listener objects
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @param {number} timeout - Timeout in ms
   */
  async executeListenersAsync(listeners, event, data, timeout) {
    const promises = listeners.map((listener, index) => 
      Promise.race([
        Promise.resolve().then(() => 
          listener.context 
            ? listener.callback.call(listener.context, data, event)
            : listener.callback(data, event)
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
      ]).then(result => ({ index, result }))
        .catch(error => ({ index, error }))
    );

    const results = await Promise.all(promises);
    const successful = results.filter(r => !r.error);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error(`[EVENT BUS] ${errors.length} errors in async listeners for '${event}':`, errors);
    }

    return { results: successful, errors };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex(l => l.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
      
      if (listeners.length === 0) {
        this.listeners.delete(event);
      }

      if (this.debugMode) {
        console.log(`[EVENT BUS] Unsubscribed from '${event}'`);
      }
    }
  }

  /**
   * Unsubscribe from a once event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  offOnce(event, callback) {
    const listeners = this.onceListeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex(l => l.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
      
      if (listeners.length === 0) {
        this.onceListeners.delete(event);
      }

      if (this.debugMode) {
        console.log(`[EVENT BUS] Unsubscribed from once '${event}'`);
      }
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    this.listeners.delete(event);
    this.onceListeners.delete(event);
    
    if (this.debugMode) {
      console.log(`[EVENT BUS] Removed all listeners for '${event}'`);
    }
  }

  /**
   * Get all event names with listeners
   * @returns {string[]} - Array of event names
   */
  getEventNames() {
    const regularEvents = Array.from(this.listeners.keys());
    const onceEvents = Array.from(this.onceListeners.keys());
    return [...new Set([...regularEvents, ...onceEvents])];
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {Object} - Listener counts
   */
  getListenerCount(event) {
    const regular = (this.listeners.get(event) || []).length;
    const once = (this.onceListeners.get(event) || []).length;
    return { regular, once, total: regular + once };
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`[EVENT BUS] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get event bus statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    const eventNames = this.getEventNames();
    const stats = {
      totalEvents: eventNames.length,
      totalListeners: 0,
      totalOnceListeners: 0,
      events: {}
    };

    eventNames.forEach(event => {
      const counts = this.getListenerCount(event);
      stats.events[event] = counts;
      stats.totalListeners += counts.regular;
      stats.totalOnceListeners += counts.once;
    });

    return stats;
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    this.listeners.clear();
    this.onceListeners.clear();
    
    if (this.debugMode) {
      console.log('[EVENT BUS] Cleaned up all listeners');
    }
  }
}

// Register module
if (window.ModuleManager) {
  window.ModuleManager.register('EventBus', EventBus);
}