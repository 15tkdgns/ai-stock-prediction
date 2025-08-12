#!/bin/bash

# AI Stock Dashboard - Smart Development Server Starter
# 포트 충돌을 자동으로 해결하고 최적의 서버를 실행합니다.

set -e

DEFAULT_PORT=8080
SERVER_TYPE=${1:-"http-server"}  # http-server, serve, python
FORCE_KILL=${2:-false}

echo "🚀 AI Stock Dashboard 개발 서버를 시작합니다..."

# 포트 사용 중인지 확인하는 함수
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 포트 사용 중
    else
        return 1  # 포트 사용 가능
    fi
}

# 사용 가능한 포트 찾기
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $port -le 9000 ]; do
        if ! check_port $port; then
            echo $port
            return
        fi
        port=$((port + 1))
    done
    
    echo "8080"  # 기본값 반환
}

# 기존 프로세스 정리
cleanup_existing_servers() {
    echo "🔍 기존 서버 프로세스를 확인합니다..."
    
    if check_port $DEFAULT_PORT; then
        local pid=$(lsof -ti:$DEFAULT_PORT)
        if [ ! -z "$pid" ]; then
            echo "⚠️  포트 $DEFAULT_PORT이 이미 사용 중입니다 (PID: $pid)"
            
            if [ "$FORCE_KILL" = "true" ] || [ "$FORCE_KILL" = "--force" ]; then
                echo "🛑 기존 프로세스를 종료합니다..."
                kill -9 $pid 2>/dev/null || true
                sleep 2
            else
                echo "💡 다른 포트를 사용합니다..."
                AVAILABLE_PORT=$(find_available_port $((DEFAULT_PORT + 1)))
                DEFAULT_PORT=$AVAILABLE_PORT
            fi
        fi
    fi
}

# 서버 시작 함수들
start_http_server() {
    local port=$1
    echo "📡 http-server를 포트 $port에서 시작합니다..."
    npx http-server -p $port -c-1 --cors
}

start_serve() {
    local port=$1
    echo "🌐 serve를 포트 $port에서 시작합니다..."
    npx serve -s . -p $port
}

start_python_server() {
    local port=$1
    echo "🐍 Python 서버를 포트 $port에서 시작합니다..."
    if [ -f "server.py" ]; then
        # server.py의 PORT를 동적으로 변경
        sed -i "s/PORT = [0-9]*/PORT = $port/" server.py
        python3 server.py
    else
        python3 -m http.server $port
    fi
}

# 메인 실행 로직
main() {
    cleanup_existing_servers
    
    echo "🎯 서버 타입: $SERVER_TYPE"
    echo "🔌 포트: $DEFAULT_PORT"
    echo "🌐 주소: http://localhost:$DEFAULT_PORT"
    echo ""
    
    case $SERVER_TYPE in
        "http-server"|"http")
            start_http_server $DEFAULT_PORT
            ;;
        "serve"|"s")
            start_serve $DEFAULT_PORT
            ;;
        "python"|"py")
            start_python_server $DEFAULT_PORT
            ;;
        *)
            echo "❌ 알 수 없는 서버 타입: $SERVER_TYPE"
            echo "사용 가능한 옵션: http-server, serve, python"
            exit 1
            ;;
    esac
}

# 도움말 표시
show_help() {
    cat << EOF
사용법: $0 [서버타입] [옵션]

서버 타입:
  http-server, http    - http-server 사용 (기본값, 권장)
  serve, s            - serve 사용
  python, py          - Python 서버 사용

옵션:
  --force            - 기존 서버 프로세스 강제 종료

예제:
  $0                   # http-server로 시작
  $0 serve             # serve로 시작
  $0 python --force    # Python 서버로 시작 (기존 프로세스 종료)

EOF
}

# 인수 처리
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 스크립트 실행
main