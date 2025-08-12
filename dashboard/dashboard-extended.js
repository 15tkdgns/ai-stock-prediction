// Extended Dashboard Features
// eslint-disable-next-line no-unused-vars
class DashboardExtensions {
  constructor(dashboardManager) {
    this.dashboard = dashboardManager;
    this.newsCache = [];
    this.displayedNewsCount = 0;
    this.newsPerPage = 10;
    this.maxNewsItems = 100;
    this.sourceFiles = {};
    this.dataEndpoints = {
      stock_data: '../data/raw/training_features.csv',
      news_data: '../data/raw/news_data.csv',
      features: '../data/processed/llm_enhanced_features.csv',
      predictions: '../data/raw/realtime_results.json',
    };

    // Register news update event listener
    window.addEventListener('newsUpdate', (event) => {
      this.newsCache = event.detail.news; // news-analyzer에서 전달된 최신 뉴스 캐시 사용
      this.updateNewsFeedDisplay();
      this.updateLlmAnalysisSummary();
    });
  }

  init() {
    console.log(
      '[DASHBOARD EXTENSIONS DEBUG] DashboardExtensions init() started'
    );
    console.log(
      '[DASHBOARD EXTENSIONS DEBUG] Instance created successfully:',
      this
    );
    console.log(
      '[DASHBOARD EXTENSIONS DEBUG] Dashboard reference:',
      this.dashboard
    );

    // Initialize news data loading and display
    this.loadNewsData().then(() => {
      console.log('News data loaded');
      this.updateNewsFeedDisplay();
      // this.updateLlmAnalysisSummary(); // Handled by newsUpdate event on initial load
      this.setupNewsScrolling();
    });

    // Load and display XAI explanation data
    this.loadXAIData()
      .then(() => {
        console.log('XAI data loaded, starting chart rendering');
        this.updateAllXAICharts(); // Call updateXAICharts instead of updateXAIExplanation

        // Render new ML and LLM visualizations
        this.renderMLPerformanceVisualizations();
        this.renderLLMAnalysisVisualizations();
        this.renderAdvancedInterpretabilityVisualizations();
        this.renderRealtimeMonitoringVisualizations();
      })
      .catch((error) => {
        console.error('Error loading XAI data:', error);
      });

    // Register event listener for dataset selection dropdown.
    const datasetSelector = document.getElementById('dataset-selector');
    if (datasetSelector) {
      datasetSelector.addEventListener('change', (event) => {
        // Load and display the selected dataset in the table.
        this.loadAndDisplayDataset(event.target.value);
      });
      // Load the initially selected dataset on page load.
      this.loadAndDisplayDataset(datasetSelector.value);
    }
    this.setupPredictionChart();
  }

