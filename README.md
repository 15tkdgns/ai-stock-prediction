# AI 주식 예측 시스템 (S&P500 이벤트 탐지)

## 📊 프로젝트 개요

이 프로젝트는 S&P500에 포함된 주식의 가격, 거래량, 변동성 등 다양한 데이터를 분석하여 주가에 영향을 미칠 수 있는 **주요 이벤트를 실시간으로 탐지하고 예측**하는 머신러닝 시스템입니다.

단순한 모델 개발을 넘어, **데이터 수집, 전처리, 모델 훈련, 실시간 테스트, 결과 분석 및 리포팅**에 이르는 전체 파이프라인을 자동화하고 체계적으로 관리하는 것을 목표로 합니다.

### ✨ 주요 기능 및 특징

- **End-to-End 자동화 파이프라인**: 데이터 수집부터 모델 평가 및 리포트 생성까지 전 과정을 자동화합니다.
- **다양한 모델 비교 분석**: Random Forest, Gradient Boosting, LSTM 등 여러 모델의 성능을 종합적으로 비교하여 최적의 모델을 선택합니다.
- **실시간 탐지 시스템**: 실시간 데이터를 기반으로 이벤트 발생 가능성을 예측하고 모니터링합니다.
- **실시간 대시보드**: Chart.js 기반 인터랙티브 웹 대시보드로 모델 성능 및 예측 결과를 실시간 모니터링
- **상세한 분석 및 리포팅**: 모델 성능, 특성 중요도, 데이터 분포 등을 시각화 자료와 함께 상세 리포트로 제공합니다.
- **체계적인 모듈 구조**: `core`, `models`, `testing`, `analysis` 등 기능별로 코드를 모듈화하여 유지보수성과 확장성을 높였습니다.

## 🛠️ 기술 스택

- **언어**: Python 3, JavaScript (ES6+), HTML5, CSS3
- **핵심 라이브러리**:
  - **데이터 처리**: Pandas, NumPy
  - **머신러닝**: Scikit-learn, TensorFlow (Keras)
  - **데이터 수집**: yfinance, NewsAPI
  - **시각화**: Matplotlib, Seaborn, Plotly, Chart.js
  - **기타**: TA (Technical Analysis), TextBlob, SHAP, LIME

## 🚀 설치 및 실행 방법

### 1. 환경 설정

먼저, 프로젝트에 필요한 라이브러리들을 설치합니다.

```bash
pip install -r config/requirements.txt
```

### 2. 전체 파이프라인 실행

프로젝트의 모든 과정을 순차적으로 실행하려면 `system_orchestrator.py`를 사용합니다.

```bash
python src/utils/system_orchestrator.py
```

### 3. 대시보드 실행

웹 브라우저에서 `dashboard/index.html` 파일을 열어 실시간 대시보드를 확인할 수 있습니다.

```bash
# 간단한 HTTP 서버 실행 (선택사항)
cd dashboard
python -m http.server 8000
# http://localhost:8000 에서 확인
```

### 4. 개별 스크립트 실행 (옵션)

특정 부분만 개별적으로 실행할 수도 있습니다. 예를 들어, 모델 훈련만 실행하려면:

```bash
python src/models/model_training.py
```

## 📂 프로젝트 구조

```
/
├── config/               # 프로젝트 설정 파일 (requirements.txt)
├── dashboard/            # 실시간 웹 대시보드
│   ├── index.html        # 메인 대시보드 페이지
│   ├── styles.css        # CSS 스타일시트
│   ├── dashboard.js      # JavaScript 로직
│   └── README.md         # 대시보드 문서
├── data/                 # 원본, 전처리, 모델 파일
├── docs/                 # 프로젝트 문서 및 리포트
│   ├── reports/          # 모델 분석, 테스트 결과 리포트
│   └── specifications/   # 데이터 명세 등
├── results/              # 분석 결과 시각화 자료
├── src/                  # 핵심 소스 코드
│   ├── analysis/         # 결과 분석 및 리포트 생성
│   ├── core/             # 데이터 수집, 전처리 등 핵심 기능
│   ├── models/           # 모델 훈련 및 관리
│   ├── testing/          # 모델 테스트 및 검증
│   └── utils/            # 시스템 총괄, 유틸리티
└── tests/                # 단위 테스트 코드 (추가 예정)
```

## 📈 결과 요약

### 모델 성능 비교

- **Gradient Boosting** 모델이 테스트 정확도 1.0, 오버피팅 지표 0.0으로 가장 우수한 성능을 보였습니다.
- 모든 모델이 97% 이상의 높은 테스트 정확도를 달성했습니다.

![모델 성능 분석](results/analysis/comprehensive_model_analysis.png)

### 특성 중요도

- **`volatility` (변동성)**, **`volume` (거래량)**, **`price_spike` (가격 급등)** 등이 이벤트 예측에 가장 중요한 영향을 미치는 특성으로 나타났습니다.

![특성 중요도](results/analysis/feature_importance.png)

## 🖥️ 실시간 대시보드

웹 기반 실시간 대시보드는 다음 기능들을 제공합니다:

- **시스템 상태 모니터링**: 모델 정확도, 처리 속도, 활성 모델 수 등 실시간 지표
- **예측 결과 표시**: 주요 종목들의 실시간 예측 결과 및 신뢰도
- **성능 추이 차트**: Chart.js 기반 인터랙티브 차트로 모델 성능 추이 시각화
- **시스템 로그**: 실시간 시스템 로그 스트리밍
- **특성 중요도**: 모델이 사용하는 특성들의 중요도 시각화

## 🔮 향후 개선 방향

- ✅ **실시간 대시보드**: Chart.js 기반 반응형 웹 대시보드 완료
- **모델 최적화**: 하이퍼파라미터 튜닝 및 최신 딥러닝 아키텍처(e.g., Transformer) 도입
- **WebSocket 연결**: 실시간 데이터 스트리밍을 위한 WebSocket 서버 구현
- **단위 테스트 코드**: 코드의 안정성 확보를 위한 `tests` 디렉토리 내 테스트 케이스 추가
