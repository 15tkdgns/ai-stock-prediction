# 대시보드 서버 개선 사항

## 📋 개선 개요

AI 주식 예측 대시보드의 서버 실행 방식을 대폭 개선하여 더 편리하고 안정적인 개발 환경을 제공합니다.

## 🎯 주요 개선 사항

### 1. 스마트 포트 관리
- **자동 포트 감지**: 기본 포트 8080부터 시작하여 사용 가능한 포트 자동 탐색
- **충돌 해결**: 포트가 사용 중일 때 자동으로 8081, 8082... 순서로 시도
- **범위 제한**: 포트 9000까지 검색하여 안전한 범위 내에서 실행

### 2. 프로세스 관리
- **기존 서버 감지**: 실행 중인 서버 프로세스 자동 감지
- **선택적 종료**: `--force` 옵션으로 기존 프로세스 강제 종료 가능
- **상태 표시**: 현재 포트 사용 상황을 명확하게 표시

### 3. 다중 서버 지원
- **http-server**: CORS 지원, 캐싱 제어 (권장)
- **serve**: 정적 파일 최적화, 프로덕션 유사 환경
- **Python**: 기본 기능, 의존성 최소화

### 4. 사용자 경험 개선
- **컬러 이모지**: 시각적으로 구분되는 상태 메시지
- **명확한 안내**: 각 단계별 상태와 접속 URL 표시
- **도움말**: `--help` 옵션으로 상세 사용법 제공

## 📁 추가된 파일들

### `dashboard/start-dev.sh`
- 스마트 서버 시작 스크립트
- 포트 충돌 해결 로직
- 다중 서버 타입 지원
- 프로세스 관리 기능

### 개선된 `package.json`
```json
{
  "scripts": {
    "dev": "./start-dev.sh http-server",
    "serve": "./start-dev.sh serve", 
    "dev:force": "./start-dev.sh http-server --force",
    "dev:simple": "npx http-server -p 8080 -c-1 --cors",
    "serve:simple": "npx serve -s . -p 8080",
    "python-server": "./start-dev.sh python"
  }
}
```

## 🚀 사용 방법

### 기본 사용법
```bash
cd dashboard
npm run dev        # 스마트 http-server (권장)
npm run serve      # 스마트 serve
```

### 고급 사용법
```bash
npm run dev:force         # 기존 서버 강제 종료 후 시작
./start-dev.sh http-server --force  # 직접 실행
./start-dev.sh --help     # 도움말 보기
```

### 문제 해결
```bash
# 포트 충돌 시
npm run dev:force

# 특정 서버 타입 선택
./start-dev.sh serve      # serve 사용
./start-dev.sh python     # Python 서버 사용
```

## 📊 서버 비교표

| 서버 | 장점 | 단점 | 권장 용도 |
|------|------|------|-----------|
| **http-server** | CORS 지원, 빠른 시작 | 기본 기능만 제공 | 일반 개발 |
| **serve** | 정적 파일 최적화, SPA 지원 | 설정 복잡 | 프로덕션 유사 환경 |
| **Python** | 의존성 없음, 안정적 | 기능 제한적 | 간단한 테스트 |

## 🔧 기술적 세부사항

### 포트 감지 로직
```bash
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 포트 사용 중
    else
        return 1  # 포트 사용 가능
    fi
}
```

### 자동 포트 탐색
- 시작 포트: 8080
- 종료 포트: 9000  
- 증가값: 1
- 탐색 방식: 순차적

### 프로세스 관리
- `lsof` 명령어로 포트 사용 프로세스 감지
- `kill -9` 명령어로 강제 종료
- 2초 대기 후 포트 재확인

## 📈 성능 및 안정성

### 개선된 점
- **시작 시간**: 포트 충돌 시 수동 개입 불필요
- **안정성**: 기존 프로세스와의 충돌 방지
- **사용성**: 한 명령어로 안정적인 서버 실행

### 호환성
- **운영체제**: Linux, macOS, WSL
- **Node.js**: 14+ (npx 지원 버전)
- **Python**: 3.6+ (기본 http.server 사용)

## 🎉 마이그레이션 가이드

### 기존 방식 → 새로운 방식
```bash
# 기존
cd dashboard && python3 server.py
cd dashboard && python3 -m http.server 8080

# 새로운 방식 (권장)
cd dashboard && npm run dev
```

### 기존 스크립트 호환성
- `npm run dev:simple`: 기존 방식과 동일한 동작
- `npm run python-server`: Python 서버 유지
- 기존 `server.py` 파일도 계속 사용 가능

## 🔮 향후 계획

- [ ] WebSocket 서버 통합
- [ ] 환경 변수 기반 설정
- [ ] Docker 컨테이너 지원
- [ ] 개발/프로덕션 모드 구분
- [ ] 자동 브라우저 열기 기능

---

*이 개선사항은 개발자의 생산성 향상과 안정적인 개발 환경 제공을 목표로 구현되었습니다.*