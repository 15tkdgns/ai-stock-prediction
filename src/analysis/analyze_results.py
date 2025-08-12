import pandas as pd
import json

# 데이터 로드
features_df = pd.read_csv("raw_data/training_features.csv")
labels_df = pd.read_csv("raw_data/event_labels.csv")

print("=== 학습 결과 분석 ===")
print(f"총 레코드 수: {len(features_df)}")
print(f'종목 수: {features_df["ticker"].nunique()}')
print(f'기간: {features_df["date"].min()} ~ {features_df["date"].max()}')

print("\n=== 이벤트 분포 ===")
print(
    f'주요 이벤트 발생: {labels_df["major_event"].sum()}회 ({labels_df["major_event"].mean():.2%})'
)
print(f'가격 이벤트: {(labels_df["price_event"] != 0).sum()}회')
print(f'거래량 이벤트: {labels_df["volume_event"].sum()}회')
print(f'변동성 이벤트: {labels_df["volatility_event"].sum()}회')

print("\n=== 종목별 이벤트 ===")
ticker_stats = (
    labels_df.groupby("ticker")
    .agg(
        {
            "major_event": "sum",
            "price_event": lambda x: (x != 0).sum(),
            "volume_event": "sum",
            "volatility_event": "sum",
        }
    )
    .round(2)
)
print(ticker_stats)

# 모델 성능 로드
with open("raw_data/model_performance.json", "r") as f:
    performance = json.load(f)

print("\n=== 모델 성능 ===")
for model_name, scores in performance.items():
    print(f"{model_name}:")
    print(f'  훈련 정확도: {scores["train_score"]:.4f}')
    print(f'  테스트 정확도: {scores["test_score"]:.4f}')
    print()

# 최고 성능 모델
best_model = max(performance.items(), key=lambda x: x[1]["test_score"])
print(
    f'🏆 최고 성능 모델: {best_model[0]} (테스트 정확도: {best_model[1]["test_score"]:.4f})'
)
