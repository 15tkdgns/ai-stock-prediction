"""
다양한 실험 설정 시스템
모델, 데이터, 전처리 조합을 통한 포괄적 실험 프레임워크
"""

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
import itertools
import logging
from pathlib import Path
import sqlite3
from sklearn.model_selection import TimeSeriesSplit, ParameterGrid
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, AdaBoostClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
import warnings
warnings.filterwarnings('ignore')

class ExperimentalFramework:
    def __init__(self, data_dir='raw_data', paper_dir='paper_data', experiment_dir='experiments'):
        self.data_dir = data_dir
        self.paper_dir = paper_dir
        self.experiment_dir = experiment_dir
        
        # 실험 디렉토리 생성
        Path(self.experiment_dir).mkdir(parents=True, exist_ok=True)
        
        # 로깅 설정
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{experiment_dir}/experiment_log.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # 실험 설정 정의
        self.define_experiment_configurations()
        
    def define_experiment_configurations(self):
        """실험 설정 정의"""
        
        # 1. 데이터 전처리 설정
        self.preprocessing_configs = {
            'standard': {
                'name': 'Standard Scaling',
                'scaler': StandardScaler(),
                'feature_selection': None,
                'outlier_treatment': 'none'
            },
            'minmax': {
                'name': 'MinMax Scaling',
                'scaler': MinMaxScaler(),
                'feature_selection': None,
                'outlier_treatment': 'none'
            },
            'robust': {
                'name': 'Robust Scaling',
                'scaler': RobustScaler(),
                'feature_selection': None,
                'outlier_treatment': 'clip'
            },
            'standard_outlier': {
                'name': 'Standard Scaling + Outlier Removal',
                'scaler': StandardScaler(),
                'feature_selection': None,
                'outlier_treatment': 'remove'
            },
            'standard_feature_select': {
                'name': 'Standard Scaling + Feature Selection',
                'scaler': StandardScaler(),
                'feature_selection': 'top_20',
                'outlier_treatment': 'none'
            }
        }
        
        # 2. 특성 조합 설정
        self.feature_combinations = {
            'basic': {
                'name': 'Basic Price + Volume',
                'features': ['open', 'high', 'low', 'close', 'volume', 'price_change', 'volume_change']
            },
            'technical': {
                'name': 'Technical Indicators',
                'features': ['sma_20', 'sma_50', 'rsi', 'macd', 'bb_upper', 'bb_lower', 'atr', 'volatility', 'obv']
            },
            'news': {
                'name': 'News Sentiment',
                'features': ['news_sentiment', 'news_polarity', 'news_count']
            },
            'basic_technical': {
                'name': 'Basic + Technical',
                'features': ['open', 'high', 'low', 'close', 'volume', 'price_change', 'volume_change',
                           'sma_20', 'sma_50', 'rsi', 'macd', 'bb_upper', 'bb_lower', 'atr', 'volatility', 'obv']
            },
            'technical_news': {
                'name': 'Technical + News',
                'features': ['sma_20', 'sma_50', 'rsi', 'macd', 'bb_upper', 'bb_lower', 'atr', 'volatility', 'obv',
                           'news_sentiment', 'news_polarity', 'news_count']
            },
            'all_features': {
                'name': 'All Features',
                'features': ['open', 'high', 'low', 'close', 'volume', 'price_change', 'volume_change',
                           'sma_20', 'sma_50', 'rsi', 'macd', 'bb_upper', 'bb_lower', 'atr', 'volatility', 'obv',
                           'news_sentiment', 'news_polarity', 'news_count', 'unusual_volume', 'price_spike']
            }
        }
        
        # 3. 모델 설정
        self.model_configs = {
            'logistic_regression': {
                'name': 'Logistic Regression',
                'model': LogisticRegression(random_state=42, max_iter=1000),
                'hyperparameters': {
                    'C': [0.1, 1.0, 10.0],
                    'penalty': ['l1', 'l2']
                }
            },
            'random_forest': {
                'name': 'Random Forest',
                'model': RandomForestClassifier(random_state=42),
                'hyperparameters': {
                    'n_estimators': [50, 100, 200],
                    'max_depth': [5, 10, 20, None],
                    'min_samples_split': [2, 5, 10]
                }
            },
            'gradient_boosting': {
                'name': 'Gradient Boosting',
                'model': GradientBoostingClassifier(random_state=42),
                'hyperparameters': {
                    'n_estimators': [50, 100, 200],
                    'learning_rate': [0.01, 0.1, 0.2],
                    'max_depth': [3, 5, 7]
                }
            },
            'xgboost': {
                'name': 'XGBoost',
                'model': XGBClassifier(random_state=42, eval_metric='logloss'),
                'hyperparameters': {
                    'n_estimators': [50, 100, 200],
                    'learning_rate': [0.01, 0.1, 0.2],
                    'max_depth': [3, 5, 7]
                }
            },
            'lightgbm': {
                'name': 'LightGBM',
                'model': LGBMClassifier(random_state=42, verbose=-1),
                'hyperparameters': {
                    'n_estimators': [50, 100, 200],
                    'learning_rate': [0.01, 0.1, 0.2],
                    'max_depth': [3, 5, 7]
                }
            },
            'svm': {
                'name': 'Support Vector Machine',
                'model': SVC(random_state=42, probability=True),
                'hyperparameters': {
                    'C': [0.1, 1.0, 10.0],
                    'kernel': ['rbf', 'linear'],
                    'gamma': ['scale', 'auto']
                }
            },
            'mlp': {
                'name': 'Multi-Layer Perceptron',
                'model': MLPClassifier(random_state=42, max_iter=1000),
                'hyperparameters': {
                    'hidden_layer_sizes': [(50,), (100,), (50, 50), (100, 50)],
                    'activation': ['relu', 'tanh'],
                    'learning_rate': ['constant', 'adaptive']
                }
            },
            'naive_bayes': {
                'name': 'Naive Bayes',
                'model': GaussianNB(),
                'hyperparameters': {
                    'var_smoothing': [1e-9, 1e-8, 1e-7]
                }
            },
            'knn': {
                'name': 'K-Nearest Neighbors',
                'model': KNeighborsClassifier(),
                'hyperparameters': {
                    'n_neighbors': [3, 5, 7, 10],
                    'weights': ['uniform', 'distance'],
                    'metric': ['euclidean', 'manhattan']
                }
            },
            'ada_boost': {
                'name': 'AdaBoost',
                'model': AdaBoostClassifier(random_state=42),
                'hyperparameters': {
                    'n_estimators': [50, 100, 200],
                    'learning_rate': [0.01, 0.1, 1.0]
                }
            }
        }
        
        # 4. 교차 검증 설정
        self.cv_configs = {
            'time_series_3fold': {
                'name': '3-Fold Time Series CV',
                'cv': TimeSeriesSplit(n_splits=3),
                'description': 'Time series cross-validation with 3 folds'
            },
            'time_series_5fold': {
                'name': '5-Fold Time Series CV',
                'cv': TimeSeriesSplit(n_splits=5),
                'description': 'Time series cross-validation with 5 folds'
            },
            'holdout': {
                'name': 'Holdout Validation',
                'cv': None,
                'description': 'Simple train/validation split'
            }
        }
        
        # 5. 평가 지표 설정
        self.evaluation_metrics = {
            'accuracy': accuracy_score,
            'precision': lambda y_true, y_pred: precision_score(y_true, y_pred, average='weighted', zero_division=0),
            'recall': lambda y_true, y_pred: recall_score(y_true, y_pred, average='weighted', zero_division=0),
            'f1_score': lambda y_true, y_pred: f1_score(y_true, y_pred, average='weighted', zero_division=0),
            'roc_auc': lambda y_true, y_pred: roc_auc_score(y_true, y_pred, average='weighted', multi_class='ovr') if len(np.unique(y_true)) > 2 else roc_auc_score(y_true, y_pred)
        }
        
    def create_experiment_plan(self, experiment_name="comprehensive_experiment"):
        """실험 계획 생성"""
        
        # 실험 조합 생성
        experiment_combinations = list(itertools.product(
            self.preprocessing_configs.keys(),
            self.feature_combinations.keys(),
            self.model_configs.keys(),
            self.cv_configs.keys()
        ))
        
        # 실험 계획 생성
        experiment_plan = {
            'experiment_name': experiment_name,
            'creation_date': datetime.now().isoformat(),
            'total_experiments': len(experiment_combinations),
            'experiment_combinations': [],
            'estimated_time': len(experiment_combinations) * 5,  # 분 단위 추정
            'configurations': {
                'preprocessing': list(self.preprocessing_configs.keys()),
                'feature_combinations': list(self.feature_combinations.keys()),
                'models': list(self.model_configs.keys()),
                'cross_validation': list(self.cv_configs.keys())
            }
        }
        
        # 각 실험 조합에 대한 상세 정보
        for i, (prep, feat, model, cv) in enumerate(experiment_combinations):
            experiment_plan['experiment_combinations'].append({
                'experiment_id': f'exp_{i+1:04d}',
                'preprocessing': prep,
                'feature_combination': feat,
                'model': model,
                'cross_validation': cv,
                'description': f"{self.preprocessing_configs[prep]['name']} + {self.feature_combinations[feat]['name']} + {self.model_configs[model]['name']} + {self.cv_configs[cv]['name']}"
            })
        
        # 실험 계획 저장
        with open(f'{self.experiment_dir}/experiment_plan.json', 'w') as f:
            json.dump(experiment_plan, f, indent=2)
            
        self.logger.info(f"실험 계획 생성 완료: {len(experiment_combinations)}개 실험")
        
        return experiment_plan
        
    def create_focused_experiment_plan(self, focus_type="top_models"):
        """집중 실험 계획 생성 (시간 단축용)"""
        
        if focus_type == "top_models":
            # 주요 모델만 선택
            selected_models = ['random_forest', 'xgboost', 'lightgbm', 'gradient_boosting']
            selected_preprocessing = ['standard', 'robust']
            selected_features = ['all_features', 'technical_news']
            selected_cv = ['time_series_5fold']
            
        elif focus_type == "quick_comparison":
            # 빠른 비교를 위한 설정
            selected_models = ['random_forest', 'xgboost', 'logistic_regression']
            selected_preprocessing = ['standard']
            selected_features = ['all_features', 'technical']
            selected_cv = ['time_series_3fold']
            
        elif focus_type == "deep_learning":
            # 딥러닝 중심 실험
            selected_models = ['mlp']
            selected_preprocessing = ['standard', 'minmax']
            selected_features = ['all_features', 'technical_news', 'basic_technical']
            selected_cv = ['time_series_5fold']
            
        else:
            # 기본 설정
            selected_models = ['random_forest', 'xgboost', 'logistic_regression']
            selected_preprocessing = ['standard']
            selected_features = ['all_features']
            selected_cv = ['time_series_3fold']
        
        # 실험 조합 생성
        experiment_combinations = list(itertools.product(
            selected_preprocessing,
            selected_features,
            selected_models,
            selected_cv
        ))
        
        # 집중 실험 계획 생성
        focused_plan = {
            'experiment_name': f'focused_{focus_type}',
            'creation_date': datetime.now().isoformat(),
            'focus_type': focus_type,
            'total_experiments': len(experiment_combinations),
            'experiment_combinations': [],
            'estimated_time': len(experiment_combinations) * 3,  # 분 단위 추정
            'configurations': {
                'preprocessing': selected_preprocessing,
                'feature_combinations': selected_features,
                'models': selected_models,
                'cross_validation': selected_cv
            }
        }
        
        # 각 실험 조합에 대한 상세 정보
        for i, (prep, feat, model, cv) in enumerate(experiment_combinations):
            focused_plan['experiment_combinations'].append({
                'experiment_id': f'focused_{i+1:04d}',
                'preprocessing': prep,
                'feature_combination': feat,
                'model': model,
                'cross_validation': cv,
                'description': f"{self.preprocessing_configs[prep]['name']} + {self.feature_combinations[feat]['name']} + {self.model_configs[model]['name']} + {self.cv_configs[cv]['name']}"
            })
        
        # 집중 실험 계획 저장
        with open(f'{self.experiment_dir}/focused_experiment_plan_{focus_type}.json', 'w') as f:
            json.dump(focused_plan, f, indent=2)
            
        self.logger.info(f"집중 실험 계획 생성 완료: {len(experiment_combinations)}개 실험 ({focus_type})")
        
        return focused_plan
        
    def create_ablation_study_plan(self):
        """특성 제거 연구 계획 생성"""
        
        # 기본 특성 세트
        all_features = self.feature_combinations['all_features']['features']
        
        # 특성 그룹별 제거 실험
        ablation_experiments = []
        
        # 1. 단일 특성 그룹 제거
        feature_groups = {
            'price_features': ['open', 'high', 'low', 'close'],
            'volume_features': ['volume', 'volume_change', 'unusual_volume'],
            'trend_features': ['sma_20', 'sma_50', 'macd'],
            'momentum_features': ['rsi'],
            'volatility_features': ['bb_upper', 'bb_lower', 'atr', 'volatility', 'price_spike'],
            'volume_indicators': ['obv'],
            'news_features': ['news_sentiment', 'news_polarity', 'news_count'],
            'derived_features': ['price_change', 'unusual_volume', 'price_spike']
        }
        
        for group_name, group_features in feature_groups.items():
            remaining_features = [f for f in all_features if f not in group_features]
            
            ablation_experiments.append({
                'experiment_type': 'remove_group',
                'removed_group': group_name,
                'removed_features': group_features,
                'remaining_features': remaining_features,
                'description': f"All features except {group_name}"
            })
        
        # 2. 단일 특성 그룹만 사용
        for group_name, group_features in feature_groups.items():
            ablation_experiments.append({
                'experiment_type': 'only_group',
                'used_group': group_name,
                'used_features': group_features,
                'description': f"Only {group_name}"
            })
        
        # 3. 점진적 특성 추가
        cumulative_features = []
        for group_name, group_features in feature_groups.items():
            cumulative_features.extend(group_features)
            
            ablation_experiments.append({
                'experiment_type': 'cumulative',
                'added_group': group_name,
                'used_features': cumulative_features.copy(),
                'description': f"Cumulative up to {group_name}"
            })
        
        # Ablation 실험 계획 생성
        ablation_plan = {
            'experiment_name': 'ablation_study',
            'creation_date': datetime.now().isoformat(),
            'total_experiments': len(ablation_experiments),
            'ablation_experiments': ablation_experiments,
            'fixed_settings': {
                'preprocessing': 'standard',
                'model': 'random_forest',
                'cross_validation': 'time_series_5fold'
            }
        }
        
        # Ablation 실험 계획 저장
        with open(f'{self.experiment_dir}/ablation_study_plan.json', 'w') as f:
            json.dump(ablation_plan, f, indent=2)
            
        self.logger.info(f"Ablation 연구 계획 생성 완료: {len(ablation_experiments)}개 실험")
        
        return ablation_plan
        
    def create_hyperparameter_tuning_plan(self, model_name='random_forest'):
        """하이퍼파라미터 튜닝 계획 생성"""
        
        if model_name not in self.model_configs:
            raise ValueError(f"Unknown model: {model_name}")
            
        model_config = self.model_configs[model_name]
        hyperparameters = model_config['hyperparameters']
        
        # 하이퍼파라미터 조합 생성
        param_combinations = list(ParameterGrid(hyperparameters))
        
        # 하이퍼파라미터 튜닝 계획 생성
        tuning_plan = {
            'experiment_name': f'hyperparameter_tuning_{model_name}',
            'creation_date': datetime.now().isoformat(),
            'model': model_name,
            'total_combinations': len(param_combinations),
            'parameter_combinations': param_combinations,
            'fixed_settings': {
                'preprocessing': 'standard',
                'feature_combination': 'all_features',
                'cross_validation': 'time_series_5fold'
            },
            'search_space': hyperparameters
        }
        
        # 하이퍼파라미터 튜닝 계획 저장
        with open(f'{self.experiment_dir}/hyperparameter_tuning_{model_name}.json', 'w') as f:
            json.dump(tuning_plan, f, indent=2)
            
        self.logger.info(f"하이퍼파라미터 튜닝 계획 생성 완료: {len(param_combinations)}개 조합")
        
        return tuning_plan
        
    def create_time_window_experiments(self):
        """시간 윈도우 실험 계획 생성"""
        
        # 다양한 시간 윈도우 설정
        time_windows = {
            'short_term': {
                'name': 'Short-term (1-5 days)',
                'lookback_days': 5,
                'prediction_horizon': 1,
                'description': 'Short-term prediction with 5-day lookback'
            },
            'medium_term': {
                'name': 'Medium-term (1-20 days)',
                'lookback_days': 20,
                'prediction_horizon': 1,
                'description': 'Medium-term prediction with 20-day lookback'
            },
            'long_term': {
                'name': 'Long-term (1-60 days)',
                'lookback_days': 60,
                'prediction_horizon': 1,
                'description': 'Long-term prediction with 60-day lookback'
            },
            'multi_horizon': {
                'name': 'Multi-horizon (1-20 days, 1-5 day prediction)',
                'lookback_days': 20,
                'prediction_horizon': 5,
                'description': 'Multi-step ahead prediction'
            }
        }
        
        # 시간 윈도우 실험 계획 생성
        time_window_plan = {
            'experiment_name': 'time_window_analysis',
            'creation_date': datetime.now().isoformat(),
            'total_experiments': len(time_windows),
            'time_window_experiments': time_windows,
            'fixed_settings': {
                'preprocessing': 'standard',
                'feature_combination': 'all_features',
                'model': 'random_forest',
                'cross_validation': 'time_series_5fold'
            }
        }
        
        # 시간 윈도우 실험 계획 저장
        with open(f'{self.experiment_dir}/time_window_experiments.json', 'w') as f:
            json.dump(time_window_plan, f, indent=2)
            
        self.logger.info(f"시간 윈도우 실험 계획 생성 완료: {len(time_windows)}개 설정")
        
        return time_window_plan
        
    def generate_all_experiment_plans(self):
        """모든 실험 계획 생성"""
        
        experiment_plans = {}
        
        # 1. 종합 실험 계획
        experiment_plans['comprehensive'] = self.create_experiment_plan()
        
        # 2. 집중 실험 계획들
        experiment_plans['top_models'] = self.create_focused_experiment_plan('top_models')
        experiment_plans['quick_comparison'] = self.create_focused_experiment_plan('quick_comparison')
        experiment_plans['deep_learning'] = self.create_focused_experiment_plan('deep_learning')
        
        # 3. Ablation 연구
        experiment_plans['ablation'] = self.create_ablation_study_plan()
        
        # 4. 하이퍼파라미터 튜닝 (주요 모델들)
        for model in ['random_forest', 'xgboost', 'lightgbm']:
            experiment_plans[f'hyperparameter_{model}'] = self.create_hyperparameter_tuning_plan(model)
        
        # 5. 시간 윈도우 실험
        experiment_plans['time_window'] = self.create_time_window_experiments()
        
        # 전체 계획 요약
        total_experiments = sum(plan['total_experiments'] for plan in experiment_plans.values())
        
        experiment_summary = {
            'total_experiment_plans': len(experiment_plans),
            'total_experiments': total_experiments,
            'experiment_plans': {name: plan['total_experiments'] for name, plan in experiment_plans.items()},
            'generation_date': datetime.now().isoformat(),
            'estimated_total_time_hours': total_experiments * 5 / 60  # 분을 시간으로 변환
        }
        
        # 실험 요약 저장
        with open(f'{self.experiment_dir}/experiment_summary.json', 'w') as f:
            json.dump(experiment_summary, f, indent=2)
            
        self.logger.info(f"모든 실험 계획 생성 완료: {len(experiment_plans)}개 계획, {total_experiments}개 실험")
        
        return experiment_plans, experiment_summary

if __name__ == "__main__":
    framework = ExperimentalFramework()
    
    print("실험 프레임워크 설정 중...")
    
    # 모든 실험 계획 생성
    plans, summary = framework.generate_all_experiment_plans()
    
    print("\n=== 실험 계획 요약 ===")
    print(f"총 실험 계획: {summary['total_experiment_plans']}개")
    print(f"총 실험 수: {summary['total_experiments']}개")
    print(f"예상 소요 시간: {summary['estimated_total_time_hours']:.1f}시간")
    
    print("\n=== 실험 계획별 세부사항 ===")
    for plan_name, exp_count in summary['experiment_plans'].items():
        print(f"- {plan_name}: {exp_count}개 실험")
        
    print(f"\n실험 계획 파일들이 '{framework.experiment_dir}' 디렉토리에 저장되었습니다.")
    print("실험 실행을 위해 experiment_runner.py를 사용하세요.")