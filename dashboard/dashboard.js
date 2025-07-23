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
            stockData: '../data/raw/training_features.csv'
        };
        
        this.newsCache = [];
        this.sourceFiles = {};
        
        this.init();
    }

    async init() {
        this.setupCharts();
        this.startRealTimeUpdates();
        this.loadInitialData();
        this.setupEventListeners();
        
        // Initialize extended features
        this.initializeExtensions();
        this.updateAPIStatusDisplay(); // Add API status display
    }

    // Initialize extensions
    initializeExtensions() {
        console.log('[DASHBOARD DEBUG] Initializing extensions...');
        console.log('[DASHBOARD DEBUG] DashboardExtensions available:', typeof DashboardExtensions !== 'undefined');
        
        if (typeof DashboardExtensions !== 'undefined') {
            try {
                console.log('[DASHBOARD DEBUG] Creating DashboardExtensions instance...');
                this.extensions = new DashboardExtensions(this);
                console.log('[DASHBOARD DEBUG] DashboardExtensions instance created:', this.extensions);
                
                // Set global reference for router access
                window.dashboard = this;
                console.log('[DASHBOARD DEBUG] window.dashboard set to:', window.dashboard);
                
                this.extensions.init();
                console.log('[DASHBOARD DEBUG] DashboardExtensions initialized successfully');
            } catch (error) {
                console.error('[DASHBOARD DEBUG] Error initializing DashboardExtensions:', error);
            }
        } else {
            console.error('[DASHBOARD DEBUG] DashboardExtensions class not found. Make sure dashboard-extended.js is loaded first.');
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
                    right: 15
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        };

        if (chartType === 'line' || chartType === 'bar') {
            baseOptions.scales = {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        font: {
                            size: 11
                        }
                    },
                    title: {
                        display: true,
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    },
                    title: {
                        display: true,
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
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
            console.warn('Could not find HTML element #api-status-container to display API status.');
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
            await this.updateSystemLogs();
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('Initial data load failed:', error);
            this.showErrorState();
        }
    }

    // Update system status
    async updateSystemStatus() {
        try {
            // Attempt to load data from actual file
            const response = await fetch(this.dataEndpoints.systemStatus);
            let data;
            
            if (response.ok) {
                data = await response.json();
            } else {
                // Use mock data if file not found
                data = this.generateMockSystemStatus();
            }

            this.updateSystemMetrics(data);
        } catch (error) {
            console.warn('Failed to load system status file, using mock data:', error);
            const mockData = this.generateMockSystemStatus();
            this.updateSystemMetrics(mockData);
        }
    }

    // Update system metrics
    updateSystemMetrics(data) {
        document.getElementById('model-accuracy').textContent = 
            data.model_accuracy ? `${data.model_accuracy}%` : `${(85 + Math.random() * 10).toFixed(1)}%`;
        
        document.getElementById('processing-speed').textContent = 
            data.processing_speed ? data.processing_speed : `${(15 + Math.random() * 10).toFixed(1)}`;
        
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

    // Update real-time prediction results
    async updateRealtimePredictions() {
        try {
            const response = await fetch(this.dataEndpoints.realtimeResults);
            let data;
            
            if (response.ok) {
                data = await response.json();
            } else {
                data = this.generateMockPredictions();
            }

            this.updatePredictionsDisplay(data);
        } catch (error) {
            console.warn('Failed to load real-time results file, using mock data:', error);
            const mockData = this.generateMockPredictions();
            this.updatePredictionsDisplay(mockData);
        }
    }

    // Update prediction results display
    updatePredictionsDisplay(data) {
        const container = document.querySelector('.predictions-container');
        
        if (data.predictions && Array.isArray(data.predictions)) {
            container.innerHTML = data.predictions.slice(0, 5).map(pred => `
                <div class="prediction-item">
                    <span class="stock-symbol">${pred.symbol}</span>
                    <span class="prediction-direction ${pred.direction}">${pred.change}</span>
                    <span class="confidence">Confidence: ${pred.confidence}%</span>
                </div>
            `).join('');
        }
    }

    // Update system logs
    async updateSystemLogs() {
        try {
            // Attempt to load log files. If not found, mock data will be used.
            const logFiles = [
                '/dashboard/log/localhost-1753240572250.log'
            ];
            let logs = [];

            for (const logFile of logFiles) {
                try {
                    const response = await fetch(logFile);
                    if (response.ok) {
                        const text = await response.text();
                        const parsedLogs = this.parseLogFile(text);
                        logs = logs.concat(parsedLogs);
                    } else {
                        console.error(`[DEBUG] Log file ${logFile} not found or failed to load (${response.status} ${response.statusText}). Using mock data.`);
                    }
                } catch (error) {
                    console.error(`[DEBUG] Error loading log file ${logFile}:`, error, `. Using mock data.`);
                }
            }

            if (logs.length === 0) {
                logs = this.generateMockLogs();
            }

            this.displayLogs(logs.slice(0, 20)); // Display only the latest 20
        } catch (error) {
            console.error('Log load failed (final):', error);
            this.displayLogs(this.generateMockLogs());
        }
    }

    // Parse log file
    parseLogFile(logText) {
        const lines = logText.split('\n').filter(line => line.trim());
        return lines.slice(-10).map((line, index) => {
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); // Use current time as timestamp is not in log file
            let level = 'INFO';
            let message = line;
            
            // Parse log level (e.g., ERROR, WARNING, INFO)
            if (line.toLowerCase().includes('error')) level = 'ERROR';
            else if (line.toLowerCase().includes('warning')) level = 'WARNING';
            else if (line.toLowerCase().includes('success')) level = 'SUCCESS';
            else if (line.toLowerCase().includes('info')) level = 'INFO';
            else if (line.toLowerCase().includes('debug')) level = 'DEBUG';
            
            // Remove level information from message (optional)
            const levelRegex = new RegExp(`(ERROR|WARNING|INFO|SUCCESS|DEBUG)`, 'i');
            message = message.replace(levelRegex, '').trim();

            return { timestamp, level, message: message.substring(0, 100) };
        });
    }

    // Display logs
    displayLogs(logs) {
        const container = document.getElementById('system-logs');
        container.innerHTML = logs.map(log => `
            <div class="log-entry ${log.level.toLowerCase()}">
                <span class="timestamp">${log.timestamp}</span>
                <span class="log-level">${log.level}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    }

    // Chart setup
    setupCharts() {
        this.setupPerformanceChart();
        this.setupVolumeChart();
        this.setupModelComparisonChart();
    }

    // Performance trend chart
    setupPerformanceChart() {
        const ctx = document.getElementById('performance-chart').getContext('2d');
        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels(24),
                datasets: [{
                    label: 'Model Accuracy',
                    data: this.generatePerformanceData(24),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 80,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        display: true
                    }
                }
            }
        });
    }

    // Trading volume chart
    setupVolumeChart() {
        const ctx = document.getElementById('volume-chart').getContext('2d');
        const volumeData = {
            labels: ['NVDA', 'TSLA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'],
            data: [89.1, 67.8, 45.2, 32.1, 28.7, 25.3, 22.4]
        };

        this.charts.volume = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: volumeData.labels,
                datasets: [{
                    label: 'Volume (Millions)',
                    data: volumeData.data,
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(118, 75, 162, 0.8)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(155, 89, 182, 0.8)'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 'M';
                            }
                        }
                    }
                }
            }
        });

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
            .map((label, index) => ({ symbol: label, volume: volumeData.data[index] }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5);

        xaiStockSelector.innerHTML = top5Stocks
            .map(stock => `<option value="${stock.symbol}">${stock.symbol}</option>`)
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
        const maxVolumeStock = volumeData.labels[volumeData.data.indexOf(maxVolume)];
        
        // Unusual volume detected (over 1.5x average)
        const abnormalVolumes = volumeData.data
            .map((vol, index) => ({ symbol: volumeData.labels[index], volume: vol }))
            .filter(item => item.volume > avgVolume * 1.5);
        
        // Update HTML
        document.getElementById('total-volume').textContent = totalVolume.toFixed(1) + 'M';
        document.getElementById('avg-volume').textContent = avgVolume.toFixed(1) + 'M';
        document.getElementById('max-volume').textContent = `${maxVolumeStock} (${maxVolume}M)`;
        
        const volumeAlertsElement = document.getElementById('volume-alerts');
        if (abnormalVolumes.length > 0) {
            volumeAlertsElement.textContent = `${abnormalVolumes.length} cases (${abnormalVolumes.map(item => item.symbol).join(', ')})`;
            volumeAlertsElement.classList.add('alert');
        } else {
            volumeAlertsElement.textContent = 'None';
            volumeAlertsElement.classList.remove('alert');
        }
    }

    // Model comparison chart
    setupModelComparisonChart() {
        const ctx = document.getElementById('model-comparison-chart').getContext('2d');
        this.charts.modelComparison = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Accuracy', 'Speed', 'Stability', 'Scalability', 'Efficiency'],
                datasets: [{
                    label: 'Random Forest',
                    data: [85, 90, 80, 75, 85],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderWidth: 2
                }, {
                    label: 'Gradient Boosting',
                    data: [90, 75, 85, 80, 80],
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.2)',
                    borderWidth: 2
                }, {
                    label: 'LSTM',
                    data: [88, 70, 90, 85, 75],
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.2)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Start real-time updates
    startRealTimeUpdates() {
        setInterval(async () => {
            await this.updateSystemStatus();
            await this.updateRealtimePredictions();
            this.updateCharts();
            this.updateLastUpdateTime();
            
            // Also update logs occasionally
            if (Math.random() > 0.7) {
                await this.updateSystemLogs();
            }
        }, this.updateInterval);
    }

    // Update chart data
    updateCharts() {
        // Update performance chart
        if (this.charts.performance) {
            const newData = 85 + Math.random() * 10;
            this.charts.performance.data.datasets[0].data.push(newData);
            this.charts.performance.data.datasets[0].data.shift();
            this.charts.performance.update('none');
        }
        
        // Update volume chart (occasionally)
        if (this.charts.volume && Math.random() > 0.8) {
            this.charts.volume.data.datasets[0].data = 
                this.charts.volume.data.datasets[0].data.map(val => 
                    val + (Math.random() - 0.5) * 5
                );
            this.charts.volume.update('none');
        }
    }

    // Generate time labels
    generateTimeLabels(hours) {
        const labels = [];
        const now = new Date();
        for (let i = hours; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit',
                hourCycle: 'h23'
            }));
        }
        return labels;
    }

    // Generate performance data
    generatePerformanceData(points) {
        const data = [];
        let baseAccuracy = 87;
        for (let i = 0; i < points; i++) {
            baseAccuracy += (Math.random() - 0.5) * 2;
            baseAccuracy = Math.max(80, Math.min(95, baseAccuracy));
            data.push(parseFloat(baseAccuracy.toFixed(1)));
        }
        return data;
    }

    // Display last update time
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('ko-KR', { hour12: false });
        document.getElementById('last-update').textContent = `Last Updated: ${timeString} KST`;
    }

    // Set up event listeners
    setupEventListeners() {
        // Display detailed information when widget is clicked
        document.querySelectorAll('.widget').forEach(widget => {
            widget.addEventListener('click', (e) => {
                if (!e.target.closest('canvas')) {
                    this.showWidgetDetails(widget);
                }
            });
        });

        // Refresh button (header click)
        document.querySelector('.content-header h1').addEventListener('click', () => {
            this.refreshAllData();
        });

        // News update event listener
        window.addEventListener('newsUpdate', (event) => {
            if (this.extensions && typeof this.extensions.updateLlmAnalysisSummary === 'function') {
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
            sidebar.querySelectorAll('.nav-link').forEach(link => {
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

            // Close sidebar by swiping from sidebar
            sidebar.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            });

            sidebar.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                if (touchStartX - touchEndX > 50) { // Swipe more than 50px to the left
                    closeSidebar();
                }
            });
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

        // Delegate event listeners for dynamic content (logs and news)
        document.querySelector('.page-content').addEventListener('click', (event) => {
            const logEntry = event.target.closest('.log-entry');
            const newsItem = event.target.closest('.news-item');

            if (logEntry) {
                // Navigate to logs page when system log item is clicked
                this.navigateToPage('logs');
            }

            if (newsItem) {
                // Navigate to news analysis page when news item is clicked
                this.navigateToPage('news');
            }
        });
    }

    /**
     * Helper function to navigate to a specific page and activate its menu
     * @param {string} pageId - ID of the page to navigate to (e.g., 'logs', 'news')
     */
    navigateToPage(pageId) {
        // Hide all pages and remove active class
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

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
            console.log(`[XAI DEBUG] Extensions available, checking renderLocalXaiAnalysis method...`);
            console.log(`[XAI DEBUG] renderLocalXaiAnalysis type:`, typeof this.extensions.renderLocalXaiAnalysis);
            
            if (typeof this.extensions.renderLocalXaiAnalysis === 'function') {
                console.log(`[XAI DEBUG] Calling renderLocalXaiAnalysis for ${stockSymbol}`);
                this.extensions.renderLocalXaiAnalysis(stockSymbol);
            } else {
                console.error(`[XAI DEBUG] renderLocalXaiAnalysis is not a function:`, this.extensions.renderLocalXaiAnalysis);
            }
        } else {
            console.error(`[XAI DEBUG] Extensions not available. This indicates the DashboardExtensions class was not loaded or instantiated properly.`);
            console.error(`[XAI DEBUG] Make sure dashboard-extended.js is loaded before dashboard.js`);
        }
    }

    // Display widget details
    showWidgetDetails(widget) {
        // Remove click message - no action
        return;
    }

    // Refresh all data
    async refreshAllData() {
        await this.loadInitialData();
        this.updateCharts();
    }

    // Display error state
    showErrorState() {
        document.getElementById('system-status').className = 'status-dot offline';
        document.getElementById('last-update').textContent = 'Update Failed';
        
        // Display default metrics
        document.getElementById('model-accuracy').textContent = '--';
        document.getElementById('processing-speed').textContent = '--';
        document.getElementById('active-models').textContent = '--';
        document.getElementById('data-sources').textContent = '--';
    }

    // Mock data generation functions
    generateMockSystemStatus() {
        return {
            model_accuracy: (85 + Math.random() * 10).toFixed(1),
            processing_speed: (15 + Math.random() * 10).toFixed(1),
            active_models: Math.floor(3 + Math.random() * 2),
            data_sources: Math.floor(5 + Math.random() * 3),
            status: 'online'
        };
    }

    generateMockPredictions() {
        const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'CRM', 'ORCL'];
        const predictions = [];
        
        for (let i = 0; i < 5; i++) {
            const isUp = Math.random() > 0.5;
            const change = (Math.random() * 3).toFixed(1);
            predictions.push({
                symbol: stocks[Math.floor(Math.random() * stocks.length)],
                direction: isUp ? 'up' : 'down',
                change: isUp ? `↗ +${change}%` : `↘ -${change}%`,
                confidence: Math.floor(75 + Math.random() * 20)
            });
        }
        
        return { predictions };
    }

    generateMockLogs() {
        const messages = [
            'Model training completed - Accuracy: 89.3%',
            'Data collection pipeline operating normally',
            'API response delay detected: average 1.2 seconds',
            'Collected 200 new news data',
            'Model prediction accuracy improved: +2.1%',
            'System backup completed',
            'Real-time data processing',
            'Feature engineering completed'
        ];
        
        const levels = ['INFO', 'SUCCESS', 'WARNING', 'INFO'];
        const logs = [];
        
        for (let i = 0; i < 8; i++) {
            const now = new Date();
            const timestamp = new Date(now.getTime() - i * 60000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            logs.push({
                timestamp,
                level: levels[Math.floor(Math.random() * levels.length)],
                message: messages[Math.floor(Math.random() * messages.length)]
            });
        }
        
        return logs;
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
        let notificationContainer = document.getElementById('notification-container');
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
        
        if (this.extensions && typeof this.extensions.refreshXAIData === 'function') {
            console.log('[DASHBOARD DEBUG] Calling extensions.refreshXAIData');
            this.extensions.refreshXAIData();
        } else {
            console.error('[DASHBOARD DEBUG] Extensions or refreshXAIData not available');
            console.log('[DASHBOARD DEBUG] Extensions:', this.extensions);
            
            // Show error notification
            this.showNotification('XAI refresh functionality not available', 'error');
        }
    }
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new DashboardManager();
    window.dashboard = dashboard; // 디버깅용
});

// 웹소켓이나 Server-Sent Events 지원 (선택사항)
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
            console.log('WebSocket server connection failed, operating in polling mode');
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
        switch(data.type) {
            case 'system_status':
                this.dashboard.updateSystemMetrics(data.payload);
                break;
            case 'predictions':
                this.dashboard.updatePredictionsDisplay(data.payload);
                break;
            case 'logs':
                this.dashboard.displayLogs(data.payload);
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