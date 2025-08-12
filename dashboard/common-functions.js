// Common Functions for Rendering and Data Loading
// 렌더링 및 데이터 로딩의 재활용성과 안정성을 위한 공통 함수들

class CommonFunctions {
  constructor() {
    this.defaultChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: { size: 12 }
          }
        }
      }
    };
  }

  /**
   * 공통 차트 생성 함수
   * @param {string|HTMLElement} canvasId - Canvas element ID or element
   * @param {string} chartType - Chart type (line, bar, pie, etc.)
   * @param {Object} data - Chart data
   * @param {Object} customOptions - Custom chart options
   * @returns {Chart|null} - Chart instance or null if failed
   */
  createChart(canvasId, chartType, data, customOptions = {}) {
    try {
      const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      
      if (!canvas) {
        console.warn(`[COMMON] Canvas element not found: ${canvasId}`);
        return null;
      }

      // Destroy existing chart if exists
      const existingChart = Chart.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`[COMMON] Failed to get 2D context for canvas: ${canvasId}`);
        return null;
      }

      // Merge options
      const options = this.mergeDeep(
        JSON.parse(JSON.stringify(this.defaultChartOptions)),
        this.getChartTypeOptions(chartType),
        customOptions
      );

      const chart = new Chart(ctx, {
        type: chartType,
        data: data,
        options: options
      });

      console.log(`[COMMON] Chart created successfully: ${canvasId} (${chartType})`);
      return chart;

    } catch (error) {
      console.error(`[COMMON] Error creating chart ${canvasId}:`, error);
      return null;
    }
  }

  /**
   * 차트 타입별 기본 옵션 반환
   * @param {string} chartType - Chart type
   * @returns {Object} - Chart type specific options
   */
  getChartTypeOptions(chartType) {
    const typeOptions = {
      line: {
        scales: {
          x: { grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' } },
          y: { grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' } }
        },
        elements: { line: { tension: 0.4 } }
      },
      bar: {
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } }
        }
      },
      pie: {
        plugins: {
          legend: { position: 'bottom' }
        }
      },
      doughnut: {
        plugins: {
          legend: { position: 'bottom' }
        }
      },
      radar: {
        scales: {
          r: { beginAtZero: true }
        }
      }
    };

    return typeOptions[chartType] || {};
  }

  /**
   * 데이터를 비동기적으로 로드하는 공통 함수
   * @param {string} url - Data URL
   * @param {Object} fallbackData - Fallback data if loading fails
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} - Loaded data or fallback data
   */
  async loadData(url, fallbackData = null, options = {}) {
    const { timeout = 5000, retries = 1 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`[COMMON] Loading data from: ${url} (attempt ${attempt + 1})`);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[COMMON] Data loaded successfully from: ${url}`);
        return data;

      } catch (error) {
        console.warn(`[COMMON] Data loading attempt ${attempt + 1} failed for ${url}:`, error.message);
        
        if (attempt === retries) {
          console.warn(`[COMMON] All attempts failed for ${url}, using fallback data`);
          return fallbackData || this.generateDefaultData();
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  /**
   * 데이터를 안전하게 업데이트하는 함수
   * @param {string} containerId - Container element ID
   * @param {string} content - HTML content to update
   * @param {boolean} animate - Whether to animate the update
   */
  updateContent(containerId, content, animate = false) {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(`[COMMON] Container not found: ${containerId}`);
        return;
      }

      if (animate) {
        container.style.opacity = '0.5';
        container.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
          container.innerHTML = content;
          container.style.opacity = '1';
        }, 150);
      } else {
        container.innerHTML = content;
      }

      console.log(`[COMMON] Content updated for: ${containerId}`);
    } catch (error) {
      console.error(`[COMMON] Error updating content for ${containerId}:`, error);
    }
  }

  /**
   * 차트 데이터를 안전하게 업데이트하는 함수
   * @param {Chart} chart - Chart instance
   * @param {Object} newData - New chart data
   * @param {string} animationMode - Animation mode ('none', 'resize', etc.)
   */
  updateChart(chart, newData, animationMode = 'none') {
    try {
      if (!chart || !newData) {
        console.warn('[COMMON] Invalid chart or data for update');
        return;
      }

      // Update labels if provided
      if (newData.labels) {
        chart.data.labels = newData.labels;
      }

      // Update datasets if provided
      if (newData.datasets) {
        newData.datasets.forEach((newDataset, index) => {
          if (chart.data.datasets[index]) {
            // Update existing dataset
            Object.assign(chart.data.datasets[index], newDataset);
          } else {
            // Add new dataset
            chart.data.datasets.push(newDataset);
          }
        });
      }

      chart.update(animationMode);
      console.log('[COMMON] Chart updated successfully');

    } catch (error) {
      console.error('[COMMON] Error updating chart:', error);
    }
  }

  /**
   * 시간 레이블 생성 함수
   * @param {number} count - Number of labels to generate
   * @param {string} interval - Time interval ('minutes', 'hours', 'days')
   * @param {string} format - Time format
   * @returns {Array} - Array of time labels
   */
  generateTimeLabels(count, interval = 'hours', format = 'HH:mm') {
    const labels = [];
    const now = new Date();
    let multiplier;

    switch (interval) {
      case 'minutes': multiplier = 60 * 1000; break;
      case 'hours': multiplier = 60 * 60 * 1000; break;
      case 'days': multiplier = 24 * 60 * 60 * 1000; break;
      default: multiplier = 60 * 60 * 1000;
    }

    for (let i = count - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * multiplier);
      
      let formattedTime;
      switch (format) {
        case 'HH:mm':
          formattedTime = time.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
          });
          break;
        case 'MM/DD':
          formattedTime = time.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit'
          });
          break;
        case 'YYYY-MM-DD':
          formattedTime = time.toLocaleDateString('ko-KR');
          break;
        default:
          formattedTime = time.toLocaleString('ko-KR');
      }
      
      labels.push(formattedTime);
    }

    return labels;
  }

  /**
   * Mock 데이터 생성 함수
   * @param {string} type - Data type ('stock', 'performance', 'sentiment', etc.)
   * @param {number} count - Number of data points
   * @param {Object} options - Generation options
   * @returns {Object} - Generated mock data
   */
  generateMockData(type, count = 10, options = {}) {
    const { min = 0, max = 100, variation = 0.1 } = options;
    
    switch (type) {
      case 'stock':
        return this.generateStockData(count, options);
      case 'performance':
        return this.generatePerformanceData(count, min, max, variation);
      case 'sentiment':
        return this.generateSentimentData();
      case 'volume':
        return this.generateVolumeData(count);
      default:
        return this.generateDefaultData(count, min, max);
    }
  }

  /**
   * 주식 데이터 생성
   */
  generateStockData(count, options = {}) {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA'];
    const data = [];

    for (let i = 0; i < count; i++) {
      const symbol = symbols[i % symbols.length];
      const basePrice = Math.random() * 300 + 50;
      const change = (Math.random() - 0.5) * 20;

      data.push({
        symbol: symbol,
        price: basePrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: ((change / basePrice) * 100).toFixed(2),
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString()
      });
    }

    return data;
  }

  /**
   * 성능 데이터 생성
   */
  generatePerformanceData(count, min = 80, max = 95, variation = 0.05) {
    const data = [];
    let current = (min + max) / 2;

    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * variation * (max - min);
      current = Math.max(min, Math.min(max, current + change));
      data.push(parseFloat(current.toFixed(2)));
    }

    return data;
  }

  /**
   * 감정 분석 데이터 생성
   */
  generateSentimentData() {
    const total = 100;
    const positive = Math.floor(Math.random() * 50) + 30;
    const negative = Math.floor(Math.random() * 30) + 10;
    const neutral = total - positive - negative;

    return {
      positive: positive,
      negative: negative,
      neutral: neutral
    };
  }

  /**
   * 거래량 데이터 생성
   */
  generateVolumeData(count) {
    const symbols = ['NVDA', 'TSLA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];
    const data = [];

    for (let i = 0; i < count && i < symbols.length; i++) {
      data.push({
        symbol: symbols[i],
        volume: (Math.random() * 80 + 20).toFixed(1)
      });
    }

    return data;
  }

  /**
   * 기본 데이터 생성
   */
  generateDefaultData(count = 10, min = 0, max = 100) {
    return Array.from({ length: count }, () => 
      Math.random() * (max - min) + min
    );
  }

  /**
   * 깊은 객체 병합 함수
   */
  mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.mergeDeep(target, ...sources);
  }

  /**
   * 객체 타입 확인
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 에러 핸들링을 포함한 안전한 함수 실행
   * @param {Function} fn - Function to execute
   * @param {string} context - Context for logging
   * @param {*} fallback - Fallback value if function fails
   */
  safeExecute(fn, context = 'Unknown', fallback = null) {
    try {
      return fn();
    } catch (error) {
      console.error(`[COMMON] Error in ${context}:`, error);
      return fallback;
    }
  }

  /**
   * 시간 지연을 위한 Promise 함수
   * @param {number} ms - Milliseconds to wait
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 요소가 보이는지 확인하는 함수
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} - Whether element is visible
   */
  isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           window.getComputedStyle(element).display !== 'none';
  }

  /**
   * 로딩 상태 표시/숨김
   * @param {string} containerId - Container element ID
   * @param {boolean} show - Whether to show loading
   * @param {string} message - Loading message
   */
  toggleLoading(containerId, show = true, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (show) {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = `${containerId}-loading`;
      loadingDiv.className = 'loading-overlay';
      loadingDiv.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <div class="loading-text">${message}</div>
        </div>
      `;
      loadingDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;
      
      container.style.position = 'relative';
      container.appendChild(loadingDiv);
    } else {
      const loadingDiv = document.getElementById(`${containerId}-loading`);
      if (loadingDiv) {
        loadingDiv.remove();
      }
    }
  }
}

// Create global instance
window.commonFunctions = new CommonFunctions();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommonFunctions;
}