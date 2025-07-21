#!/usr/bin/env python3
"""
실시간 테스트 실행기
학습된 모델로 실시간 S&P500 이벤트 탐지 테스트
"""

import sys
import os
import json
import time
import pandas as pd
import numpy as np
import yfinance as yf
import joblib
import warnings
from datetime import datetime, timedelta
import logging

warnings.filterwarnings('ignore')

class RealTimePredictor:
    def __init__(self, data_dir='raw_data'):
        self.data_dir = data_dir
        self.models = {}
        self.test_results = []
        
        # 로깅 설정
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def load_best_model(self):
        """최고 성능 모델 로드"""
        try:
            # 성능 정보 로드
            with open(f'{self.data_dir}/model_performance.json', 'r') as f:
                performance = json.load(f)
            
            # 최고 성능 모델 찾기
            best_model_name = max(performance.keys(), key=lambda x: performance[x]['test_score'])
            best_score = performance[best_model_name]['test_score']
            
            # 모델 로드
            model_path = f'{self.data_dir}/{best_model_name}_model.pkl'
            if os.path.exists(model_path):
                self.models[best_model_name] = joblib.load(model_path)
                self.logger.info(f"✅ 최고 성능 모델 로드 완료: {best_model_name} (테스트 정확도: {best_score:.4f})")
                return True
            else:
                self.logger.error(f"❌ 모델 파일 없음: {model_path}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ 모델 로드 실패: {e}")
            return False
    
    def get_latest_data(self, ticker, period='2d'):
        """최신 시장 데이터 수집"""
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            
            if hist.empty:
                self.logger.warning(f"⚠️ {ticker}: 데이터 없음")
                return None
                
            return hist
            
        except Exception as e:
            self.logger.error(f"❌ {ticker} 데이터 수집 실패: {e}")
            return None
    
    def calculate_technical_indicators(self, ticker, hist):
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
            self.logger.error(f"❌ {ticker} 기술적 지표 계산 실패: {e}")
            return None
    
    def make_prediction(self, features):
        """예측 수행"""
        try:
            X = np.array(features).reshape(1, -1)
            
            predictions = {}
            for model_name, model in self.models.items():
                try:
                    # 예측 확률
                    pred_proba = model.predict_proba(X)[0]
                    pred_class = model.predict(X)[0]
                    
                    predictions[model_name] = {
                        'prediction': int(pred_class),
                        'event_probability': float(pred_proba[1]),
                        'confidence': float(np.max(pred_proba))
                    }
                    
                except Exception as e:
                    self.logger.error(f"❌ {model_name} 예측 실패: {e}")
                    
            return predictions
            
        except Exception as e:
            self.logger.error(f"❌ 예측 실패: {e}")
            return {}
    
    def run_single_test(self, tickers):
        """단일 테스트 실행"""
        test_timestamp = datetime.now()
        test_results = []
        
        self.logger.info(f"🚀 실시간 테스트 시작: {test_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        
        for ticker in tickers:
            self.logger.info(f"📊 {ticker} 분석 중...")
            
            # 데이터 수집
            hist = self.get_latest_data(ticker)
            if hist is None:
                continue
                
            # 기술적 지표 계산
            features = self.calculate_technical_indicators(ticker, hist)
            if features is None:
                continue
                
            # 예측 수행
            predictions = self.make_prediction(features)
            if not predictions:
                continue
                
            # 결과 저장
            result = {
                'ticker': ticker,
                'timestamp': test_timestamp.isoformat(),
                'current_price': float(hist['Close'].iloc[-1]),
                'features': features,
                'predictions': predictions
            }
            
            test_results.append(result)
            
            # 결과 출력
            for model_name, pred in predictions.items():
                event_prob = pred['event_probability']
                confidence = pred['confidence']
                
                # 알림 수준 결정
                if event_prob > 0.75:
                    level = "🔥 HIGH"
                elif event_prob > 0.65:
                    level = "⚠️ MEDIUM"
                elif event_prob > 0.5:
                    level = "📊 LOW"
                else:
                    level = "✅ NORMAL"
                    
                self.logger.info(
                    f"  {model_name}: {level} - "
                    f"이벤트 확률 {event_prob:.1%}, 신뢰도 {confidence:.1%}"
                )
        
        # 결과 저장
        results_file = f'{self.data_dir}/realtime_test_results.json'
        with open(results_file, 'w') as f:
            json.dump(test_results, f, indent=2)
            
        self.logger.info(f"💾 결과 저장 완료: {results_file}")
        return test_results
    
    def run_continuous_test(self, tickers, interval_minutes=5, duration_minutes=30):
        """지속적 테스트 실행"""
        self.logger.info(f"🔄 지속적 테스트 시작: {interval_minutes}분 간격, {duration_minutes}분 실행")
        
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        all_results = []
        
        while datetime.now() < end_time:
            try:
                # 단일 테스트 실행
                results = self.run_single_test(tickers)
                all_results.extend(results)
                
                # 다음 실행까지 대기
                self.logger.info(f"⏱️ {interval_minutes}분 대기 중...")
                time.sleep(interval_minutes * 60)
                
            except KeyboardInterrupt:
                self.logger.info("🛑 사용자에 의해 중단됨")
                break
            except Exception as e:
                self.logger.error(f"❌ 테스트 실행 중 오류: {e}")
                time.sleep(60)  # 오류 발생 시 1분 대기
        
        # 전체 결과 저장
        summary_file = f'{self.data_dir}/continuous_test_summary.json'
        with open(summary_file, 'w') as f:
            json.dump({
                'test_period': {
                    'start': start_time.isoformat(),
                    'end': datetime.now().isoformat(),
                    'duration_minutes': duration_minutes,
                    'interval_minutes': interval_minutes
                },
                'total_predictions': len(all_results),
                'results': all_results
            }, f, indent=2)
            
        self.logger.info(f"📋 전체 결과 저장 완료: {summary_file}")
        return all_results

def main():
    """메인 함수"""
    print("🎯 S&P500 실시간 이벤트 탐지 테스트")
    print("="*50)
    
    # 예측기 초기화
    predictor = RealTimePredictor()
    
    # 모델 로드
    if not predictor.load_best_model():
        print("❌ 모델 로드 실패. 먼저 모델을 학습하세요.")
        return
    
    # 테스트 종목
    tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
    
    print("\n테스트 모드를 선택하세요:")
    print("1. 단일 테스트 (현재 시점 1회)")
    print("2. 지속적 테스트 (30분간 5분 간격)")
    print("3. 커스텀 지속적 테스트")
    
    choice = input("\n선택 (1/2/3): ").strip()
    
    if choice == '1':
        # 단일 테스트
        results = predictor.run_single_test(tickers)
        print(f"\n✅ 테스트 완료! {len(results)}개 종목 분석됨")
        
    elif choice == '2':
        # 기본 지속적 테스트
        print("\n🔄 지속적 테스트 시작 (30분간 5분 간격)")
        print("중단하려면 Ctrl+C를 누르세요.")
        results = predictor.run_continuous_test(tickers, 5, 30)
        print(f"\n✅ 테스트 완료! 총 {len(results)}개 예측 수행됨")
        
    elif choice == '3':
        # 커스텀 지속적 테스트
        try:
            interval = int(input("예측 간격 (분): "))
            duration = int(input("실행 시간 (분): "))
            
            print(f"\n🔄 커스텀 테스트 시작 ({duration}분간 {interval}분 간격)")
            print("중단하려면 Ctrl+C를 누르세요.")
            results = predictor.run_continuous_test(tickers, interval, duration)
            print(f"\n✅ 테스트 완료! 총 {len(results)}개 예측 수행됨")
            
        except ValueError:
            print("❌ 잘못된 입력입니다.")
            
    else:
        print("❌ 잘못된 선택입니다.")

if __name__ == "__main__":
    main()