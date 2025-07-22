import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import shap
import os
import lime
import lime.lime_tabular
from sklearn.inspection import permutation_importance
import joblib
import warnings
warnings.filterwarnings('ignore')

class XAIMonitoringSystem:
    def __init__(self, data_dir='/root/workspace/data/raw'):
        self.data_dir = data_dir
        self.models = {}
        self.explainers = {}
        self.monitoring_metrics = {}
        
    def load_trained_models(self):
        """학습된 모델 로드"""
        try:
            # Random Forest 모델
            if os.path.exists(f'{self.data_dir}/random_forest_model.pkl'):
                self.models['random_forest'] = joblib.load(f'{self.data_dir}/random_forest_model.pkl')
                
            # Gradient Boosting 모델
            if os.path.exists(f'{self.data_dir}/gradient_boosting_model.pkl'):
                self.models['gradient_boosting'] = joblib.load(f'{self.data_dir}/gradient_boosting_model.pkl')
                
            # 스케일러
            if os.path.exists(f'{self.data_dir}/scaler.pkl'):
                self.scaler = joblib.load(f'{self.data_dir}/scaler.pkl')
                
            print(f"✅ 로드된 모델: {list(self.models.keys())}")
            return True
            
        except Exception as e:
            print(f"❌ 모델 로드 실패: {e}")
            return False
            
    def setup_explainers(self, X_train, feature_names):
        """XAI 설명자 설정"""
        print("=== XAI 설명자 설정 ===")
        
        try:
            # SHAP 설명자 설정
            for model_name, model in self.models.items():
                if model_name in ['random_forest', 'gradient_boosting']:
                    explainer = shap.TreeExplainer(model)
                    self.explainers[f'{model_name}_shap'] = explainer
                    print(f"✅ {model_name} SHAP 설명자 설정 완료")
                    
            # LIME 설명자 설정
            self.explainers['lime'] = lime.lime_tabular.LimeTabularExplainer(
                X_train,
                feature_names=feature_names,
                class_names=['Normal', 'Event'],
                mode='classification'
            )
            print("✅ LIME 설명자 설정 완료")
            
            return True
            
        except Exception as e:
            print(f"❌ 설명자 설정 실패: {e}")
            return False
            
    def calculate_feature_importance(self, X_test, y_test, feature_names):
        """특성 중요도 계산"""
        print("\n=== 특성 중요도 계산 ===")
        
        importance_results = {}
        
        for model_name, model in self.models.items():
            try:
                # 1. 내장 특성 중요도
                if hasattr(model, 'feature_importances_'):
                    importance_results[f'{model_name}_builtin'] = {
                        'importance': model.feature_importances_,
                        'features': feature_names
                    }
                    
                # 2. Permutation 중요도
                perm_importance = permutation_importance(
                    model, X_test, y_test, n_repeats=10, random_state=42
                )
                importance_results[f'{model_name}_permutation'] = {
                    'importance': perm_importance.importances_mean,
                    'std': perm_importance.importances_std,
                    'features': feature_names
                }
                
                print(f"✅ {model_name} 특성 중요도 계산 완료")
                
            except Exception as e:
                print(f"❌ {model_name} 특성 중요도 계산 실패: {e}")
                
        return importance_results
        
    def generate_shap_explanations(self, X_sample, max_samples=100):
        """SHAP 설명 생성"""
        print("\n=== SHAP 설명 생성 ===")
        
        shap_results = {}
        
        # 샘플 수 제한 (계산 시간 단축)
        if len(X_sample) > max_samples:
            X_sample = X_sample[:max_samples]
            
        for explainer_name, explainer in self.explainers.items():
            if 'shap' in explainer_name:
                try:
                    # SHAP 값 계산
                    shap_values = explainer.shap_values(X_sample)
                    
                    # 이진 분류의 경우 클래스 1에 대한 SHAP 값만 사용
                    if isinstance(shap_values, list) and len(shap_values) == 2:
                        shap_values = shap_values[1]
                        
                    shap_results[explainer_name] = {
                        'shap_values': shap_values,
                        'base_value': explainer.expected_value if hasattr(explainer, 'expected_value') else 0,
                        'feature_importance': np.abs(shap_values).mean(axis=0)
                    }
                    
                    print(f"✅ {explainer_name} SHAP 설명 생성 완료")
                    
                except Exception as e:
                    print(f"❌ {explainer_name} SHAP 설명 생성 실패: {e}")
                    
        return shap_results
        
    def generate_lime_explanations(self, X_sample, model_name='random_forest', num_samples=5):
        """LIME 설명 생성"""
        print("\n=== LIME 설명 생성 ===")
        
        lime_results = []
        
        if model_name not in self.models:
            print(f"❌ 모델 {model_name} 없음")
            return lime_results
            
        model = self.models[model_name]
        lime_explainer = self.explainers.get('lime')
        
        if lime_explainer is None:
            print("❌ LIME 설명자 없음")
            return lime_results
            
        try:
            # 샘플 수 제한
            samples_to_explain = min(num_samples, len(X_sample))
            
            for i in range(samples_to_explain):
                explanation = lime_explainer.explain_instance(
                    X_sample[i], 
                    model.predict_proba,
                    num_features=10
                )
                
                lime_results.append({
                    'sample_index': i,
                    'explanation': explanation.as_list(),
                    'prediction_proba': model.predict_proba([X_sample[i]])[0]
                })
                
            print(f"✅ LIME 설명 {samples_to_explain}개 생성 완료")
            
        except Exception as e:
            print(f"❌ LIME 설명 생성 실패: {e}")
            
        return lime_results
        
    def monitor_prediction_confidence(self, X_test, threshold=0.7):
        """예측 신뢰도 모니터링"""
        print("\n=== 예측 신뢰도 모니터링 ===")
        
        confidence_results = {}
        
        for model_name, model in self.models.items():
            try:
                # 예측 확률 계산
                pred_proba = model.predict_proba(X_test)
                
                # 최대 확률 (신뢰도)
                max_proba = np.max(pred_proba, axis=1)
                
                # 신뢰도 통계
                confidence_stats = {
                    'mean_confidence': np.mean(max_proba),
                    'std_confidence': np.std(max_proba),
                    'low_confidence_ratio': np.mean(max_proba < threshold),
                    'high_confidence_ratio': np.mean(max_proba > 0.9),
                    'confidence_distribution': {
                        'very_low': np.mean(max_proba < 0.5),
                        'low': np.mean((max_proba >= 0.5) & (max_proba < 0.7)),
                        'medium': np.mean((max_proba >= 0.7) & (max_proba < 0.9)),
                        'high': np.mean(max_proba >= 0.9)
                    }
                }
                
                confidence_results[model_name] = confidence_stats
                
                print(f"✅ {model_name} 신뢰도 모니터링 완료")
                print(f"   평균 신뢰도: {confidence_stats['mean_confidence']:.3f}")
                print(f"   낮은 신뢰도 비율: {confidence_stats['low_confidence_ratio']:.3f}")
                
            except Exception as e:
                print(f"❌ {model_name} 신뢰도 모니터링 실패: {e}")
                
        return confidence_results
        
    def detect_feature_drift(self, X_train, X_test, feature_names, threshold=0.1):
        """특성 드리프트 탐지"""
        print("\n=== 특성 드리프트 탐지 ===")
        
        drift_results = {}
        
        try:
            for i, feature in enumerate(feature_names):
                # 통계적 차이 계산
                train_mean = np.mean(X_train[:, i])
                test_mean = np.mean(X_test[:, i])
                train_std = np.std(X_train[:, i])
                test_std = np.std(X_test[:, i])
                
                # 정규화된 차이
                if train_std > 0:
                    mean_drift = abs(test_mean - train_mean) / train_std
                    std_drift = abs(test_std - train_std) / train_std
                else:
                    mean_drift = 0
                    std_drift = 0
                    
                # 드리프트 탐지
                is_drift = mean_drift > threshold or std_drift > threshold
                
                drift_results[feature] = {
                    'mean_drift': mean_drift,
                    'std_drift': std_drift,
                    'is_drift': is_drift,
                    'drift_severity': 'high' if mean_drift > threshold * 2 else 'medium' if is_drift else 'low'
                }
                
                if is_drift:
                    print(f"⚠️  {feature}: 드리프트 탐지됨 (평균: {mean_drift:.3f}, 표준편차: {std_drift:.3f})")
                    
            drift_count = sum(1 for v in drift_results.values() if v['is_drift'])
            print(f"✅ 특성 드리프트 탐지 완료: {drift_count}/{len(feature_names)}개 특성에서 드리프트 탐지")
            
        except Exception as e:
            print(f"❌ 특성 드리프트 탐지 실패: {e}")
            
        return drift_results
        
    def create_monitoring_dashboard(self, importance_results, shap_results, confidence_results, drift_results):
        """모니터링 대시보드 생성"""
        print("\n=== 모니터링 대시보드 생성 ===")
        
        try:
            # NumPy 배열을 리스트로 변환
            for model_name, results in importance_results.items():
                for key, value in results.items():
                    if isinstance(value, np.ndarray):
                        results[key] = value.tolist()

            # 종합 모니터링 메트릭
            dashboard_data = {
                'timestamp': datetime.now().isoformat(),
                'model_performance': {
                    'loaded_models': list(self.models.keys()),
                    'confidence_metrics': confidence_results,
                    'feature_drift_summary': {
                        'total_features': len(drift_results),
                        'drift_detected': sum(1 for v in drift_results.values() if v['is_drift']),
                        'high_severity_drift': sum(1 for v in drift_results.values() if v['drift_severity'] == 'high')
                    }
                },
                'explainability': {
                    'shap_available': len(shap_results) > 0,
                    'lime_available': 'lime' in self.explainers,
                    'feature_importance_methods': importance_results # 변경: 특성 중요도 결과 전체 저장
                },
                'alerts': []
            }
            
            # 알림 생성
            for model_name, conf in confidence_results.items():
                if conf['low_confidence_ratio'] > 0.2:
                    dashboard_data['alerts'].append({
                        'type': 'low_confidence',
                        'message': f"{model_name}: 낮은 신뢰도 예측 비율 높음 ({conf['low_confidence_ratio']:.3f})",
                        'severity': 'warning'
                    })
                    
            if dashboard_data['model_performance']['feature_drift_summary']['high_severity_drift'] > 0:
                dashboard_data['alerts'].append({
                    'type': 'feature_drift',
                    'message': f"고강도 특성 드리프트 {dashboard_data['model_performance']['feature_drift_summary']['high_severity_drift']}개 탐지",
                    'severity': 'critical'
                })
                
            # 대시보드 데이터 저장
            with open(f'{self.data_dir}/monitoring_dashboard.json', 'w') as f:
                json.dump(dashboard_data, f, indent=2)
                
            print("✅ 모니터링 대시보드 생성 완료")
            return dashboard_data
            
        except Exception as e:
            print(f"❌ 모니터링 대시보드 생성 실패: {e}")
            return None
            
    def run_full_monitoring(self):
        """전체 모니터링 실행"""
        print("=== XAI 모니터링 시스템 실행 ===")
        
        # 1. 모델 로드
        if not self.load_trained_models():
            return None
            
        # 2. 테스트 데이터 로드
        try:
            features_df = pd.read_csv(f'{self.data_dir}/training_features.csv')
            
            # 특성 이름
            feature_names = [
                'Open', 'High', 'Low', 'Close', 'Volume',
                'sma_20', 'sma_50', 'rsi', 'macd', 'bb_upper', 'bb_lower',
                'atr', 'volatility', 'obv', 'price_change', 'volume_change',
                'unusual_volume', 'price_spike', 'news_sentiment', 'news_polarity', 'news_count'
            ]
            
            X = features_df[feature_names].fillna(0).values
            
            # 데이터 분할 (학습/테스트 분리)
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            
            # 라벨 로드
            labels_df = pd.read_csv(f'{self.data_dir}/event_labels.csv')
            y_test = labels_df['major_event'].values[split_idx:]
            
        except Exception as e:
            print(f"❌ 데이터 로드 실패: {e}")
            return None
            
        # 3. 설명자 설정
        self.setup_explainers(X_train, feature_names)
        
        # 4. 특성 중요도 계산
        importance_results = self.calculate_feature_importance(X_test, y_test, feature_names)
        
        # 5. SHAP 설명 생성
        shap_results = self.generate_shap_explanations(X_test[:50])  # 샘플 50개
        
        # 6. 신뢰도 모니터링
        confidence_results = self.monitor_prediction_confidence(X_test)
        
        # 7. 드리프트 탐지
        drift_results = self.detect_feature_drift(X_train, X_test, feature_names)
        
        # 8. 대시보드 생성
        dashboard = self.create_monitoring_dashboard(
            importance_results, shap_results, confidence_results, drift_results
        )
        
        print("\n=== 모니터링 완료 ===")
        return dashboard

if __name__ == "__main__":
    import os
    
    monitor = XAIMonitoringSystem()
    result = monitor.run_full_monitoring()