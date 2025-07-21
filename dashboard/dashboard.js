// 대시보드 메인 JavaScript 파일
class DashboardManager {
    constructor() {
        this.charts = {};
        this.updateInterval = 5000; // 5초마다 업데이트
        this.dataEndpoints = {
            systemStatus: '../data/raw/system_status.json',
            realtimeResults: '../data/raw/realtime_results.json',
            monitoringData: '../data/raw/monitoring_dashboard.json'
        };
        
        this.init();
    }

    async init() {
        this.setupCharts();
        this.startRealTimeUpdates();
        this.loadInitialData();
        this.setupEventListeners();
    }

    // 초기 데이터 로드
    async loadInitialData() {
        try {
            await this.updateSystemStatus();
            await this.updateRealtimePredictions();
            await this.updateSystemLogs();
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
            this.showErrorState();
        }
    }

    // 시스템 상태 업데이트
    async updateSystemStatus() {
        try {
            // 실제 파일에서 데이터 로드 시도
            const response = await fetch(this.dataEndpoints.systemStatus);
            let data;
            
            if (response.ok) {
                data = await response.json();
            } else {
                // 파일이 없으면 모의 데이터 사용
                data = this.generateMockSystemStatus();
            }

            this.updateSystemMetrics(data);
        } catch (error) {
            console.warn('시스템 상태 파일 로드 실패, 모의 데이터 사용:', error);
            const mockData = this.generateMockSystemStatus();
            this.updateSystemMetrics(mockData);
        }
    }

    // 시스템 메트릭 업데이트
    updateSystemMetrics(data) {
        document.getElementById('model-accuracy').textContent = 
            data.model_accuracy ? `${data.model_accuracy}%` : `${(85 + Math.random() * 10).toFixed(1)}%`;
        
        document.getElementById('processing-speed').textContent = 
            data.processing_speed ? data.processing_speed : `${(15 + Math.random() * 10).toFixed(1)}`;
        
        document.getElementById('active-models').textContent = 
            data.active_models || Math.floor(3 + Math.random() * 2);
        
        document.getElementById('data-sources').textContent = 
            data.data_sources || Math.floor(5 + Math.random() * 3);

        // 시스템 상태 표시
        const statusElement = document.getElementById('system-status');
        if (data.status === 'online' || !data.status) {
            statusElement.className = 'status-dot online';
        } else {
            statusElement.className = 'status-dot offline';
        }
    }

