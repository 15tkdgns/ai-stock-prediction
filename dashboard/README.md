# 프로젝트 대시보드

AI 주식 예측 시스템을 위한 실시간 모니터링 대시보드입니다.

## 기능

### 실시간 모니터링
- 시스템 상태 실시간 업데이트
- 모델 성능 지표 모니터링
- 실시간 예측 결과 표시
- 시스템 로그 실시간 스트리밍

### 데이터 시각화
- Chart.js를 이용한 인터랙티브 차트
- 모델 성능 추이 그래프
- 거래량 분석 차트
- 모델 비교 레이더 차트

### 반응형 디자인
- 모바일 및 태블릿 지원
- 유연한 그리드 레이아웃
- 터치 친화적 인터페이스

## 파일 구조

```
dashboard/
├── index.html          # 메인 대시보드 페이지
├── styles.css          # CSS 스타일시트
├── dashboard.js        # JavaScript 메인 로직
└── README.md          # 이 파일
```

## 사용 방법

1. 웹 서버에서 index.html 파일을 실행
2. 대시보드가 자동으로 데이터를 로드하고 실시간 업데이트 시작
3. 각 위젯을 클릭하여 상세 정보 확인 가능

## 데이터 연동

대시보드는 다음 경로의 JSON 파일들과 연동됩니다:

- `../data/raw/system_status.json` - 시스템 상태
- `../data/raw/realtime_results.json` - 실시간 예측 결과
- `../data/raw/monitoring_dashboard.json` - 모니터링 데이터
- `../data/raw/realtime_testing.log` - 실시간 테스트 로그
- `../data/raw/system_orchestrator.log` - 시스템 오케스트레이터 로그

파일이 없을 경우 모의 데이터가 자동으로 생성됩니다.

## 기술 스택

- **HTML5** - 시맨틱 마크업
- **CSS3** - Flexbox/Grid 레이아웃, 그라데이션, 애니메이션
- **JavaScript (ES6+)** - 모듈 방식, async/await
- **Chart.js** - 차트 라이브러리
- **Fetch API** - 데이터 로딩

## 브라우저 지원

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 커스터마이징

### 업데이트 간격 변경
```javascript
// dashboard.js에서 수정
this.updateInterval = 5000; // 밀리초 단위 (기본값: 5초)
```

### 색상 테마 변경
```css
/* styles.css에서 CSS 변수 수정 */
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #27ae60;
    --warning-color: #f39c12;
    --danger-color: #e74c3c;
}
```

### 차트 설정 수정
```javascript
// dashboard.js의 setupCharts() 메소드에서 Chart.js 옵션 수정
```

## 실시간 연결

WebSocket 서버가 실행 중이면 실시간 데이터 스트리밍이 가능합니다:

```javascript
// WebSocket 서버 URL 설정
const ws = new WebSocket('ws://localhost:8080/dashboard');
```

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.