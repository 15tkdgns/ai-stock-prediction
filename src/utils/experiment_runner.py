"""
실험 실행 엔진
다양한 실험 계획을 실행하고 결과를 수집하는 시스템
"""

import pandas as pd
import numpy as np
import json
import os
import time
from datetime import datetime
from pathlib import Path
import logging
from sklearn.model_selection import cross_val_score
import matplotlib.pyplot as plt
from scipy import stats
import warnings

warnings.filterwarnings("ignore")


class ExperimentRunner:
    def __init__(
        self, data_dir="raw_data", paper_dir="paper_data", experiment_dir="experiments"
    ):
        self.data_dir = data_dir
        self.paper_dir = paper_dir
        self.experiment_dir = experiment_dir

        # 결과 디렉토리 생성
        self.results_dir = f"{experiment_dir}/results"
        Path(self.results_dir).mkdir(parents=True, exist_ok=True)

        # 로깅 설정
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(f"{self.results_dir}/experiment_runner.log"),
                logging.StreamHandler(),
            ],
        )
        self.logger = logging.getLogger(__name__)

        # 데이터 로드
        self.load_data()

        # 실험 설정 로드
        self.load_experiment_configs()

    def load_data(self):
        """데이터 로드"""
        try:
            # 학습 데이터 로드
            self.features_df = pd.read_csv(f"{self.data_dir}/training_features.csv")
            self.labels_df = pd.read_csv(f"{self.data_dir}/event_labels.csv")

            # 날짜 기준 병합
            self.features_df["date"] = pd.to_datetime(self.features_df["date"])
            self.labels_df["Date"] = pd.to_datetime(self.labels_df["Date"])

            self.merged_df = pd.merge(
                self.features_df,
                self.labels_df,
                left_on=["ticker", "date"],
                right_on=["ticker", "Date"],
                how="inner",
            )

            self.logger.info(f"데이터 로드 완료: {len(self.merged_df)} 레코드")

        except Exception as e:
            self.logger.error(f"데이터 로드 실패: {e}")
            raise

    def load_experiment_configs(self):
        """실험 설정 로드"""
        from experimental_framework import ExperimentalFramework

        self.framework = ExperimentalFramework(
            self.data_dir, self.paper_dir, self.experiment_dir
        )

        # 설정 로드
        self.preprocessing_configs = self.framework.preprocessing_configs
        self.feature_combinations = self.framework.feature_combinations
        self.model_configs = self.framework.model_configs
        self.cv_configs = self.framework.cv_configs
        self.evaluation_metrics = self.framework.evaluation_metrics

    def prepare_features(self, feature_combination_name, preprocessing_name):
        """특성 준비 및 전처리"""

        # 특성 선택
        feature_list = self.feature_combinations[feature_combination_name]["features"]

        # 사용 가능한 특성만 선택
        available_features = [f for f in feature_list if f in self.merged_df.columns]

        if len(available_features) == 0:
            raise ValueError(f"사용 가능한 특성이 없습니다: {feature_list}")

        # 특성 추출
        X = self.merged_df[available_features].copy()
        y = self.merged_df["major_event"].copy()

        # 결측값 처리
        X = X.fillna(X.mean())

        # 이상치 처리
        preprocessing_config = self.preprocessing_configs[preprocessing_name]

        if preprocessing_config["outlier_treatment"] == "remove":
            # Z-score 기반 이상치 제거
            z_scores = np.abs(stats.zscore(X))
            outlier_mask = (z_scores < 3).all(axis=1)
            X = X[outlier_mask]
            y = y[outlier_mask]

        elif preprocessing_config["outlier_treatment"] == "clip":
            # 이상치 클리핑
            for col in X.columns:
                Q1 = X[col].quantile(0.25)
                Q3 = X[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                X[col] = X[col].clip(lower=lower_bound, upper=upper_bound)

        # 스케일링
        scaler = preprocessing_config["scaler"]
        X_scaled = scaler.fit_transform(X)

        # 특성 선택
        if preprocessing_config["feature_selection"] == "top_20":
            # 상위 20개 특성 선택 (간단한 분산 기반)
            from sklearn.feature_selection import SelectKBest, f_classif

            selector = SelectKBest(score_func=f_classif, k=min(20, X_scaled.shape[1]))
            X_scaled = selector.fit_transform(X_scaled, y)
            selected_features = np.array(available_features)[selector.get_support()]
        else:
            selected_features = available_features

        return X_scaled, y, selected_features, scaler

    def run_single_experiment(self, experiment_config):
        """단일 실험 실행"""

        start_time = time.time()

        try:
            # 실험 설정 추출
            exp_id = experiment_config["experiment_id"]
            preprocessing_name = experiment_config["preprocessing"]
            feature_combination_name = experiment_config["feature_combination"]
            model_name = experiment_config["model"]
            cv_name = experiment_config["cross_validation"]

            self.logger.info(f"실험 {exp_id} 시작: {experiment_config['description']}")

            # 데이터 준비
            X, y, selected_features, scaler = self.prepare_features(
                feature_combination_name, preprocessing_name
            )

            # 모델 초기화
            model = self.model_configs[model_name]["model"]

            # 교차 검증 설정
            cv_config = self.cv_configs[cv_name]

            # 교차 검증 실행
            if cv_config["cv"] is not None:
                # 교차 검증 수행
                cv_scores = {}

                for metric_name, metric_func in self.evaluation_metrics.items():
                    try:
                        if metric_name == "roc_auc":
                            scores = cross_val_score(
                                model,
                                X,
                                y,
                                cv=cv_config["cv"],
                                scoring="roc_auc",
                                n_jobs=-1,
                            )
                        else:
                            scores = cross_val_score(
                                model,
                                X,
                                y,
                                cv=cv_config["cv"],
                                scoring=metric_name,
                                n_jobs=-1,
                            )
                        cv_scores[metric_name] = {
                            "mean": float(np.mean(scores)),
                            "std": float(np.std(scores)),
                            "scores": scores.tolist(),
                        }
                    except Exception as e:
                        self.logger.warning(f"메트릭 {metric_name} 계산 실패: {e}")
                        cv_scores[metric_name] = {"mean": 0, "std": 0, "scores": []}

            else:
                # 단순 홀드아웃 검증
                from sklearn.model_selection import train_test_split

                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )

                # 모델 학습
                model.fit(X_train, y_train)

                # 예측
                y_pred = model.predict(X_test)
                y_pred_proba = (
                    model.predict_proba(X_test)[:, 1]
                    if hasattr(model, "predict_proba")
                    else None
                )

                # 성능 평가
                cv_scores = {}
                for metric_name, metric_func in self.evaluation_metrics.items():
                    try:
                        if metric_name == "roc_auc" and y_pred_proba is not None:
                            score = metric_func(y_test, y_pred_proba)
                        else:
                            score = metric_func(y_test, y_pred)
                        cv_scores[metric_name] = {
                            "mean": float(score),
                            "std": 0,
                            "scores": [float(score)],
                        }
                    except Exception as e:
                        self.logger.warning(f"메트릭 {metric_name} 계산 실패: {e}")
                        cv_scores[metric_name] = {"mean": 0, "std": 0, "scores": []}

            # 실행 시간 계산
            execution_time = time.time() - start_time

            # 결과 정리
            experiment_result = {
                "experiment_id": exp_id,
                "timestamp": datetime.now().isoformat(),
                "configuration": experiment_config,
                "data_info": {
                    "n_samples": len(X),
                    "n_features": X.shape[1],
                    "selected_features": (
                        selected_features.tolist()
                        if hasattr(selected_features, "tolist")
                        else list(selected_features)
                    ),
                    "class_distribution": {
                        str(k): int(v) for k, v in pd.Series(y).value_counts().items()
                    },
                },
                "performance": cv_scores,
                "execution_time": execution_time,
                "status": "completed",
            }

            self.logger.info(
                f"실험 {exp_id} 완료 - 정확도: {cv_scores.get('accuracy', {}).get('mean', 0):.4f}"
            )

            return experiment_result

        except Exception as e:
            self.logger.error(f"실험 {exp_id} 실패: {e}")

            return {
                "experiment_id": exp_id,
                "timestamp": datetime.now().isoformat(),
                "configuration": experiment_config,
                "error": str(e),
                "execution_time": time.time() - start_time,
                "status": "failed",
            }

    def run_experiment_batch(self, experiment_plan_path, max_experiments=None):
        """실험 배치 실행"""

        # 실험 계획 로드
        with open(experiment_plan_path, "r") as f:
            experiment_plan = json.load(f)

        experiments = experiment_plan["experiment_combinations"]

        if max_experiments:
            experiments = experiments[:max_experiments]

        self.logger.info(f"배치 실험 시작: {len(experiments)}개 실험")

        # 결과 저장을 위한 리스트
        results = []

        # 각 실험 실행
        for i, experiment_config in enumerate(experiments):
            self.logger.info(f"진행률: {i+1}/{len(experiments)}")

            result = self.run_single_experiment(experiment_config)
            results.append(result)

            # 중간 결과 저장 (10개마다)
            if (i + 1) % 10 == 0:
                self.save_batch_results(
                    results, experiment_plan["experiment_name"], partial=True
                )

        # 최종 결과 저장
        self.save_batch_results(results, experiment_plan["experiment_name"])

        return results

    def save_batch_results(self, results, experiment_name, partial=False):
        """배치 결과 저장"""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        suffix = "_partial" if partial else ""

        # JSON 형식으로 저장
        results_file = (
            f"{self.results_dir}/{experiment_name}_results{suffix}_{timestamp}.json"
        )

        with open(results_file, "w") as f:
            json.dump(results, f, indent=2)

        # 요약 통계 생성
        summary = self.generate_results_summary(results)

        summary_file = (
            f"{self.results_dir}/{experiment_name}_summary{suffix}_{timestamp}.json"
        )

        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)

        self.logger.info(f"결과 저장 완료: {results_file}")

    def generate_results_summary(self, results):
        """결과 요약 생성"""

        successful_results = [r for r in results if r["status"] == "completed"]
        failed_results = [r for r in results if r["status"] == "failed"]

        if not successful_results:
            return {
                "total_experiments": len(results),
                "successful_experiments": 0,
                "failed_experiments": len(failed_results),
                "error": "No successful experiments",
            }

        # 성능 메트릭 수집
        performance_data = []

        for result in successful_results:
            exp_performance = {
                "experiment_id": result["experiment_id"],
                "preprocessing": result["configuration"]["preprocessing"],
                "feature_combination": result["configuration"]["feature_combination"],
                "model": result["configuration"]["model"],
                "cross_validation": result["configuration"]["cross_validation"],
            }

            # 성능 메트릭 추가
            for metric_name, metric_data in result["performance"].items():
                exp_performance[metric_name] = metric_data["mean"]
                exp_performance[f"{metric_name}_std"] = metric_data["std"]

            performance_data.append(exp_performance)

        # DataFrame으로 변환
        performance_df = pd.DataFrame(performance_data)

        # 요약 통계 생성
        summary = {
            "total_experiments": len(results),
            "successful_experiments": len(successful_results),
            "failed_experiments": len(failed_results),
            "average_execution_time": np.mean(
                [r["execution_time"] for r in successful_results]
            ),
            "best_performances": {},
            "model_comparison": {},
            "preprocessing_comparison": {},
            "feature_combination_comparison": {},
        }

        # 각 메트릭별 최고 성능
        for metric in ["accuracy", "precision", "recall", "f1_score", "roc_auc"]:
            if metric in performance_df.columns:
                best_idx = performance_df[metric].idxmax()
                summary["best_performances"][metric] = {
                    "value": float(performance_df.loc[best_idx, metric]),
                    "experiment_id": performance_df.loc[best_idx, "experiment_id"],
                    "configuration": {
                        "preprocessing": performance_df.loc[best_idx, "preprocessing"],
                        "feature_combination": performance_df.loc[
                            best_idx, "feature_combination"
                        ],
                        "model": performance_df.loc[best_idx, "model"],
                    },
                }

        # 모델별 비교
        if "model" in performance_df.columns:
            for metric in ["accuracy", "precision", "recall", "f1_score"]:
                if metric in performance_df.columns:
                    model_performance = (
                        performance_df.groupby("model")[metric]
                        .agg(["mean", "std"])
                        .round(4)
                    )
                    summary["model_comparison"][metric] = model_performance.to_dict()

        # 전처리별 비교
        if "preprocessing" in performance_df.columns:
            for metric in ["accuracy", "precision", "recall", "f1_score"]:
                if metric in performance_df.columns:
                    prep_performance = (
                        performance_df.groupby("preprocessing")[metric]
                        .agg(["mean", "std"])
                        .round(4)
                    )
                    summary["preprocessing_comparison"][
                        metric
                    ] = prep_performance.to_dict()

        # 특성 조합별 비교
        if "feature_combination" in performance_df.columns:
            for metric in ["accuracy", "precision", "recall", "f1_score"]:
                if metric in performance_df.columns:
                    feat_performance = (
                        performance_df.groupby("feature_combination")[metric]
                        .agg(["mean", "std"])
                        .round(4)
                    )
                    summary["feature_combination_comparison"][
                        metric
                    ] = feat_performance.to_dict()

        return summary

    def generate_comparison_plots(self, results, experiment_name):
        """비교 플롯 생성"""

        successful_results = [r for r in results if r["status"] == "completed"]

        if not successful_results:
            return

        # 성능 데이터 수집
        performance_data = []

        for result in successful_results:
            exp_data = {
                "experiment_id": result["experiment_id"],
                "model": result["configuration"]["model"],
                "preprocessing": result["configuration"]["preprocessing"],
                "feature_combination": result["configuration"]["feature_combination"],
            }

            for metric_name, metric_data in result["performance"].items():
                exp_data[metric_name] = metric_data["mean"]

            performance_data.append(exp_data)

        df = pd.DataFrame(performance_data)

        # 플롯 생성
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))

        # 모델별 성능 비교
        if "model" in df.columns and "accuracy" in df.columns:
            model_performance = (
                df.groupby("model")["accuracy"].mean().sort_values(ascending=False)
            )
            axes[0, 0].bar(model_performance.index, model_performance.values)
            axes[0, 0].set_title("Model Performance Comparison (Accuracy)")
            axes[0, 0].set_ylabel("Accuracy")
            axes[0, 0].tick_params(axis="x", rotation=45)

        # 전처리별 성능 비교
        if "preprocessing" in df.columns and "accuracy" in df.columns:
            prep_performance = (
                df.groupby("preprocessing")["accuracy"]
                .mean()
                .sort_values(ascending=False)
            )
            axes[0, 1].bar(prep_performance.index, prep_performance.values)
            axes[0, 1].set_title("Preprocessing Performance Comparison (Accuracy)")
            axes[0, 1].set_ylabel("Accuracy")
            axes[0, 1].tick_params(axis="x", rotation=45)

        # 특성 조합별 성능 비교
        if "feature_combination" in df.columns and "accuracy" in df.columns:
            feat_performance = (
                df.groupby("feature_combination")["accuracy"]
                .mean()
                .sort_values(ascending=False)
            )
            axes[1, 0].bar(feat_performance.index, feat_performance.values)
            axes[1, 0].set_title(
                "Feature Combination Performance Comparison (Accuracy)"
            )
            axes[1, 0].set_ylabel("Accuracy")
            axes[1, 0].tick_params(axis="x", rotation=45)

        # 다중 메트릭 비교 (상위 5개 실험)
        if len(df) > 0:
            metrics = ["accuracy", "precision", "recall", "f1_score"]
            available_metrics = [m for m in metrics if m in df.columns]

            if available_metrics:
                top_5_experiments = df.nlargest(5, "accuracy")

                x = np.arange(len(available_metrics))
                width = 0.15

                for i, (_, row) in enumerate(top_5_experiments.iterrows()):
                    values = [row[metric] for metric in available_metrics]
                    axes[1, 1].bar(
                        x + i * width,
                        values,
                        width,
                        label=f"Exp {row['experiment_id']}",
                    )

                axes[1, 1].set_xlabel("Metrics")
                axes[1, 1].set_ylabel("Score")
                axes[1, 1].set_title("Top 5 Experiments Multi-Metric Comparison")
                axes[1, 1].set_xticks(x + width * 2)
                axes[1, 1].set_xticklabels(available_metrics)
                axes[1, 1].legend()

        plt.tight_layout()
        plt.savefig(
            f"{self.results_dir}/{experiment_name}_comparison_plots.png",
            dpi=300,
            bbox_inches="tight",
        )
        plt.close()

        self.logger.info(
            f"비교 플롯 저장 완료: {self.results_dir}/{experiment_name}_comparison_plots.png"
        )


