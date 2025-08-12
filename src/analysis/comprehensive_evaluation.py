"""
포괄적 평가 메트릭 시스템
논문용 상세 통계 분석 및 다양한 평가 지표
"""

import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    log_loss,
    matthews_corrcoef,
    cohen_kappa_score,
    balanced_accuracy_score,
)
from scipy import stats
from scipy.stats import wilcoxon, friedmanchisquare
import warnings

warnings.filterwarnings("ignore")


class ComprehensiveEvaluator:
    def __init__(self, results_dir="experiments/results"):
        self.results_dir = results_dir
        self.evaluation_metrics = self.define_evaluation_metrics()
        self.statistical_tests = self.define_statistical_tests()

    def define_evaluation_metrics(self):
        """평가 메트릭 정의"""

        return {
            # 1. 기본 분류 메트릭
            "basic_classification": {
                "accuracy": {
                    "function": accuracy_score,
                    "description": "Overall classification accuracy",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "precision_macro": {
                    "function": lambda y_true, y_pred: precision_score(
                        y_true, y_pred, average="macro", zero_division=0
                    ),
                    "description": "Macro-averaged precision",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "recall_macro": {
                    "function": lambda y_true, y_pred: recall_score(
                        y_true, y_pred, average="macro", zero_division=0
                    ),
                    "description": "Macro-averaged recall",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "f1_macro": {
                    "function": lambda y_true, y_pred: f1_score(
                        y_true, y_pred, average="macro", zero_division=0
                    ),
                    "description": "Macro-averaged F1 score",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "precision_weighted": {
                    "function": lambda y_true, y_pred: precision_score(
                        y_true, y_pred, average="weighted", zero_division=0
                    ),
                    "description": "Weighted precision",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "recall_weighted": {
                    "function": lambda y_true, y_pred: recall_score(
                        y_true, y_pred, average="weighted", zero_division=0
                    ),
                    "description": "Weighted recall",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "f1_weighted": {
                    "function": lambda y_true, y_pred: f1_score(
                        y_true, y_pred, average="weighted", zero_division=0
                    ),
                    "description": "Weighted F1 score",
                    "interpretation": "Higher is better (0-1 range)",
                },
            },
            # 2. 고급 분류 메트릭
            "advanced_classification": {
                "balanced_accuracy": {
                    "function": balanced_accuracy_score,
                    "description": "Balanced accuracy (accounts for class imbalance)",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "matthews_corrcoef": {
                    "function": matthews_corrcoef,
                    "description": "Matthews correlation coefficient",
                    "interpretation": "Higher is better (-1 to 1 range)",
                },
                "cohen_kappa": {
                    "function": cohen_kappa_score,
                    "description": "Cohen's kappa coefficient",
                    "interpretation": "Higher is better (-1 to 1 range)",
                },
                "roc_auc": {
                    "function": lambda y_true, y_pred_proba: (
                        roc_auc_score(y_true, y_pred_proba[:, 1])
                        if y_pred_proba.ndim > 1
                        else roc_auc_score(y_true, y_pred_proba)
                    ),
                    "description": "Area under ROC curve",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "log_loss": {
                    "function": log_loss,
                    "description": "Logarithmic loss",
                    "interpretation": "Lower is better (0 to inf)",
                },
            },
            # 3. 금융 특화 메트릭
            "financial_metrics": {
                "profit_factor": {
                    "function": self.calculate_profit_factor,
                    "description": "Ratio of gross profit to gross loss",
                    "interpretation": "Higher is better (>1 is profitable)",
                },
                "sharpe_ratio": {
                    "function": self.calculate_sharpe_ratio,
                    "description": "Risk-adjusted return measure",
                    "interpretation": "Higher is better (>1 is good)",
                },
                "max_drawdown": {
                    "function": self.calculate_max_drawdown,
                    "description": "Maximum peak-to-trough decline",
                    "interpretation": "Lower is better (negative values)",
                },
                "win_rate": {
                    "function": self.calculate_win_rate,
                    "description": "Percentage of profitable predictions",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "avg_return": {
                    "function": self.calculate_avg_return,
                    "description": "Average return per prediction",
                    "interpretation": "Higher is better",
                },
                "volatility": {
                    "function": self.calculate_volatility,
                    "description": "Standard deviation of returns",
                    "interpretation": "Lower is better for risk management",
                },
                "information_ratio": {
                    "function": self.calculate_information_ratio,
                    "description": "Active return divided by tracking error",
                    "interpretation": "Higher is better",
                },
            },
            # 4. 시간 기반 메트릭
            "temporal_metrics": {
                "temporal_consistency": {
                    "function": self.calculate_temporal_consistency,
                    "description": "Consistency of predictions over time",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "trend_accuracy": {
                    "function": self.calculate_trend_accuracy,
                    "description": "Accuracy in predicting trend direction",
                    "interpretation": "Higher is better (0-1 range)",
                },
                "lag_correlation": {
                    "function": self.calculate_lag_correlation,
                    "description": "Correlation between predictions and lagged reality",
                    "interpretation": "Higher is better (-1 to 1 range)",
                },
            },
            # 5. 예측 신뢰도 메트릭
            "confidence_metrics": {
                "prediction_confidence": {
                    "function": self.calculate_prediction_confidence,
                    "description": "Average confidence of predictions",
                    "interpretation": "Higher confidence indicates more certain predictions",
                },
                "calibration_error": {
                    "function": self.calculate_calibration_error,
                    "description": "Difference between predicted and actual probabilities",
                    "interpretation": "Lower is better (well-calibrated model)",
                },
                "prediction_entropy": {
                    "function": self.calculate_prediction_entropy,
                    "description": "Entropy of prediction distribution",
                    "interpretation": "Lower entropy indicates more confident predictions",
                },
            },
        }

    def define_statistical_tests(self):
        """통계적 검증 테스트 정의"""

        return {
            "paired_ttest": {
                "function": stats.ttest_rel,
                "description": "Paired t-test for comparing two models",
                "interpretation": "p < 0.05 indicates significant difference",
            },
            "wilcoxon_signed_rank": {
                "function": wilcoxon,
                "description": "Non-parametric test for paired samples",
                "interpretation": "p < 0.05 indicates significant difference",
            },
            "friedman_test": {
                "function": friedmanchisquare,
                "description": "Non-parametric test for multiple models",
                "interpretation": "p < 0.05 indicates significant difference among models",
            },
            "mcnemar_test": {
                "function": self.mcnemar_test,
                "description": "Test for comparing two classifiers",
                "interpretation": "p < 0.05 indicates significant difference",
            },
        }

    # 금융 메트릭 계산 함수들
    def calculate_profit_factor(self, y_true, y_pred, returns=None):
        """수익 팩터 계산"""
        if returns is None:
            returns = np.random.normal(0, 0.02, len(y_true))  # 기본 수익률

        correct_predictions = y_true == y_pred
        profitable_returns = returns[correct_predictions & (returns > 0)]
        loss_returns = returns[correct_predictions & (returns < 0)]

        if len(loss_returns) == 0 or sum(abs(loss_returns)) == 0:
            return float("inf") if len(profitable_returns) > 0 else 0

        return sum(profitable_returns) / sum(abs(loss_returns))

    def calculate_sharpe_ratio(self, y_true, y_pred, returns=None, risk_free_rate=0.02):
        """샤프 비율 계산"""
        if returns is None:
            returns = np.random.normal(0, 0.02, len(y_true))

        correct_predictions = y_true == y_pred
        strategy_returns = returns[correct_predictions]

        if len(strategy_returns) == 0:
            return 0

        excess_return = np.mean(strategy_returns) - risk_free_rate / 252
        return_std = np.std(strategy_returns)

        if return_std == 0:
            return 0

        return excess_return / return_std * np.sqrt(252)

    def calculate_max_drawdown(self, y_true, y_pred, returns=None):
        """최대 낙폭 계산"""
        if returns is None:
            returns = np.random.normal(0, 0.02, len(y_true))

        correct_predictions = y_true == y_pred
        strategy_returns = returns[correct_predictions]

        if len(strategy_returns) == 0:
            return 0

        cumulative_returns = np.cumsum(strategy_returns)
        running_max = np.maximum.accumulate(cumulative_returns)
        drawdown = cumulative_returns - running_max

        return np.min(drawdown)

    def calculate_win_rate(self, y_true, y_pred, returns=None):
        """승률 계산"""
        if returns is None:
            returns = np.random.normal(0, 0.02, len(y_true))

        correct_predictions = y_true == y_pred
        strategy_returns = returns[correct_predictions]

        if len(strategy_returns) == 0:
            return 0

        return np.mean(strategy_returns > 0)

    def calculate_avg_return(self, y_true, y_pred, returns=None):
        """평균 수익률 계산"""
        if returns is None:
            returns = np.random.normal(0, 0.02, len(y_true))

        correct_predictions = y_true == y_pred
        strategy_returns = returns[correct_predictions]

        if len(strategy_returns) == 0:
            return 0

        return np.mean(strategy_returns)

    def calculate_volatility(self, y_true, y_pred, returns=None):
        """변동성 계산"""
        if returns is None:
            returns = np.random.normal(0, 0.02, len(y_true))

        correct_predictions = y_true == y_pred
        strategy_returns = returns[correct_predictions]

        if len(strategy_returns) == 0:
            return 0

        return np.std(strategy_returns) * np.sqrt(252)

    def calculate_information_ratio(
        self, y_true, y_pred, returns=None, benchmark_returns=None
    ):
        """정보 비율 계산"""
        if returns is None:
            returns = np.random.normal(0, 0.02, len(y_true))
        if benchmark_returns is None:
            benchmark_returns = np.random.normal(0, 0.01, len(y_true))

        correct_predictions = y_true == y_pred
        strategy_returns = returns[correct_predictions]
        benchmark_returns = benchmark_returns[correct_predictions]

        if len(strategy_returns) == 0:
            return 0

        active_returns = strategy_returns - benchmark_returns
        tracking_error = np.std(active_returns)

        if tracking_error == 0:
            return 0

        return np.mean(active_returns) / tracking_error

    # 시간 기반 메트릭 계산 함수들
    def calculate_temporal_consistency(self, y_true, y_pred, timestamps=None):
        """시간적 일관성 계산"""
        if timestamps is None:
            timestamps = np.arange(len(y_true))

        # 시간 윈도우별 정확도 계산
        window_size = max(10, len(y_true) // 10)
        accuracies = []

        for i in range(0, len(y_true) - window_size, window_size):
            window_accuracy = accuracy_score(
                y_true[i : i + window_size], y_pred[i : i + window_size]
            )
            accuracies.append(window_accuracy)

        if len(accuracies) == 0:
            return 0

        # 일관성은 정확도의 변동성이 낮을수록 높음
        return 1 - np.std(accuracies)

    def calculate_trend_accuracy(self, y_true, y_pred, values=None):
        """추세 정확도 계산"""
        if values is None:
            values = np.random.normal(0, 0.02, len(y_true))

        if len(values) < 2:
            return 0

        # 실제 추세와 예측 추세 비교
        actual_trend = np.diff(values) > 0
        predicted_trend = y_pred[1:] > y_pred[:-1]

        if len(actual_trend) == 0:
            return 0

        return np.mean(actual_trend == predicted_trend)

    def calculate_lag_correlation(self, y_true, y_pred, max_lag=5):
        """지연 상관관계 계산"""
        max_correlation = 0

        for lag in range(1, min(max_lag + 1, len(y_true) // 4)):
            if len(y_true) > lag:
                correlation = np.corrcoef(y_true[:-lag], y_pred[lag:])[0, 1]
                if not np.isnan(correlation):
                    max_correlation = max(max_correlation, abs(correlation))

        return max_correlation

    # 신뢰도 메트릭 계산 함수들
    def calculate_prediction_confidence(self, y_pred_proba):
        """예측 신뢰도 계산"""
        if y_pred_proba.ndim > 1:
            confidence = np.max(y_pred_proba, axis=1)
        else:
            confidence = np.abs(y_pred_proba - 0.5) + 0.5

        return np.mean(confidence)

    def calculate_calibration_error(self, y_true, y_pred_proba, n_bins=10):
        """보정 오차 계산"""
        if y_pred_proba.ndim > 1:
            y_pred_proba = y_pred_proba[:, 1]

        bin_boundaries = np.linspace(0, 1, n_bins + 1)
        bin_lowers = bin_boundaries[:-1]
        bin_uppers = bin_boundaries[1:]

        calibration_error = 0
        for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
            in_bin = (y_pred_proba > bin_lower) & (y_pred_proba <= bin_upper)
            prop_in_bin = in_bin.mean()

            if prop_in_bin > 0:
                accuracy_in_bin = y_true[in_bin].mean()
                avg_confidence_in_bin = y_pred_proba[in_bin].mean()
                calibration_error += (
                    np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
                )

        return calibration_error

    def calculate_prediction_entropy(self, y_pred_proba):
        """예측 엔트로피 계산"""
        if y_pred_proba.ndim > 1:
            entropy = -np.sum(y_pred_proba * np.log(y_pred_proba + 1e-15), axis=1)
        else:
            proba_0 = 1 - y_pred_proba
            proba_1 = y_pred_proba
            entropy = -(
                proba_0 * np.log(proba_0 + 1e-15) + proba_1 * np.log(proba_1 + 1e-15)
            )

        return np.mean(entropy)

    # 통계적 검증 함수들
    def mcnemar_test(self, y_true, y_pred1, y_pred2):
        """McNemar 테스트"""
        # 혼동 행렬 생성
        correct1 = y_true == y_pred1
        correct2 = y_true == y_pred2

        # 2x2 분할표
        model1_correct = np.sum(correct1 & ~correct2)
        model2_correct = np.sum(~correct1 & correct2)

        # McNemar 통계량
        if model1_correct + model2_correct == 0:
            return 1.0  # 차이가 없음

        mcnemar_stat = (abs(model1_correct - model2_correct) - 1) ** 2 / (
            model1_correct + model2_correct
        )
        p_value = 1 - stats.chi2.cdf(mcnemar_stat, 1)

        return p_value

    def evaluate_single_model(self, y_true, y_pred, y_pred_proba=None, returns=None):
        """단일 모델 종합 평가"""

        evaluation_results = {}

        # 각 메트릭 카테고리별 평가
        for category_name, metrics in self.evaluation_metrics.items():
            evaluation_results[category_name] = {}

            for metric_name, metric_info in metrics.items():
                try:
                    if (
                        category_name == "advanced_classification"
                        and metric_name == "roc_auc"
                    ):
                        if y_pred_proba is not None:
                            score = metric_info["function"](y_true, y_pred_proba)
                        else:
                            continue
                    elif category_name == "financial_metrics":
                        score = metric_info["function"](y_true, y_pred, returns)
                    elif category_name == "confidence_metrics":
                        if y_pred_proba is not None:
                            if metric_name == "calibration_error":
                                score = metric_info["function"](y_true, y_pred_proba)
                            else:
                                score = metric_info["function"](y_pred_proba)
                        else:
                            continue
                    else:
                        score = metric_info["function"](y_true, y_pred)

                    evaluation_results[category_name][metric_name] = {
                        "score": float(score),
                        "description": metric_info["description"],
                        "interpretation": metric_info["interpretation"],
                    }

                except Exception as e:
                    evaluation_results[category_name][metric_name] = {
                        "score": None,
                        "error": str(e),
                        "description": metric_info["description"],
                        "interpretation": metric_info["interpretation"],
                    }

        return evaluation_results

    def compare_models(self, model_results):
        """모델 간 비교 분석"""

        comparison_results = {
            "model_rankings": {},
            "statistical_tests": {},
            "performance_summary": {},
        }

        # 각 메트릭별 모델 순위
        for category_name, metrics in self.evaluation_metrics.items():
            comparison_results["model_rankings"][category_name] = {}

            for metric_name in metrics.keys():
                scores = {}

                for model_name, model_result in model_results.items():
                    if (
                        category_name in model_result
                        and metric_name in model_result[category_name]
                        and model_result[category_name][metric_name]["score"]
                        is not None
                    ):
                        scores[model_name] = model_result[category_name][metric_name][
                            "score"
                        ]

                if scores:
                    # 메트릭에 따른 정렬 (높을수록 좋은 메트릭 vs 낮을수록 좋은 메트릭)
                    reverse_sort = metric_name not in [
                        "log_loss",
                        "max_drawdown",
                        "calibration_error",
                        "prediction_entropy",
                    ]
                    sorted_models = sorted(
                        scores.items(), key=lambda x: x[1], reverse=reverse_sort
                    )

                    comparison_results["model_rankings"][category_name][metric_name] = {
                        "ranking": [
                            {"model": model, "score": score}
                            for model, score in sorted_models
                        ],
                        "best_model": sorted_models[0][0],
                        "best_score": sorted_models[0][1],
                    }

        # 통계적 유의성 검증
        if len(model_results) >= 2:
            model_names = list(model_results.keys())

            for i in range(len(model_names)):
                for j in range(i + 1, len(model_names)):
                    model1, model2 = model_names[i], model_names[j]

                    # 기본 메트릭들로 비교
                    try:
                        acc1 = model_results[model1]["basic_classification"][
                            "accuracy"
                        ]["score"]
                        acc2 = model_results[model2]["basic_classification"][
                            "accuracy"
                        ]["score"]

                        if acc1 is not None and acc2 is not None:
                            # 단순 차이 비교 (실제로는 여러 fold의 결과가 있어야 함)
                            comparison_results["statistical_tests"][
                                f"{model1}_vs_{model2}"
                            ] = {
                                "accuracy_difference": acc1 - acc2,
                                "better_model": model1 if acc1 > acc2 else model2,
                            }
                    except Exception:
                        pass

        return comparison_results

    def generate_comprehensive_report(self, model_results, output_path=None):
        """종합 평가 보고서 생성"""

        report = {
            "evaluation_timestamp": pd.Timestamp.now().isoformat(),
            "total_models": len(model_results),
            "individual_evaluations": model_results,
            "comparative_analysis": self.compare_models(model_results),
            "summary_statistics": self.generate_summary_statistics(model_results),
            "recommendations": self.generate_recommendations(model_results),
        }

        if output_path:
            with open(output_path, "w") as f:
                json.dump(report, f, indent=2, default=str)

        return report

    def generate_summary_statistics(self, model_results):
        """요약 통계 생성"""

        summary = {"metric_statistics": {}, "model_statistics": {}}

        # 메트릭별 통계
        for category_name, metrics in self.evaluation_metrics.items():
            summary["metric_statistics"][category_name] = {}

            for metric_name in metrics.keys():
                scores = []

                for model_result in model_results.values():
                    if (
                        category_name in model_result
                        and metric_name in model_result[category_name]
                        and model_result[category_name][metric_name]["score"]
                        is not None
                    ):
                        scores.append(model_result[category_name][metric_name]["score"])

                if scores:
                    summary["metric_statistics"][category_name][metric_name] = {
                        "mean": np.mean(scores),
                        "std": np.std(scores),
                        "min": np.min(scores),
                        "max": np.max(scores),
                        "median": np.median(scores),
                        "count": len(scores),
                    }

        # 모델별 통계
        for model_name, model_result in model_results.items():
            summary["model_statistics"][model_name] = {
                "evaluated_metrics": 0,
                "failed_metrics": 0,
                "average_scores": {},
            }

            for category_name, metrics in model_result.items():
                category_scores = []

                for metric_name, metric_result in metrics.items():
                    if metric_result["score"] is not None:
                        summary["model_statistics"][model_name][
                            "evaluated_metrics"
                        ] += 1
                        category_scores.append(metric_result["score"])
                    else:
                        summary["model_statistics"][model_name]["failed_metrics"] += 1

                if category_scores:
                    summary["model_statistics"][model_name]["average_scores"][
                        category_name
                    ] = np.mean(category_scores)

        return summary

    def generate_recommendations(self, model_results):
        """권장사항 생성"""

        recommendations = {
            "best_overall_model": None,
            "best_by_category": {},
            "performance_insights": [],
            "improvement_suggestions": [],
        }

        # 전체 최고 성능 모델 찾기
        overall_scores = {}

        for model_name, model_result in model_results.items():
            scores = []

            for category_name, metrics in model_result.items():
                for metric_name, metric_result in metrics.items():
                    if metric_result["score"] is not None:
                        # 정규화된 점수 (0-1 범위)
                        if metric_name in [
                            "log_loss",
                            "max_drawdown",
                            "calibration_error",
                        ]:
                            # 낮을수록 좋은 메트릭
                            normalized_score = 1 / (1 + abs(metric_result["score"]))
                        else:
                            # 높을수록 좋은 메트릭
                            normalized_score = max(0, min(1, metric_result["score"]))

                        scores.append(normalized_score)

            if scores:
                overall_scores[model_name] = np.mean(scores)

        if overall_scores:
            best_model = max(overall_scores, key=overall_scores.get)
            recommendations["best_overall_model"] = {
                "model": best_model,
                "score": overall_scores[best_model],
            }

        # 카테고리별 최고 성능 모델
        comparison_results = self.compare_models(model_results)

        for category_name, metrics in comparison_results["model_rankings"].items():
            category_winners = {}

            for metric_name, ranking in metrics.items():
                if ranking["ranking"]:
                    best_model = ranking["best_model"]
                    category_winners[best_model] = (
                        category_winners.get(best_model, 0) + 1
                    )

            if category_winners:
                best_category_model = max(category_winners, key=category_winners.get)
                recommendations["best_by_category"][category_name] = best_category_model

        # 성능 인사이트
        if overall_scores:
            score_values = list(overall_scores.values())

            if np.std(score_values) < 0.05:
                recommendations["performance_insights"].append(
                    "모델 간 성능 차이가 미미합니다."
                )

            if max(score_values) < 0.7:
                recommendations["improvement_suggestions"].append(
                    "모든 모델의 성능이 낮습니다. 특성 엔지니어링이나 하이퍼파라미터 튜닝을 고려해보세요."
                )

            if max(score_values) - min(score_values) > 0.3:
                recommendations["performance_insights"].append(
                    "모델 간 성능 차이가 큽니다. 최고 성능 모델을 선택하는 것이 중요합니다."
                )

        return recommendations

    def create_visualization_dashboard(self, model_results, output_dir=None):
        """시각화 대시보드 생성"""

        if output_dir is None:
            output_dir = self.results_dir

        # 1. 모델별 성능 비교 차트
        self.plot_model_comparison(model_results, output_dir)

        # 2. 메트릭별 분포 차트
        self.plot_metric_distributions(model_results, output_dir)

        # 3. 상관관계 히트맵
        self.plot_metric_correlations(model_results, output_dir)

        # 4. 레이더 차트
        self.plot_radar_chart(model_results, output_dir)

    def plot_model_comparison(self, model_results, output_dir):
        """모델 비교 차트"""

        metrics_to_plot = ["accuracy", "precision_macro", "recall_macro", "f1_macro"]

        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        axes = axes.flatten()

        for i, metric in enumerate(metrics_to_plot):
            if i < len(axes):
                scores = {}

                for model_name, model_result in model_results.items():
                    if (
                        "basic_classification" in model_result
                        and metric in model_result["basic_classification"]
                        and model_result["basic_classification"][metric]["score"]
                        is not None
                    ):
                        scores[model_name] = model_result["basic_classification"][
                            metric
                        ]["score"]

                if scores:
                    models = list(scores.keys())
                    values = list(scores.values())

                    axes[i].bar(models, values)
                    axes[i].set_title(f"{metric.capitalize()} Comparison")
                    axes[i].set_ylabel("Score")
                    axes[i].tick_params(axis="x", rotation=45)

        plt.tight_layout()
        plt.savefig(f"{output_dir}/model_comparison.png", dpi=300, bbox_inches="tight")
        plt.close()

    def plot_metric_distributions(self, model_results, output_dir):
        """메트릭 분포 차트"""

        all_scores = {}

        for model_name, model_result in model_results.items():
            for category_name, metrics in model_result.items():
                for metric_name, metric_result in metrics.items():
                    if metric_result["score"] is not None:
                        if metric_name not in all_scores:
                            all_scores[metric_name] = []
                        all_scores[metric_name].append(metric_result["score"])

        # 분포가 있는 메트릭만 플롯
        metrics_with_data = {k: v for k, v in all_scores.items() if len(v) > 1}

        if metrics_with_data:
            n_metrics = len(metrics_with_data)
            n_cols = 3
            n_rows = (n_metrics + n_cols - 1) // n_cols

            fig, axes = plt.subplots(n_rows, n_cols, figsize=(15, 5 * n_rows))
            if n_rows == 1:
                axes = [axes] if n_cols == 1 else axes
            else:
                axes = axes.flatten()

            for i, (metric_name, scores) in enumerate(metrics_with_data.items()):
                if i < len(axes):
                    axes[i].hist(scores, bins=10, alpha=0.7)
                    axes[i].set_title(f"{metric_name} Distribution")
                    axes[i].set_xlabel("Score")
                    axes[i].set_ylabel("Frequency")

            # 빈 서브플롯 제거
            for i in range(len(metrics_with_data), len(axes)):
                axes[i].remove()

            plt.tight_layout()
            plt.savefig(
                f"{output_dir}/metric_distributions.png", dpi=300, bbox_inches="tight"
            )
            plt.close()

    def plot_metric_correlations(self, model_results, output_dir):
        """메트릭 상관관계 히트맵"""

        # 모델별 메트릭 데이터 수집
        metric_data = {}

        for model_name, model_result in model_results.items():
            model_metrics = {}

            for category_name, metrics in model_result.items():
                for metric_name, metric_result in metrics.items():
                    if metric_result["score"] is not None:
                        model_metrics[metric_name] = metric_result["score"]

            metric_data[model_name] = model_metrics

        # DataFrame 생성
        df = pd.DataFrame(metric_data).T

        # 상관관계 계산
        if len(df) > 1 and len(df.columns) > 1:
            correlation_matrix = df.corr()

            plt.figure(figsize=(12, 10))
            sns.heatmap(correlation_matrix, annot=True, cmap="coolwarm", center=0)
            plt.title("Metric Correlations")
            plt.tight_layout()
            plt.savefig(
                f"{output_dir}/metric_correlations.png", dpi=300, bbox_inches="tight"
            )
            plt.close()

    def plot_radar_chart(self, model_results, output_dir):
        """레이더 차트"""

        # 주요 메트릭 선택
        key_metrics = ["accuracy", "precision_macro", "recall_macro", "f1_macro"]

        fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(projection="polar"))

        angles = np.linspace(0, 2 * np.pi, len(key_metrics), endpoint=False).tolist()
        angles += angles[:1]  # 원형 완성

        for model_name, model_result in model_results.items():
            values = []

            for metric in key_metrics:
                if (
                    "basic_classification" in model_result
                    and metric in model_result["basic_classification"]
                    and model_result["basic_classification"][metric]["score"]
                    is not None
                ):
                    values.append(model_result["basic_classification"][metric]["score"])
                else:
                    values.append(0)

            values += values[:1]  # 원형 완성

            ax.plot(angles, values, "o-", linewidth=2, label=model_name)
            ax.fill(angles, values, alpha=0.25)

        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(key_metrics)
        ax.set_ylim(0, 1)
        ax.set_title("Model Performance Radar Chart")
        ax.legend(loc="upper right", bbox_to_anchor=(1.2, 1.0))

        plt.tight_layout()
        plt.savefig(f"{output_dir}/radar_chart.png", dpi=300, bbox_inches="tight")
        plt.close()


if __name__ == "__main__":
    evaluator = ComprehensiveEvaluator()

    # 예시 모델 결과 (실제로는 실험에서 가져옴)
    sample_results = {
        "RandomForest": {
            "basic_classification": {
                "accuracy": {
                    "score": 0.85,
                    "description": "Overall accuracy",
                    "interpretation": "Higher is better",
                },
                "precision_macro": {
                    "score": 0.82,
                    "description": "Macro precision",
                    "interpretation": "Higher is better",
                },
                "recall_macro": {
                    "score": 0.78,
                    "description": "Macro recall",
                    "interpretation": "Higher is better",
                },
                "f1_macro": {
                    "score": 0.80,
                    "description": "Macro F1",
                    "interpretation": "Higher is better",
                },
            }
        },
        "XGBoost": {
            "basic_classification": {
                "accuracy": {
                    "score": 0.87,
                    "description": "Overall accuracy",
                    "interpretation": "Higher is better",
                },
                "precision_macro": {
                    "score": 0.84,
                    "description": "Macro precision",
                    "interpretation": "Higher is better",
                },
                "recall_macro": {
                    "score": 0.81,
                    "description": "Macro recall",
                    "interpretation": "Higher is better",
                },
                "f1_macro": {
                    "score": 0.82,
                    "description": "Macro F1",
                    "interpretation": "Higher is better",
                },
            }
        },
    }

    # 종합 평가 보고서 생성
    report = evaluator.generate_comprehensive_report(sample_results)

    print("종합 평가 시스템 테스트 완료!")
    print(f"최고 성능 모델: {report['recommendations']['best_overall_model']['model']}")

    # 시각화 대시보드 생성
    evaluator.create_visualization_dashboard(sample_results)

    print("시각화 대시보드 생성 완료!")
