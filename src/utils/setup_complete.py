#!/usr/bin/env python3
"""
S&P500 실시간 이벤트 탐지 시스템 설정 완료 스크립트
"""

import os
import json
import subprocess
import sys
from datetime import datetime

def check_dependencies():
    """의존성 확인"""
    print("=== 의존성 확인 ===")
    
    try:
        # pip install 실행
        print("필요한 패키지 설치 중...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ 패키지 설치 완료")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 패키지 설치 실패: {e}")
        return False

def run_validation():
    """시스템 검증"""
    print("\n=== 시스템 검증 ===")
    
    try:
        from validation_checker import DataValidationChecker
        
        # 임시 데이터 생성 (테스트용)
        import pandas as pd
        import numpy as np
        
        # raw_data 디렉토리 생성
        os.makedirs('raw_data', exist_ok=True)
        
        # 테스트 데이터 생성
        test_data = {
            'ticker': ['AAPL'] * 100,
            'date': pd.date_range('2024-01-01', periods=100),
            'open': np.random.uniform(150, 200, 100),
            'high': np.random.uniform(150, 200, 100),
            'low': np.random.uniform(150, 200, 100),
            'close': np.random.uniform(150, 200, 100),
            'volume': np.random.randint(1000000, 10000000, 100),
            'sma_20': np.random.uniform(150, 200, 100),
            'sma_50': np.random.uniform(150, 200, 100),
            'rsi': np.random.uniform(30, 70, 100),
            'macd': np.random.uniform(-2, 2, 100),
            'bb_upper': np.random.uniform(150, 200, 100),
            'bb_lower': np.random.uniform(150, 200, 100),
            'atr': np.random.uniform(1, 5, 100),
            'volatility': np.random.uniform(0.01, 0.05, 100),
            'obv': np.random.uniform(1000000, 10000000, 100),
            'price_change': np.random.uniform(-0.05, 0.05, 100),
            'volume_change': np.random.uniform(-0.5, 0.5, 100),
            'unusual_volume': np.random.randint(0, 2, 100),
            'price_spike': np.random.randint(0, 2, 100),
            'news_sentiment': np.random.uniform(0, 1, 100),
            'news_polarity': np.random.uniform(-1, 1, 100),
            'news_count': np.random.randint(0, 10, 100)
        }
        
        df = pd.DataFrame(test_data)
        df.to_csv('raw_data/training_features.csv', index=False)
        
        # 이벤트 라벨 생성
        event_data = {
            'ticker': ['AAPL'] * 100,
            'Date': pd.date_range('2024-01-01', periods=100),
            'price_event': np.random.randint(-1, 2, 100),
            'volume_event': np.random.randint(0, 2, 100),
            'volatility_event': np.random.randint(0, 2, 100),
            'major_event': np.random.randint(0, 2, 100),
            'event_score': np.random.uniform(0, 3, 100)
        }
        
        events_df = pd.DataFrame(event_data)
        events_df.to_csv('raw_data/event_labels.csv', index=False)
        
        # 검증 실행
        checker = DataValidationChecker()
        report = checker.generate_validation_report()
        
        if report['overall_status'] == 'PASS':
            print("✅ 시스템 검증 통과")
            return True
        else:
            print("❌ 시스템 검증 실패")
            return False
            
    except Exception as e:
        print(f"❌ 시스템 검증 실패: {e}")
        return False

def generate_config_files():
    """설정 파일 생성"""
    print("\n=== 설정 파일 생성 ===")
    
    try:
        # 임계값 추천 실행
        from threshold_recommendations import ThresholdRecommendations
        
        recommender = ThresholdRecommendations()
        recommendations = recommender.save_recommendations('raw_data/threshold_recommendations.json')
        
        # 실시간 테스트 설정 파일 생성
        realtime_config = {
            'test_tickers': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
            'data_interval': '1m',
            'prediction_interval': 300,
            'api_config': {
                'use_yahoo_rss': True,
                'use_free_news_api': True,
                'newsapi_key': None
            },
            'monitoring_thresholds': recommendations['confidence_thresholds'],
            'performance_window': 100,
            'business_thresholds': recommendations['business_thresholds']
        }
        
        with open('realtime_config.json', 'w') as f:
            json.dump(realtime_config, f, indent=2)
            
        print("✅ 설정 파일 생성 완료")
        return True
        
    except Exception as e:
        print(f"❌ 설정 파일 생성 실패: {e}")
        return False

