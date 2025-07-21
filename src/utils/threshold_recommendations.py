import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import json

class ThresholdRecommendations:
    def __init__(self):
        self.recommendations = {}
        
    def calculate_confidence_thresholds(self):
        """신뢰도 임계값 추천"""
        
        # 금융 시장 특성을 고려한 신뢰도 임계값
        confidence_thresholds = {
            'high_confidence': 0.85,     # 높은 신뢰도 (85% 이상)
            'medium_confidence': 0.70,   # 중간 신뢰도 (70-85%)
            'low_confidence': 0.55,      # 낮은 신뢰도 (55-70%)
            'very_low_confidence': 0.55, # 매우 낮은 신뢰도 (55% 미만)
            
            # 실행 임계값
            'action_threshold': 0.75,    # 실제 거래/알림 발생 임계값
            'warning_threshold': 0.65,   # 경고 알림 임계값
            'monitoring_threshold': 0.55 # 모니터링 강화 임계값
        }
        
        # 임계값 근거
        reasoning = {
            'high_confidence': "85% 이상 - 높은 확신을 가지고 이벤트 예측 가능",
            'medium_confidence': "70-85% - 보통 수준의 신뢰도, 주의 깊은 모니터링 필요",
            'low_confidence': "55-70% - 낮은 신뢰도, 추가 정보 필요",
            'action_threshold': "75% - 실제 거래 결정을 위한 최소 신뢰도",
            'warning_threshold': "65% - 사용자에게 경고 알림을 보내는 임계값",
            'monitoring_threshold': "55% - 모니터링을 강화하는 임계값"
        }
        
        return confidence_thresholds, reasoning
        
    def calculate_performance_thresholds(self):
        """성능 임계값 추천"""
        
        performance_thresholds = {
            # 정확도 임계값
            'accuracy': {
                'excellent': 0.85,      # 우수 (85% 이상)
                'good': 0.75,           # 양호 (75-85%)
                'acceptable': 0.65,     # 허용 (65-75%)
                'poor': 0.65,           # 불량 (65% 미만)
                'retrain_threshold': 0.60  # 재학습 필요 임계값
            },
            
            # 정밀도 임계값 (False Positive 최소화)
            'precision': {
                'excellent': 0.80,
                'good': 0.70,
                'acceptable': 0.60,
                'poor': 0.60,
                'retrain_threshold': 0.50
            },
            
            # 재현율 임계값 (False Negative 최소화)
            'recall': {
                'excellent': 0.80,
                'good': 0.70,
                'acceptable': 0.60,
                'poor': 0.60,
                'retrain_threshold': 0.50
            },
            
            # F1 스코어 임계값
            'f1_score': {
                'excellent': 0.82,
                'good': 0.72,
                'acceptable': 0.62,
                'poor': 0.62,
                'retrain_threshold': 0.55
            },
            
            # 드리프트 탐지 임계값
            'drift_detection': {
                'statistical_threshold': 0.1,    # 통계적 차이 임계값
                'severe_drift': 0.3,             # 심각한 드리프트
                'moderate_drift': 0.15,          # 중간 드리프트
                'minor_drift': 0.05,             # 경미한 드리프트
                'retrain_threshold': 0.2         # 재학습 필요 드리프트
            }
        }
        
        # 성능 임계값 근거
        reasoning = {
            'accuracy_retrain': "정확도 60% 미만 시 재학습 필요",
            'precision_focus': "금융 시장에서 False Positive(잘못된 알림) 최소화 중요",
            'recall_balance': "중요한 이벤트 놓치지 않기 위한 재현율 확보",
            'f1_overall': "정밀도와 재현율의 균형을 위한 F1 스코어",
            'drift_statistical': "통계적 유의미한 변화 감지를 위한 임계값",
            'drift_severity': "드리프트 심각도에 따른 대응 방안"
        }
        
        return performance_thresholds, reasoning
        
    def calculate_business_thresholds(self):
        """비즈니스 임계값 추천"""
        
        business_thresholds = {
            # 이벤트 발생 임계값
            'event_detection': {
                'price_change_major': 0.05,      # 5% 이상 가격 변동
                'price_change_minor': 0.02,      # 2% 이상 가격 변동
                'volume_spike': 3.0,             # 평균 거래량의 3배
                'volatility_high': 0.9,          # 변동성 상위 10%
                'news_sentiment_strong': 0.7,    # 강한 감성 점수
                'news_sentiment_moderate': 0.4   # 보통 감성 점수
            },
            
            # 알림 임계값
            'alert_system': {
                'critical_alert': 0.90,          # 긴급 알림
                'warning_alert': 0.75,           # 경고 알림
                'info_alert': 0.60,              # 정보 알림
                'monitoring_alert': 0.50         # 모니터링 알림
            },
            
            # 데이터 품질 임계값
            'data_quality': {
                'missing_data_threshold': 0.05,  # 결측값 5% 이상
                'outlier_threshold': 0.1,        # 이상치 10% 이상
                'data_staleness': 300,           # 데이터 신선도 5분
                'api_failure_threshold': 0.1     # API 실패율 10% 이상
            }
        }
        
        reasoning = {
            'event_major': "5% 이상 가격 변동은 시장에서 중요한 이벤트로 간주",
            'volume_spike': "평균 거래량의 3배는 비정상적 거래 활동을 나타냄",
            'alert_critical': "90% 이상 신뢰도에서 긴급 알림 발생",
            'data_quality': "데이터 품질 저하 시 예측 성능에 직접적 영향"
        }
        
        return business_thresholds, reasoning
        
    def generate_comprehensive_recommendations(self):
        """종합 임계값 추천 생성"""
        
        confidence_thresholds, conf_reasoning = self.calculate_confidence_thresholds()
        performance_thresholds, perf_reasoning = self.calculate_performance_thresholds()
        business_thresholds, biz_reasoning = self.calculate_business_thresholds()
        
        comprehensive_recommendations = {
            'confidence_thresholds': confidence_thresholds,
            'performance_thresholds': performance_thresholds,
            'business_thresholds': business_thresholds,
            'reasoning': {
                'confidence': conf_reasoning,
                'performance': perf_reasoning,
                'business': biz_reasoning
            },
            'implementation_priority': {
                'critical': [
                    'confidence.action_threshold',
                    'performance.accuracy.retrain_threshold',
                    'business.event_detection.price_change_major'
                ],
                'high': [
                    'confidence.warning_threshold',
                    'performance.drift_detection.retrain_threshold',
                    'business.alert_system.critical_alert'
                ],
                'medium': [
                    'confidence.monitoring_threshold',
                    'performance.precision.acceptable',
                    'business.data_quality.missing_data_threshold'
                ]
            },
            'adaptive_thresholds': {
                'market_volatility_adjustment': {
                    'high_volatility': {
                        'confidence_boost': 0.05,    # 변동성 높을 때 신뢰도 임계값 상향
                        'precision_focus': True      # 정밀도 중심 평가
                    },
                    'low_volatility': {
                        'confidence_reduction': 0.03, # 변동성 낮을 때 신뢰도 임계값 하향
                        'recall_focus': True          # 재현율 중심 평가
                    }
                },
                'time_based_adjustment': {
                    'market_open': {
                        'confidence_boost': 0.02,    # 시장 개장 시 신뢰도 임계값 상향
                        'volume_threshold_increase': 1.5  # 거래량 임계값 증가
                    },
                    'market_close': {
                        'confidence_reduction': 0.02, # 시장 마감 시 신뢰도 임계값 하향
                        'volume_threshold_decrease': 0.7  # 거래량 임계값 감소
                    }
                }
            }
        }
        
        return comprehensive_recommendations
        
    def save_recommendations(self, filename='threshold_recommendations.json'):
        """추천 임계값 저장"""
        recommendations = self.generate_comprehensive_recommendations()
        
        with open(filename, 'w') as f:
            json.dump(recommendations, f, indent=2)
            
        print(f"임계값 추천 저장 완료: {filename}")
        
        # 요약 출력
        print("\n=== 주요 임계값 추천 ===")
        print(f"신뢰도 임계값:")
        print(f"  - 실행 임계값: {recommendations['confidence_thresholds']['action_threshold']}")
        print(f"  - 경고 임계값: {recommendations['confidence_thresholds']['warning_threshold']}")
        print(f"  - 모니터링 임계값: {recommendations['confidence_thresholds']['monitoring_threshold']}")
        
        print(f"\n성능 임계값:")
        print(f"  - 정확도 재학습 임계값: {recommendations['performance_thresholds']['accuracy']['retrain_threshold']}")
        print(f"  - 드리프트 재학습 임계값: {recommendations['performance_thresholds']['drift_detection']['retrain_threshold']}")
        
        print(f"\n비즈니스 임계값:")
        print(f"  - 주요 가격 변동: {recommendations['business_thresholds']['event_detection']['price_change_major']}")
        print(f"  - 거래량 급증: {recommendations['business_thresholds']['event_detection']['volume_spike']}")
        
        return recommendations

if __name__ == "__main__":
    recommender = ThresholdRecommendations()
    recommendations = recommender.save_recommendations('raw_data/threshold_recommendations.json')
    
    print("\n임계값 추천 시스템 실행 완료")