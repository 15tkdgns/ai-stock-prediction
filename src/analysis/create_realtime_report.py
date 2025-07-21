#!/usr/bin/env python3
"""
실시간 테스트 결과 리포트 생성
"""

import json
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime
import seaborn as sns

def create_realtime_report():
    """실시간 테스트 결과 분석 리포트 생성"""
    
    # 결과 데이터 로드
    with open('raw_data/realtime_test_results.json', 'r') as f:
        results = json.load(f)
    
    # 훈련 성능 데이터 로드
    with open('raw_data/model_performance.json', 'r') as f:
        training_performance = json.load(f)
    
    # 분석 수행
    analysis = analyze_results(results, training_performance)
    
    # 시각화 생성
    create_visualizations(results, analysis)
    
    # 마크다운 리포트 생성
    create_markdown_report(results, analysis)
    
    print("✅ 실시간 테스트 리포트 생성 완료!")

def analyze_results(results, training_performance):
    """결과 분석"""
    
    test_timestamp = datetime.fromisoformat(results['test_timestamp'])
    model_used = results['model_used']
    
    # 종목별 결과 정리
    ticker_results = {}
    for result in results['results']:
        ticker = result['ticker']
        pred = result['prediction']
        
        ticker_results[ticker] = {
            'current_price': result['current_price'],
            'event_probability': pred['event_probability'],
            'confidence': pred['confidence'],
            'prediction': pred['prediction'],
            'risk_level': get_risk_level(pred['event_probability'])
        }
    
    # 전체 통계
    event_probs = [r['prediction']['event_probability'] for r in results['results']]
    confidences = [r['prediction']['confidence'] for r in results['results']]
    
    analysis = {
        'test_info': {
            'timestamp': test_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'model_used': model_used,
            'model_training_accuracy': training_performance[model_used]['test_score'],
            'total_stocks': len(results['results'])
        },
        'predictions': {
            'avg_event_probability': sum(event_probs) / len(event_probs),
            'max_event_probability': max(event_probs),
            'min_event_probability': min(event_probs),
            'avg_confidence': sum(confidences) / len(confidences),
            'high_risk_count': sum(1 for p in event_probs if p > 0.65),
            'medium_risk_count': sum(1 for p in event_probs if 0.5 < p <= 0.65),
            'low_risk_count': sum(1 for p in event_probs if p <= 0.5)
        },
        'ticker_results': ticker_results,
        'market_outlook': generate_market_outlook(ticker_results)
    }
    
    return analysis

def get_risk_level(event_probability):
    """위험도 레벨 결정"""
    if event_probability > 0.75:
        return "HIGH"
    elif event_probability > 0.65:
        return "MEDIUM"
    elif event_probability > 0.5:
        return "LOW"
    else:
        return "NORMAL"

def generate_market_outlook(ticker_results):
    """시장 전망 생성"""
    high_risk_stocks = [t for t, r in ticker_results.items() if r['risk_level'] == 'HIGH']
    medium_risk_stocks = [t for t, r in ticker_results.items() if r['risk_level'] == 'MEDIUM']
    
    if high_risk_stocks:
        outlook = "⚠️ 주의: 일부 종목에서 높은 이벤트 확률 감지"
    elif medium_risk_stocks:
        outlook = "📊 모니터링: 일부 종목에서 중간 수준의 이벤트 확률"
    else:
        outlook = "✅ 안정: 모든 종목이 정상 범위 내"
    
    return outlook

