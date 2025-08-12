import os
import numpy as np
import json
import yfinance as yf
from datetime import datetime
import time
import threading
import queue
import logging
from collections import deque
import joblib
import warnings

warnings.filterwarnings("ignore")


class RealTimeTestingSystem:
    def __init__(self, data_dir="raw_data", config_file="realtime_config.json"):
        self.data_dir = data_dir
        self.config_file = config_file
        self.models = {}
        self.scaler = None
        self.is_running = False
        self.data_queue = queue.Queue()
        self.prediction_history = deque(maxlen=1000)
        self.performance_metrics = {}

        # 로깅 설정
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(f"{data_dir}/realtime_testing.log"),
                logging.StreamHandler(),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def load_config(self):
        """설정 파일 로드"""
        try:
            with open(self.config_file, "r") as f:
                config = json.load(f)

            return config

        except FileNotFoundError:
            # 기본 설정 생성
            default_config = {
                "test_tickers": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
                "data_interval": "1m",  # 1분 간격
                "prediction_interval": 300,  # 5분마다 예측
                "api_config": {
                    "use_yahoo_rss": True,
                    "use_free_news_api": True,
                    "newsapi_key": None,
                },
                "monitoring_thresholds": {
                    "confidence_threshold": 0.75,  # 추천 신뢰도 임계값
                    "warning_threshold": 0.65,  # 경고 임계값
                    "action_threshold": 0.75,  # 실행 임계값
                    "drift_threshold": 0.1,  # 드리프트 임계값
                    "retrain_accuracy_threshold": 0.60,  # 재학습 정확도 임계값
                },
                "performance_window": 100,  # 성능 계산 윈도우
                "business_thresholds": {
                    "price_change_major": 0.05,  # 주요 가격 변동 5%
                    "volume_spike": 3.0,  # 거래량 급증 3배
                    "volatility_high": 0.9,  # 변동성 상위 10%
                },
            }

            with open(self.config_file, "w") as f:
                json.dump(default_config, f, indent=2)

            self.logger.info(f"기본 설정 파일 생성: {self.config_file}")
            return default_config

    def load_trained_models(self):
        """학습된 모델 로드"""
        try:
            # Random Forest 모델
            if os.path.exists(f"{self.data_dir}/random_forest_model.pkl"):
                self.models["random_forest"] = joblib.load(
                    f"{self.data_dir}/random_forest_model.pkl"
                )
                self.logger.info("Random Forest 모델 로드 완료")

            # Gradient Boosting 모델
            if os.path.exists(f"{self.data_dir}/gradient_boosting_model.pkl"):
                self.models["gradient_boosting"] = joblib.load(
                    f"{self.data_dir}/gradient_boosting_model.pkl"
                )
                self.logger.info("Gradient Boosting 모델 로드 완료")

            # 스케일러
            if os.path.exists(f"{self.data_dir}/scaler.pkl"):
                self.scaler = joblib.load(f"{self.data_dir}/scaler.pkl")
                self.logger.info("스케일러 로드 완료")

            if not self.models:
                self.logger.error("로드된 모델이 없습니다")
                return False

            return True

        except Exception as e:
            self.logger.error(f"모델 로드 실패: {e}")
            return False

    def collect_realtime_data(self, ticker, period="1d", interval="1m"):
        """실시간 데이터 수집 (API Manager 사용)"""
        try:
            from api_config import APIManager

            api_manager = APIManager()

            # 시장 데이터 수집
            hist = api_manager.get_market_data(ticker, period, interval)

            if hist is None or hist.empty:
                self.logger.warning(f"{ticker}: 시장 데이터 없음")
                return None

            # 뉴스 데이터 수집
            news_data = api_manager.get_news_data(ticker, limit=5)

            # 뉴스 감성 평균 계산
            if news_data:
                avg_sentiment = np.mean([n["sentiment_score"] for n in news_data])
                avg_polarity = np.mean([n["polarity"] for n in news_data])
                news_count = len(news_data)
            else:
                avg_sentiment = 0
                avg_polarity = 0
                news_count = 0

            return self._calculate_features(
                ticker, hist, avg_sentiment, avg_polarity, news_count
            )

        except Exception as e:
            self.logger.error(f"{ticker} 실시간 데이터 수집 실패: {e}")
            return self._fallback_data_collection(ticker, period, interval)

    def _fallback_data_collection(self, ticker, period="1d", interval="1m"):
        """백업 데이터 수집 방법"""
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period, interval=interval)

            if hist.empty:
                return None

            return self._calculate_features(ticker, hist, 0, 0, 0)

        except Exception as e:
            self.logger.error(f"{ticker} 백업 데이터 수집 실패: {e}")
            return None

    def _calculate_features(
        self, ticker, hist, avg_sentiment, avg_polarity, news_count
    ):
        """기술적 지표 계산 및 특성 벡터 생성"""
        try:
            # 최신 데이터 포인트
            latest_data = hist.iloc[-1]

            # 기술적 지표 계산
            close_prices = hist["Close"].values
            volumes = hist["Volume"].values

            # 이동평균
            sma_20 = (
                np.mean(close_prices[-20:])
                if len(close_prices) >= 20
                else close_prices[-1]
            )
            sma_50 = (
                np.mean(close_prices[-50:])
                if len(close_prices) >= 50
                else close_prices[-1]
            )

            # RSI (단순 버전)
            price_changes = np.diff(close_prices)
            gains = np.where(price_changes > 0, price_changes, 0)
            losses = np.where(price_changes < 0, -price_changes, 0)
            avg_gain = np.mean(gains[-14:]) if len(gains) >= 14 else 0
            avg_loss = np.mean(losses[-14:]) if len(losses) >= 14 else 0.001
            rsi = 100 - (100 / (1 + avg_gain / avg_loss))

            # 변동성
            volatility = np.std(close_prices[-20:]) if len(close_prices) >= 20 else 0

            # 거래량 변화
            volume_change = (
                (volumes[-1] - volumes[-2]) / volumes[-2] if len(volumes) >= 2 else 0
            )

            # 가격 변화
            price_change = (
                (close_prices[-1] - close_prices[-2]) / close_prices[-2]
                if len(close_prices) >= 2
                else 0
            )

            # 특성 벡터 생성
            features = {
                "ticker": ticker,
                "timestamp": datetime.now().isoformat(),
                "open": latest_data["Open"],
                "high": latest_data["High"],
                "low": latest_data["Low"],
                "close": latest_data["Close"],
                "volume": latest_data["Volume"],
                "sma_20": sma_20,
                "sma_50": sma_50,
                "rsi": rsi,
                "macd": 0,  # 복잡한 계산 생략
                "bb_upper": sma_20 + 2 * volatility,
                "bb_lower": sma_20 - 2 * volatility,
                "atr": volatility,
                "volatility": volatility,
                "obv": 0,  # 복잡한 계산 생략
                "price_change": price_change,
                "volume_change": volume_change,
                "unusual_volume": 1 if volume_change > 2 else 0,
                "price_spike": 1 if abs(price_change) > 0.05 else 0,
                "news_sentiment": avg_sentiment,
                "news_polarity": avg_polarity,
                "news_count": news_count,
            }

            return features

        except Exception as e:
            self.logger.error(f"{ticker} 특성 계산 실패: {e}")
            return None

    def make_prediction(self, features):
        """예측 수행"""
        try:
            # 특성 벡터 준비
            feature_names = [
                "open",
                "high",
                "low",
                "close",
                "volume",
                "sma_20",
                "sma_50",
                "rsi",
                "macd",
                "bb_upper",
                "bb_lower",
                "atr",
                "volatility",
                "obv",
                "price_change",
                "volume_change",
                "unusual_volume",
                "price_spike",
                "news_sentiment",
                "news_polarity",
                "news_count",
            ]

            X = np.array([features[name] for name in feature_names]).reshape(1, -1)

            # 스케일링
            if self.scaler:
                X = self.scaler.transform(X)

            predictions = {}

            # 각 모델로 예측
            for model_name, model in self.models.items():
                try:
                    pred_proba = model.predict_proba(X)[0]
                    pred_class = model.predict(X)[0]

                    predictions[model_name] = {
                        "prediction": int(pred_class),
                        "probability": float(pred_proba[1]),  # 이벤트 발생 확률
                        "confidence": float(np.max(pred_proba)),
                    }

                except Exception as e:
                    self.logger.error(f"{model_name} 예측 실패: {e}")

            return predictions

        except Exception as e:
            self.logger.error(f"예측 실패: {e}")
            return {}

    def evaluate_prediction_performance(self, ticker, actual_event=None):
        """예측 성능 평가"""
        try:
            if ticker not in self.performance_metrics:
                self.performance_metrics[ticker] = {
                    "total_predictions": 0,
                    "correct_predictions": 0,
                    "false_positives": 0,
                    "false_negatives": 0,
                    "confidence_scores": [],
                }

            metrics = self.performance_metrics[ticker]

            # 최근 예측 가져오기
            recent_predictions = [
                p for p in self.prediction_history if p["ticker"] == ticker
            ]

            if not recent_predictions:
                return metrics

            latest_pred = recent_predictions[-1]

            # 실제 이벤트 발생 확인 (간단한 버전)
            if actual_event is None:
                # 5% 이상 가격 변동을 이벤트로 간주
                # 여기서는 실제 검증 로직 구현 필요
                actual_event = 0  # 임시값

            # 성능 메트릭 업데이트
            metrics["total_predictions"] += 1

            for model_name, pred in latest_pred["predictions"].items():
                if pred["prediction"] == actual_event:
                    metrics["correct_predictions"] += 1
                elif pred["prediction"] == 1 and actual_event == 0:
                    metrics["false_positives"] += 1
                elif pred["prediction"] == 0 and actual_event == 1:
                    metrics["false_negatives"] += 1

                metrics["confidence_scores"].append(pred["confidence"])

            # 정확도 계산
            if metrics["total_predictions"] > 0:
                metrics["accuracy"] = (
                    metrics["correct_predictions"] / metrics["total_predictions"]
                )
                metrics["avg_confidence"] = np.mean(metrics["confidence_scores"])

            return metrics

        except Exception as e:
            self.logger.error(f"성능 평가 실패: {e}")
            return {}

    def run_continuous_testing(self, tickers, interval=300):
        """지속적 테스트 실행"""
        self.logger.info(f"실시간 테스트 시작: {tickers}")
        self.is_running = True

        while self.is_running:
            try:
                for ticker in tickers:
                    # 실시간 데이터 수집
                    features = self.collect_realtime_data(ticker)

                    if features:
                        # 예측 수행
                        predictions = self.make_prediction(features)

                        # 결과 저장
                        result = {
                            "ticker": ticker,
                            "timestamp": datetime.now().isoformat(),
                            "features": features,
                            "predictions": predictions,
                        }

                        self.prediction_history.append(result)

                        # 로그 출력
                        for model_name, pred in predictions.items():
                            self.logger.info(
                                f"{ticker} - {model_name}: "
                                f"이벤트 확률 {pred['probability']:.3f}, "
                                f"신뢰도 {pred['confidence']:.3f}"
                            )

                        # 성능 평가
                        self.evaluate_prediction_performance(ticker)

                        # 결과 저장
                        with open(f"{self.data_dir}/realtime_results.json", "w") as f:
                            json.dump(
                                {
                                    "latest_predictions": list(self.prediction_history)[
                                        -100:
                                    ],
                                    "performance_metrics": self.performance_metrics,
                                    "last_update": datetime.now().isoformat(),
                                },
                                f,
                                indent=2,
                            )

                # 대기
                time.sleep(interval)

            except KeyboardInterrupt:
                self.logger.info("사용자에 의해 중단됨")
                break
            except Exception as e:
                self.logger.error(f"테스트 실행 중 오류: {e}")
                time.sleep(60)  # 오류 발생 시 1분 대기

        self.is_running = False
        self.logger.info("실시간 테스트 종료")

    def start_testing(self):
        """테스트 시작"""
        # 설정 로드
        config = self.load_config()

        # 모델 로드
        if not self.load_trained_models():
            return False

        # 별도 스레드에서 실행
        test_thread = threading.Thread(
            target=self.run_continuous_testing,
            args=(config["test_tickers"], config["prediction_interval"]),
        )
        test_thread.daemon = True
        test_thread.start()

        return True

    def stop_testing(self):
        """테스트 중지"""
        self.is_running = False

    def get_status(self):
        """현재 상태 반환"""
        return {
            "is_running": self.is_running,
            "models_loaded": list(self.models.keys()),
            "prediction_count": len(self.prediction_history),
            "performance_metrics": self.performance_metrics,
        }


if __name__ == "__main__":
    import os

    # 실시간 테스트 시스템 초기화
    test_system = RealTimeTestingSystem()

    print("실시간 테스트 시스템을 시작하시겠습니까? (y/n)")
    response = input().lower()

    if response == "y":
        if test_system.start_testing():
            print("실시간 테스트 시작됨. 종료하려면 Ctrl+C를 누르세요.")
            try:
                while test_system.is_running:
                    time.sleep(1)
            except KeyboardInterrupt:
                test_system.stop_testing()
                print("테스트 중지됨")
        else:
            print("테스트 시작 실패")
    else:
        print("테스트 취소됨")