  /**
   * Initializes the prediction chart on the 'Real-time Predictions' page.
   */
  setupPredictionChart() {
    const ctx = document.getElementById('prediction-chart')?.getContext('2d');
    if (!ctx) return;

    if (this.dashboard.charts.prediction) {
      this.dashboard.charts.prediction.destroy();
    }
    this.dashboard.charts.prediction = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Actual Price',
            data: [],
            borderColor: '#6c757d',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Predicted Price',
            data: [],
            borderColor: '#007bff',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { title: { display: true, text: 'Time' } },
          y: { title: { display: true, text: 'Price (USD)' } },
        },
      },
    });

    // Initial chart rendering
    this.updatePredictionChart('AAPL');

    // Add stock selection event listener
    this.setupStockSelector();
  }

  /**
   * Sets up the stock selector event listener
   */
  setupStockSelector() {
    const stockSelector = document.getElementById('prediction-stock-selector');
    if (stockSelector) {
      stockSelector.addEventListener('change', (event) => {
        const selectedStock = event.target.value;
        this.updatePredictionChart(selectedStock);
        this.updateChartDescription(selectedStock);
      });
    }
  }

  /**
   * Updates the chart description
   */
  updateChartDescription(stockSymbol) {
    const description = document.getElementById('prediction-chart-description');
    const stockSelector = document.getElementById('prediction-stock-selector');

    if (description && stockSelector) {
      const selectedOption = stockSelector.querySelector(
        `option[value="${stockSymbol}"]`
      );
      const companyName = selectedOption
        ? selectedOption.textContent
        : stockSymbol;

      description.textContent =
        `Currently displaying real-time price prediction chart for ${companyName}. ` +
        `The blue solid line represents the actual price, and the red dashed line represents the AI model's predicted price.`;
    }
  }

  /**
   * Updates the prediction chart for a specific stock.
   * @param {string} stockSymbol - The symbol of the stock to update
   */
  updatePredictionChart(stockSymbol) {
    const chart = this.dashboard.charts.prediction;
    if (!chart) return;

    // Mock time series data generation
    const labels = Array.from({ length: 30 }, (_, i) => `T-${29 - i}`);
    const actualPriceData = [];
    const predictedPriceData = [];
    let currentPrice = Math.random() * 200 + 100;

    for (let i = 0; i < 30; i++) {
      actualPriceData.push(currentPrice);
      if (i >= 25) {
        // 마지막 5개 포인트에 대한 예측
        predictedPriceData.push(
          currentPrice * (1 + (Math.random() - 0.45) * 0.05)
        );
      } else {
        predictedPriceData.push(null); // 이전 데이터는 null
      }
      currentPrice *= 1 + (Math.random() - 0.5) * 0.03;
    }

    chart.data.labels = labels;
    chart.data.datasets[0].data = actualPriceData;
    chart.data.datasets[0].label = `${stockSymbol} Actual Price`;
    chart.data.datasets[1].data = predictedPriceData;
    chart.data.datasets[1].label = `${stockSymbol} Predicted Price`;
    chart.update();
  }

  /**
   * Initializes the XAI analysis page and renders global analysis charts.
   */
  initXaiPage() {
    this.renderGlobalXaiCharts();
  }

  /**
   * Renders charts for global model analysis (feature importance, SHAP summary plot, etc.).
   * In a real application, XAI data calculated from the backend should be fetched.
   * Here, mock data is generated for visualization using Chart.js.
   */
  renderGlobalXaiCharts() {
    // 1. Feature Importance Chart
    const fiCtx = document
      .getElementById('feature-importance-chart')
      .getContext('2d');
    if (fiCtx) {
      if (this.fiChart) {
        this.fiChart.destroy();
      }
      this.fiChart = new Chart(fiCtx, {
        type: 'bar',
        data: {
          labels: [
            '5-day Volume Change',
            'News Sentiment Score',
            '20-day Moving Average',
            'RSI',
            'Nasdaq Correlation',
            'Oil Price Volatility',
          ],
          datasets: [
            {
              label: 'Feature Importance',
              data: [0.35, 0.28, 0.15, 0.12, 0.08, 0.02],
              backgroundColor: 'rgba(102, 126, 234, 0.7)',
              borderColor: 'rgba(102, 126, 234, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { title: { display: true, text: 'Importance' } } },
        },
      });
    }

    // 2. SHAP Summary Plot - Simplified with Chart.js
    const shapCtx = document
      .getElementById('shap-summary-plot')
      .getContext('2d');
    if (shapCtx) {
      if (this.shapChart) {
        this.shapChart.destroy();
      }
      this.shapChart = new Chart(shapCtx, {
        type: 'bubble',
        data: {
          datasets: [
            {
              label: 'High Feature Value (Positive Contribution)',
              data: [
                { x: 0.2, y: 5, r: 15 },
                { x: 0.15, y: 4, r: 10 },
              ],
              backgroundColor: 'rgba(102, 126, 234, 0.7)',
            },
            {
              label: 'Low Feature Value (Positive Contribution)',
              data: [{ x: 0.1, y: 3, r: 5 }],
              backgroundColor: 'rgba(102, 126, 234, 0.4)',
            },
            {
              label: 'High Feature Value (Negative Contribution)',
              data: [{ x: -0.18, y: 2, r: 12 }],
              backgroundColor: 'rgba(118, 75, 162, 0.7)',
            },
            {
              label: 'Low Feature Value (Negative Contribution)',
              data: [{ x: -0.12, y: 1, r: 8 }],
              backgroundColor: 'rgba(118, 75, 162, 0.4)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            x: {
              title: {
                display: true,
                text: 'SHAP Value (Impact on Prediction)',
              },
            },
            y: { display: false },
          },
        },
      });
    }
  }

  /**
   * Dynamically generates and displays individual prediction analysis for the selected stock.
   * @param {string} stockSymbol - The symbol of the stock to analyze (e.g., 'AAPL')
   */
  renderLocalXaiAnalysis(stockSymbol) {
    console.log(
      `[XAI DEBUG] Rendering individual XAI analysis for: ${stockSymbol}`
    );
    console.log(`[XAI DEBUG] Available XAI data:`, this.xaiData);

    if (!this.xaiData) {
      console.error(
        `[XAI DEBUG] No XAI data available, cannot render analysis for ${stockSymbol}`
      );
      return;
    }

    // SHAP Force Plot using real data
    const forcePlotContainer = document.getElementById('shap-force-plot');
    if (forcePlotContainer) {
      // Use real SHAP data if available
      let baseValue = 350.0;
      let prediction = 355.2;
      let positiveFeatures = [
        { name: '5-day Volume', value: 3.2 },
        { name: 'News Sentiment', value: 2.8 },
      ];
      let negativeFeatures = [{ name: '20-day MA', value: -0.8 }];

      if (
        this.xaiData &&
        this.xaiData.explainability &&
        this.xaiData.explainability.shap_available
      ) {
        console.log(`[XAI DEBUG] Using real SHAP data for ${stockSymbol}`);
        // Extract SHAP values from real data
        const shapData =
          this.xaiData.explainability.feature_importance_methods
            ?.random_forest_builtin?.importance;
        if (shapData) {
          baseValue = Math.random() * 100 + 300; // Simulated base value
          prediction = baseValue + (Math.random() * 20 - 10);

          // Use real feature names and values
          positiveFeatures = shapData
            .slice(0, 3)
            .map((val, idx) => ({
              name: `Feature_${idx + 1}`,
              value: val * 10,
            }))
            .filter((f) => f.value > 0);

          negativeFeatures = shapData
            .slice(3, 6)
            .map((val, idx) => ({
              name: `Feature_${idx + 4}`,
              value: val * 10,
            }))
            .filter((f) => f.value < 0);
        }
      } else {
        console.warn(
          `[XAI DEBUG] Using mock SHAP data for ${stockSymbol} - real data not available`
        );
      }
      forcePlotContainer.innerHTML = `
                <h4>SHAP Force Plot (${stockSymbol})</h4>
                <div class="force-plot">
                    <div class="force-plot-base">Base Value: ${baseValue.toFixed(2)}</div>
                    <div class="force-plot-bar">
                        ${negativeFeatures.map((f) => `<div class="force-feature negative" style="flex-grow: ${Math.abs(f.value)}">${f.name}<br>(${f.value})</div>`).join('')}
                        <div class="force-prediction">${prediction.toFixed(2)}</div>
                        ${positiveFeatures.map((f) => `<div class="force-feature positive" style="flex-grow: ${Math.abs(f.value)}">${f.name}<br>(${f.value})</div>`).join('')}
                    </div>
                </div>
                <p class="xai-explanation">
                    The chart above shows how the predicted price (${prediction.toFixed(2)}) for ${stockSymbol} was determined.
                    <strong>Blue</strong> indicates factors that lower the prediction, and <strong>red</strong> indicates factors that raise the prediction.
                </p>
            `;
    }

    // LIME Explanation using real data
    const limeContainer = document.getElementById('lime-explanation');
    if (limeContainer) {
      console.log(`[XAI DEBUG] Rendering LIME explanation for ${stockSymbol}`);

      let limeExplanations = [
        {
          text: 'News: "New Product Launch"',
          contribution: 3.5,
          positive: true,
        },
        { text: '10% Increase in Volume', contribution: 1.8, positive: true },
        { text: 'RSI exceeding 75', contribution: -2.1, positive: false },
      ];

      if (
        this.xaiData &&
        this.xaiData.explainability &&
        this.xaiData.explainability.lime_available
      ) {
        console.log(`[XAI DEBUG] Using real LIME data for ${stockSymbol}`);
        // Generate dynamic LIME explanations based on real data
        const importance =
          this.xaiData.explainability.feature_importance_methods
            ?.random_forest_builtin?.importance;
        if (importance) {
          limeExplanations = importance.slice(0, 4).map((val, idx) => ({
            text: `Technical Factor ${idx + 1}`,
            contribution: (val * 100).toFixed(1),
            positive: val > 0,
          }));
        }
      } else {
        console.warn(
          `[XAI DEBUG] Using mock LIME data for ${stockSymbol} - real data not available`
        );
      }

      limeContainer.innerHTML = `
                <h4>LIME Explanation (${stockSymbol})</h4>
                <ul class="lime-explanation-list">
                    ${limeExplanations
                      .map(
                        (exp) =>
                          `<li class="${exp.positive ? 'positive' : 'negative'}">
                            <strong>${exp.text}</strong> contributed <strong>${exp.positive ? '+' : ''}${exp.contribution}%</strong> to the prediction
                        </li>`
                      )
                      .join('')}
                </ul>
                <p class="xai-explanation">
                    LIME shows the top factors that had the greatest impact on the prediction for ${stockSymbol}.
                    Green items increase the prediction, red items decrease it.
                </p>
            `;
    }

    // Counterfactual/What-if Analysis (simulated with HTML)
    const counterfactualContainer = document.getElementById(
      'counterfactual-what-if'
    );
    if (counterfactualContainer) {
      counterfactualContainer.innerHTML = `
                <h4>Counterfactual/What-if Analysis (${stockSymbol})</h4>
                <div class="counterfactual-item">
                    <p><strong>If</strong> 'News Sentiment Score' was <strong>-0.5</strong>,</p>
                    <p><strong>Then</strong> the prediction would have been <strong>'down'</strong> instead of 'up'.</p>
                </div>
                <p class="xai-explanation">
                    This analysis shows what conditions need to be met to change the prediction result.
                </p>
            `;
    }
    // Initialize S&P 500 pagination
    this.initializePagination();
  }

  async loadXAIData() {
    try {
      console.log(
        '[XAI DEBUG] Attempting to load XAI data from monitoring_dashboard.json...'
      );
      const response = await fetch('../data/raw/monitoring_dashboard.json');
      console.log(
        '[XAI DEBUG] Fetch response status:',
        response.status,
        response.statusText
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('[XAI DEBUG] Raw data loaded:', data);

      // XAI 데이터 유효성 검사 및 안전한 할당
      if (data && data.explainability) {
        this.xaiData = data;
        console.log(
          '[XAI DEBUG] XAI data loaded successfully with explainability section'
        );
        console.log(
          '[XAI DEBUG] Available explainability features:',
          Object.keys(data.explainability)
        );

        // Update charts if XAI data is successfully loaded
        console.log('[XAI DEBUG] Starting chart update with actual XAI data');
        this.updateAllXAICharts();
      } else {
        console.warn(
          '[XAI DEBUG] XAI data is not in the correct format. Missing explainability section. Using mock data.'
        );
        console.log(
          '[XAI DEBUG] Available data keys:',
          data ? Object.keys(data) : 'No data'
        );
        this.xaiData = this.generateMockXAIData();
        console.log(
          '[XAI DEBUG] XAI data (mock) generated and assigned.',
          this.xaiData
        );
        this.updateAllXAICharts();
      }
    } catch (error) {
      console.error('[XAI DEBUG] XAI data load failed:', error);
      console.error('[XAI DEBUG] Error details:', error.message, error.stack);
      console.log('[XAI DEBUG] Falling back to mock XAI data.');
      this.xaiData = this.generateMockXAIData();
      console.log(
        '[XAI DEBUG] XAI data (mock) generated and assigned after error.',
        this.xaiData
      );
      this.updateAllXAICharts();
    }
  }

  updateXAICharts() {
    console.log('[XAI DEBUG] XAI chart update started');
    console.log('[XAI DEBUG] XAI data available:', !!this.xaiData);
    console.log(
      '[XAI DEBUG] Explainability section available:',
      !!this.xaiData?.explainability
    );

    if (!this.xaiData) {
      console.error('[XAI DEBUG] No XAI data available for chart rendering');
      return;
    }

    // Update XAI related charts with detailed logging
    console.log('[XAI DEBUG] Rendering Feature Importance...');
    this.renderFeatureImportance();

    console.log('[XAI DEBUG] Rendering SHAP Summary Plot...');
    this.renderSHAPSummaryPlot();

    console.log('[XAI DEBUG] Rendering SHAP Dependence Plot...');
    this.renderSHAPDependencePlot();

    console.log('[XAI DEBUG] Rendering SHAP Force Plot...');
    this.renderSHAPForcePlot();

    console.log('[XAI DEBUG] Rendering LIME Explanation...');
    this.renderLIMEExplanation();

    console.log('[XAI DEBUG] Rendering Confusion Matrix...');
    this.renderConfusionMatrix();

    console.log('[XAI DEBUG] Rendering Partial Dependence Plot...');
    this.renderPartialDependencePlot();

    console.log('[XAI DEBUG] Rendering Counterfactual What-if Analysis...');
    this.renderCounterfactualWhatIf();

    console.log('[XAI DEBUG] XAI chart update completed');
  }

  generateMockXAIData() {
    // Mock XAI data to use when real data is unavailable
    console.log('Generating mock XAI data');
    return {
      explainability: {
        feature_importance_methods: {
          random_forest_builtin: {
            features: [
              'volatility',
              'volume',
              'price_change',
              'rsi',
              'macd',
              'sma_20',
              'sma_50',
              'news_sentiment',
              'bb_upper',
              'bb_lower',
            ],
            importance: [
              0.25, 0.18, 0.15, 0.12, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01,
            ],
          },
          gradient_boosting_builtin: {
            features: [
              'volatility',
              'volume',
              'price_change',
              'rsi',
              'macd',
              'sma_20',
              'sma_50',
              'news_sentiment',
              'bb_upper',
              'bb_lower',
            ],
            importance: [
              0.22, 0.2, 0.16, 0.13, 0.11, 0.07, 0.05, 0.03, 0.02, 0.01,
            ],
          },
        },
        shap_explanations: {
          random_forest_shap: {
            feature_names: [
              'volatility',
              'volume',
              'price_change',
              'rsi',
              'macd',
            ],
            shap_values: [[0.15, -0.08, 0.12, -0.05, 0.09]],
            base_value: 0.5,
          },
        },
        lime_explanations: [
          {
            explanation: [
              ['news_sentiment', 0.05],
              ['price_change', 0.03],
              ['volume', -0.02],
            ],
            prediction_proba: [0.2, 0.8],
          },
        ],
        partial_dependence_plots: {
          price_change: { x: [0, 0.01, 0.02, 0.03], y: [0.1, 0.3, 0.7, 0.9] },
          news_sentiment: {
            x: [-1, -0.5, 0, 0.5, 1],
            y: [0.2, 0.3, 0.5, 0.7, 0.8],
          },
        },
        counterfactual_what_if: [
          {
            condition: 'news_sentiment was positive',
            result: 'prediction would be UP',
          },
          {
            condition: 'volume was 20% higher',
            result: 'prediction would be DOWN',
          },
        ],
        prediction_data: {
          sample_predictions: [
            { prediction: 0.75, actual: 1, confidence: 0.85 },
            { prediction: 0.32, actual: 0, confidence: 0.78 },
            { prediction: 0.88, actual: 1, confidence: 0.92 },
          ],
        },
      },
      model_performance: {
        confusion_matrix: {
          matrix: [
            [180, 20],
            [15, 85],
          ],
          labels: ['Down', 'Up'],
        },
        confidence_metrics: {
          random_forest: {
            mean_confidence: 0.82,
            std_confidence: 0.12,
          },
          gradient_boosting: {
            mean_confidence: 0.89,
            std_confidence: 0.08,
          },
        },
      },
    };
  }

  updateAllXAICharts() {
    const xaiPage = document.getElementById('page-xai');
    if (!xaiPage) {
      console.warn('XAI page container not found.');
      return;
    }

    console.log('XAI 데이터 확인:', this.xaiData ? 'Available' : 'Missing');
    console.log('XAI 데이터 내용:', this.xaiData);

    // Render each XAI component
    console.log(
      'Rendering Feature Importance. Data available:',
      !!this.xaiData?.explainability?.feature_importance_methods
    );
    this.renderFeatureImportance();

    console.log(
      'Rendering SHAP Summary Plot. Data available:',
      !!this.xaiData?.explainability?.shap_explanations
    );
    this.renderSHAPSummaryPlot();

    console.log(
      'Rendering SHAP Dependence Plot. Data available:',
      !!this.xaiData?.explainability?.shap_explanations
    );
    this.renderSHAPDependencePlot();

    console.log(
      'Rendering SHAP Force Plot. Data available:',
      !!this.xaiData?.explainability?.shap_explanations
    );
    this.renderSHAPForcePlot();

    console.log(
      'Rendering LIME Explanation. Data available:',
      !!this.xaiData?.explainability?.lime_explanations
    );
    this.renderLIMEExplanation();

    console.log(
      'Rendering Confusion Matrix. Data available:',
      !!this.xaiData?.model_performance?.confusion_matrix
    );
    this.renderConfusionMatrix();

    console.log(
      'Rendering Partial Dependence Plot. Data available:',
      !!this.xaiData?.explainability?.partial_dependence_plots
    );
    this.renderPartialDependencePlot();

    console.log(
      'Rendering Counterfactual What-if. Data available:',
      !!this.xaiData?.explainability?.counterfactual_what_if
    );
    this.renderCounterfactualWhatIf();
    console.log('All XAI components rendered');
  }

  renderFeatureImportance() {
    console.log('[XAI DEBUG] Rendering: Feature Importance');
    const container = document.getElementById('feature-importance-chart');
    if (!container) {
      console.error(
        '[XAI DEBUG] Could not find feature-importance-chart container.'
      );
      return;
    }

    console.log('[XAI DEBUG] XAI data structure:', this.xaiData);
    const importanceMethods =
      this.xaiData?.explainability?.feature_importance_methods;
    console.log('[XAI DEBUG] Feature importance methods:', importanceMethods);

    if (!importanceMethods) {
      console.warn(
        '[XAI DEBUG] Feature importance data not found, showing error message'
      );
      container.innerHTML =
        '<div class="xai-error"><p>Feature importance data not found. Check console for debugging info.</p></div>';
      return;
    }

    const rfBuiltin = importanceMethods.random_forest_builtin;
    console.log('[XAI DEBUG] Random forest builtin data:', rfBuiltin);

    if (
      rfBuiltin &&
      Array.isArray(rfBuiltin.importance) &&
      rfBuiltin.importance.length > 0
    ) {
      console.log('[XAI DEBUG] Rendering feature importance with real data');
      let html = '<h4>Feature Importance (Random Forest)</h4>';
      html += '<div class="feature-importance-bars">';

      // Handle case where we only have importance values without feature names
      let sortedFeatures;
      if (rfBuiltin.features && Array.isArray(rfBuiltin.features)) {
        sortedFeatures = rfBuiltin.features
          .map((name, index) => ({
            name,
            importance: rfBuiltin.importance[index],
          }))
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 8);
      } else {
        // Generate generic feature names when only importance values are available
        sortedFeatures = rfBuiltin.importance
          .map((importance, index) => ({
            name: `Feature_${index + 1}`,
            importance,
          }))
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 8);
      }

      const maxImportance = Math.max(
        ...sortedFeatures.map((f) => f.importance)
      );

      sortedFeatures.forEach((feature, _index) => {
        const percentage = (feature.importance / maxImportance) * 100;
        const featureDisplayName = this.getFeatureDisplayName(feature.name);

        html += `
                    <div class="shap-feature-bar">
                        <div class="feature-info">
                            <div class="feature-name">${featureDisplayName}</div>
                            <div class="feature-desc">${this.getFeatureDescription(feature.name)}</div>
                        </div>
                        <div class="bar-container">
                            <div class="bar" style="width: ${percentage}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                        </div>
                        <div class="feature-value">${(feature.importance * 100).toFixed(2)}%</div>
                    </div>
                `;
      });
      html += '</div>';
      container.innerHTML = html;
      console.log('Feature importance rendering complete');
    } else {
      console.warn(
        '[XAI DEBUG] Feature importance data format is incorrect, showing mock data'
      );
      // Show meaningful mock data instead of error
      const mockFeatures = [
        { name: 'Trading Volume', importance: 0.23 },
        { name: 'News Sentiment', importance: 0.19 },
        { name: 'Price Momentum', importance: 0.16 },
        { name: 'Market Volatility', importance: 0.14 },
        { name: 'RSI Indicator', importance: 0.12 },
        { name: 'Moving Average', importance: 0.1 },
        { name: 'Bollinger Bands', importance: 0.06 },
      ];

      let html = '<h4>Feature Importance (Mock Data)</h4>';
      html += '<div class="feature-importance-bars">';

      mockFeatures.forEach((feature, index) => {
        const percentage = (feature.importance / 0.23) * 100; // Normalize to max
        html += `
                    <div class="shap-feature-bar">
                        <div class="feature-info">
                            <div class="feature-name">${feature.name}</div>
                            <div class="feature-desc">Stock prediction factor</div>
                        </div>
                        <div class="bar-container">
                            <div class="bar" style="width: ${percentage}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                        </div>
                        <div class="feature-value">${(feature.importance * 100).toFixed(1)}%</div>
                    </div>
                `;
      });

      html += '</div>';
      html +=
        '<p class="xai-note"><em>Note: Displaying mock data as real feature importance data is not available.</em></p>';
      container.innerHTML = html;
    }
  }

  renderSHAPSummaryPlot() {
    console.log('[XAI DEBUG] Rendering: SHAP Summary Plot');
    const container = document.getElementById('shap-summary-plot');
    if (!container) {
      console.error('[XAI DEBUG] Could not find shap-summary-plot container.');
      return;
    }

    const shapExplanations = this.xaiData?.explainability?.shap_explanations;
    console.log('[XAI DEBUG] SHAP explanations:', shapExplanations);

    if (!shapExplanations || !shapExplanations.random_forest_shap) {
      console.warn(
        '[XAI DEBUG] SHAP Summary Plot data not found, showing mock visualization'
      );
      this.renderMockSHAPSummary(container);
      return;
    }

    const rfShap = shapExplanations.random_forest_shap;
    let html = '<h4>SHAP Impact Analysis</h4>';
    html += '<div class="shap-summary-container">';

    if (
      rfShap.feature_names &&
      rfShap.shap_values &&
      rfShap.shap_values.length > 0
    ) {
      const values = Array.isArray(rfShap.shap_values[0])
        ? rfShap.shap_values[0]
        : rfShap.shap_values; // Use first prediction

      rfShap.feature_names.forEach((featureName, _index) => {
        const shapValue = values[_index] || 0;
        const absValue = Math.abs(shapValue);
        const isPositive = shapValue > 0;
        const barColor = isPositive ? '#28a745' : '#dc3545';
        const displayName = this.getFeatureDisplayName(featureName);

        html += `
                    <div class="shap-feature-item">
                        <div class="shap-feature-info">
                            <div class="feature-name">${displayName}</div>
                            <div class="shap-value ${isPositive ? 'positive' : 'negative'}">
                                ${isPositive ? '+' : ''}${shapValue.toFixed(3)}
                            </div>
                        </div>
                        <div class="shap-bar-container">
                            <div class="shap-bar" style="width: ${absValue * 200}px; background: ${barColor};"></div>
                        </div>
                    </div>
                `;
      });
    } else {
      html += '<p>No SHAP value data.</p>';
    }

    html += '</div>';
    html +=
      '<div class="shap-legend"><span class="positive">▌ Positive Impact</span><span class="negative">▌ Negative Impact</span></div>';
    container.innerHTML = html;
    console.log('[XAI DEBUG] SHAP Summary Plot rendering complete');

    // Use Random Forest built-in feature importance
    const rfBuiltin =
      this.xaiData.explainability.feature_importance_methods
        .random_forest_builtin;
    if (rfBuiltin && rfBuiltin.importance && rfBuiltin.features) {
      const sortedFeatures = rfBuiltin.features
        .map((name, index) => ({
          name,
          value: rfBuiltin.importance[index],
          description: this.getFeatureDescription(name),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Display only top 10

      let html = '<h4>SHAP Summary Plot (Feature Importance)</h4>';
      html += '<div class="shap-chart">';

      sortedFeatures.forEach((feature, _index) => {
        const percentage = (feature.value * 100).toFixed(1);
        const barWidth = Math.max(
          ((feature.value / sortedFeatures[0].value) * 100).toFixed(1),
          1
        );
        html += `
                    <div class="shap-feature-bar">
                        <div class="feature-info">
                            <div class="feature-name">${feature.name}</div>
                            <div class="feature-desc">${feature.description}</div>
                        </div>
                        <div class="bar-container">
                            <div class="bar" style="width: ${barWidth}%; background: linear-gradient(90deg, #ff6b6b, #4ecdc4)"></div>
                        </div>
                        <div class="feature-value">${percentage}%</div>
                    </div>
                `;
      });

      html += '</div>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p>Could not load SHAP Summary Plot data.</p>';
    }
  }

  // Feature variable description function
  getFeatureDescription(featureName) {
    const descriptions = {
      Open: 'Opening Price - Stock price at the start of trading',
      High: 'High Price - Highest trading price of the day',
      Low: 'Low Price - Lowest trading price of the day',
      Close: 'Closing Price - Stock price at the end of trading',
      Volume: 'Trading Volume - Total number of shares traded today',
      sma_20:
        '20-day Simple Moving Average - Average price over the last 20 days',
      sma_50:
        '50-day Simple Moving Average - Average price over the last 50 days',
      rsi: 'RSI - Relative Strength Index, an indicator for overbought/oversold conditions',
      macd: 'MACD - Moving Average Convergence Divergence, detects trend changes',
      bb_upper: 'Bollinger Band Upper - Upper limit based on price volatility',
      bb_lower: 'Bollinger Band Lower - Lower limit based on price volatility',
      atr: 'ATR - Average True Range, a volatility measurement indicator',
      volatility: 'Volatility - Degree of stock price fluctuation',
      obv: 'OBV - On-Balance Volume, a volume-based momentum indicator',
      price_change:
        'Price Change - Percentage change in price from the previous day',
      volume_change:
        'Volume Change - Percentage change in volume from the previous day',
      unusual_volume:
        'Unusual Volume - Whether trading volume is higher than average',
      price_spike: 'Price Spike - Whether there was a sharp increase in price',
      news_sentiment:
        'News Sentiment - Degree of positive/negative sentiment in related news',
      news_polarity: 'News Polarity - Intensity of news sentiment',
      news_count: 'News Count - Number of related news articles',
    };
    return descriptions[featureName] || 'No information available.';
  }

  renderLIMEExplanation() {
    console.log('Rendering: LIME Explanation');
    const container = document.getElementById('lime-explanation');
    if (!container) return;

    const limeExplanations = this.xaiData?.explainability?.lime_explanations;
    if (!limeExplanations || limeExplanations.length === 0) {
      container.innerHTML =
        '<div class="xai-error"><p>LIME explanation data not found.</p></div>';
      return;
    }

    // Display only the first LIME explanation
    const firstLimeExplanation = limeExplanations[0];
    if (firstLimeExplanation && firstLimeExplanation.explanation) {
      let html = '<h4>LIME Explanation (First Sample)</h4>';
      html +=
        '<p>Prediction Probability: ' +
        (firstLimeExplanation.prediction_proba[1] || 0).toFixed(4) +
        '</p>';
      html += '<ul class="feature-importance-list">';

      firstLimeExplanation.explanation.forEach((exp) => {
        const feature = this.getFeatureDisplayName(exp[0]);
        const value = exp[1];
        const sign = value >= 0 ? 'Positive' : 'Negative';
        const color = value >= 0 ? 'green' : 'red';
        html += `
                    <li>
                        <span class="feature-name">${feature}</span>
                        <span class="feature-value" style="color: ${color};">${sign}: ${value.toFixed(4)}</span>
                    </li>
                `;
      });
      html += '</ul>';
      container.innerHTML = html;
    } else {
      container.innerHTML =
        '<div class="xai-error"><p>LIME explanation data not found.</p></div>';
    }
  }

  renderConfusionMatrix() {
    console.log('Rendering: Confusion Matrix');
    const container = document.getElementById('confusion-matrix');
    if (!container) {
      console.warn('Could not find confusion-matrix container.');
      return;
    }

    const confusionMatrixData =
      this.xaiData?.model_performance?.confusion_matrix;
    if (
      !confusionMatrixData ||
      !confusionMatrixData.matrix ||
      !confusionMatrixData.labels
    ) {
      container.innerHTML =
        '<div class="xai-error"><p>Confusion Matrix data not found.</p></div>';
      return;
    }

    const confusionMatrix = confusionMatrixData.matrix;
    const labels = confusionMatrixData.labels;

    let html = '<h4>Confusion Matrix</h4>';
    html += '<div class="confusion-matrix-container">';
    html += '<div class="confusion-matrix-grid">';

    // Header
    html += '<div class="matrix-cell header"></div>';
    html += `<div class="matrix-cell header">Predicted: ${labels[0]}</div>`;
    html += `<div class="matrix-cell header">Predicted: ${labels[1]}</div>`;

    // First row
    html += `<div class="matrix-cell header">Actual: ${labels[0]}</div>`;
    html += `<div class="matrix-cell tn">${confusionMatrix[0][0]}</div>`;
    html += `<div class="matrix-cell fp">${confusionMatrix[0][1]}</div>`;

    // Second row
    html += `<div class="matrix-cell header">Actual: ${labels[1]}</div>`;
    html += `<div class="matrix-cell fn">${confusionMatrix[1][0]}</div>`;
    html += `<div class="matrix-cell tp">${confusionMatrix[1][1]}</div>`;

    html += '</div>';

    // Calculate performance metrics
    const tp = confusionMatrix[1][1];
    const tn = confusionMatrix[0][0];
    const fp = confusionMatrix[0][1];
    const fn = confusionMatrix[1][0];

    const accuracy = (((tp + tn) / (tp + tn + fp + fn)) * 100).toFixed(1);
    const precision = ((tp / (tp + fp)) * 100).toFixed(1);
    const recall = ((tp / (tp + fn)) * 100).toFixed(1);
    const f1Score = (
      ((2 * ((precision * recall) / 100)) / (precision / 100 + recall / 100)) *
      100
    ).toFixed(1);

    html += '<div class="matrix-metrics">';
    html += `<div class="metric"><strong>Accuracy:</strong> ${accuracy}%</div>`;
    html += `<div class="metric"><strong>Precision:</strong> ${precision}%</div>`;
    html += `<div class="metric"><strong>Recall:</strong> ${recall}%</div>`;
    html += `<div class="metric"><strong>F1-Score:</strong> ${f1Score}%</div>`;
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
    console.log('Confusion Matrix rendering complete');
  }

  renderPartialDependencePlot() {
    console.log('Rendering: Partial Dependence Plot');
    const container = document.getElementById('partial-dependence-plot');
    if (!container) {
      console.warn('Could not find partial-dependence-plot container.');
      return;
    }

    const pdpData = this.xaiData?.explainability?.partial_dependence_plots;
    if (!pdpData) {
      container.innerHTML =
        '<div class="xai-error"><p>Partial Dependence Plot data not found.</p></div>';
      return;
    }

    let html = '<h4>Partial Dependence Plot</h4>';
    html += '<div class="partial-dependence-container">';
    html +=
      '<p>Shows how model predictions change with feature value changes:</p>';

    for (const featureName in pdpData) {
      const data = pdpData[featureName];
      const displayName = this.getFeatureDisplayName(featureName);

      // Add simple text explanation or chart rendering logic
      html += `
                <div class="dependence-item">
                    <strong>${displayName}</strong>: 
                    When the value of this feature changes from ${data.x[0]} to ${data.x[data.x.length - 1]}, 
                    the model prediction changes by an average of ${((data.y[data.y.length - 1] - data.y[0]) * 100).toFixed(2)}%.
                </div>
            `;
    }

    html += '</div>';
    container.innerHTML = html;
    console.log('Partial Dependence Plot rendering complete');
  }

  renderCounterfactualWhatIf() {
    console.log('Rendering: What-if Analysis');
    const container = document.getElementById('counterfactual-what-if');
    if (!container) {
      console.warn('Could not find counterfactual-what-if container.');
      return;
    }

    const whatIfData = this.xaiData?.explainability?.counterfactual_what_if;
    if (!whatIfData || whatIfData.length === 0) {
      container.innerHTML =
        '<div class="xai-error"><p>Counterfactual/What-if Analysis data not found.</p></div>';
      return;
    }

    let html = '<h4>Counterfactual/What-if Analysis</h4>';
    html += '<div class="whatif-container">';
    html += '<p>Conditions to change prediction:</p>';

    whatIfData.forEach((scenario) => {
      html += `
                <div class="whatif-item">
                    <div class="whatif-condition"><strong>If</strong> ${scenario.condition}</div>
                    <div class="whatif-result"><strong>Then</strong> ${scenario.result}</div>
                </div>
            `;
    });

    html += '</div>';
    container.innerHTML = html;
    console.log('What-if Analysis rendering complete');
  }

  // S&P 500 Pagination System
  initializePagination() {
    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.sp500Data = [];
    this.filteredData = [];
    this.totalPages = 0;

    this.loadSP500Data().then(() => {
      this.setupPaginationControls();
      this.renderPredictionsTable();
    });
  }

  async loadSP500Data() {
    try {
      // Load S&P 500 constituent data
      const response = await fetch('../data/raw/sp500_constituents.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      const lines = csvText.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',');

      this.sp500Data = [];
      for (let i = 1; i < lines.length && i <= 500; i++) {
        const values = lines[i].split(',');
        if (values.length >= 3) {
          this.sp500Data.push({
            index: i,
            symbol: values[0]?.replace(/"/g, '') || '',
            security: values[1]?.replace(/"/g, '') || '',
            sector: values[2]?.replace(/"/g, '') || '',
            subsector: values[3]?.replace(/"/g, '') || '',
            headquarters: values[4]?.replace(/"/g, '') || '',
            // Generate mock prediction data
            currentPrice: (Math.random() * 500 + 50).toFixed(2),
            predictedPrice: (Math.random() * 500 + 50).toFixed(2),
            changePercent: ((Math.random() - 0.5) * 10).toFixed(2),
            confidence: (85 + Math.random() * 14).toFixed(1),
            lastUpdate:
              new Date().toLocaleTimeString('en-US', { hour12: false }) +
              ' KST',
            unusualVolume: Math.random() < 0.1 ? true : false, // 10% chance of unusual volume
          });
        }
      }

      this.filteredData = [...this.sp500Data];
      this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);

      console.log(`S&P 500 data loaded: ${this.sp500Data.length} items`);
    } catch (_error) {
      console.error('S&P 500 data load failed:', _error);
      this.generateMockSP500Data();
    }
  }

  generateMockSP500Data() {
    // Generate mock data if real data fails to load
    const mockSymbols = [
      'AAPL',
      'MSFT',
      'GOOGL',
      'AMZN',
      'TSLA',
      'META',
      'NVDA',
      'JPM',
      'JNJ',
      'V',
      'PG',
      'HD',
      'UNH',
      'DIS',
      'MA',
      'PYPL',
      'ADBE',
      'CRM',
      'NFLX',
      'CMCSA',
    ];

    this.sp500Data = [];
    for (let i = 0; i < 500; i++) {
      const symbol =
        mockSymbols[i % mockSymbols.length] +
        (i > 19 ? Math.floor(i / 20) : '');
      this.sp500Data.push({
        index: i + 1,
        symbol: symbol,
        security: `${symbol} Company`,
        sector: [
          'Technology',
          'Healthcare',
          'Financials',
          'Consumer',
          'Industrials',
        ][i % 5],
        subsector: 'Sample Subsector',
        headquarters: 'USA',
        currentPrice: (Math.random() * 500 + 50).toFixed(2),
        predictedPrice: (Math.random() * 500 + 50).toFixed(2),
        changePercent: ((Math.random() - 0.5) * 10).toFixed(2),
        confidence: (85 + Math.random() * 14).toFixed(1),
        lastUpdate: new Date().toLocaleTimeString('en-US'),
      });
    }

    this.filteredData = [...this.sp500Data];
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  setupPaginationControls() {
    // Change items per page
    const itemsPerPageSelect = document.getElementById('items-per-page');
    if (itemsPerPageSelect) {
      itemsPerPageSelect.addEventListener('change', (e) => {
        this.itemsPerPage = parseInt(e.target.value);
        this.currentPage = 1;
        this.totalPages = Math.ceil(
          this.filteredData.length / this.itemsPerPage
        );
        this.renderPredictionsTable();
        this.renderPagination();
      });
    }

    // Previous/Next buttons
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderPredictionsTable();
          this.renderPagination();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.renderPredictionsTable();
          this.renderPagination();
        }
      });
    }

    // Search function
    const searchInput = document.getElementById('symbol-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterData();
      });
    }

    // Sector filter
    const sectorFilter = document.getElementById('sector-filter');
    if (sectorFilter) {
      sectorFilter.addEventListener('change', (e) => {
        this.filterData();
      });
    }
  }

  filterData() {
    const searchTerm =
      document.getElementById('symbol-search')?.value.toUpperCase() || '';
    const sectorFilter =
      document.getElementById('sector-filter')?.value || 'all';

    this.filteredData = this.sp500Data.filter((item) => {
      const matchesSearch =
        item.symbol.toUpperCase().includes(searchTerm) ||
        item.security.toUpperCase().includes(searchTerm);
      const matchesSector =
        sectorFilter === 'all' || item.sector.includes(sectorFilter);

      return matchesSearch && matchesSector;
    });

    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.renderPredictionsTable();
    this.renderPagination();
  }

  renderPredictionsTable() {
    const tableBody = document.getElementById('predictions-table-body');
    if (!tableBody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(
      startIndex + this.itemsPerPage,
      this.filteredData.length
    );
    const currentPageData = this.filteredData.slice(startIndex, endIndex);

    let html = '';
    currentPageData.forEach((item, idx) => {
      const changeClass =
        parseFloat(item.changePercent) >= 0 ? 'positive' : 'negative';
      const changeSymbol = parseFloat(item.changePercent) >= 0 ? '+' : '';

      html += `
                <tr data-symbol="${item.symbol}" style="cursor: pointer;">
                    <td>${startIndex + idx + 1}</td>
                    <td class="symbol-cell">
                        <strong>${item.symbol}</strong>
                    </td>
                    <td class="company-name">${item.security}</td>
                    <td class="sector-cell">${item.sector}</td>
                    <td class="price-cell">${item.currentPrice}</td>
                    <td class="price-cell">${item.predictedPrice}</td>
                    <td class="change-cell ${changeClass}">
                        ${changeSymbol}${item.changePercent}%
                    </td>
                    <td class="confidence-cell">
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${item.confidence}%"></div>
                            <span class="confidence-text">${item.confidence}%</span>
                        </div>
                    </td>
                    <td class="time-cell">${item.lastUpdate}</td>
                    <td class="unusual-volume-cell">${item.unusualVolume ? '<span class="alert-badge">Unusual Volume</span>' : ''}</td>
                </tr>
            `;
    });

    tableBody.innerHTML = html;

    // 테이블 행 클릭 이벤트 리스너 추가
    tableBody.querySelectorAll('tr').forEach((row) => {
      row.addEventListener('click', () => {
        const symbol = row.dataset.symbol;
        if (symbol) {
          this.updatePredictionChart(symbol);
          // 차트가 있는 곳으로 스크롤
          document
            .getElementById('prediction-chart')
            .scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Update page info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
      const start = startIndex + 1;
      const end = endIndex;
      const total = this.filteredData.length;
      paginationInfo.textContent = `${start}-${end} of ${total} stocks`;
    }

    this.renderPagination();
  }

  renderPagination() {
    const pageNumbers = document.getElementById('page-numbers');
    if (!pageNumbers) return;

    let html = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        html += `<span class="page-ellipsis">...</span>`;
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === this.currentPage ? 'active' : '';
      html += `<button class="page-btn ${isActive}" data-page="${i}">${i}</button>`;
    }

    // 마지막 페이지
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        html += `<span class="page-ellipsis">...</span>`;
      }
      html += `<button class="page-btn" data-page="${this.totalPages}">${this.totalPages}</button>`;
    }

    pageNumbers.innerHTML = html;

    // Page number click event
    pageNumbers.querySelectorAll('.page-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.target.dataset.page);
        if (page !== this.currentPage) {
          this.currentPage = page;
          this.renderPredictionsTable();
          this.renderPagination();
        }
      });
    });

    // Update previous/next button status
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= this.totalPages;
    }
  }

  // News analysis function

  // Chart.js helper functions
  createBarChart(elementId, title, labels, data, backgroundColor, borderColor) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: title,
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: title,
          },
        },
      },
    });
  }

  createScatterChart(
    elementId,
    title,
    labels,
    data,
    backgroundColor,
    borderColor
  ) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'scatter',
      data: {
        labels: labels,
        datasets: [
          {
            label: title,
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
          },
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: title,
          },
        },
      },
    });
  }

  createHeatmap(elementId, title, labels, data) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    // Chart.js does not have a direct heatmap chart type, so consider transforming a Bar chart or using another library.
    // Here, we either create a simple text-based heatmap or use a separate library (e.g., D3.js, Plotly.js) for complex implementations.
    // For now, display as text
    let html = `<h4>${title}</h4>`;
    html += '<table class="confusion-matrix-table">';
    html += '<thead><tr><th></th>';
    html += '</tr></thead><tbody>';

    labels.forEach((rowLabel, i) => {
      html += `<tr><th>${rowLabel} (Actual)</th>`;
      labels.forEach((colLabel, j) => {
        const value = data[i][j];
        html += `<td class="matrix-cell" data-value="${value}">${value}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById(elementId).innerHTML = html;
  }

  // Update and display news feed
  async loadNewsData() {
    try {
      const response = await fetch('../data/raw/news_data.csv');
      let newsData;

      if (response.ok) {
        const csvText = await response.text();
        newsData = this.parseCSV(csvText);
      } else {
        newsData = this.generateMockNews();
      }

      this.newsCache = newsData;
      return newsData;
    } catch (_error) {
      console.error('News data load failed, using mock data:', _error);
      this.newsCache = this.generateMockNews();
      return this.newsCache;
    }
  }

  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const entry = {};
        headers.forEach((header, index) => {
          entry[header.trim()] = values[index]?.trim() || '';
        });
        data.push(entry);
      }
    }

    return data; // 모든 데이터 반환
  }

  parseJSON(jsonText) {
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('JSON parsing error:', error);
      return null;
    }
  }

  generateMockNews() {
    const mockNews = [
      {
        title: 'Fed Interest Rate Hike Decision Increases Market Volatility',
        content:
          'The Federal Reserve raised its benchmark interest rate by 0.25 percentage points, signaling its commitment to curbing inflation. This has led to mixed reactions in the stock market, with technology stocks particularly affected.',
        sentiment: 'negative',
        sentiment_score: -0.3,
        timestamp: new Date(
          Date.now() - Math.random() * 86400000
        ).toISOString(),
        source: 'Reuters',
        category: 'market',
      },
      {
        title: 'Apple Officially Announces New iPhone 15 Series',
        content:
          'Apple has unveiled its iPhone 15 series with innovative features. The adoption of a USB-C port and improved camera performance are drawing attention, and the stock price rose 3% after the announcement.',
        sentiment: 'positive',
        sentiment_score: 0.6,
        timestamp: new Date(
          Date.now() - Math.random() * 86400000
        ).toISOString(),
        source: 'Bloomberg',
        category: 'stock',
      },
      {
        title: 'Tesla Q3 Earnings Exceed Expectations',
        content:
          'Tesla announced that its Q3 revenue and net income significantly exceeded market expectations. Increased electric vehicle sales and growth in the energy storage business were key drivers.',
        sentiment: 'positive',
        sentiment_score: 0.8,
        timestamp: new Date(
          Date.now() - Math.random() * 86400000
        ).toISOString(),
        source: 'CNBC',
        category: 'stock',
      },
      {
        title: 'Microsoft Expands AI Investment, Strengthens Cloud Business',
        content:
          'Microsoft announced a significant expansion of its investment in artificial intelligence and the integration of AI capabilities into its Azure cloud services. The partnership with OpenAI is also expected to be further strengthened.',
        sentiment: 'positive',
        sentiment_score: 0.5,
        timestamp: new Date(
          Date.now() - Math.random() * 86400000
        ).toISOString(),
        source: 'TechCrunch',
        category: 'stock',
      },
      {
        title: 'Consumer Sector Declines Amid Inflation Concerns',
        content:
          "Due to persistent inflationary pressures, consumer goods companies' stock prices have uniformly declined. Rising raw material costs and increased labor costs are identified as key factors.",
        sentiment: 'negative',
        sentiment_score: -0.4,
        timestamp: new Date(
          Date.now() - Math.random() * 86400000
        ).toISOString(),
        source: 'Wall Street Journal',
        category: 'economy',
      },
    ];

    return mockNews;
  }

  // Update and display news feed
  updateNewsFeedDisplay() {
    const newsFeedContainer = document.getElementById('news-feed');
    if (!newsFeedContainer) return;

    newsFeedContainer.innerHTML = ''; // Clear existing news

    if (this.newsCache.length === 0) {
      newsFeedContainer.innerHTML =
        '<div class="news-loading">Loading news...</div>';
      return;
    }

    this.displayedNewsCount = 0; // Initialize counter

    // Display only initial news items
    this.addMoreNewsItems();

    // Update "Load More" button and related UI state
    const loadMoreButton = document.getElementById('load-more-news');
    const scrollEndMessage = document.getElementById('news-scroll-end');

    if (this.newsCache.length > this.newsPerPage) {
      if (loadMoreButton) loadMoreButton.style.display = 'inline-block';
      if (scrollEndMessage) scrollEndMessage.style.display = 'none';
    } else {
      if (loadMoreButton) loadMoreButton.style.display = 'none';
      if (scrollEndMessage) scrollEndMessage.style.display = 'block';
    }
  }

  /**
   * Set up news scrolling functionality
   */
  setupNewsScrolling() {
    const loadMoreButton = document.getElementById('load-more-news');
    const newsFeedContainer = document.getElementById('news-feed');

    // "Load More" button event
    if (loadMoreButton) {
      loadMoreButton.addEventListener('click', () => {
        this.loadMoreNews();
      });
    }

    // Auto infinite scroll (automatically load more when scrolled to bottom)
    if (newsFeedContainer) {
      newsFeedContainer.addEventListener('scroll', (e) => {
        const container = e.target;
        const threshold = 100; // Load 100px before bottom

        if (
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - threshold
        ) {
          if (
            this.displayedNewsCount < this.newsCache.length &&
            this.displayedNewsCount < this.maxNewsItems
          ) {
            this.loadMoreNews();
          }
        }
      });
    }
  }

  /**
   * Load more news
   */
  loadMoreNews() {
    const loadingIndicator = document.getElementById('news-loading-indicator');
    const loadMoreButton = document.getElementById('load-more-news');
    const scrollEndMessage = document.getElementById('news-scroll-end');

    // Loading indicator
    if (loadingIndicator) loadingIndicator.style.display = 'inline';
    if (loadMoreButton) loadMoreButton.disabled = true;

    // Simulated loading delay
    setTimeout(() => {
      this.addMoreNewsItems();

      // Hide loading indicator
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      if (loadMoreButton) loadMoreButton.disabled = false;

      // Check if all news has been loaded
      if (
        this.displayedNewsCount >= this.newsCache.length ||
        this.displayedNewsCount >= this.maxNewsItems
      ) {
        if (loadMoreButton) loadMoreButton.style.display = 'none';
        if (scrollEndMessage) scrollEndMessage.style.display = 'block';
      }
    }, 800);
  }

  /**
   * Add news items
   */
  addMoreNewsItems() {
    const newsFeedContainer = document.getElementById('news-feed');
    if (!newsFeedContainer || !this.newsCache.length) return;

    const startIndex = this.displayedNewsCount;
    const endIndex = Math.min(
      startIndex + this.newsPerPage,
      this.newsCache.length,
      this.maxNewsItems
    );

    for (let i = startIndex; i < endIndex; i++) {
      const news = this.newsCache[i];
      const newsItem = this.createNewsItem(news);
      newsFeedContainer.appendChild(newsItem);
    }

    this.displayedNewsCount = endIndex;
  }

  /**
   * Create news item HTML element
   */
  createNewsItem(news) {
    const newsItem = document.createElement('div');
    newsItem.className = 'news-item';
    newsItem.setAttribute('data-importance', news.importance || 0.5);

    const sentimentClass = `sentiment-${news.sentiment || 'neutral'}`;
    const publishedDate = news.publishedAt
      ? new Date(news.publishedAt).toLocaleString('en-US')
      : 'No Date';

    newsItem.innerHTML = `
            <div class="news-header">
                <h4 class="news-title">
                    ${
                      news.url && news.url !== 'N/A' && news.url !== ''
                        ? `<a href="${news.url}" target="_blank" rel="noopener noreferrer" class="news-link">${news.title}</a>`
                        : `<span class="news-title-text">${news.title}</span>`
                    }
                </h4>
                ${news.importance ? `<span class="importance-badge ${news.importance >= 0.8 ? 'high' : news.importance >= 0.6 ? 'medium' : ''}">Importance: ${news.importance.toFixed(2)}</span>` : ''}
            </div>
            <p class="news-summary">${news.content}</p>
            <div class="news-meta">
                <span class="news-source">Source: ${news.source || 'Unknown'}</span>
                <span class="news-date">${publishedDate}</span>
                <span class="sentiment-badge ${sentimentClass}">${news.sentiment || 'Neutral'}</span>
            </div>
            ${
              news.keywords && news.keywords.length > 0
                ? `
                <div class="news-keywords">
                    ${news.keywords.map((keyword) => `<span class="keyword-tag">${keyword}</span>`).join('')}
                </div>
            `
                : ''
            }
        `;

    return newsItem;
  }

  /**
   * Converts feature names to display names
   */
  getFeatureDisplayName(featureName) {
    const displayNames = {
      volatility: 'Volatility',
      volume: 'Volume',
      price_change: 'Price Change Rate',
      rsi: 'RSI Indicator',
      macd: 'MACD',
      sma_20: '20-day Moving Average',
      sma_50: '50-day Moving Average',
      news_sentiment: 'News Sentiment',
      bb_upper: 'Bollinger Band Upper',
      bb_lower: 'Bollinger Band Lower',
      atr: 'Average True Range',
      obv: 'On-Balance Volume',
    };
    return displayNames[featureName] || featureName;
  }

  // Existing news processing logic (kept for reference)
  _processOldNewsItems() {
    const newsFeedContainer = document.getElementById('news-feed'); // Added this line
    if (!newsFeedContainer) return; // Added this line

    this.newsCache.forEach((news) => {
      const newsItem = document.createElement('div');
      newsItem.className = 'news-item';
      newsItem.setAttribute('data-importance', news.importance || 0.5);

      const sentimentClass = `sentiment-${news.sentiment || 'neutral'}`;
      const publishedDate = news.publishedAt
        ? new Date(news.publishedAt).toLocaleString('en-US')
        : 'No Date';

      newsItem.innerHTML = `
                <div class="news-header">
                    <h4 class="news-title">
                        ${
                          news.url && news.url !== 'N/A' && news.url !== ''
                            ? `<a href="${news.url}" target="_blank" rel="noopener noreferrer" class="news-link">${news.title}</a>`
                            : `<span class="news-title-text">${news.title}</span>`
                        }
                    </h4>
                    ${news.importance ? `<span class="importance-badge ${news.importance >= 0.8 ? 'high' : news.importance >= 0.6 ? 'medium' : ''}">Importance: ${news.importance.toFixed(2)}</span>` : ''}
                </div>
                <p class="news-summary">${news.content}</p>
                <div class="news-meta">
                    <span class="news-source">Source: ${news.source || 'Unknown'}</span>
                    <span class="news-date">${publishedDate}</span>
                    <span class="sentiment-badge ${sentimentClass}">${news.sentiment || 'Neutral'}</span>
                </div>
                ${
                  news.keywords && news.keywords.length > 0
                    ? `
                    <div class="news-keywords">
                        ${news.keywords.map((keyword) => `<span class="keyword-tag">${keyword}</span>`).join('')}
                    </div>
                `
                    : ''
                }
            `;
      newsFeedContainer.appendChild(newsItem);
    });
  }

  async generateNewsSummary(newsData) {
    if (!newsData || newsData.length === 0) {
      newsData = await this.loadNewsData();
    }

    // Sentiment analysis statistics
    const sentimentStats = newsData.reduce((acc, news) => {
      const sentiment = news.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    // Category statistics
    const categoryStats = newsData.reduce((acc, news) => {
      const category = news.category || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Key trend analysis
    const positiveNews = newsData.filter(
      (news) => news.sentiment === 'positive'
    );
    const negativeNews = newsData.filter(
      (news) => news.sentiment === 'negative'
    );

    const summary = {
      totalNews: newsData.length,
      sentimentStats,
      categoryStats,
      mainTrends: [
        {
          title: 'Key Trends',
          content:
            positiveNews.length > negativeNews.length
              ? 'Overall, a positive market sentiment is forming.'
              : 'Concerns about the market are increasing.',
        },
        {
          title: 'Hot Topics',
          content: this.extractHotTopics(newsData),
        },
        {
          title: 'Market Outlook',
          content: this.generateMarketOutlook(newsData),
        },
      ],
    };

    return summary;
  }

  extractHotTopics(newsData) {
    const keywords = [
      'AI',
      'Artificial Intelligence',
      'iPhone',
      'Tesla',
      'Fed',
      'Interest Rate',
      'Inflation',
    ];
    const topicCounts = {};

    newsData.forEach((news) => {
      const text = (news.title + ' ' + news.content).toLowerCase();
      keywords.forEach((keyword) => {
        if (text.includes(keyword.toLowerCase())) {
          topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
        }
      });
    });

    const sortedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    return sortedTopics.length > 0
      ? `${sortedTopics.join(', ')} related news is being reported frequently.`
      : 'News on various topics is being reported evenly.';
  }

  generateMarketOutlook(newsData) {
    const avgSentiment =
      newsData.reduce((sum, news) => {
        return sum + (parseFloat(news.sentiment_score) || 0);
      }, 0) / newsData.length;

    if (avgSentiment > 0.2) {
      return 'A positive market trend is expected in the short term due to abundant positive news.';
    } else if (avgSentiment < -0.2) {
      return 'The market may continue to be in a correction phase due to the impact of negative news.';
    } else {
      return 'The market is expected to show volatile movements amidst mixed sentiments.';
    }
  }

  // Load and display dataset
  async loadAndDisplayDataset(datasetName) {
    const dataTable = document.getElementById('data-table');
    const dataStats = document.getElementById('data-stats');
    if (!dataTable || !dataStats) return;

    dataTable.innerHTML = '<tr><td>Loading data...</td></tr>';
    dataStats.innerHTML = '';

    const filePath = this.dataEndpoints[datasetName];
    if (!filePath) {
      dataTable.innerHTML = '<tr><td>Dataset not found.</td></tr>';
      return;
    }

    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data;
      if (filePath.endsWith('.csv')) {
        const csvText = await response.text();
        data = this.parseCSV(csvText);
      } else if (filePath.endsWith('.json')) {
        const jsonText = await response.text();
        data = this.parseJSON(jsonText);
      } else {
        throw new Error('Unsupported file format.');
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        dataTable.innerHTML = '<tr><td>No data available.</td></tr>';
        return;
      }

      this.renderDataTable(data, dataTable);
      this.renderDataStats(data, dataStats);
    } catch (error) {
      console.error(`Data load failed (${datasetName}):`, error);
      dataTable.innerHTML = `<tr><td>Data load failed: ${error.message}</td></tr>`;
      dataStats.innerHTML = '';
    }
  }

  renderDataTable(data, tableElement) {
    let headers = [];
    let rowsHtml = '';

    if (Array.isArray(data)) {
      if (data.length > 0) {
        headers = Object.keys(data[0]);
        rowsHtml = data
          .map(
            (row) =>
              `<tr>${headers.map((header) => `<td>${row[header]}</td>`).join('')}</tr>`
          )
          .join('');
      }
    } else if (typeof data === 'object' && data !== null) {
      // JSON 객체인 경우 (예: realtime_results.json)
      if (data.predictions && Array.isArray(data.predictions)) {
        headers = Object.keys(data.predictions[0]);
        rowsHtml = data.predictions
          .map(
            (row) =>
              `<tr>${headers.map((header) => `<td>${row[header]}</td>`).join('')}</tr>`
          )
          .join('');
      } else {
        // 일반 JSON 객체
        headers = Object.keys(data);
        rowsHtml = `<tr>${headers.map((header) => `<td>${data[header]}</td>`).join('')}</tr>`;
      }
    }

    tableElement.innerHTML = `
            <thead>
                <tr>
                    ${headers.map((header) => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        `;
  }

  renderDataStats(data, statsElement) {
    let statsHtml = '';
    if (Array.isArray(data)) {
      statsHtml += `<div class="stat-item"><span class="stat-label">Total Items:</span><span class="stat-value">${data.length}</span></div>`;
      // Additional statistics (e.g., average, min, max for numerical data) can be added here.
    } else if (typeof data === 'object' && data !== null) {
      statsHtml += `<div class="stat-item"><span class="stat-label">Number of Keys:</span><span class="stat-value">${Object.keys(data).length}</span></div>`;
      // Additional statistics for JSON objects
    }
    statsElement.innerHTML = statsHtml;
  }

  // Source code viewer functionality
  async loadSourceFile(filePath) {
    try {
      // Use cached file if available
      if (this.sourceFiles[filePath]) {
        return this.sourceFiles[filePath];
      }

      const response = await fetch(`../${filePath}`);
      let content;

      if (response.ok) {
        content = await response.text();
      } else {
        content = this.getMockSourceCode(filePath);
      }

      // Save to cache
      this.sourceFiles[filePath] = {
        content,
        size: content.length,
        lastModified: new Date().toISOString(),
      };

      return this.sourceFiles[filePath];
    } catch (error) {
      console.error('Source file load failed:', error);
      return {
        content: '// Could not load file.',
        size: 0,
        lastModified: new Date().toISOString(),
      };
    }
  }

  getMockSourceCode(filePath) {
    const mockCodes = {
      'dashboard/index.html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>AI Stock Prediction Dashboard</title>\n    <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n    <div class="dashboard-container">\n        <!-- Dashboard content -->\n    </div>\n</body>\n</html>`,
      'dashboard/styles.css': `/* Dashboard styles */\n.dashboard-container {\n    display: flex;\n    min-height: 100vh;\n}\n\n.sidebar {\n    width: 280px;\n    background: rgba(255, 255, 255, 0.95);\n    backdrop-filter: blur(20px);\n}`,
      'src/models/model_training.py': `# AI Model Training Script\nimport pandas as pd\nimport numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nimport joblib\n\nclass ModelTrainer:\n    def __init__(self):\n        self.models = {}\n        \n    def load_data(self, file_path):\n        """Load data"""\n        return pd.read_csv(file_path)\n        \n    def preprocess_data(self, data):\n        """Preprocess data"""\n        # Handle missing values\n        data = data.fillna(0)\n        \n        # Feature engineering\n        data['volatility'] = data['high'] - data['low']\n        data['price_change'] = data['close'] - data['open']\n        \n        return data\n        \n    def train_random_forest(self, X, y):\n        """Train Random Forest model"""\n        X_train, X_test, y_train, y_test = train_test_split(\n            X, y, test_size=0.2, random_state=42\n        )\n        \n        model = RandomForestClassifier(\n            n_estimators=100,\n            max_depth=15,\n            random_state=42\n        )\n        \n        model.fit(X_train, y_train)\n        \n        # Save model\n        joblib.dump(model, 'models/random_forest_model.pkl')\n        \n        return model, X_test, y_test`,
      'src/core/data_collection_pipeline.py': `# Data Collection Pipeline\nimport yfinance as yf\nimport pandas as pd\nfrom datetime import datetime, timedelta\nimport requests\n\nclass DataCollectionPipeline:\n    def __init__(self):\n        self.symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']\n        self.data_dir = '../data/raw/'\n        \n    def collect_stock_data(self, symbol, period='1y'):\n        """Collect stock data"""\n        try:\n            stock = yf.Ticker(symbol)\n            data = stock.history(period=period)\n            \n            # Add technical indicators\n            data['SMA_20'] = data['Close'].rolling(window=20).mean()\n            data['SMA_50'] = data['Close'].rolling(window=50).mean()\n            data['RSI'] = self.calculate_rsi(data['Close'])\n            \n            # Save file\n            data.to_csv(f"{self.data_dir}stock_{symbol}.csv")\n            \n            return data\n        except Exception as e:\n            print(f"Data collection failed {symbol}: {e}")\n            return None\n            \n    def calculate_rsi(self, prices, window=14):\n        """Calculate RSI"""\n        delta = prices.diff()\n        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()\n        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()\n        rs = gain / loss\n        rsi = 100 - (100 / (1 + rs))\n        return rsi\n        \n    def collect_news_data(self, api_key):\n        """Collect news data"""\n        url = "https://newsapi.org/v2/everything"\n        params = {\n            'q': 'stock market finance',\n            'sortBy': 'publishedAt',\n            'pageSize': 100,\n            'apiKey': api_key\n        }\n        \n        try:\n            response = requests.get(url, params=params)\n            news_data = response.json()\n            \n            # Process and save data\n            articles = []\n            for article in news_data.get('articles', []):\n                articles.push({\n                    'title': article['title'],\n                    'description': article['description'],\n                    'source': article['source']['name'],\n                    'publishedAt': article['publishedAt'],\n                    'url': article['url']\n                })\n            \n            df = pd.DataFrame(articles)\n            df.to_csv(f"{self.data_dir}news_data.csv", index=False)\n            \n            return df\n        except Exception as e:\n            print(f"뉴스 데이터 수집 실패: {e}")\n            return None`,
    };

    return (
      mockCodes[filePath] ||
      `// Contents of ${filePath}
// In a real project, the actual contents of this file would be displayed.

console.log('Hello from ${filePath}');`
    );
  }

  // 데이터 내보내기 기능
  exportData(format = 'json') {
    const data = {
      timestamp: new Date().toISOString(),
      systemStatus: this.dashboard.generateMockSystemStatus(),
      predictions: this.dashboard.generateMockPredictions(),
      news: this.newsCache.slice(0, 10),
    };

    let content, mimeType, filename;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename = `dashboard_data_${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'csv':
        content = this.convertToCSV(data.predictions);
        mimeType = 'text/csv';
        filename = `predictions_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename = `dashboard_data.json`;
    }

    this.downloadFile(content, filename, mimeType);
  }

  convertToCSV(predictions) {
    if (!predictions.predictions || predictions.predictions.length === 0) {
      return 'No data available';
    }

    const headers = ['Symbol', 'Direction', 'Change', 'Confidence'];
    const csvContent = [
      headers.join(','),
      ...predictions.predictions.map((pred) =>
        [pred.symbol, pred.direction, pred.change, pred.confidence].join(',')
      ),
    ].join('\n');

    return csvContent;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Fullscreen toggle
  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  // Refresh dashboard
  refreshDashboard() {
    this.dashboard.loadInitialData();
    this.dashboard.updateCharts();

    // Display success message
    this.showNotification('Dashboard refreshed.', 'success');
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `\n            <span class="notification-message">${message}</span>\n            <button class="notification-close" onclick="this.parentElement.remove()">×</button>\n        `;

    // 스타일 설정
    notification.style.cssText = `\n            position: fixed;\n            top: 20px;\n            right: 20px;\n            padding: 15px 20px;\n            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};\n            color: white;\n            border-radius: 8px;\n            box-shadow: 0 4px 12px rgba(0,0,0,0.3);\n            z-index: 10000;\n            display: flex;\n            align-items: center;\n            gap: 10px;\n            animation: slideInRight 0.3s ease;\n        `;

    document.body.appendChild(notification);

    // 자동 제거
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, duration);
  }

  // Copy function
  async copyCode() {
    const codeElement = document.getElementById('code-display');
    if (codeElement && codeElement.textContent) {
      try {
        await navigator.clipboard.writeText(codeElement.textContent);
        this.showNotification('Code copied to clipboard.', 'success');
      } catch (error) {
        this.showNotification('Failed to copy.', 'error');
      }
    }
  }

  // File download
  async downloadCurrentFile() {
    const fileSelector = document.getElementById('file-selector');
    const filePath = fileSelector?.value;

    if (filePath) {
      const fileData = await this.loadSourceFile(filePath);
      const filename = filePath.split('/').pop();
      this.downloadFile(fileData.content, filename, 'text/plain');
    }
  }

  // Export current data (for Data Explorer)
  exportCurrentData() {
    const datasetSelector = document.getElementById('dataset-selector');
    const selectedDataset = datasetSelector?.value || 'stock_data';

    // 현재 테이블 데이터 추출
    const dataTable = document.getElementById('data-table');
    if (dataTable) {
      const rows = Array.from(dataTable.querySelectorAll('tr'));
      const headers = Array.from(rows[0]?.querySelectorAll('th') || []).map(
        (th) => th.textContent
      );
      const data = rows
        .slice(1)
        .map((row) =>
          Array.from(row.querySelectorAll('td')).map((td) => td.textContent)
        );

      const csvContent = [
        headers.join(','),
        ...data.map((row) => row.join(',')),
      ].join('\n');

      this.downloadFile(
        csvContent,
        `${selectedDataset}_export.csv`,
        'text/csv'
      );
    }
  }

  // Save settings
  saveSettings() {
    const updateInterval = document.getElementById('update-interval')?.value;
    const theme = document.getElementById('theme-selector')?.value;
    const autoRefresh = document.getElementById('auto-refresh')?.checked;
    const desktopNotifications = document.getElementById(
      'desktop-notifications'
    )?.checked;
    const soundAlerts = document.getElementById('sound-alerts')?.checked;
    const accuracyThreshold =
      document.getElementById('accuracy-threshold')?.value;

    // Save settings to local storage
    const settings = {
      updateInterval: parseInt(updateInterval) || 5,
      theme: theme || 'light',
      autoRefresh: autoRefresh !== false,
      desktopNotifications: desktopNotifications !== false,
      soundAlerts: soundAlerts === true,
      accuracyThreshold: parseInt(accuracyThreshold) || 85,
    };

    localStorage.setItem('dashboardSettings', JSON.stringify(settings));

    // Apply settings
    this.dashboard.updateInterval = settings.updateInterval * 1000;

    // Display success message
    this.showNotification('Settings saved.', 'success');
  }

  // Reset settings
  resetSettings() {
    localStorage.removeItem('dashboardSettings');

    // Reset to default values
    document.getElementById('update-interval').value = '5';
    document.getElementById('theme-selector').value = 'light';
    document.getElementById('auto-refresh').checked = true;
    document.getElementById('desktop-notifications').checked = true;
    document.getElementById('sound-alerts').checked = false;
    document.getElementById('accuracy-threshold').value = '85';

    this.showNotification('Settings reset.', 'success');
  }

  // Render mock SHAP summary when real data is not available
  renderMockSHAPSummary(container) {
    console.log('[XAI DEBUG] Rendering mock SHAP summary');
    const mockShapData = [
      { name: 'Trading Volume', value: 0.85, impact: 'positive' },
      { name: 'News Sentiment', value: -0.72, impact: 'negative' },
      { name: 'Price Momentum', value: 0.65, impact: 'positive' },
      { name: 'Market Volatility', value: -0.58, impact: 'negative' },
      { name: 'RSI Indicator', value: 0.41, impact: 'positive' },
      { name: 'Moving Average', value: -0.35, impact: 'negative' },
      { name: 'Bollinger Bands', value: 0.28, impact: 'positive' },
    ];

    let html = '<h4>SHAP Impact Analysis (Mock Data)</h4>';
    html += '<div class="shap-summary-container">';

    mockShapData.forEach((feature) => {
      const absValue = Math.abs(feature.value);
      const percentage = (absValue / 0.85) * 100; // Normalize to max value
      const impactClass =
        feature.impact === 'positive' ? 'positive' : 'negative';

      html += `
                <div class="shap-feature-bar">
                    <div class="feature-info">
                        <div class="feature-name">${feature.name}</div>
                        <div class="feature-desc">Stock prediction factor</div>
                    </div>
                    <div class="bar-container">
                        <div class="bar ${impactClass}" style="width: ${percentage}%;"></div>
                    </div>
                    <div class="feature-value">${feature.value.toFixed(2)}</div>
                </div>
            `;
    });

    html += '</div>';
    html +=
      '<div class="shap-legend"><span class="positive">▌ Positive Impact</span><span class="negative">▌ Negative Impact</span></div>';
    html +=
      '<p class="xai-note"><em>Note: Displaying mock SHAP data as real explanations are not available.</em></p>';

    container.innerHTML = html;
  }

  // Refresh XAI Analysis Data
  refreshXAIData() {
    console.log('[XAI DEBUG] Refresh XAI Data requested');

    // Show loading message
    const containers = [
      'feature-importance-chart',
      'shap-summary-plot',
      'shap-force-plot',
      'lime-explanation',
      'partial-dependence-plot',
      'confusion-matrix',
      'counterfactual-what-if',
    ];

    containers.forEach((containerId) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML =
          '<div class="xai-loading"><p>🔄 Refreshing analysis...</p></div>';
      }
    });

    // Reload XAI data
    this.loadXAIData()
      .then(() => {
        console.log('[XAI DEBUG] XAI data refresh completed');

        // Refresh all new visualizations
        this.renderMLPerformanceVisualizations();
        this.renderLLMAnalysisVisualizations();
        this.renderAdvancedInterpretabilityVisualizations();
        this.renderRealtimeMonitoringVisualizations();

        // Trigger stock analysis refresh if there's a selected stock
        const stockSelector = document.getElementById('xai-stock-selector');
        if (stockSelector && stockSelector.value) {
          console.log(
            '[XAI DEBUG] Refreshing stock analysis for:',
            stockSelector.value
          );
          this.renderLocalXaiAnalysis(stockSelector.value);
        }

        // Show success message
        if (this.dashboard && this.dashboard.showNotification) {
          this.dashboard.showNotification(
            'XAI analysis refreshed successfully',
            'success'
          );
        }
      })
      .catch((error) => {
        console.error('[XAI DEBUG] Error refreshing XAI data:', error);

        // Show error message
        if (this.dashboard && this.dashboard.showNotification) {
          this.dashboard.showNotification(
            'Failed to refresh XAI analysis',
            'error'
          );
        }

        // Restore charts with existing data
        this.updateAllXAICharts();
      });
  }

  // LLM 분석 요약 업데이트
  updateLlmAnalysisSummary() {
    const newsSummary = window.newsAnalyzer.generateNewsSummary();

    const llmMarketSentimentElem = document.getElementById(
      'llm-market-sentiment'
    );
    const llmEventCategoryElem = document.getElementById('llm-event-category');

    if (llmMarketSentimentElem) {
      llmMarketSentimentElem.textContent =
        newsSummary.marketImpact || '분석 불가';
    }
    if (llmEventCategoryElem) {
      // 주요 이벤트 카테고리를 텍스트로 표시
      const topCategories = newsSummary.topCategories
        .map((cat) => `${cat.category} (${cat.count})`)
        .join(', ');
      llmEventCategoryElem.textContent = topCategories || '분석 불가';
    }
  }

  // === ML Performance Visualizations ===
  renderMLPerformanceVisualizations() {
    this.renderPerformanceMetricsChart();
    this.renderLearningCurvesChart();
    this.renderValidationCurvesChart();
    this.renderCorrelationHeatmap();
  }

  renderPerformanceMetricsChart() {
    const ctx = document.getElementById('performance-metrics-chart');
    if (!ctx) return;

    const performanceData = {
      labels: [
        'Random Forest',
        'Gradient Boosting',
        'LSTM',
        'Transformer',
        'Ensemble',
      ],
      datasets: [
        {
          label: 'Accuracy (%)',
          data: [87.2, 89.1, 85.6, 91.3, 92.8],
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
        },
        {
          label: 'Precision (%)',
          data: [84.5, 87.3, 83.2, 89.7, 91.2],
          backgroundColor: 'rgba(118, 75, 162, 0.8)',
          borderColor: 'rgba(118, 75, 162, 1)',
          borderWidth: 2,
        },
        {
          label: 'Recall (%)',
          data: [85.8, 88.9, 84.1, 90.5, 92.1],
          backgroundColor: 'rgba(52, 152, 219, 0.8)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 2,
        },
      ],
    };

    new Chart(ctx, {
      type: 'bar',
      data: performanceData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (value) {
                return value + '%';
              },
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Model Performance Comparison',
          },
        },
      },
    });
  }

  renderLearningCurvesChart() {
    const ctx = document.getElementById('learning-curves-chart');
    if (!ctx) return;

    const trainingData = [];
    const validationData = [];
    const epochs = [];

    for (let i = 1; i <= 50; i++) {
      epochs.push(i);
      trainingData.push(70 + 20 * (1 - Math.exp(-i / 15)) + Math.random() * 2);
      validationData.push(
        65 + 18 * (1 - Math.exp(-i / 18)) + Math.random() * 3
      );
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: epochs,
        datasets: [
          {
            label: 'Training Accuracy',
            data: trainingData,
            borderColor: 'rgba(46, 204, 113, 1)',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Validation Accuracy',
            data: validationData,
            borderColor: 'rgba(231, 76, 60, 1)',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Epochs',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Accuracy (%)',
            },
            min: 60,
            max: 95,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Training vs Validation Learning Curves',
          },
        },
      },
    });
  }

  renderValidationCurvesChart() {
    const ctx = document.getElementById('validation-curves-chart');
    if (!ctx) return;

    const hyperparameterValues = [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0];
    const trainingScores = [82.1, 85.3, 87.2, 89.1, 90.5, 89.8, 87.6, 84.2];
    const validationScores = [81.8, 84.9, 86.8, 88.3, 87.9, 85.4, 82.1, 78.9];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: hyperparameterValues,
        datasets: [
          {
            label: 'Training Score',
            data: trainingScores,
            borderColor: 'rgba(52, 152, 219, 1)',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Validation Score',
            data: validationScores,
            borderColor: 'rgba(231, 76, 60, 1)',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'logarithmic',
            title: {
              display: true,
              text: 'Learning Rate',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Accuracy Score',
            },
            min: 75,
            max: 95,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Validation Curve (Learning Rate)',
          },
        },
      },
    });
  }

  renderCorrelationHeatmap() {
    const container = document.getElementById('correlation-heatmap-chart');
    if (!container) return;

    const features = [
      'Volume',
      'Price_MA_5',
      'Price_MA_20',
      'RSI',
      'MACD',
      'News_Sentiment',
      'VIX',
    ];
    const correlationMatrix = [
      [1.0, 0.23, 0.18, -0.12, 0.34, 0.45, -0.67],
      [0.23, 1.0, 0.89, -0.34, 0.56, 0.12, -0.23],
      [0.18, 0.89, 1.0, -0.28, 0.48, 0.08, -0.19],
      [-0.12, -0.34, -0.28, 1.0, -0.45, -0.23, 0.34],
      [0.34, 0.56, 0.48, -0.45, 1.0, 0.37, -0.42],
      [0.45, 0.12, 0.08, -0.23, 0.37, 1.0, -0.56],
      [-0.67, -0.23, -0.19, 0.34, -0.42, -0.56, 1.0],
    ];

    // Create HTML table-based heatmap
    let html = '<div class="correlation-heatmap">';
    html += '<div class="heatmap-title">Feature Correlation Matrix</div>';
    html += '<table class="heatmap-table">';

    // Header row
    html += '<thead><tr><th></th>';
    features.forEach((feature) => {
      html += `<th class="feature-header">${feature}</th>`;
    });
    html += '</tr></thead>';

    // Data rows
    html += '<tbody>';
    features.forEach((rowFeature, i) => {
      html += `<tr><td class="feature-header">${rowFeature}</td>`;
      features.forEach((colFeature, j) => {
        const correlation = correlationMatrix[i][j];
        const absCorr = Math.abs(correlation);
        const intensity = absCorr;
        const isPositive = correlation > 0;

        // Color intensity based on correlation strength
        let backgroundColor;
        if (correlation === 1.0) {
          backgroundColor = '#2c3e50'; // Dark for perfect correlation
        } else if (isPositive) {
          backgroundColor = `rgba(52, 152, 219, ${intensity * 0.8 + 0.2})`; // Blue for positive
        } else {
          backgroundColor = `rgba(231, 76, 60, ${intensity * 0.8 + 0.2})`; // Red for negative
        }

        const textColor = intensity > 0.5 ? 'white' : 'black';

        html += `<td class="correlation-cell" 
                    style="background-color: ${backgroundColor}; color: ${textColor};" 
                    title="${rowFeature} vs ${colFeature}: ${correlation.toFixed(3)}">
                    ${correlation.toFixed(2)}
                </td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    // Legend
    html += '<div class="heatmap-legend">';
    html +=
      '<div class="legend-item"><span class="legend-color positive"></span> Positive Correlation</div>';
    html +=
      '<div class="legend-item"><span class="legend-color negative"></span> Negative Correlation</div>';
    html +=
      '<div class="legend-note">Color intensity represents correlation strength</div>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
  }

  // === LLM Analysis Visualizations ===
  renderLLMAnalysisVisualizations() {
    this.renderSentimentTimelineChart();
    this.renderTopicModelingChart();
    this.renderAttentionWeightsChart();
    this.renderEmbeddingSpaceChart();
  }

  renderSentimentTimelineChart() {
    const ctx = document.getElementById('sentiment-timeline-chart');
    if (!ctx) return;

    const timeLabels = [];
    const sentimentScores = [];
    const volumeWeightedSentiment = [];

    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      timeLabels.push(
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );

      const baseSentiment =
        0.1 + 0.4 * Math.sin(i * 0.2) + (Math.random() - 0.5) * 0.3;
      sentimentScores.push(baseSentiment);
      volumeWeightedSentiment.push(baseSentiment * (0.8 + Math.random() * 0.4));
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: 'News Sentiment Score',
            data: sentimentScores,
            borderColor: 'rgba(46, 204, 113, 1)',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            borderWidth: 2,
            fill: true,
          },
          {
            label: 'Volume-Weighted Sentiment',
            data: volumeWeightedSentiment,
            borderColor: 'rgba(52, 152, 219, 1)',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Sentiment Score',
            },
            min: -0.8,
            max: 0.8,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'News Sentiment Analysis Over Time',
          },
        },
      },
    });
  }

  renderTopicModelingChart() {
    const ctx = document.getElementById('topic-modeling-visualization');
    if (!ctx) return;

    const topics = [
      {
        name: 'Market Volatility',
        weight: 0.28,
        keywords: ['volatility', 'uncertainty', 'risk'],
      },
      {
        name: 'Tech Earnings',
        weight: 0.22,
        keywords: ['earnings', 'revenue', 'growth'],
      },
      {
        name: 'Fed Policy',
        weight: 0.18,
        keywords: ['federal', 'interest', 'rate'],
      },
      {
        name: 'AI/Innovation',
        weight: 0.15,
        keywords: ['artificial', 'intelligence', 'innovation'],
      },
      {
        name: 'Geopolitical',
        weight: 0.12,
        keywords: ['trade', 'geopolitical', 'sanctions'],
      },
      {
        name: 'Crypto/Blockchain',
        weight: 0.05,
        keywords: ['bitcoin', 'crypto', 'blockchain'],
      },
    ];

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: topics.map((t) => t.name),
        datasets: [
          {
            data: topics.map((t) => t.weight * 100),
            backgroundColor: [
              'rgba(231, 76, 60, 0.8)',
              'rgba(52, 152, 219, 0.8)',
              'rgba(46, 204, 113, 0.8)',
              'rgba(241, 196, 15, 0.8)',
              'rgba(155, 89, 182, 0.8)',
              'rgba(230, 126, 34, 0.8)',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Topic Distribution in News Articles',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const topic = topics[context.dataIndex];
                return `${topic.name}: ${context.parsed.toFixed(1)}% (${topic.keywords.join(', ')})`;
              },
            },
          },
        },
      },
    });
  }

  renderAttentionWeightsChart() {
    const ctx = document.getElementById('attention-weights-chart');
    if (!ctx) return;

    // Clear any existing chart
    if (this.attentionChart) {
      this.attentionChart.destroy();
    }

    const words = [
      'The',
      'stock',
      'market',
      'showed',
      'strong',
      'performance',
      'despite',
      'economic',
      'uncertainty',
    ];
    const attentionData = [0.05, 0.18, 0.22, 0.08, 0.15, 0.25, 0.12, 0.2, 0.18];

    // Create color array with varying intensities
    const backgroundColors = attentionData.map((weight) => {
      const intensity = Math.min(0.3 + weight * 3, 1); // Scale to 0.3-1 range
      return `rgba(231, 76, 60, ${intensity})`;
    });

    this.attentionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: words,
        datasets: [
          {
            label: 'Attention Weight',
            data: attentionData,
            backgroundColor: backgroundColors,
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        layout: {
          padding: {
            left: 10,
            right: 10,
            top: 10,
            bottom: 10,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Attention Weight',
              font: {
                size: 12,
                weight: 'bold',
              },
            },
            min: 0,
            max: 0.3,
            ticks: {
              font: {
                size: 11,
              },
            },
            grid: {
              color: 'rgba(0,0,0,0.1)',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Words',
              font: {
                size: 12,
                weight: 'bold',
              },
            },
            ticks: {
              font: {
                size: 11,
              },
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Attention Weights for Sample News Sentence',
            font: {
              size: 14,
              weight: 'bold',
            },
            padding: {
              bottom: 20,
            },
          },
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.label}: ${context.parsed.x.toFixed(4)}`;
              },
            },
          },
        },
      },
    });
  }

  renderEmbeddingSpaceChart() {
    const ctx = document.getElementById('embedding-tsne-chart');
    if (!ctx) return;

    const categories = ['Tech', 'Finance', 'Healthcare', 'Energy', 'Consumer'];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    const datasets = [];

    categories.forEach((category, idx) => {
      const points = [];
      for (let i = 0; i < 20; i++) {
        points.push({
          x: (Math.random() - 0.5) * 10 + (idx - 2) * 3,
          y: (Math.random() - 0.5) * 10 + Math.sin(idx) * 3,
        });
      }

      datasets.push({
        label: category,
        data: points,
        backgroundColor: colors[idx],
        borderColor: colors[idx],
        pointRadius: 4,
      });
    });

    new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 't-SNE Dimension 1',
            },
          },
          y: {
            title: {
              display: true,
              text: 't-SNE Dimension 2',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'News Article Embeddings (t-SNE Visualization)',
          },
        },
      },
    });
  }

  // === Advanced Interpretability Visualizations ===
  renderAdvancedInterpretabilityVisualizations() {
    this.renderDecisionTreeVisualization();
    this.renderGradientAttributionChart();
    this.renderLayerWiseRelevanceChart();
    this.renderIntegratedGradientsChart();
  }

  renderDecisionTreeVisualization() {
    const container = document.getElementById('decision-tree-container');
    if (!container) return;

    const treeData = {
      name: 'Volume > 1.5M?',
      value: 'Root',
      children: [
        {
          name: 'Yes: RSI > 70?',
          value: 'High Volume',
          children: [
            { name: 'Yes: SELL', value: '85% confidence', color: '#e74c3c' },
            {
              name: 'No: News Sentiment > 0.2?',
              value: 'Normal RSI',
              children: [
                { name: 'Yes: BUY', value: '78% confidence', color: '#2ecc71' },
                { name: 'No: HOLD', value: '65% confidence', color: '#f39c12' },
              ],
            },
          ],
        },
        {
          name: 'No: MA5 > MA20?',
          value: 'Low Volume',
          children: [
            { name: 'Yes: BUY', value: '72% confidence', color: '#2ecc71' },
            { name: 'No: SELL', value: '68% confidence', color: '#e74c3c' },
          ],
        },
      ],
    };

    let html = '<div class="decision-tree">';
    html += this.renderTreeNode(treeData, 0);
    html += '</div>';
    html += '<p class="tree-legend">🟢 BUY 🟡 HOLD 🔴 SELL</p>';

    container.innerHTML = html;
  }

  renderTreeNode(node, level) {
    const isLeaf = !node.children;
    const nodeClass = isLeaf ? 'tree-leaf' : 'tree-node';
    const bgColor = node.color || '#3498db';

    let html = `<div class="${nodeClass}" style="${isLeaf ? `background-color: ${bgColor}` : ''}" data-level="${level}">`;
    html += `<div class="node-name">${node.name}</div>`;
    html += `<div class="node-value">${node.value}</div>`;
    html += '</div>';

    if (node.children) {
      html += '<div class="tree-children">';
      node.children.forEach((child) => {
        html += this.renderTreeNode(child, level + 1);
      });
      html += '</div>';
    }

    return html;
  }

  renderGradientAttributionChart() {
    const ctx = document.getElementById('gradient-attribution-chart');
    if (!ctx) return;

    const features = [
      'Price',
      'Volume',
      'RSI',
      'MACD',
      'News_Sentiment',
      'VIX',
      'SP500_Corr',
    ];
    const gradients = [0.23, -0.15, 0.18, 0.31, 0.42, -0.28, 0.19];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: features,
        datasets: [
          {
            label: 'Gradient Attribution',
            data: gradients,
            backgroundColor: gradients.map((g) =>
              g > 0 ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)'
            ),
            borderColor: gradients.map((g) =>
              g > 0 ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)'
            ),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            title: {
              display: true,
              text: 'Attribution Score',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Gradient-based Feature Attribution',
          },
          legend: {
            display: false,
          },
        },
      },
    });
  }

  renderLayerWiseRelevanceChart() {
    const ctx = document.getElementById('lrp-chart');
    if (!ctx) return;

    const layers = ['Input', 'Hidden 1', 'Hidden 2', 'Hidden 3', 'Output'];
    const relevanceScores = [1.0, 0.85, 0.72, 0.58, 0.45];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: layers,
        datasets: [
          {
            label: 'Relevance Score',
            data: relevanceScores,
            borderColor: 'rgba(155, 89, 182, 1)',
            backgroundColor: 'rgba(155, 89, 182, 0.1)',
            borderWidth: 3,
            fill: true,
            pointRadius: 6,
            pointBackgroundColor: 'rgba(155, 89, 182, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Relevance Score',
            },
            min: 0,
            max: 1.2,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Layer-wise Relevance Propagation',
          },
        },
      },
    });
  }

  renderIntegratedGradientsChart() {
    const ctx = document.getElementById('integrated-gradients-chart');
    if (!ctx) return;

    const steps = [];
    const integratedGradients = [];

    for (let i = 0; i <= 50; i++) {
      steps.push(i / 50);
      integratedGradients.push(
        Math.sin(i * 0.1) * Math.exp(-i * 0.05) + Math.random() * 0.1
      );
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: steps,
        datasets: [
          {
            label: 'Integrated Gradients',
            data: integratedGradients,
            borderColor: 'rgba(230, 126, 34, 1)',
            backgroundColor: 'rgba(230, 126, 34, 0.1)',
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Integration Path (α)',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Gradient Value',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Integrated Gradients Attribution Path',
          },
        },
      },
    });
  }

  // === Real-time Monitoring Visualizations ===
  renderRealtimeMonitoringVisualizations() {
    this.renderConfidenceDistributionChart();
    this.renderDriftDetectionChart();
    this.renderPredictionVsActualChart();
    this.renderEnsembleVotingChart();
  }

  renderConfidenceDistributionChart() {
    const ctx = document.getElementById('confidence-distribution-chart');
    if (!ctx) return;

    const confidenceBins = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
    const counts = [12, 28, 45, 78, 156];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: confidenceBins,
        datasets: [
          {
            label: 'Number of Predictions',
            data: counts,
            backgroundColor: [
              'rgba(231, 76, 60, 0.8)',
              'rgba(230, 126, 34, 0.8)',
              'rgba(241, 196, 15, 0.8)',
              'rgba(52, 152, 219, 0.8)',
              'rgba(46, 204, 113, 0.8)',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Count',
            },
            beginAtZero: true,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Prediction Confidence Distribution (Last 24h)',
          },
          legend: {
            display: false,
          },
        },
      },
    });
  }

  renderDriftDetectionChart() {
    const ctx = document.getElementById('drift-detection-chart');
    if (!ctx) return;

    const timeLabels = [];
    const driftScores = [];
    const threshold = 0.1;

    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      timeLabels.push(
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );

      const driftScore =
        Math.abs(Math.sin(i * 0.3)) * 0.15 + Math.random() * 0.05;
      driftScores.push(driftScore);
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Drift Score',
            data: driftScores,
            borderColor: 'rgba(52, 152, 219, 1)',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 2,
            fill: true,
          },
          {
            label: 'Threshold',
            data: new Array(timeLabels.length).fill(threshold),
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Drift Score',
            },
            min: 0,
            max: 0.2,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Data Drift Detection Over Time',
          },
        },
      },
    });
  }

  renderPredictionVsActualChart() {
    const ctx = document.getElementById('prediction-actual-chart');
    if (!ctx) return;

    const data = [];
    for (let i = 0; i < 100; i++) {
      const actual = Math.random() * 100 - 50;
      const predicted = actual + (Math.random() - 0.5) * 20;
      data.push({ x: actual, y: predicted });
    }

    new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Predictions',
            data: data,
            backgroundColor: 'rgba(52, 152, 219, 0.6)',
            borderColor: 'rgba(52, 152, 219, 1)',
            pointRadius: 3,
          },
          {
            label: 'Perfect Prediction',
            data: [
              { x: -50, y: -50 },
              { x: 50, y: 50 },
            ],
            type: 'line',
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Actual Values',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Predicted Values',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Prediction vs Actual Values',
          },
        },
      },
    });
  }

  renderEnsembleVotingChart() {
    const ctx = document.getElementById('ensemble-voting-chart');
    if (!ctx) return;

    const models = [
      'Random Forest',
      'Gradient Boosting',
      'LSTM',
      'Transformer',
    ];
    const predictions = [
      { model: 'Random Forest', buy: 0.65, hold: 0.25, sell: 0.1 },
      { model: 'Gradient Boosting', buy: 0.72, hold: 0.18, sell: 0.1 },
      { model: 'LSTM', buy: 0.58, hold: 0.32, sell: 0.1 },
      { model: 'Transformer', buy: 0.8, hold: 0.15, sell: 0.05 },
    ];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: models,
        datasets: [
          {
            label: 'BUY',
            data: predictions.map((p) => p.buy * 100),
            backgroundColor: 'rgba(46, 204, 113, 0.8)',
            borderColor: 'rgba(46, 204, 113, 1)',
            borderWidth: 1,
          },
          {
            label: 'HOLD',
            data: predictions.map((p) => p.hold * 100),
            backgroundColor: 'rgba(241, 196, 15, 0.8)',
            borderColor: 'rgba(241, 196, 15, 1)',
            borderWidth: 1,
          },
          {
            label: 'SELL',
            data: predictions.map((p) => p.sell * 100),
            backgroundColor: 'rgba(231, 76, 60, 0.8)',
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: 'Prediction Probability (%)',
            },
            max: 100,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Ensemble Model Voting Distribution',
          },
        },
      },
    });
  }
}
