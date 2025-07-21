"""
고급 데이터 전처리 실험 옵션
다양한 전처리 기법과 특성 엔지니어링을 통한 성능 향상
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer, QuantileTransformer
from sklearn.decomposition import PCA, FastICA, FactorAnalysis
from sklearn.feature_selection import SelectKBest, SelectPercentile, RFE, RFECV
from sklearn.feature_selection import chi2, f_classif, mutual_info_classif
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LassoCV
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from scipy import stats
from scipy.stats import boxcox
import ta
import warnings
warnings.filterwarnings('ignore')

class AdvancedPreprocessor:
    def __init__(self):
        self.preprocessing_methods = self.define_preprocessing_methods()
        
    def define_preprocessing_methods(self):
        """고급 전처리 방법 정의"""
        
        return {
            # 1. 스케일링 방법
            'standard_scaling': {
                'name': 'Standard Scaling',
                'method': StandardScaler(),
                'description': 'Mean 0, Standard deviation 1로 정규화'
            },
            
            'minmax_scaling': {
                'name': 'MinMax Scaling',
                'method': MinMaxScaler(),
                'description': '0-1 범위로 정규화'
            },
            
            'robust_scaling': {
                'name': 'Robust Scaling',
                'method': RobustScaler(),
                'description': 'Median과 IQR 사용한 스케일링'
            },
            
            'power_transform': {
                'name': 'Power Transform (Yeo-Johnson)',
                'method': PowerTransformer(method='yeo-johnson'),
                'description': 'Power transformation으로 정규분포에 가깝게 변환'
            },
            
            'quantile_transform': {
                'name': 'Quantile Transform',
                'method': QuantileTransformer(output_distribution='normal'),
                'description': 'Quantile 기반 정규분포 변환'
            },
            
            # 2. 결측값 처리
            'simple_imputer_mean': {
                'name': 'Simple Imputer (Mean)',
                'method': SimpleImputer(strategy='mean'),
                'description': '평균값으로 결측값 대체'
            },
            
            'simple_imputer_median': {
                'name': 'Simple Imputer (Median)',
                'method': SimpleImputer(strategy='median'),
                'description': '중간값으로 결측값 대체'
            },
            
            'knn_imputer': {
                'name': 'KNN Imputer',
                'method': KNNImputer(n_neighbors=5),
                'description': 'K-최근접 이웃 기반 결측값 대체'
            },
            
            # 3. 이상치 처리
            'outlier_clip': {
                'name': 'Outlier Clipping',
                'method': self.clip_outliers,
                'description': 'IQR 기반 이상치 클리핑'
            },
            
            'outlier_zscore': {
                'name': 'Z-Score Outlier Removal',
                'method': self.remove_zscore_outliers,
                'description': 'Z-Score 기반 이상치 제거'
            },
            
            'outlier_isolation': {
                'name': 'Isolation Forest',
                'method': self.remove_isolation_outliers,
                'description': 'Isolation Forest 기반 이상치 제거'
            },
            
            # 4. 특성 생성
            'polynomial_features': {
                'name': 'Polynomial Features',
                'method': self.create_polynomial_features,
                'description': '다항식 특성 생성'
            },
            
            'interaction_features': {
                'name': 'Interaction Features',
                'method': self.create_interaction_features,
                'description': '특성 간 상호작용 특성 생성'
            },
            
            'technical_ratios': {
                'name': 'Technical Ratios',
                'method': self.create_technical_ratios,
                'description': '기술적 비율 특성 생성'
            },
            
            'rolling_features': {
                'name': 'Rolling Features',
                'method': self.create_rolling_features,
                'description': '이동 윈도우 통계 특성 생성'
            },
            
            'lag_features': {
                'name': 'Lag Features',
                'method': self.create_lag_features,
                'description': '시차 특성 생성'
            },
            
            'fourier_features': {
                'name': 'Fourier Transform Features',
                'method': self.create_fourier_features,
                'description': 'FFT 기반 주파수 도메인 특성'
            },
            
            # 5. 차원 축소
            'pca': {
                'name': 'Principal Component Analysis',
                'method': PCA(n_components=0.95),
                'description': '주성분 분석 (95% 분산 유지)'
            },
            
            'ica': {
                'name': 'Independent Component Analysis',
                'method': FastICA(n_components=20, random_state=42),
                'description': '독립성분 분석'
            },
            
            'factor_analysis': {
                'name': 'Factor Analysis',
                'method': FactorAnalysis(n_components=20, random_state=42),
                'description': '요인 분석'
            },
            
            # 6. 특성 선택
            'univariate_selection': {
                'name': 'Univariate Feature Selection',
                'method': SelectKBest(score_func=f_classif, k=20),
                'description': '단변량 통계 테스트 기반 특성 선택'
            },
            
            'mutual_info_selection': {
                'name': 'Mutual Information Selection',
                'method': SelectKBest(score_func=mutual_info_classif, k=20),
                'description': '상호정보량 기반 특성 선택'
            },
            
            'rfe_selection': {
                'name': 'Recursive Feature Elimination',
                'method': RFE(RandomForestClassifier(n_estimators=100, random_state=42), n_features_to_select=20),
                'description': '재귀적 특성 제거'
            },
            
            'lasso_selection': {
                'name': 'Lasso Feature Selection',
                'method': self.lasso_feature_selection,
                'description': 'Lasso 정규화 기반 특성 선택'
            },
            
            # 7. 클러스터링 기반 특성
            'kmeans_features': {
                'name': 'K-Means Clustering Features',
                'method': self.create_kmeans_features,
                'description': 'K-Means 클러스터링 기반 특성'
            },
            
            # 8. 시계열 특성
            'technical_indicators_extended': {
                'name': 'Extended Technical Indicators',
                'method': self.create_extended_technical_indicators,
                'description': '확장된 기술적 지표'
            },
            
            'cyclical_features': {
                'name': 'Cyclical Features',
                'method': self.create_cyclical_features,
                'description': '시간 기반 순환 특성'
            }
        }
    
    def clip_outliers(self, X):
        """IQR 기반 이상치 클리핑"""
        X_clipped = X.copy()
        
        for i in range(X.shape[1]):
            Q1 = np.percentile(X[:, i], 25)
            Q3 = np.percentile(X[:, i], 75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            X_clipped[:, i] = np.clip(X[:, i], lower_bound, upper_bound)
        
        return X_clipped
    
    def remove_zscore_outliers(self, X, y=None, threshold=3):
        """Z-Score 기반 이상치 제거"""
        z_scores = np.abs(stats.zscore(X))
        outlier_mask = (z_scores < threshold).all(axis=1)
        
        if y is not None:
            return X[outlier_mask], y[outlier_mask]
        else:
            return X[outlier_mask]
    
    def remove_isolation_outliers(self, X, y=None, contamination=0.1):
        """Isolation Forest 기반 이상치 제거"""
        from sklearn.ensemble import IsolationForest
        
        iso_forest = IsolationForest(contamination=contamination, random_state=42)
        outlier_mask = iso_forest.fit_predict(X) == 1
        
        if y is not None:
            return X[outlier_mask], y[outlier_mask]
        else:
            return X[outlier_mask]
    
    def create_polynomial_features(self, X, degree=2):
        """다항식 특성 생성"""
        from sklearn.preprocessing import PolynomialFeatures
        
        # 특성 수가 많을 경우 제한
        if X.shape[1] > 10:
            X_selected = X[:, :10]  # 상위 10개 특성만 사용
        else:
            X_selected = X
            
        poly = PolynomialFeatures(degree=degree, include_bias=False)
        X_poly = poly.fit_transform(X_selected)
        
        return X_poly
    
    def create_interaction_features(self, X):
        """특성 간 상호작용 특성 생성"""
        n_features = X.shape[1]
        
        # 상위 몇 개 특성만 사용 (계산 복잡도 제한)
        if n_features > 10:
            X_selected = X[:, :10]
            n_features = 10
        else:
            X_selected = X
            
        interaction_features = []
        
        # 2차 상호작용
        for i in range(n_features):
            for j in range(i+1, n_features):
                interaction_features.append(X_selected[:, i] * X_selected[:, j])
        
        if interaction_features:
            X_interactions = np.column_stack([X] + interaction_features)
        else:
            X_interactions = X
            
        return X_interactions
    
    def create_technical_ratios(self, df):
        """기술적 비율 특성 생성"""
        ratios = {}
        
        if 'close' in df.columns and 'volume' in df.columns:
            ratios['price_volume_ratio'] = df['close'] / (df['volume'] + 1e-8)
        
        if 'high' in df.columns and 'low' in df.columns:
            ratios['high_low_ratio'] = df['high'] / (df['low'] + 1e-8)
        
        if 'close' in df.columns and 'open' in df.columns:
            ratios['close_open_ratio'] = df['close'] / (df['open'] + 1e-8)
        
        if 'sma_20' in df.columns and 'sma_50' in df.columns:
            ratios['sma_ratio'] = df['sma_20'] / (df['sma_50'] + 1e-8)
        
        if 'bb_upper' in df.columns and 'bb_lower' in df.columns:
            ratios['bb_width'] = (df['bb_upper'] - df['bb_lower']) / (df['bb_lower'] + 1e-8)
        
        if 'close' in df.columns and 'bb_upper' in df.columns and 'bb_lower' in df.columns:
            ratios['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'] + 1e-8)
        
        return pd.DataFrame(ratios)
    
    def create_rolling_features(self, df, windows=[5, 10, 20]):
        """이동 윈도우 통계 특성 생성"""
        rolling_features = {}
        
        for window in windows:
            if 'close' in df.columns:
                rolling_features[f'close_mean_{window}'] = df['close'].rolling(window=window).mean()
                rolling_features[f'close_std_{window}'] = df['close'].rolling(window=window).std()
                rolling_features[f'close_min_{window}'] = df['close'].rolling(window=window).min()
                rolling_features[f'close_max_{window}'] = df['close'].rolling(window=window).max()
            
            if 'volume' in df.columns:
                rolling_features[f'volume_mean_{window}'] = df['volume'].rolling(window=window).mean()
                rolling_features[f'volume_std_{window}'] = df['volume'].rolling(window=window).std()
            
            if 'price_change' in df.columns:
                rolling_features[f'return_mean_{window}'] = df['price_change'].rolling(window=window).mean()
                rolling_features[f'return_std_{window}'] = df['price_change'].rolling(window=window).std()
                rolling_features[f'return_skew_{window}'] = df['price_change'].rolling(window=window).skew()
                rolling_features[f'return_kurt_{window}'] = df['price_change'].rolling(window=window).kurt()
        
        return pd.DataFrame(rolling_features)
    
    def create_lag_features(self, df, lags=[1, 3, 5, 10]):
        """시차 특성 생성"""
        lag_features = {}
        
        for lag in lags:
            if 'close' in df.columns:
                lag_features[f'close_lag_{lag}'] = df['close'].shift(lag)
            
            if 'volume' in df.columns:
                lag_features[f'volume_lag_{lag}'] = df['volume'].shift(lag)
            
            if 'price_change' in df.columns:
                lag_features[f'return_lag_{lag}'] = df['price_change'].shift(lag)
            
            if 'rsi' in df.columns:
                lag_features[f'rsi_lag_{lag}'] = df['rsi'].shift(lag)
        
        return pd.DataFrame(lag_features)
    
    def create_fourier_features(self, X, n_components=5):
        """FFT 기반 주파수 도메인 특성"""
        fourier_features = []
        
        for i in range(min(n_components, X.shape[1])):
            # FFT 계산
            fft_values = np.fft.fft(X[:, i])
            
            # 주파수 성분 추출
            fourier_features.append(np.real(fft_values[:len(fft_values)//2]))
            fourier_features.append(np.imag(fft_values[:len(fft_values)//2]))
        
        if fourier_features:
            # 모든 시리즈 길이를 맞춤
            min_length = min(len(f) for f in fourier_features)
            fourier_features = [f[:min_length] for f in fourier_features]
            
            X_fourier = np.column_stack([X] + fourier_features)
        else:
            X_fourier = X
            
        return X_fourier
    
    def lasso_feature_selection(self, X, y):
        """Lasso 정규화 기반 특성 선택"""
        lasso = LassoCV(cv=5, random_state=42)
        lasso.fit(X, y)
        
        selected_features = np.where(lasso.coef_ != 0)[0]
        
        if len(selected_features) == 0:
            return X[:, :min(20, X.shape[1])]  # 최소 20개 특성 유지
        
        return X[:, selected_features]
    
    def create_kmeans_features(self, X, n_clusters=5):
        """K-Means 클러스터링 기반 특성"""
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        cluster_labels = kmeans.fit_predict(X)
        
        # 클러스터 중심까지의 거리
        distances = kmeans.transform(X)
        
        # 클러스터 라벨과 거리를 특성으로 추가
        cluster_features = np.column_stack([
            X, 
            cluster_labels.reshape(-1, 1),
            distances
        ])
        
        return cluster_features
    
    def create_extended_technical_indicators(self, df):
        """확장된 기술적 지표"""
        indicators = {}
        
        if all(col in df.columns for col in ['high', 'low', 'close', 'volume']):
            # 추가 기술적 지표 계산
            high = df['high']
            low = df['low']
            close = df['close']
            volume = df['volume']
            
            # Commodity Channel Index
            indicators['cci'] = ta.trend.cci(high, low, close)
            
            # Money Flow Index
            indicators['mfi'] = ta.volume.money_flow_index(high, low, close, volume)
            
            # Average Directional Index
            indicators['adx'] = ta.trend.adx(high, low, close)
            
            # Parabolic SAR
            indicators['psar'] = ta.trend.psar_up(high, low, close)
            
            # Stochastic Oscillator
            indicators['stoch'] = ta.momentum.stoch(high, low, close)
            
            # Williams %R
            indicators['williams_r'] = ta.momentum.williams_r(high, low, close)
            
            # Ultimate Oscillator
            indicators['uo'] = ta.momentum.ultimate_oscillator(high, low, close)
            
            # Kaufman Adaptive Moving Average
            indicators['kama'] = ta.trend.kama(close)
            
            # Triple Exponential Moving Average
            indicators['tema'] = ta.trend.tema(close)
            
            # Chaikin Oscillator
            indicators['chaikin_osc'] = ta.volume.chaikin_money_flow(high, low, close, volume)
        
        return pd.DataFrame(indicators)
    
    def create_cyclical_features(self, df):
        """시간 기반 순환 특성"""
        cyclical_features = {}
        
        if 'date' in df.columns:
            dates = pd.to_datetime(df['date'])
            
            # 시간 기반 순환 특성
            cyclical_features['hour_sin'] = np.sin(2 * np.pi * dates.dt.hour / 24)
            cyclical_features['hour_cos'] = np.cos(2 * np.pi * dates.dt.hour / 24)
            
            cyclical_features['day_sin'] = np.sin(2 * np.pi * dates.dt.dayofweek / 7)
            cyclical_features['day_cos'] = np.cos(2 * np.pi * dates.dt.dayofweek / 7)
            
            cyclical_features['month_sin'] = np.sin(2 * np.pi * dates.dt.month / 12)
            cyclical_features['month_cos'] = np.cos(2 * np.pi * dates.dt.month / 12)
            
            cyclical_features['quarter_sin'] = np.sin(2 * np.pi * dates.dt.quarter / 4)
            cyclical_features['quarter_cos'] = np.cos(2 * np.pi * dates.dt.quarter / 4)
        
        return pd.DataFrame(cyclical_features)
    
    def create_preprocessing_pipeline(self, methods_list):
        """전처리 파이프라인 생성"""
        
        pipeline_steps = []
        
        for method_name in methods_list:
            if method_name in self.preprocessing_methods:
                method_info = self.preprocessing_methods[method_name]
                pipeline_steps.append((method_name, method_info['method']))
        
        return Pipeline(pipeline_steps)
    
    def apply_preprocessing_combination(self, X, y, method_names):
        """전처리 조합 적용"""
        
        X_processed = X.copy()
        y_processed = y.copy()
        
        applied_methods = []
        
        for method_name in method_names:
            if method_name in self.preprocessing_methods:
                method = self.preprocessing_methods[method_name]['method']
                
                try:
                    if hasattr(method, 'fit_transform'):
                        if method_name in ['lasso_selection', 'rfe_selection']:
                            # 지도학습 기반 방법
                            X_processed = method.fit_transform(X_processed, y_processed)
                        else:
                            X_processed = method.fit_transform(X_processed)
                    elif callable(method):
                        # 커스텀 함수
                        if method_name in ['remove_zscore_outliers', 'remove_isolation_outliers']:
                            X_processed, y_processed = method(X_processed, y_processed)
                        else:
                            X_processed = method(X_processed)
                    
                    applied_methods.append(method_name)
                    
                except Exception as e:
                    print(f"전처리 방법 {method_name} 적용 실패: {e}")
                    continue
        
        return X_processed, y_processed, applied_methods
    
    def get_preprocessing_combinations(self):
        """전처리 조합 추천"""
        
        combinations = {
            'basic': {
                'name': 'Basic Preprocessing',
                'methods': ['standard_scaling', 'simple_imputer_mean'],
                'description': '기본 전처리 (표준화 + 평균 대체)'
            },
            
            'robust': {
                'name': 'Robust Preprocessing',
                'methods': ['robust_scaling', 'knn_imputer', 'outlier_clip'],
                'description': '로버스트 전처리 (로버스트 스케일링 + KNN 대체 + 이상치 클리핑)'
            },
            
            'advanced': {
                'name': 'Advanced Preprocessing',
                'methods': ['power_transform', 'knn_imputer', 'outlier_isolation', 'univariate_selection'],
                'description': '고급 전처리 (파워 변환 + KNN 대체 + 이상치 제거 + 특성 선택)'
            },
            
            'feature_engineering': {
                'name': 'Feature Engineering',
                'methods': ['standard_scaling', 'polynomial_features', 'interaction_features'],
                'description': '특성 엔지니어링 (표준화 + 다항식 특성 + 상호작용 특성)'
            },
            
            'dimensionality_reduction': {
                'name': 'Dimensionality Reduction',
                'methods': ['standard_scaling', 'pca'],
                'description': '차원 축소 (표준화 + PCA)'
            },
            
            'comprehensive': {
                'name': 'Comprehensive Preprocessing',
                'methods': ['power_transform', 'knn_imputer', 'outlier_isolation', 'interaction_features', 'mutual_info_selection'],
                'description': '종합 전처리 (파워 변환 + KNN 대체 + 이상치 제거 + 상호작용 특성 + 상호정보 선택)'
            }
        }
        
        return combinations

if __name__ == "__main__":
    preprocessor = AdvancedPreprocessor()
    
    # 전처리 방법 목록 출력
    print("사용 가능한 전처리 방법:")
    for method_name, method_info in preprocessor.preprocessing_methods.items():
        print(f"- {method_name}: {method_info['description']}")
    
    print("\n추천 전처리 조합:")
    combinations = preprocessor.get_preprocessing_combinations()
    for combo_name, combo_info in combinations.items():
        print(f"- {combo_name}: {combo_info['description']}")
        print(f"  방법: {', '.join(combo_info['methods'])}")
        print()