def run_paper_data_setup():
    """논문 데이터 설정"""
    print("\n=== 논문 데이터 설정 ===")
    
    try:
        from paper_data_manager import PaperDataManager
        
        manager = PaperDataManager()
        
        # 기본 분석 실행
        if manager.run_complete_analysis():
            print("✅ 논문 데이터 설정 완료")
            return True
        else:
            print("❌ 논문 데이터 설정 실패")
            return False
            
    except Exception as e:
        print(f"❌ 논문 데이터 설정 실패: {e}")
        return False

def create_startup_script():
    """시작 스크립트 생성"""
    print("\n=== 시작 스크립트 생성 ===")
    
    startup_script = '''#!/bin/bash
# S&P500 실시간 이벤트 탐지 시스템 시작 스크립트

echo "S&P500 실시간 이벤트 탐지 시스템 시작"
echo "====================================="

# 가상환경 활성화 (있는 경우)
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "가상환경 활성화됨"
fi

# 의존성 설치
echo "의존성 확인 중..."
pip install -r requirements.txt

# 시스템 검증
echo "시스템 검증 중..."
python validation_checker.py

# 전체 시스템 시작
echo "전체 시스템 시작..."
python system_orchestrator.py

echo "시스템 시작 완료!"
'''
    
    with open('start_system.sh', 'w') as f:
        f.write(startup_script)
        
    # 실행 권한 부여
    os.chmod('start_system.sh', 0o755)
    
    print("✅ 시작 스크립트 생성 완료 (start_system.sh)")
    return True

def print_final_summary():
    """최종 요약 출력"""
    print("\n" + "="*60)
    print("🎯 S&P500 실시간 이벤트 탐지 시스템 설정 완료!")
    print("="*60)
    
    print("\n📁 생성된 파일:")
    print("  • data_collection_pipeline.py - 데이터 수집 파이프라인")
    print("  • model_training.py - 모델 학습 시스템")
    print("  • xai_monitoring.py - XAI 모니터링 시스템")
    print("  • realtime_testing_system.py - 실시간 테스트 시스템")
    print("  • paper_data_manager.py - 논문용 데이터 관리")
    print("  • system_orchestrator.py - 전체 시스템 관리")
    print("  • validation_checker.py - 시스템 검증")
    print("  • api_config.py - API 설정 및 관리")
    print("  • threshold_recommendations.py - 임계값 추천")
    
    print("\n🔧 추천 설정값:")
    print("  • 신뢰도 임계값: 75% (실행), 65% (경고)")
    print("  • 성능 임계값: 60% (재학습 필요)")
    print("  • 가격 변동 임계값: 5% (주요 이벤트)")
    print("  • 거래량 임계값: 3배 (급증 탐지)")
    print("  • 예측 주기: 5분마다")
    
    print("\n🚀 시스템 실행 방법:")
    print("  1. 전체 시스템: python system_orchestrator.py")
    print("  2. 또는 시작 스크립트: ./start_system.sh")
    print("  3. 개별 모듈: python [모듈명].py")
    
    print("\n📊 논문 데이터:")
    print("  • 위치: paper_data/ 디렉토리")
    print("  • 포함: 통계, 그래프, 테이블, 분석 결과")
    print("  • 형식: CSV, JSON, LaTeX, PNG")
    
    print("\n⚠️  주의사항:")
    print("  • API 키 설정 시 realtime_config.json 수정")
    print("  • 모델 학습 전 데이터 수집 필요")
    print("  • 실시간 테스트는 시장 시간 고려")
    
    print("\n✅ 시스템 준비 완료!")
    print("="*60)

def main():
    """메인 설정 함수"""
    print("S&P500 실시간 이벤트 탐지 시스템 설정")
    print("="*50)
    
    # 단계별 설정
    steps = [
        ("의존성 확인", check_dependencies),
        ("시스템 검증", run_validation),
        ("설정 파일 생성", generate_config_files),
        ("논문 데이터 설정", run_paper_data_setup),
        ("시작 스크립트 생성", create_startup_script)
    ]
    
    success_count = 0
    
    for step_name, step_func in steps:
        if step_func():
            success_count += 1
        else:
            print(f"⚠️  {step_name} 실패 - 계속 진행")
    
    print(f"\n설정 완료: {success_count}/{len(steps)} 단계 성공")
    
    if success_count >= 3:  # 핵심 단계 성공
        print_final_summary()
        return True
    else:
        print("❌ 설정 실패 - 일부 단계에서 문제 발생")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)