if __name__ == "__main__":
    runner = ExperimentRunner()

    # 사용 가능한 실험 계획 출력
    experiment_plans = [
        "experiment_plan.json",
        "focused_experiment_plan_top_models.json",
        "focused_experiment_plan_quick_comparison.json",
        "ablation_study_plan.json",
    ]

    print("사용 가능한 실험 계획:")
    for i, plan in enumerate(experiment_plans):
        plan_path = f"experiments/{plan}"
        if os.path.exists(plan_path):
            print(f"{i+1}. {plan}")

    print("\n실행할 실험 계획을 선택하세요 (번호 입력):")
    try:
        choice = int(input()) - 1
        if 0 <= choice < len(experiment_plans):
            selected_plan = f"experiments/{experiment_plans[choice]}"

            if os.path.exists(selected_plan):
                print(f"\n{experiment_plans[choice]} 실행 중...")

                # 실험 실행
                results = runner.run_experiment_batch(
                    selected_plan, max_experiments=10
                )  # 테스트용 10개만

                # 비교 플롯 생성
                experiment_name = experiment_plans[choice].replace(".json", "")
                runner.generate_comparison_plots(results, experiment_name)

                print(
                    f"\n실험 완료! 결과는 {runner.results_dir} 디렉토리에 저장되었습니다."
                )
            else:
                print("선택한 실험 계획 파일이 존재하지 않습니다.")
        else:
            print("잘못된 선택입니다.")
    except ValueError:
        print("숫자를 입력해주세요.")
    except KeyboardInterrupt:
        print("\n실험이 중단되었습니다.")