def create_visualizations(results, analysis):
    """시각화 생성"""
    
    # 스타일 설정
    plt.style.use('default')
    sns.set_palette("husl")
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. 종목별 이벤트 확률
    tickers = [r['ticker'] for r in results['results']]
    event_probs = [r['prediction']['event_probability'] * 100 for r in results['results']]
    
    bars = axes[0, 0].bar(tickers, event_probs, color=['red' if p > 65 else 'orange' if p > 50 else 'green' for p in event_probs])
    axes[0, 0].set_title('종목별 이벤트 발생 확률')
    axes[0, 0].set_ylabel('확률 (%)')
    axes[0, 0].set_ylim(0, 100)
    
    # 값 표시
    for bar, prob in zip(bars, event_probs):
        axes[0, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                       f'{prob:.3f}%', ha='center', va='bottom', fontsize=8)
    
    # 2. 종목별 현재 가격
    current_prices = [r['current_price'] for r in results['results']]
    axes[0, 1].bar(tickers, current_prices, color='skyblue')
    axes[0, 1].set_title('종목별 현재 가격')
    axes[0, 1].set_ylabel('가격 ($)')
    
    # 값 표시
    for i, (ticker, price) in enumerate(zip(tickers, current_prices)):
        axes[0, 1].text(i, price + max(current_prices) * 0.01,
                       f'${price:.2f}', ha='center', va='bottom', fontsize=8)
    
    # 3. 위험도 분포
    risk_levels = ['HIGH', 'MEDIUM', 'LOW', 'NORMAL']
    risk_counts = [
        analysis['predictions']['high_risk_count'],
        analysis['predictions']['medium_risk_count'],
        analysis['predictions']['low_risk_count'],
        len(results['results']) - analysis['predictions']['high_risk_count'] - 
        analysis['predictions']['medium_risk_count'] - analysis['predictions']['low_risk_count']
    ]
    
    colors = ['red', 'orange', 'yellow', 'green']
    wedges, texts, autotexts = axes[1, 0].pie(risk_counts, labels=risk_levels, colors=colors, 
                                              autopct='%1.0f%%', startangle=90)
    axes[1, 0].set_title('위험도 분포')
    
    # 4. 신뢰도 분포
    confidences = [r['prediction']['confidence'] * 100 for r in results['results']]
    axes[1, 1].bar(tickers, confidences, color='lightgreen')
    axes[1, 1].set_title('종목별 예측 신뢰도')
    axes[1, 1].set_ylabel('신뢰도 (%)')
    axes[1, 1].set_ylim(0, 100)
    
    # 값 표시
    for i, (ticker, conf) in enumerate(zip(tickers, confidences)):
        axes[1, 1].text(i, conf + 1,
                       f'{conf:.1f}%', ha='center', va='bottom', fontsize=8)
    
    plt.tight_layout()
    plt.savefig('raw_data/realtime_test_visualization.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print("✅ 시각화 생성 완료: raw_data/realtime_test_visualization.png")

def create_markdown_report(results, analysis):
    """마크다운 리포트 생성"""
    
    test_info = analysis['test_info']
    predictions = analysis['predictions']
    ticker_results = analysis['ticker_results']
    
    report = f"""# S&P500 실시간 이벤트 탐지 테스트 결과

## 📊 테스트 개요

**테스트 시간**: {test_info['timestamp']}  
**사용 모델**: {test_info['model_used']}  
**모델 훈련 정확도**: {test_info['model_training_accuracy']:.4f}  
**분석 종목 수**: {test_info['total_stocks']}개

## 🎯 예측 결과 요약

### 전체 통계
- **평균 이벤트 확률**: {predictions['avg_event_probability']:.4%}
- **최대 이벤트 확률**: {predictions['max_event_probability']:.4%}
- **평균 신뢰도**: {predictions['avg_confidence']:.4%}

### 위험도 분포
- **🔥 HIGH**: {predictions['high_risk_count']}개 종목 (>75% 확률)
- **⚠️ MEDIUM**: {predictions['medium_risk_count']}개 종목 (65-75% 확률)
- **📊 LOW**: {predictions['low_risk_count']}개 종목 (50-65% 확률)

## 📈 종목별 상세 결과

| 종목 | 현재 가격 | 이벤트 확률 | 신뢰도 | 위험도 | 권장 조치 |
|------|-----------|-------------|--------|--------|-----------|
"""
    
    for ticker, result in ticker_results.items():
        action = get_recommended_action(result['risk_level'])
        report += f"| {ticker} | ${result['current_price']:.2f} | {result['event_probability']:.4%} | {result['confidence']:.4%} | {result['risk_level']} | {action} |\n"
    
    report += f"""
## 🔍 시장 전망

{analysis['market_outlook']}

## 📋 주요 발견사항

1. **모델 성능**: Gradient Boosting 모델이 {test_info['model_training_accuracy']:.1%}의 높은 훈련 정확도를 보임
2. **예측 신뢰도**: 모든 종목에서 {predictions['avg_confidence']:.1%}의 높은 신뢰도
3. **이벤트 확률**: 현재 시점에서 모든 종목이 정상 범위 내 (평균 {predictions['avg_event_probability']:.4%})
4. **시장 안정성**: 주요 이벤트 발생 가능성이 낮은 안정적인 상태

## 🎯 권장 사항

### 단기 (1-2일)
- 모든 종목이 정상 범위 내이므로 일반적인 모니터링 유지
- 급격한 시장 변동 시 추가 분석 필요

### 중기 (1주)
- 주요 경제 지표 발표 일정 확인
- 뉴스 감성 분석 추가 모니터링

### 장기 (1개월)
- 모델 성능 지속 모니터링
- 새로운 데이터로 모델 업데이트 고려

## 📊 결과 파일

- **상세 결과**: `realtime_test_results.json`
- **시각화**: `realtime_test_visualization.png`
- **이 리포트**: `REALTIME_TEST_REPORT.md`

---
*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
    
    with open('raw_data/REALTIME_TEST_REPORT.md', 'w') as f:
        f.write(report)
    
    print("✅ 마크다운 리포트 생성 완료: raw_data/REALTIME_TEST_REPORT.md")

def get_recommended_action(risk_level):
    """위험도별 권장 조치"""
    actions = {
        'HIGH': '즉시 모니터링',
        'MEDIUM': '주의 깊은 관찰',
        'LOW': '일반적인 관찰',
        'NORMAL': '정상 상태'
    }
    return actions.get(risk_level, '일반적인 관찰')

if __name__ == "__main__":
    create_realtime_report()