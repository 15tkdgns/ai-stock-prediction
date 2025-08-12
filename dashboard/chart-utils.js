/**
 * Chart utility functions for enhanced error handling and validation
 */

class ChartUtils {
  /**
   * Safely check if DOM element exists and is valid for Chart.js
   * @param {string} elementId - The ID of the element to check
   * @returns {HTMLElement|null} - The element if valid, null otherwise
   */
  static checkChartElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`[CHART UTILS] Chart element not found: ${elementId}`);
      return null;
    }
    
    // Check if element is visible and has dimensions
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none') {
      console.warn(`[CHART UTILS] Chart element is hidden: ${elementId}`);
      return null;
    }
    
    // Check if element has canvas context capability
    if (element.tagName.toLowerCase() !== 'canvas') {
      console.warn(`[CHART UTILS] Chart element is not a canvas: ${elementId} (${element.tagName})`);
      return null;
    }
    
    return element;
  }

  /**
   * Safely destroy existing chart before creating new one
   * @param {string|HTMLElement} elementOrId - Element or element ID
   */
  static destroyExistingChart(elementOrId) {
    try {
      const element = typeof elementOrId === 'string' 
        ? document.getElementById(elementOrId) 
        : elementOrId;
        
      if (element) {
        const existingChart = Chart.getChart(element);
        if (existingChart) {
          existingChart.destroy();
          console.log(`[CHART UTILS] Destroyed existing chart for element: ${element.id || 'unknown'}`);
        }
      }
    } catch (error) {
      console.warn(`[CHART UTILS] Error destroying chart:`, error);
    }
  }

  /**
   * Create chart with enhanced error handling
   * @param {string} elementId - Chart container element ID
   * @param {object} config - Chart.js configuration
   * @returns {Chart|null} - Created chart instance or null if failed
   */
  static createChartSafe(elementId, config) {
    try {
      // Check element validity
      const element = this.checkChartElement(elementId);
      if (!element) {
        return null;
      }

      // Destroy existing chart
      this.destroyExistingChart(element);

      // Create new chart
      const chart = new Chart(element, config);
      console.log(`[CHART UTILS] Successfully created chart: ${elementId}`);
      return chart;

    } catch (error) {
      console.error(`[CHART UTILS] Failed to create chart ${elementId}:`, error);
      
      // Try to show error in the container
      const container = document.getElementById(elementId);
      if (container && container.parentElement) {
        container.parentElement.innerHTML = `
          <div class="chart-error">
            <p>⚠️ Chart rendering failed</p>
            <small>Element: ${elementId}</small>
            <small>Error: ${error.message}</small>
          </div>
        `;
      }
      
      return null;
    }
  }

  /**
   * Wait for element to be available in DOM
   * @param {string} elementId - Element ID to wait for
   * @param {number} timeout - Timeout in milliseconds (default: 5000)
   * @returns {Promise<HTMLElement|null>} - Element when available or null if timeout
   */
  static waitForElement(elementId, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.getElementById(elementId);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        const element = document.getElementById(elementId);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        console.warn(`[CHART UTILS] Timeout waiting for element: ${elementId}`);
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Batch create multiple charts with error handling
   * @param {Array} chartConfigs - Array of {elementId, config} objects
   * @returns {Array} - Array of created chart instances
   */
  static createChartseBatch(chartConfigs) {
    const charts = [];
    
    for (const {elementId, config} of chartConfigs) {
      const chart = this.createChartSafe(elementId, config);
      if (chart) {
        charts.push({elementId, chart});
      }
    }
    
    console.log(`[CHART UTILS] Created ${charts.length}/${chartConfigs.length} charts successfully`);
    return charts;
  }
}

// Export for use in other modules
window.ChartUtils = ChartUtils;