#!/usr/bin/env python3
"""
단일 실시간 테스트 실행
"""

import os
import json
import pandas as pd
import numpy as np
import yfinance as yf
import joblib
import warnings
from datetime import datetime

warnings.filterwarnings('ignore')

def load_best_model():
    """최고 성능 모델 로드"""
    try:
        # 성능 정보 로드
        with open('raw_data/model_performance.json', 'r') as f:
            performance = json.load(f)
        
        # 최고 성능 모델 찾기
        best_model_name = max(performance.keys(), key=lambda x: performance[x]['test_score'])
        best_score = performance[best_model_name]['test_score']
        
        # 모델 로드
        model_path = f'raw_data/{best_model_name}_model.pkl'
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            print(f"✅ 최고 성능 모델 로드 완료: {best_model_name} (테스트 정확도: {best_score:.4f})")
            return model, best_model_name
        else:
            print(f"❌ 모델 파일 없음: {model_path}")
            return None, None
            
    except Exception as e:
        print(f"❌ 모델 로드 실패: {e}")
        return None, None

def get_latest_data(ticker, period='2d'):
    """최신 시장 데이터 수집"""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        
        if hist.empty:
            print(f"⚠️ {ticker}: 데이터 없음")
            return None
            
        return hist
        
    except Exception as e:
        print(f"❌ {ticker} 데이터 수집 실패: {e}")
        return None

def calculate_features(ticker, hist):
    """기술적 지표 계산"""
    try:
        # 최신 데이터 포인트
        latest = hist.iloc[-1]
        
        # 기본 데이터
        close_prices = hist['Close'].values
        volumes = hist['Volume'].values
        
        # 이동평균
        sma_20 = np.mean(close_prices[-20:]) if len(close_prices) >= 20 else close_prices[-1]
        sma_50 = np.mean(close_prices[-50:]) if len(close_prices) >= 50 else close_prices[-1]
        
        # RSI 계산
        price_changes = np.diff(close_prices)
        gains = np.where(price_changes > 0, price_changes, 0)
        losses = np.where(price_changes < 0, -price_changes, 0)
        avg_gain = np.mean(gains[-14:]) if len(gains) >= 14 else 0
        avg_loss = np.mean(losses[-14:]) if len(losses) >= 14 else 0.001
        rsi = 100 - (100 / (1 + avg_gain / avg_loss))
        
        # 변동성
        volatility = np.std(close_prices[-20:]) if len(close_prices) >= 20 else 0
        
        # 변화율
        price_change = (close_prices[-1] - close_prices[-2]) / close_prices[-2] if len(close_prices) >= 2 else 0
        volume_change = (volumes[-1] - volumes[-2]) / volumes[-2] if len(volumes) >= 2 else 0
        
        # 특성 벡터
        features = [
            latest['Open'],
            latest['High'],
            latest['Low'],
            latest['Close'],
            latest['Volume'],
            sma_20,
            sma_50,
            rsi,
            0,  # MACD (간단히 0으로 설정)
            sma_20 + 2 * volatility,  # BB Upper
            sma_20 - 2 * volatility,  # BB Lower
            volatility,  # ATR
            volatility,
            0,  # OBV (간단히 0으로 설정)
            price_change,
            volume_change,
            1 if volume_change > 2 else 0,  # unusual_volume
            1 if abs(price_change) > 0.05 else 0,  # price_spike
            0,  # news_sentiment
            0,  # news_polarity
            0   # news_count
        ]
        
        return features
        
    except Exception as e:
        print(f"❌ {ticker} 기술적 지표 계산 실패: {e}")
        return None

def make_prediction(model, features):
    """예측 수행"""
    try:
        X = np.array(features).reshape(1, -1)
        
        # 예측 확률
        pred_proba = model.predict_proba(X)[0]
        pred_class = model.predict(X)[0]
        
        return {
            'prediction': int(pred_class),
            'event_probability': float(pred_proba[1]),
            'confidence': float(np.max(pred_proba))
        }
        
    except Exception as e:
        print(f"❌ 예측 실패: {e}")
        return None

def main():
    """메인 함수"""
    print("🎯 S&P500 실시간 이벤트 탐지 테스트")
    print("="*50)
    
    # 모델 로드
    model, model_name = load_best_model()
    if model is None:
        print("❌ 모델 로드 실패. 먼저 모델을 학습하세요.")
        return
    
    # 테스트 종목
    tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
    
    test_timestamp = datetime.now()
    test_results = []
    
    print(f"\n🚀 실시간 테스트 시작: {test_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    
    for ticker in tickers:
        print(f"\n📊 {ticker} 분석 중...")
        
        # 데이터 수집
        hist = get_latest_data(ticker)
        if hist is None:
            continue
            
        # 기술적 지표 계산
        features = calculate_features(ticker, hist)
        if features is None:
            continue
            
        # 예측 수행
        prediction = make_prediction(model, features)
        if prediction is None:
            continue
            
        # 결과 저장
        current_price = float(hist['Close'].iloc[-1])
        result = {
            'ticker': ticker,
            'timestamp': test_timestamp.isoformat(),
            'current_price': current_price,
            'model': model_name,
            'prediction': prediction
        }
        
        test_results.append(result)
        
        # 결과 출력
        event_prob = prediction['event_probability']
        confidence = prediction['confidence']
        
        # 알림 수준 결정
        if event_prob > 0.75:
            level = "🔥 HIGH"
            action = "주의 깊게 모니터링 필요"
        elif event_prob > 0.65:
            level = "⚠️ MEDIUM"
            action = "모니터링 권장"
        elif event_prob > 0.5:
            level = "📊 LOW"
            action = "일반적인 관찰"
        else:
            level = "✅ NORMAL"
            action = "정상 상태"
            
        print(f"  현재 가격: ${current_price:.2f}")
        print(f"  예측 결과: {level}")
        print(f"  이벤트 확률: {event_prob:.1%}")
        print(f"  신뢰도: {confidence:.1%}")
        print(f"  권장 조치: {action}")
    
    # 결과 저장
    results_file = 'raw_data/realtime_test_results.json'
    with open(results_file, 'w') as f:
        json.dump({
            'test_timestamp': test_timestamp.isoformat(),
            'model_used': model_name,
            'total_predictions': len(test_results),
            'results': test_results
        }, f, indent=2)
        
    print(f"\n💾 결과 저장 완료: {results_file}")
    print(f"✅ 테스트 완료! {len(test_results)}개 종목 분석됨")

if __name__ == "__main__":
    main()