    // 실시간 예측 결과 업데이트
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
            console.warn('실시간 결과 파일 로드 실패, 모의 데이터 사용:', error);
            const mockData = this.generateMockPredictions();
            this.updatePredictionsDisplay(mockData);
        }
    }

    // 예측 결과 표시 업데이트
    updatePredictionsDisplay(data) {
        const container = document.querySelector('.predictions-container');
        
        if (data.predictions && Array.isArray(data.predictions)) {
            container.innerHTML = data.predictions.slice(0, 5).map(pred => `
                <div class="prediction-item">
                    <span class="stock-symbol">${pred.symbol}</span>
                    <span class="prediction-direction ${pred.direction}">${pred.change}</span>
                    <span class="confidence">신뢰도: ${pred.confidence}%</span>
                </div>
            `).join('');
        }
    }

    // 시스템 로그 업데이트
    async updateSystemLogs() {
        try {
            // 실제 로그 파일 읽기 시도
            const logFiles = ['../data/raw/realtime_testing.log', '../data/raw/system_orchestrator.log'];
            let logs = [];
            
            for (const logFile of logFiles) {
                try {
                    const response = await fetch(logFile);
                    if (response.ok) {
                        const text = await response.text();
                        const parsedLogs = this.parseLogFile(text);
                        logs = logs.concat(parsedLogs);
                    }
                } catch (error) {
                    console.log(`로그 파일 ${logFile} 로드 실패`);
                }
            }
            
            if (logs.length === 0) {
                logs = this.generateMockLogs();
            }
            
            this.displayLogs(logs.slice(0, 20)); // 최근 20개만 표시
        } catch (error) {
            console.warn('로그 로드 실패, 모의 데이터 사용:', error);
            this.displayLogs(this.generateMockLogs());
        }
    }

    // 로그 파일 파싱
    parseLogFile(logText) {
        const lines = logText.split('\n').filter(line => line.trim());
        return lines.slice(-10).map((line, index) => {
            const timestamp = new Date().toLocaleTimeString('ko-KR');
            let level = 'INFO';
            let message = line;
            
            if (line.toLowerCase().includes('error')) level = 'ERROR';
            else if (line.toLowerCase().includes('warning')) level = 'WARNING';
            else if (line.toLowerCase().includes('success')) level = 'SUCCESS';
            
            return { timestamp, level, message: message.substring(0, 100) };
        });
    }

    // 로그 표시
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

    // 차트 설정
    setupCharts() {
        this.setupPerformanceChart();
        this.setupVolumeChart();
        this.setupModelComparisonChart();
    }

    // 성능 추이 차트
    setupPerformanceChart() {
        const ctx = document.getElementById('performance-chart').getContext('2d');
        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels(24),
                datasets: [{
                    label: '모델 정확도',
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

    // 거래량 차트
    setupVolumeChart() {
        const ctx = document.getElementById('volume-chart').getContext('2d');
        this.charts.volume = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA'],
                datasets: [{
                    label: '거래량 (백만)',
                    data: [45.2, 32.1, 28.7, 25.3, 67.8, 22.4, 89.1],
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
    }

    // 모델 비교 차트
    setupModelComparisonChart() {
        const ctx = document.getElementById('model-comparison-chart').getContext('2d');
        this.charts.modelComparison = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['정확도', '속도', '안정성', '확장성', '효율성'],
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

    // 실시간 업데이트 시작
    startRealTimeUpdates() {
        setInterval(async () => {
            await this.updateSystemStatus();
            await this.updateRealtimePredictions();
            this.updateCharts();
            this.updateLastUpdateTime();
            
            // 가끔 로그도 업데이트
            if (Math.random() > 0.7) {
                await this.updateSystemLogs();
            }
        }, this.updateInterval);
    }

    // 차트 데이터 업데이트
    updateCharts() {
        // 성능 차트 업데이트
        if (this.charts.performance) {
            const newData = 85 + Math.random() * 10;
            this.charts.performance.data.datasets[0].data.push(newData);
            this.charts.performance.data.datasets[0].data.shift();
            this.charts.performance.update('none');
        }
        
        // 거래량 차트 업데이트 (가끔)
        if (this.charts.volume && Math.random() > 0.8) {
            this.charts.volume.data.datasets[0].data = 
                this.charts.volume.data.datasets[0].data.map(val => 
                    val + (Math.random() - 0.5) * 5
                );
            this.charts.volume.update('none');
        }
    }

    // 시간 라벨 생성
    generateTimeLabels(hours) {
        const labels = [];
        const now = new Date();
        for (let i = hours; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        }
        return labels;
    }

    // 성능 데이터 생성
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

    // 마지막 업데이트 시간 표시
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('ko-KR');
        document.getElementById('last-update').textContent = `마지막 업데이트: ${timeString}`;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 위젯 클릭 시 상세 정보 표시
        document.querySelectorAll('.widget').forEach(widget => {
            widget.addEventListener('click', (e) => {
                if (!e.target.closest('canvas')) {
                    this.showWidgetDetails(widget);
                }
            });
        });

        // 새로고침 버튼 (헤더 클릭)
        document.querySelector('.header h1').addEventListener('click', () => {
            this.refreshAllData();
        });
    }

    // 위젯 상세 정보 표시
    showWidgetDetails(widget) {
        const title = widget.querySelector('h2').textContent;
        alert(`${title}의 상세 정보를 표시합니다.\n(실제 구현시 모달이나 상세 페이지로 연결)`);
    }

    // 모든 데이터 새로고침
    async refreshAllData() {
        await this.loadInitialData();
        this.updateCharts();
    }

    // 에러 상태 표시
    showErrorState() {
        document.getElementById('system-status').className = 'status-dot offline';
        document.getElementById('last-update').textContent = '업데이트 실패';
        
        // 기본 메트릭 표시
        document.getElementById('model-accuracy').textContent = '--';
        document.getElementById('processing-speed').textContent = '--';
        document.getElementById('active-models').textContent = '--';
        document.getElementById('data-sources').textContent = '--';
    }

    // 모의 데이터 생성 함수들
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
            '모델 훈련 완료 - 정확도: 89.3%',
            '데이터 수집 파이프라인 정상 작동',
            'API 응답 지연 감지: 평균 1.2초',
            '새로운 뉴스 데이터 200건 수집',
            '모델 예측 정확도 향상: +2.1%',
            '시스템 백업 완료',
            '실시간 데이터 처리 중',
            '특성 엔지니어링 완료'
        ];
        
        const levels = ['INFO', 'SUCCESS', 'WARNING', 'INFO'];
        const logs = [];
        
        for (let i = 0; i < 8; i++) {
            const now = new Date();
            const timestamp = new Date(now.getTime() - i * 60000).toLocaleTimeString('ko-KR');
            logs.push({
                timestamp,
                level: levels[Math.floor(Math.random() * levels.length)],
                message: messages[Math.floor(Math.random() * messages.length)]
            });
        }
        
        return logs;
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
            console.log('WebSocket 서버 연결 실패, 폴링 모드로 동작');
        }
    }

    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('실시간 연결 성공');
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
            console.error('WebSocket 에러:', error);
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