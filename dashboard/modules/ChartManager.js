/**
 * Chart Manager Module
 * Centralized chart creation and management system
 */
class ChartManager {
  constructor(dependencies) {
    this.eventBus = dependencies.EventBus;
    this.dataService = dependencies.DataService;
    this.charts = new Map();
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    };
  }

  /**
   * Create a chart with enhanced error handling
   * @param {string} elementId - Chart container element ID
   * @param {Object} config - Chart.js configuration
   * @param {Object} options - Additional options
   * @returns {Chart|null} - Created chart instance
   */
  createChart(elementId, config, options = {}) {
    try {
      // Check element validity
      const element = this.validateChartElement(elementId);
      if (!element) {
        return null;
      }

      // Destroy existing chart
      this.destroyChart(elementId);

      // Merge with default options
      const mergedConfig = this.mergeConfig(config, options);

      // Create new chart
      const chart = new Chart(element, mergedConfig);
      
      // Store chart reference
      this.charts.set(elementId, {
        chart,
        config: mergedConfig,
        element,
        created: Date.now(),
        lastUpdate: Date.now()
      });

      // Emit chart creation event
      this.eventBus?.emit('chart:created', { elementId, chart });

      console.log(`[CHART MANAGER] Created chart: ${elementId}`);
      return chart;

    } catch (error) {
      console.error(`[CHART MANAGER] Failed to create chart ${elementId}:`, error);
      this.showChartError(elementId, error);
      return null;
    }
  }

  /**
   * Batch create multiple charts
   * @param {Array} chartConfigs - Array of chart configurations
   * @returns {Array} - Array of created chart instances
   */
  createChartsBatch(chartConfigs) {
    const results = [];
    
    chartConfigs.forEach(({ elementId, config, options = {} }) => {
      const chart = this.createChart(elementId, config, options);
      results.push({ elementId, chart, success: chart !== null });
    });

    const successful = results.filter(r => r.success).length;
    console.log(`[CHART MANAGER] Created ${successful}/${chartConfigs.length} charts successfully`);

    this.eventBus?.emit('charts:batch-created', { results });
    return results;
  }

  /**
   * Update chart data
   * @param {string} elementId - Chart element ID
   * @param {Object} newData - New chart data
   * @param {boolean} animate - Whether to animate the update
   */
  updateChart(elementId, newData, animate = true) {
    const chartInfo = this.charts.get(elementId);
    if (!chartInfo) {
      console.warn(`[CHART MANAGER] Chart not found for update: ${elementId}`);
      return;
    }

    try {
      const { chart } = chartInfo;
      
      // Update data
      if (newData.labels) {
        chart.data.labels = newData.labels;
      }
      if (newData.datasets) {
        chart.data.datasets = newData.datasets;
      }

      // Update chart
      chart.update(animate ? 'active' : 'none');
      chartInfo.lastUpdate = Date.now();

      this.eventBus?.emit('chart:updated', { elementId, chart });
      console.log(`[CHART MANAGER] Updated chart: ${elementId}`);

    } catch (error) {
      console.error(`[CHART MANAGER] Failed to update chart ${elementId}:`, error);
    }
  }

  /**
   * Update multiple charts with data from DataService
   * @param {Array} updates - Array of update configurations
   */
  async updateChartsFromData(updates) {
    const dataKeys = [...new Set(updates.map(u => u.dataKey).filter(Boolean))];
    
    try {
      const { data, errors } = await this.dataService.fetchBatch(dataKeys);
      
      updates.forEach(({ elementId, dataKey, transformer }) => {
        if (data[dataKey] && transformer) {
          const chartData = transformer(data[dataKey]);
          this.updateChart(elementId, chartData);
        } else if (errors[dataKey]) {
          console.error(`[CHART MANAGER] Data fetch failed for ${elementId}:`, errors[dataKey]);
        }
      });

    } catch (error) {
      console.error('[CHART MANAGER] Batch update failed:', error);
    }
  }

  /**
   * Destroy a chart
   * @param {string} elementId - Chart element ID
   */
  destroyChart(elementId) {
    const chartInfo = this.charts.get(elementId);
    if (!chartInfo) {
      return;
    }

    try {
      chartInfo.chart.destroy();
      this.charts.delete(elementId);
      
      this.eventBus?.emit('chart:destroyed', { elementId });
      console.log(`[CHART MANAGER] Destroyed chart: ${elementId}`);

    } catch (error) {
      console.error(`[CHART MANAGER] Error destroying chart ${elementId}:`, error);
    }
  }

  /**
   * Destroy all charts
   */
  destroyAllCharts() {
    const chartIds = Array.from(this.charts.keys());
    chartIds.forEach(id => this.destroyChart(id));
    console.log(`[CHART MANAGER] Destroyed ${chartIds.length} charts`);
  }

  /**
   * Get chart instance
   * @param {string} elementId - Chart element ID
   * @returns {Chart|null} - Chart instance
   */
  getChart(elementId) {
    const chartInfo = this.charts.get(elementId);
    return chartInfo ? chartInfo.chart : null;
  }

  /**
   * Resize all charts (useful for responsive layouts)
   */
  resizeAllCharts() {
    this.charts.forEach((chartInfo, elementId) => {
      try {
        chartInfo.chart.resize();
        console.log(`[CHART MANAGER] Resized chart: ${elementId}`);
      } catch (error) {
        console.error(`[CHART MANAGER] Failed to resize chart ${elementId}:`, error);
      }
    });
  }

  /**
   * Validate chart element
   * @param {string} elementId - Element ID
   * @returns {HTMLElement|null} - Element if valid
   */
  validateChartElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`[CHART MANAGER] Element not found: ${elementId}`);
      return null;
    }
    
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none') {
      console.warn(`[CHART MANAGER] Element is hidden: ${elementId}`);
      return null;
    }
    
    if (element.tagName.toLowerCase() !== 'canvas') {
      console.warn(`[CHART MANAGER] Element is not a canvas: ${elementId}`);
      return null;
    }
    
    return element;
  }

  /**
   * Merge configuration with defaults
   * @param {Object} config - Chart configuration
   * @param {Object} options - Additional options
   * @returns {Object} - Merged configuration
   */
  mergeConfig(config, options) {
    const merged = {
      ...config,
      options: {
        ...this.defaultOptions,
        ...(config.options || {}),
        ...(options.chartOptions || {})
      }
    };

    return merged;
  }

  /**
   * Show chart error in container
   * @param {string} elementId - Element ID
   * @param {Error} error - Error object
   */
  showChartError(elementId, error) {
    const element = document.getElementById(elementId);
    if (element && element.parentElement) {
      element.parentElement.innerHTML = `
        <div class="chart-error">
          <p>⚠️ Chart rendering failed</p>
          <small>Element: ${elementId}</small>
          <small>Error: ${error.message}</small>
        </div>
      `;
    }
  }

  /**
   * Get chart manager statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    const chartInfos = Array.from(this.charts.values());
    const now = Date.now();
    
    return {
      totalCharts: this.charts.size,
      chartTypes: this.getChartTypes(),
      oldestChart: Math.min(...chartInfos.map(c => c.created)),
      newestChart: Math.max(...chartInfos.map(c => c.created)),
      averageAge: chartInfos.reduce((sum, c) => sum + (now - c.created), 0) / chartInfos.length,
      lastUpdateTimes: Object.fromEntries(
        Array.from(this.charts.entries()).map(([id, info]) => [id, info.lastUpdate])
      )
    };
  }

  /**
   * Get chart types distribution
   * @returns {Object} - Chart types count
   */
  getChartTypes() {
    const types = {};
    this.charts.forEach((chartInfo, elementId) => {
      const type = chartInfo.config.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  /**
   * Setup automatic chart updates
   * @param {Array} configs - Auto-update configurations
   */
  setupAutoUpdates(configs) {
    configs.forEach(({ elementId, dataKey, transformer, interval = 5000 }) => {
      if (this.dataService) {
        const unsubscribe = this.dataService.subscribe(
          dataKey,
          (data, error) => {
            if (data && transformer) {
              const chartData = transformer(data);
              this.updateChart(elementId, chartData);
            } else if (error) {
              console.error(`[CHART MANAGER] Auto-update failed for ${elementId}:`, error);
            }
          },
          interval
        );

        // Store unsubscribe function
        const chartInfo = this.charts.get(elementId);
        if (chartInfo) {
          chartInfo.autoUpdateUnsubscribe = unsubscribe;
        }
      }
    });
  }

  /**
   * Cleanup method
   */
  cleanup() {
    // Unsubscribe from auto-updates
    this.charts.forEach(chartInfo => {
      if (chartInfo.autoUpdateUnsubscribe) {
        chartInfo.autoUpdateUnsubscribe();
      }
    });

    this.destroyAllCharts();
    console.log('[CHART MANAGER] Cleaned up');
  }
}

// Register module
if (window.ModuleManager) {
  window.ModuleManager.register('ChartManager', ChartManager, ['EventBus', 'DataService']);
}