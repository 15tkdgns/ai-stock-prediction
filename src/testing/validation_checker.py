import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class DataValidationChecker:
    def __init__(self, data_dir='raw_data'):
        self.data_dir = data_dir
        self.validation_results = {}
        
    def check_data_integrity(self):
        """데이터 무결성 검사"""
        print("=== 데이터 무결성 검사 ===")
        
        # 1. 필수 파일 존재 확인
        required_files = [
            'sp500_constituents.csv',
            'training_features.csv', 
            'event_labels.csv'
        ]
        
        missing_files = []
        for file in required_files:
            if not os.path.exists(f'{self.data_dir}/{file}'):
                missing_files.append(file)
                
        if missing_files:
            print(f"❌ 누락된 파일: {missing_files}")
            return False
        else:
            print("✅ 모든 필수 파일 존재")
            
        # 2. 데이터 품질 검사
        try:
            features_df = pd.read_csv(f'{self.data_dir}/training_features.csv')
            labels_df = pd.read_csv(f'{self.data_dir}/event_labels.csv')
            
            # 데이터 크기 검사
            if len(features_df) == 0 or len(labels_df) == 0:
                print("❌ 데이터가 비어있음")
                return False
                
            # 결측값 검사
            null_features = features_df.isnull().sum().sum()
            null_labels = labels_df.isnull().sum().sum()
            
            print(f"✅ 학습 데이터 크기: {len(features_df)}행")
            print(f"✅ 라벨 데이터 크기: {len(labels_df)}행")
            print(f"⚠️  결측값 - 특성: {null_features}, 라벨: {null_labels}")
            
            # 날짜 범위 검사
            features_df['date'] = pd.to_datetime(features_df['date'])
            date_range = f"{features_df['date'].min()} ~ {features_df['date'].max()}"
            print(f"✅ 데이터 기간: {date_range}")
            
            # 티커 수 검사
            unique_tickers = features_df['ticker'].nunique()
            print(f"✅ 고유 티커 수: {unique_tickers}")
            
            return True
            
        except Exception as e:
            print(f"❌ 데이터 로드 실패: {e}")
            return False
            
    def check_feature_quality(self):
        """특성 품질 검사"""
        print("\n=== 특성 품질 검사 ===")
        
        try:
            df = pd.read_csv(f'{self.data_dir}/training_features.csv')
            
            # 수치형 특성 검사
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                if col in ['date']:
                    continue
                    
                # 무한대 값 검사
                inf_count = np.isinf(df[col]).sum()
                if inf_count > 0:
                    print(f"⚠️  {col}: 무한대 값 {inf_count}개")
                    
                # 이상치 검사 (IQR 방법)
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                outliers = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum()
                
                if outliers > len(df) * 0.1:  # 10% 이상이면 경고
                    print(f"⚠️  {col}: 이상치 {outliers}개 ({outliers/len(df)*100:.1f}%)")
                    
            print("✅ 특성 품질 검사 완료")
            return True
            
        except Exception as e:
            print(f"❌ 특성 품질 검사 실패: {e}")
            return False
            
    def check_label_distribution(self):
        """라벨 분포 검사"""
        print("\n=== 라벨 분포 검사 ===")
        
        try:
            df = pd.read_csv(f'{self.data_dir}/event_labels.csv')
            
            # 각 이벤트 타입별 분포
            event_types = ['price_event', 'volume_event', 'volatility_event', 'major_event']
            
            for event_type in event_types:
                if event_type in df.columns:
                    distribution = df[event_type].value_counts()
                    print(f"✅ {event_type}: {distribution.to_dict()}")
                    
                    # 클래스 불균형 검사
                    if event_type == 'major_event':
                        event_ratio = distribution.get(1, 0) / len(df)
                        if event_ratio < 0.01:
                            print(f"⚠️  {event_type}: 이벤트 비율이 매우 낮음 ({event_ratio:.3f})")
                        elif event_ratio > 0.5:
                            print(f"⚠️  {event_type}: 이벤트 비율이 매우 높음 ({event_ratio:.3f})")
                            
            return True
            
        except Exception as e:
            print(f"❌ 라벨 분포 검사 실패: {e}")
            return False
            
    def check_pipeline_compatibility(self):
        """파이프라인 호환성 검사"""
        print("\n=== 파이프라인 호환성 검사 ===")
        
        try:
            # 데이터 수집 파이프라인 테스트
            from data_collection_pipeline import SP500DataCollector
            collector = SP500DataCollector()
            print("✅ 데이터 수집 파이프라인 임포트 성공")
            
            # 모델 학습 파이프라인 테스트
            from model_training import SP500EventDetectionModel
            trainer = SP500EventDetectionModel()
            print("✅ 모델 학습 파이프라인 임포트 성공")
            
            # 필요한 라이브러리 검사
            required_libs = [
                'pandas', 'numpy', 'sklearn', 'yfinance', 
                'requests', 'ta', 'textblob', 'transformers'
            ]
            
            for lib in required_libs:
                try:
                    __import__(lib)
                    print(f"✅ {lib} 사용 가능")
                except ImportError:
                    print(f"❌ {lib} 설치 필요")
                    
            return True
            
        except Exception as e:
            print(f"❌ 파이프라인 호환성 검사 실패: {e}")
            return False
            
    def generate_validation_report(self):
        """검증 리포트 생성"""
        print("\n=== 전체 검증 리포트 생성 ===")
        
        report = {
            'validation_timestamp': datetime.now().isoformat(),
            'data_integrity': self.check_data_integrity(),
            'feature_quality': self.check_feature_quality(),
            'label_distribution': self.check_label_distribution(),
            'pipeline_compatibility': self.check_pipeline_compatibility()
        }
        
        # 전체 상태
        all_passed = all(report.values())
        report['overall_status'] = 'PASS' if all_passed else 'FAIL'
        
        # 리포트 저장
        with open(f'{self.data_dir}/validation_report.json', 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n{'='*50}")
        print(f"전체 검증 결과: {'✅ PASS' if all_passed else '❌ FAIL'}")
        print(f"{'='*50}")
        
        return report

if __name__ == "__main__":
    checker = DataValidationChecker()
    report = checker.generate_validation_report()