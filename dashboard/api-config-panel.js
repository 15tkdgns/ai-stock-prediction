// API 설정 및 관리 패널
class APIConfigPanel {
    constructor() {
        this.apiManager = window.sp500APIManager;
        this.setupEventListeners();
        this.createConfigPanel();
    }

    createConfigPanel() {
        // 설정 페이지에 API 설정 섹션 추가
        const settingsContainer = document.querySelector('#page-settings .settings-container');
        if (settingsContainer) {
            const apiConfigSection = this.createAPIConfigSection();
            settingsContainer.appendChild(apiConfigSection);
        }
    }

    createAPIConfigSection() {
        const section = document.createElement('div');
        section.className = 'api-config-section';
        section.innerHTML = `
            <h2>📡 S&P 500 API 설정</h2>
            
            <div class="api-status-panel">
                <h3>API 연결 상태</h3>
                <div id="api-status-grid" class="api-status-grid">
                    <div class="api-status-item">
                        <span class="api-name">Alpha Vantage</span>
                        <span class="api-status" id="status-alphaVantage">테스트 중...</span>
                        <span class="api-limit">5 calls/min (Free)</span>
                    </div>
                    <div class="api-status-item">
                        <span class="api-name">Financial Modeling Prep</span>
                        <span class="api-status" id="status-financialModelingPrep">테스트 중...</span>
                        <span class="api-limit">250 calls/day (Free)</span>
                    </div>
                    <div class="api-status-item">
                        <span class="api-name">Twelve Data</span>
                        <span class="api-status" id="status-twelveData">테스트 중...</span>
                        <span class="api-limit">800 calls/day (Free)</span>
                    </div>
                    <div class="api-status-item">
                        <span class="api-name">Polygon.io</span>
                        <span class="api-status" id="status-polygon">테스트 중...</span>
                        <span class="api-limit">5 calls/min (Free)</span>
                    </div>
                    <div class="api-status-item">
                        <span class="api-name">IEX Cloud</span>
                        <span class="api-status" id="status-iexCloud">테스트 중...</span>
                        <span class="api-limit">100 calls/month (Free)</span>
                    </div>
                    <div class="api-status-item">
                        <span class="api-name">Yahoo Finance</span>
                        <span class="api-status" id="status-yahooFinance">테스트 중...</span>
                        <span class="api-limit">무료 (비공식)</span>
                    </div>
                </div>
                <button class="btn btn-primary" id="test-apis">🔄 API 연결 테스트</button>
            </div>

            <div class="api-keys-panel">
                <h3>🔑 API 키 관리</h3>
                <div class="api-keys-grid">
                    <div class="api-key-item">
                        <label>Alpha Vantage API Key</label>
                        <div class="key-input-group">
                            <input type="password" id="alpha-vantage-key" placeholder="Your Alpha Vantage API key">
                            <button class="btn btn-small" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">👁️</button>
                        </div>
                        <small>무료: <a href="https://www.alphavantage.co/support/#api-key" target="_blank">API 키 받기</a></small>
                    </div>
                    
                    <div class="api-key-item">
                        <label>Financial Modeling Prep API Key</label>
                        <div class="key-input-group">
                            <input type="password" id="fmp-key" placeholder="Your FMP API key">
                            <button class="btn btn-small" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">👁️</button>
                        </div>
                        <small>무료: <a href="https://financialmodelingprep.com/developer/docs" target="_blank">API 키 받기</a></small>
                    </div>
                    
                    <div class="api-key-item">
                        <label>Twelve Data API Key</label>
                        <div class="key-input-group">
                            <input type="password" id="twelve-data-key" placeholder="Your Twelve Data API key">
                            <button class="btn btn-small" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">👁️</button>
                        </div>
                        <small>무료: <a href="https://twelvedata.com/pricing" target="_blank">API 키 받기</a></small>
                    </div>
                    
                    <div class="api-key-item">
                        <label>Polygon.io API Key</label>
                        <div class="key-input-group">
                            <input type="password" id="polygon-key" placeholder="Your Polygon API key">
                            <button class="btn btn-small" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">👁️</button>
                        </div>
                        <small>무료: <a href="https://polygon.io/pricing" target="_blank">API 키 받기</a></small>
                    </div>
                    
                    <div class="api-key-item">
                        <label>IEX Cloud API Key</label>
                        <div class="key-input-group">
                            <input type="password" id="iex-key" placeholder="Your IEX Cloud API key">
                            <button class="btn btn-small" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">👁️</button>
                        </div>
                        <small>무료: <a href="https://iexcloud.io/pricing" target="_blank">API 키 받기</a></small>
                    </div>
                </div>
                
                <div class="api-actions">
                    <button class="btn btn-success" id="save-api-keys">💾 API 키 저장</button>
                    <button class="btn btn-warning" id="clear-api-keys">🗑️ 키 초기화</button>
                </div>
            </div>

            <div class="api-usage-panel">
                <h3>📊 API 사용량 현황</h3>
                <div id="api-usage-stats" class="usage-stats">
                    <!-- 동적으로 생성됨 -->
                </div>
            </div>

            <div class="market-data-panel">
                <h3>📈 실시간 S&P 500 데이터</h3>
                <div class="data-controls">
                    <button class="btn" id="refresh-market-data">🔄 데이터 새로고침</button>
                    <select id="data-update-interval">
                        <option value="30000">30초마다</option>
                        <option value="60000" selected>1분마다</option>
                        <option value="300000">5분마다</option>
                        <option value="600000">10분마다</option>
                    </select>
                </div>
                <div id="market-summary" class="market-summary">
                    <!-- 시장 요약 정보 -->
                </div>
            </div>

            <div class="api-guide-panel">
                <h3>📖 API 설정 가이드</h3>
                <div class="guide-content">
                    <div class="guide-section">
                        <h4>🚀 빠른 시작 가이드</h4>
                        <ol>
                            <li><strong>Alpha Vantage</strong>: 가장 쉬운 시작점. 무료 등록 후 즉시 사용 가능</li>
                            <li><strong>Financial Modeling Prep</strong>: 종합적인 재무 데이터 제공</li>
                            <li><strong>Yahoo Finance</strong>: API 키 없이 즉시 사용 가능 (제한적)</li>
                        </ol>
                    </div>
                    
                    <div class="guide-section">
                        <h4>💡 권장 설정</h4>
                        <ul>
                            <li>최소 2-3개의 API를 설정하여 데이터 안정성 확보</li>
                            <li>무료 요금제 한도를 고려하여 업데이트 주기 조절</li>
                            <li>중요한 거래 시간에는 짧은 주기로 업데이트</li>
                        </ul>
                    </div>

                    <div class="guide-section">
                        <h4>🔐 보안 권장사항</h4>
                        <ul>
                            <li>API 키는 로컬 스토리지에만 저장 (서버 전송 안함)</li>
                            <li>정기적으로 API 키 재생성</li>
                            <li>공유 컴퓨터에서는 사용 후 키 삭제</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        return section;
    }

    setupEventListeners() {
        // 이벤트는 DOM이 완전히 로드된 후 설정
        document.addEventListener('DOMContentLoaded', () => {
            this.attachEventListeners();
        });

        // API 데이터 업데이트 이벤트 리스너
        window.addEventListener('sp500DataUpdate', (event) => {
            this.updateMarketSummary(event.detail);
        });
    }

    attachEventListeners() {
        // API 연결 테스트 버튼
        const testButton = document.getElementById('test-apis');
        if (testButton) {
            testButton.addEventListener('click', () => this.testAllAPIs());
        }

        // API 키 저장 버튼
        const saveButton = document.getElementById('save-api-keys');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveAPIKeys());
        }

        // API 키 초기화 버튼
        const clearButton = document.getElementById('clear-api-keys');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearAPIKeys());
        }

        // 데이터 새로고침 버튼
        const refreshButton = document.getElementById('refresh-market-data');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshMarketData());
        }

        // 업데이트 주기 변경
        const intervalSelect = document.getElementById('data-update-interval');
        if (intervalSelect) {
            intervalSelect.addEventListener('change', (e) => {
                this.updateDataInterval(parseInt(e.target.value));
            });
        }

        // 초기 데이터 로드
        this.loadSavedKeys();
        this.updateUsageStats();
        
        // 5초 후 API 테스트 자동 실행
        setTimeout(() => this.testAllAPIs(), 5000);
    }

    // API 키 저장된 것 로드
    loadSavedKeys() {
        const keyMappings = {
            'alpha-vantage-key': 'alpha_vantage_key',
            'fmp-key': 'fmp_key',
            'twelve-data-key': 'twelve_data_key',
            'polygon-key': 'polygon_key',
            'iex-key': 'iex_key'
        };

        Object.entries(keyMappings).forEach(([inputId, storageKey]) => {
            const input = document.getElementById(inputId);
            const savedKey = localStorage.getItem(storageKey);
            if (input && savedKey) {
                input.value = savedKey;
            }
        });
    }

    // 모든 API 연결 테스트
    async testAllAPIs() {
        const testButton = document.getElementById('test-apis');
        if (testButton) {
            testButton.disabled = true;
            testButton.textContent = '테스트 중...';
        }

        try {
            const results = await this.apiManager.testAPIConnections();
            
            // 상태 업데이트
            Object.entries(results).forEach(([api, status]) => {
                const statusElement = document.getElementById(`status-${api}`);
                if (statusElement) {
                    statusElement.className = `api-status ${status === 'OK' ? 'success' : status === 'NO_KEY' ? 'warning' : 'error'}`;
                    statusElement.textContent = status === 'OK' ? '✅ 연결됨' : 
                                              status === 'NO_KEY' ? '⚠️ 키 없음' : 
                                              '❌ 오류';
                }
            });

            // 성공한 API 개수 알림
            const successCount = Object.values(results).filter(status => status === 'OK').length;
            this.showNotification(`${successCount}개 API 연결 성공`, 'success');

        } catch (error) {
            console.error('API 테스트 실패:', error);
            this.showNotification('API 테스트 중 오류 발생', 'error');
        } finally {
            if (testButton) {
                testButton.disabled = false;
                testButton.textContent = '🔄 API 연결 테스트';
            }
        }
    }

    // API 키 저장
    saveAPIKeys() {
        const keyMappings = {
            'alpha-vantage-key': 'alphaVantage',
            'fmp-key': 'financialModelingPrep',
            'twelve-data-key': 'twelveData',
            'polygon-key': 'polygon',
            'iex-key': 'iexCloud'
        };

        let savedCount = 0;

        Object.entries(keyMappings).forEach(([inputId, apiProvider]) => {
            const input = document.getElementById(inputId);
            if (input && input.value.trim()) {
                this.apiManager.setAPIKey(apiProvider, input.value.trim());
                savedCount++;
            }
        });

        if (savedCount > 0) {
            this.showNotification(`${savedCount}개 API 키가 저장되었습니다`, 'success');
            // 자동으로 API 테스트 실행
            setTimeout(() => this.testAllAPIs(), 1000);
        } else {
            this.showNotification('저장할 API 키가 없습니다', 'warning');
        }
    }

    // API 키 초기화
    clearAPIKeys() {
        if (confirm('모든 API 키를 삭제하시겠습니까?')) {
            const inputs = ['alpha-vantage-key', 'fmp-key', 'twelve-data-key', 'polygon-key', 'iex-key'];
            const storageKeys = ['alpha_vantage_key', 'fmp_key', 'twelve_data_key', 'polygon_key', 'iex_key'];

            inputs.forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });

            storageKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            this.showNotification('API 키가 초기화되었습니다', 'info');
            
            // 상태 초기화
            setTimeout(() => this.testAllAPIs(), 500);
        }
    }

    // 시장 데이터 새로고침
    refreshMarketData() {
        if (this.apiManager) {
            this.apiManager.collectAllData();
            this.showNotification('시장 데이터를 새로고침합니다', 'info');
        }
    }

    // 데이터 업데이트 주기 변경
    updateDataInterval(intervalMs) {
        if (this.apiManager) {
            this.apiManager.setUpdateInterval(intervalMs);
            this.showNotification(`업데이트 주기가 ${intervalMs/1000}초로 변경되었습니다`, 'success');
        }
    }

    // 시장 요약 정보 업데이트
    updateMarketSummary(data) {
        const summaryContainer = document.getElementById('market-summary');
        if (summaryContainer && data.analysis) {
            const analysis = data.analysis;
            
            summaryContainer.innerHTML = `
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">분석 종목수</div>
                        <div class="summary-value">${analysis.totalStocks}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">상승 종목</div>
                        <div class="summary-value success">${analysis.gainers}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">하락 종목</div>
                        <div class="summary-value danger">${analysis.losers}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">평균 변동률</div>
                        <div class="summary-value ${parseFloat(analysis.avgChange) >= 0 ? 'success' : 'danger'}">
                            ${parseFloat(analysis.avgChange) >= 0 ? '+' : ''}${analysis.avgChange}%
                        </div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">시장 분위기</div>
                        <div class="summary-value ${analysis.marketSentiment === 'bullish' ? 'success' : analysis.marketSentiment === 'bearish' ? 'danger' : 'info'}">
                            ${analysis.marketSentiment === 'bullish' ? '🐂 강세' : analysis.marketSentiment === 'bearish' ? '🐻 약세' : '😐 중립'}
                        </div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">마지막 업데이트</div>
                        <div class="summary-value">${new Date(analysis.lastUpdate).toLocaleTimeString('ko-KR')}</div>
                    </div>
                </div>

                ${analysis.topGainers && analysis.topGainers.length > 0 ? `
                    <div class="top-movers">
                        <h4>📈 상위 상승주</h4>
                        <div class="movers-list">
                            ${analysis.topGainers.slice(0, 3).map(stock => `
                                <div class="mover-item">
                                    <span class="symbol">${stock.symbol}</span>
                                    <span class="change success">+${stock.change.toFixed(2)} (+${stock.changePercent}%)</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${analysis.topLosers && analysis.topLosers.length > 0 ? `
                    <div class="top-movers">
                        <h4>📉 상위 하락주</h4>
                        <div class="movers-list">
                            ${analysis.topLosers.slice(0, 3).map(stock => `
                                <div class="mover-item">
                                    <span class="symbol">${stock.symbol}</span>
                                    <span class="change danger">${stock.change.toFixed(2)} (${stock.changePercent}%)</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
        }
    }

    // 사용량 통계 업데이트
    updateUsageStats() {
        const statsContainer = document.getElementById('api-usage-stats');
        if (statsContainer && this.apiManager) {
            const usage = this.apiManager.getAPIUsage();
            
            statsContainer.innerHTML = `
                <div class="usage-item">
                    <span class="usage-label">총 API 요청</span>
                    <span class="usage-value">${usage.totalRequests}</span>
                </div>
                <div class="usage-item">
                    <span class="usage-label">활성 API</span>
                    <span class="usage-value">${usage.activeAPIs}/6</span>
                </div>
                <div class="usage-item">
                    <span class="usage-label">마지막 업데이트</span>
                    <span class="usage-value">${new Date(usage.lastUpdate).toLocaleTimeString('ko-KR')}</span>
                </div>
            `;
        }
        
        // 1분마다 업데이트
        setTimeout(() => this.updateUsageStats(), 60000);
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        // 대시보드의 알림 시스템 사용
        if (window.dashboard && window.dashboard.extensions) {
            window.dashboard.extensions.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// API 설정 패널 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.apiConfigPanel = new APIConfigPanel();
});