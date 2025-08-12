#!/usr/bin/env python3
"""
빠른 모델 학습 시작
샘플 데이터 생성 및 모델 학습 실행
"""

import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import os
import warnings

warnings.filterwarnings("ignore")


def create_sample_data():
    """샘플 데이터 생성"""
    print("=== 샘플 데이터 생성 중 ===")

    # raw_data 디렉토리 생성
    os.makedirs("raw_data", exist_ok=True)

    # S&P 500 주요 종목 5개
    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]

    # 실제 데이터 다운로드 (최근 6개월)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=180)

    all_data = []

    for ticker in tickers:
        print(f"다운로드 중: {ticker}")
        try:
            # 주가 데이터 다운로드
            stock = yf.Ticker(ticker)
            hist = stock.history(start=start_date, end=end_date)

            if not hist.empty:
                # 데이터 정리
                hist = hist.reset_index()
                hist["ticker"] = ticker
                hist["date"] = hist["Date"].dt.strftime("%Y-%m-%d")

                # 컬럼명 소문자로 변경
                hist.columns = [col.lower() for col in hist.columns]

                # 기본 특성 계산
                hist["price_change"] = hist["close"].pct_change()
                hist["volume_change"] = hist["volume"].pct_change()

                # 기술적 지표 계산
                hist["sma_20"] = hist["close"].rolling(window=20).mean()
                hist["sma_50"] = hist["close"].rolling(window=50).mean()

                # RSI 계산 (간단한 버전)
                delta = hist["close"].diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                rs = gain / loss
                hist["rsi"] = 100 - (100 / (1 + rs))

                # 볼린저 밴드
                hist["bb_middle"] = hist["sma_20"]
                hist["bb_std"] = hist["close"].rolling(window=20).std()
                hist["bb_upper"] = hist["bb_middle"] + (hist["bb_std"] * 2)
                hist["bb_lower"] = hist["bb_middle"] - (hist["bb_std"] * 2)

                # 기타 지표
                hist["macd"] = (
                    hist["close"].ewm(span=12).mean()
                    - hist["close"].ewm(span=26).mean()
                )
                hist["atr"] = (hist["high"] - hist["low"]).rolling(window=14).mean()
                hist["volatility"] = hist["close"].rolling(window=20).std()
                hist["obv"] = (
                    hist["volume"]
                    * np.where(hist["close"] > hist["close"].shift(1), 1, -1)
                ).cumsum()

                # 추가 특성
                hist["unusual_volume"] = (
                    hist["volume"] > hist["volume"].rolling(window=20).mean() * 2
                ).astype(int)
                hist["price_spike"] = (abs(hist["price_change"]) > 0.05).astype(int)

                # 뉴스 관련 특성 (더미 데이터)
                np.random.seed(42)
                hist["news_sentiment"] = np.random.uniform(0, 1, len(hist))
                hist["news_polarity"] = np.random.uniform(-1, 1, len(hist))
                hist["news_count"] = np.random.randint(0, 10, len(hist))

                all_data.append(hist)

        except Exception as e:
            print(f"오류 발생 ({ticker}): {e}")

    # 데이터 합치기
    combined_data = pd.concat(all_data, ignore_index=True)

    # 결측값 처리
    combined_data = combined_data.fillna(method="ffill").fillna(0)

    # 이벤트 라벨 생성
    combined_data["price_event"] = 0
    combined_data.loc[combined_data["price_change"] > 0.05, "price_event"] = 1
    combined_data.loc[combined_data["price_change"] < -0.05, "price_event"] = -1

    combined_data["volume_event"] = (
        combined_data["volume"] > combined_data["volume"].rolling(window=30).mean() * 3
    ).astype(int)
    combined_data["volatility_event"] = (
        combined_data["volatility"] > combined_data["volatility"].quantile(0.9)
    ).astype(int)
    combined_data["major_event"] = (
        (abs(combined_data["price_event"]) == 1)
        | (combined_data["volume_event"] == 1)
        | (combined_data["volatility_event"] == 1)
    ).astype(int)
    combined_data["event_score"] = (
        abs(combined_data["price_event"])
        + combined_data["volume_event"]
        + combined_data["volatility_event"]
    )

    # 저장
    feature_columns = [
        "ticker",
        "date",
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

    label_columns = [
        "ticker",
        "date",
        "price_event",
        "volume_event",
        "volatility_event",
        "major_event",
        "event_score",
    ]

    # 학습 특성 저장
    features_df = combined_data[feature_columns].copy()
    features_df.to_csv("raw_data/training_features.csv", index=False)

    # 이벤트 라벨 저장
    labels_df = combined_data[label_columns].copy()
    labels_df.rename(columns={"date": "Date"}, inplace=True)
    labels_df.to_csv("raw_data/event_labels.csv", index=False)

    # S&P 500 구성 종목 정보 저장
    sp500_df = pd.DataFrame(
        {
            "Symbol": tickers,
            "Security": [
                "Apple Inc.",
                "Microsoft Corporation",
                "Alphabet Inc.",
                "Amazon.com Inc.",
                "Tesla Inc.",
            ],
            "Sector": [
                "Technology",
                "Technology",
                "Technology",
                "Consumer Discretionary",
                "Consumer Discretionary",
            ],
        }
    )
    sp500_df.to_csv("raw_data/sp500_constituents.csv", index=False)

    # 뉴스 데이터 더미 생성
    news_data = []
    for _, row in combined_data.iterrows():
        if np.random.random() < 0.3:  # 30% 확률로 뉴스 있음
            news_data.append(
                {
                    "ticker": row["ticker"],
                    "title": f"Market update for {row['ticker']}",
                    "description": f"Stock {row['ticker']} shows movement",
                    "url": f"https://example.com/news/{row['ticker']}",
                    "publishedAt": row["date"],
                    "source": "Sample News",
                    "sentiment_label": (
                        "positive"
                        if row["news_sentiment"] > 0.6
                        else "negative" if row["news_sentiment"] < 0.4 else "neutral"
                    ),
                    "sentiment_score": row["news_sentiment"],
                    "polarity": row["news_polarity"],
                    "text_length": np.random.randint(100, 1000),
                }
            )

    news_df = pd.DataFrame(news_data)
    news_df.to_csv("raw_data/news_data.csv", index=False)

    print("✅ 샘플 데이터 생성 완료:")
    print(f"   - 학습 특성: {len(features_df)} 레코드")
    print(f"   - 이벤트 라벨: {len(labels_df)} 레코드")
    print(f"   - 뉴스 데이터: {len(news_df)} 레코드")
    print(f"   - 종목 수: {len(tickers)}")

    return True


def run_quick_training():
    """빠른 모델 학습 실행"""
    print("\n=== 빠른 모델 학습 시작 ===")

    try:
        # 데이터 검증
        from validation_checker import DataValidationChecker

        checker = DataValidationChecker()
        validation_result = checker.generate_validation_report()

        if validation_result["overall_status"] != "PASS":
            print("⚠️  데이터 검증 실패, 계속 진행...")

        # 모델 학습 실행
        from model_training import SP500EventDetectionModel

        trainer = SP500EventDetectionModel()

        print("모델 학습 파이프라인 실행 중...")
        results = trainer.run_training_pipeline()

        if results:
            print("✅ 모델 학습 완료!")

            # 결과 출력
            print("\n=== 학습 결과 ===")
            for model_name, result in results.items():
                print(f"{model_name}: 정확도 = {result['accuracy']:.4f}")

            return True
        else:
            print("❌ 모델 학습 실패")
            return False

    except Exception as e:
        print(f"❌ 모델 학습 중 오류: {e}")
        return False


def main():
    """메인 실행 함수"""
    print("🚀 S&P500 이벤트 탐지 모델 학습 시작")
    print("=" * 50)

    # 1. 샘플 데이터 생성
    if not create_sample_data():
        print("❌ 데이터 생성 실패")
        return

    # 2. 모델 학습 실행
    if run_quick_training():
        print("\n🎉 모델 학습 성공적으로 완료!")
        print("📊 결과 파일:")
        print("   - raw_data/training_features.csv")
        print("   - raw_data/event_labels.csv")
        print("   - raw_data/feature_importance.png")
        print("   - raw_data/model_performance.json")
    else:
        print("\n❌ 모델 학습 실패")


if __name__ == "__main__":
    main()
