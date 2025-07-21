"""
논문용 데이터셋 상세 명세서
S&P500 실시간 이벤트 탐지 시스템
"""

import pandas as pd
import numpy as np
import json
import sqlite3
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
import warnings
warnings.filterwarnings('ignore')

class PaperDatasetSpecification:
    def __init__(self, data_dir='raw_data', paper_dir='paper_data'):
        self.data_dir = data_dir
        self.paper_dir = paper_dir
        self.dataset_specifications = {}
        
    def create_comprehensive_dataset_specification(self):
        """포괄적인 데이터셋 명세서 생성"""
        
        specification = {
            "dataset_metadata": {
                "title": "S&P500 Real-time Event Detection Dataset",
                "version": "1.0",
                "creation_date": datetime.now().isoformat(),
                "description": "A comprehensive dataset for detecting and predicting market events in S&P500 stocks using multi-modal data sources including price, volume, technical indicators, and news sentiment",
                "license": "Academic Use Only",
                "citation": "Authors et al. (2024). S&P500 Real-time Event Detection Using Multi-modal Machine Learning"
            },
            
            "data_sources": {
                "financial_data": {
                    "source": "Yahoo Finance API",
                    "frequency": "1-minute intervals",
                    "coverage": "S&P500 constituent stocks",
                    "time_period": "2023-01-01 to 2024-12-31",
                    "fields": {
                        "open": "Opening price (USD)",
                        "high": "Highest price (USD)",
                        "low": "Lowest price (USD)",
                        "close": "Closing price (USD)",
                        "volume": "Trading volume (shares)",
                        "adjusted_close": "Dividend-adjusted closing price (USD)"
                    }
                },
                
                "news_data": {
                    "sources": ["Yahoo Finance RSS", "Google News", "NewsAPI"],
                    "frequency": "Real-time",
                    "coverage": "S&P500 companies",
                    "languages": ["English"],
                    "fields": {
                        "title": "News article title",
                        "description": "Article summary/description",
                        "published_at": "Publication timestamp",
                        "source": "News source identifier",
                        "url": "Article URL",
                        "sentiment_score": "Sentiment intensity (0-1)",
                        "sentiment_label": "Positive/Negative/Neutral",
                        "polarity": "Sentiment polarity (-1 to 1)"
                    }
                },
                
                "technical_indicators": {
                    "calculation_library": "TA-Lib",
                    "indicators": {
                        "trend_indicators": {
                            "sma_20": "20-period Simple Moving Average",
                            "sma_50": "50-period Simple Moving Average",
                            "ema_12": "12-period Exponential Moving Average",
                            "ema_26": "26-period Exponential Moving Average",
                            "macd": "Moving Average Convergence Divergence",
                            "macd_signal": "MACD Signal Line",
                            "macd_histogram": "MACD Histogram"
                        },
                        "momentum_indicators": {
                            "rsi": "14-period Relative Strength Index",
                            "stoch_k": "Stochastic %K",
                            "stoch_d": "Stochastic %D",
                            "williams_r": "Williams %R",
                            "roc": "Rate of Change"
                        },
                        "volatility_indicators": {
                            "bb_upper": "Bollinger Bands Upper Band",
                            "bb_middle": "Bollinger Bands Middle Band",
                            "bb_lower": "Bollinger Bands Lower Band",
                            "atr": "Average True Range",
                            "keltner_upper": "Keltner Channel Upper",
                            "keltner_lower": "Keltner Channel Lower"
                        },
                        "volume_indicators": {
                            "obv": "On-Balance Volume",
                            "ad": "Accumulation/Distribution Line",
                            "cmf": "Chaikin Money Flow",
                            "vwap": "Volume Weighted Average Price"
                        }
                    }
                }
            },
            
            "event_definitions": {
                "price_events": {
                    "major_price_increase": {
                        "definition": "Price increase >= 5% within 1 day",
                        "threshold": 0.05,
                        "label": 1
                    },
                    "major_price_decrease": {
                        "definition": "Price decrease >= 5% within 1 day",
                        "threshold": -0.05,
                        "label": -1
                    },
                    "minor_price_increase": {
                        "definition": "Price increase 2-5% within 1 day",
                        "threshold_range": [0.02, 0.05],
                        "label": 2
                    },
                    "minor_price_decrease": {
                        "definition": "Price decrease 2-5% within 1 day",
                        "threshold_range": [-0.05, -0.02],
                        "label": -2
                    }
                },
                
                "volume_events": {
                    "extreme_volume": {
                        "definition": "Volume >= 5x 30-day average",
                        "threshold": 5.0,
                        "label": 3
                    },
                    "high_volume": {
                        "definition": "Volume >= 3x 30-day average",
                        "threshold": 3.0,
                        "label": 2
                    },
                    "moderate_volume": {
                        "definition": "Volume >= 2x 30-day average",
                        "threshold": 2.0,
                        "label": 1
                    }
                },
                
                "volatility_events": {
                    "extreme_volatility": {
                        "definition": "Volatility > 95th percentile",
                        "threshold": 0.95,
                        "label": 3
                    },
                    "high_volatility": {
                        "definition": "Volatility > 90th percentile",
                        "threshold": 0.90,
                        "label": 2
                    },
                    "moderate_volatility": {
                        "definition": "Volatility > 75th percentile",
                        "threshold": 0.75,
                        "label": 1
                    }
                },
                
                "sentiment_events": {
                    "very_positive": {
                        "definition": "Sentiment score >= 0.8",
                        "threshold": 0.8,
                        "label": 2
                    },
                    "positive": {
                        "definition": "Sentiment score >= 0.6",
                        "threshold": 0.6,
                        "label": 1
                    },
                    "neutral": {
                        "definition": "Sentiment score 0.4-0.6",
                        "threshold_range": [0.4, 0.6],
                        "label": 0
                    },
                    "negative": {
                        "definition": "Sentiment score <= 0.4",
                        "threshold": 0.4,
                        "label": -1
                    },
                    "very_negative": {
                        "definition": "Sentiment score <= 0.2",
                        "threshold": 0.2,
                        "label": -2
                    }
                }
            },
            
            "feature_engineering": {
                "temporal_features": {
                    "time_of_day": "Hour of trading day (0-23)",
                    "day_of_week": "Trading day of week (0-6)",
                    "month": "Month of year (1-12)",
                    "quarter": "Quarter of year (1-4)",
                    "is_market_open": "Market open indicator (0/1)",
                    "minutes_since_open": "Minutes since market open",
                    "minutes_to_close": "Minutes to market close"
                },
                
                "rolling_statistics": {
                    "price_volatility_5min": "5-minute rolling price volatility",
                    "price_volatility_15min": "15-minute rolling price volatility",
                    "price_volatility_60min": "60-minute rolling price volatility",
                    "volume_mean_20": "20-period rolling volume mean",
                    "volume_std_20": "20-period rolling volume standard deviation",
                    "return_mean_10": "10-period rolling return mean",
                    "return_std_10": "10-period rolling return standard deviation"
                },
                
                "cross_asset_features": {
                    "sector_correlation": "Correlation with sector index",
                    "market_correlation": "Correlation with S&P500 index",
                    "relative_strength": "Relative strength vs market",
                    "beta": "Stock beta coefficient",
                    "sector_momentum": "Sector momentum indicator"
                },
                
                "news_features": {
                    "news_volume_1h": "Number of news articles in past 1 hour",
                    "news_volume_4h": "Number of news articles in past 4 hours",
                    "news_volume_24h": "Number of news articles in past 24 hours",
                    "sentiment_trend": "Sentiment trend over time",
                    "sentiment_volatility": "Sentiment volatility measure",
                    "news_impact_score": "Weighted news impact score"
                }
            },
            
            "dataset_statistics": {
                "total_observations": 0,  # To be filled
                "total_tickers": 0,       # To be filled
                "date_range": {
                    "start": None,  # To be filled
                    "end": None     # To be filled
                },
                "event_distribution": {
                    "price_events": 0,      # To be filled
                    "volume_events": 0,     # To be filled
                    "volatility_events": 0, # To be filled
                    "sentiment_events": 0   # To be filled
                },
                "missing_data_analysis": {
                    "financial_data_completeness": 0,  # To be filled
                    "news_data_completeness": 0,       # To be filled
                    "technical_indicators_completeness": 0  # To be filled
                }
            },
            
            "data_quality_measures": {
                "outlier_detection": {
                    "method": "IQR and Z-score based",
                    "price_outliers": "Prices beyond 3 standard deviations",
                    "volume_outliers": "Volume beyond 99th percentile",
                    "return_outliers": "Returns beyond 5 standard deviations"
                },
                
                "data_validation": {
                    "price_consistency": "OHLC price relationship validation",
                    "volume_validation": "Non-negative volume validation",
                    "timestamp_validation": "Chronological order validation",
                    "missing_value_handling": "Forward fill and interpolation"
                },
                
                "data_preprocessing": {
                    "normalization_methods": ["StandardScaler", "MinMaxScaler", "RobustScaler"],
                    "feature_scaling": "Applied to all numerical features",
                    "categorical_encoding": "One-hot encoding for categorical variables",
                    "time_series_stationarity": "ADF test for stationarity"
                }
            },
            
            "experimental_design": {
                "train_test_split": {
                    "method": "Time-based split",
                    "train_ratio": 0.7,
                    "validation_ratio": 0.15,
                    "test_ratio": 0.15
                },
                
                "cross_validation": {
                    "method": "Time series cross-validation",
                    "n_splits": 5,
                    "test_size": "30 days",
                    "gap": "7 days"
                },
                
                "evaluation_metrics": {
                    "classification_metrics": [
                        "Accuracy", "Precision", "Recall", "F1-Score",
                        "AUC-ROC", "AUC-PR", "Cohen's Kappa"
                    ],
                    "regression_metrics": [
                        "MAE", "MSE", "RMSE", "MAPE", "R²"
                    ],
                    "financial_metrics": [
                        "Sharpe Ratio", "Max Drawdown", "Profit Factor",
                        "Win Rate", "Risk-Adjusted Return"
                    ]
                }
            }
        }
        
        return specification
        
    def generate_detailed_data_statistics(self):
        """상세한 데이터 통계 생성"""
        
        try:
            # 데이터 로드
            conn = sqlite3.connect(f'{self.paper_dir}/paper_dataset.db')
            
            # 기본 통계
            basic_stats = {}
            
            # 1. 주가 데이터 통계
            stock_query = """
                SELECT 
                    COUNT(*) as total_observations,
                    COUNT(DISTINCT ticker) as total_tickers,
                    MIN(date) as start_date,
                    MAX(date) as end_date,
                    AVG(close) as avg_price,
                    STDEV(close) as price_std,
                    MIN(close) as min_price,
                    MAX(close) as max_price,
                    AVG(volume) as avg_volume,
                    STDEV(volume) as volume_std,
                    MIN(volume) as min_volume,
                    MAX(volume) as max_volume
                FROM stock_data
            """
            
            stock_stats = pd.read_sql_query(stock_query, conn)
            basic_stats['stock_data'] = stock_stats.iloc[0].to_dict()
            
            # 2. 기술적 지표 통계
            technical_query = """
                SELECT 
                    AVG(sma_20) as avg_sma_20,
                    STDEV(sma_20) as std_sma_20,
                    AVG(sma_50) as avg_sma_50,
                    STDEV(sma_50) as std_sma_50,
                    AVG(rsi) as avg_rsi,
                    STDEV(rsi) as std_rsi,
                    AVG(volatility) as avg_volatility,
                    STDEV(volatility) as std_volatility,
                    AVG(atr) as avg_atr,
                    STDEV(atr) as std_atr
                FROM technical_indicators
                WHERE sma_20 IS NOT NULL
            """
            
            technical_stats = pd.read_sql_query(technical_query, conn)
            basic_stats['technical_indicators'] = technical_stats.iloc[0].to_dict()
            
            # 3. 뉴스 데이터 통계
            news_query = """
                SELECT 
                    COUNT(*) as total_news,
                    COUNT(DISTINCT ticker) as tickers_with_news,
                    AVG(sentiment_score) as avg_sentiment,
                    STDEV(sentiment_score) as std_sentiment,
                    AVG(polarity) as avg_polarity,
                    STDEV(polarity) as std_polarity,
                    COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) as positive_news,
                    COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) as negative_news,
                    COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) as neutral_news
                FROM news_data
            """
            
            news_stats = pd.read_sql_query(news_query, conn)
            basic_stats['news_data'] = news_stats.iloc[0].to_dict()
            
            # 4. 이벤트 분포 통계
            event_query = """
                SELECT 
                    SUM(CASE WHEN price_event != 0 THEN 1 ELSE 0 END) as price_events,
                    SUM(CASE WHEN volume_event != 0 THEN 1 ELSE 0 END) as volume_events,
                    SUM(CASE WHEN volatility_event != 0 THEN 1 ELSE 0 END) as volatility_events,
                    SUM(CASE WHEN major_event = 1 THEN 1 ELSE 0 END) as major_events,
                    AVG(event_score) as avg_event_score,
                    STDEV(event_score) as std_event_score
                FROM event_labels
            """
            
            event_stats = pd.read_sql_query(event_query, conn)
            basic_stats['event_distribution'] = event_stats.iloc[0].to_dict()
            
            # 5. 시계열 분석
            monthly_stats = pd.read_sql_query("""
                SELECT 
                    strftime('%Y-%m', date) as month,
                    COUNT(*) as trading_days,
                    AVG(close) as avg_price,
                    STDEV(close) as price_volatility,
                    SUM(volume) as total_volume,
                    SUM(major_event) as monthly_events
                FROM stock_data s
                JOIN event_labels e ON s.ticker = e.ticker AND s.date = e.date
                GROUP BY strftime('%Y-%m', s.date)
                ORDER BY month
            """, conn)
            
            # 6. 티커별 상세 통계
            ticker_stats = pd.read_sql_query("""
                SELECT 
                    s.ticker,
                    COUNT(*) as observations,
                    AVG(s.close) as avg_price,
                    STDEV(s.close) as price_volatility,
                    AVG(s.volume) as avg_volume,
                    SUM(e.major_event) as major_events,
                    AVG(e.event_score) as avg_event_score,
                    COUNT(n.id) as news_count
                FROM stock_data s
                LEFT JOIN event_labels e ON s.ticker = e.ticker AND s.date = e.date
                LEFT JOIN news_data n ON s.ticker = n.ticker
                GROUP BY s.ticker
                ORDER BY major_events DESC
            """, conn)
            
            conn.close()
            
            # 통계 저장
            detailed_stats = {
                'basic_statistics': basic_stats,
                'monthly_analysis': monthly_stats.to_dict('records'),
                'ticker_analysis': ticker_stats.to_dict('records'),
                'generation_timestamp': datetime.now().isoformat()
            }
            
            # JSON 저장
            with open(f'{self.paper_dir}/detailed_statistics.json', 'w') as f:
                json.dump(detailed_stats, f, indent=2, default=str)
                
            # CSV 저장
            monthly_stats.to_csv(f'{self.paper_dir}/statistics/monthly_statistics.csv', index=False)
            ticker_stats.to_csv(f'{self.paper_dir}/statistics/ticker_statistics.csv', index=False)
            
            return detailed_stats
            
        except Exception as e:
            print(f"통계 생성 실패: {e}")
            return None
            
    def create_data_distribution_analysis(self):
        """데이터 분포 분석"""
        
        try:
            conn = sqlite3.connect(f'{self.paper_dir}/paper_dataset.db')
            
            # 가격 분포 분석
            price_data = pd.read_sql_query("""
                SELECT close, volume, 
                       (close - LAG(close) OVER (PARTITION BY ticker ORDER BY date)) / LAG(close) OVER (PARTITION BY ticker ORDER BY date) as returns
                FROM stock_data
                ORDER BY ticker, date
            """, conn)
            
            # 분포 분석 및 시각화
            fig, axes = plt.subplots(2, 3, figsize=(18, 12))
            
            # 가격 분포
            axes[0, 0].hist(price_data['close'].dropna(), bins=50, alpha=0.7, color='blue')
            axes[0, 0].set_title('Price Distribution')
            axes[0, 0].set_xlabel('Price (USD)')
            axes[0, 0].set_ylabel('Frequency')
            
            # 거래량 분포 (로그 스케일)
            axes[0, 1].hist(np.log(price_data['volume'].dropna()), bins=50, alpha=0.7, color='green')
            axes[0, 1].set_title('Volume Distribution (Log Scale)')
            axes[0, 1].set_xlabel('Log(Volume)')
            axes[0, 1].set_ylabel('Frequency')
            
            # 수익률 분포
            axes[0, 2].hist(price_data['returns'].dropna(), bins=100, alpha=0.7, color='red')
            axes[0, 2].set_title('Returns Distribution')
            axes[0, 2].set_xlabel('Returns')
            axes[0, 2].set_ylabel('Frequency')
            
            # 기술적 지표 분포
            technical_data = pd.read_sql_query("""
                SELECT rsi, volatility, atr
                FROM technical_indicators
                WHERE rsi IS NOT NULL
            """, conn)
            
            # RSI 분포
            axes[1, 0].hist(technical_data['rsi'].dropna(), bins=50, alpha=0.7, color='purple')
            axes[1, 0].set_title('RSI Distribution')
            axes[1, 0].set_xlabel('RSI')
            axes[1, 0].set_ylabel('Frequency')
            
            # 변동성 분포
            axes[1, 1].hist(technical_data['volatility'].dropna(), bins=50, alpha=0.7, color='orange')
            axes[1, 1].set_title('Volatility Distribution')
            axes[1, 1].set_xlabel('Volatility')
            axes[1, 1].set_ylabel('Frequency')
            
            # ATR 분포
            axes[1, 2].hist(technical_data['atr'].dropna(), bins=50, alpha=0.7, color='brown')
            axes[1, 2].set_title('ATR Distribution')
            axes[1, 2].set_xlabel('ATR')
            axes[1, 2].set_ylabel('Frequency')
            
            plt.tight_layout()
            plt.savefig(f'{self.paper_dir}/figures/data_distributions.png', dpi=300, bbox_inches='tight')
            plt.close()
            
            # 정규성 검정
            normality_tests = {}
            
            # 가격 데이터
            price_clean = price_data['close'].dropna()
            stat, p_value = stats.jarque_bera(price_clean)
            normality_tests['price_jarque_bera'] = {'statistic': stat, 'p_value': p_value}
            
            # 수익률 데이터
            returns_clean = price_data['returns'].dropna()
            stat, p_value = stats.jarque_bera(returns_clean)
            normality_tests['returns_jarque_bera'] = {'statistic': stat, 'p_value': p_value}
            
            # 기술적 지표
            rsi_clean = technical_data['rsi'].dropna()
            stat, p_value = stats.jarque_bera(rsi_clean)
            normality_tests['rsi_jarque_bera'] = {'statistic': stat, 'p_value': p_value}
            
            # 분포 통계
            distribution_stats = {
                'price_statistics': {
                    'mean': float(price_clean.mean()),
                    'median': float(price_clean.median()),
                    'std': float(price_clean.std()),
                    'skewness': float(stats.skew(price_clean)),
                    'kurtosis': float(stats.kurtosis(price_clean))
                },
                'returns_statistics': {
                    'mean': float(returns_clean.mean()),
                    'median': float(returns_clean.median()),
                    'std': float(returns_clean.std()),
                    'skewness': float(stats.skew(returns_clean)),
                    'kurtosis': float(stats.kurtosis(returns_clean))
                },
                'normality_tests': normality_tests
            }
            
            conn.close()
            
            # 결과 저장
            with open(f'{self.paper_dir}/statistics/distribution_analysis.json', 'w') as f:
                json.dump(distribution_stats, f, indent=2, default=str)
                
            return distribution_stats
            
        except Exception as e:
            print(f"분포 분석 실패: {e}")
            return None
            
    def save_comprehensive_specification(self):
        """종합 명세서 저장"""
        
        # 기본 명세서
        spec = self.create_comprehensive_dataset_specification()
        
        # 상세 통계 추가
        detailed_stats = self.generate_detailed_data_statistics()
        if detailed_stats:
            spec['detailed_statistics'] = detailed_stats
            
        # 분포 분석 추가
        distribution_analysis = self.create_data_distribution_analysis()
        if distribution_analysis:
            spec['distribution_analysis'] = distribution_analysis
            
        # 최종 저장
        with open(f'{self.paper_dir}/comprehensive_dataset_specification.json', 'w') as f:
            json.dump(spec, f, indent=2, default=str)
            
        # 마크다운 형식으로도 저장
        self.create_markdown_specification(spec)
        
        print(f"종합 데이터셋 명세서 저장 완료: {self.paper_dir}/comprehensive_dataset_specification.json")
        
        return spec
        
    def create_markdown_specification(self, spec):
        """마크다운 형식 명세서 생성"""
        
        markdown_content = f"""# {spec['dataset_metadata']['title']}

## Dataset Overview

**Version:** {spec['dataset_metadata']['version']}  
**Creation Date:** {spec['dataset_metadata']['creation_date']}  
**Description:** {spec['dataset_metadata']['description']}

## Data Sources

### Financial Data
- **Source:** {spec['data_sources']['financial_data']['source']}
- **Frequency:** {spec['data_sources']['financial_data']['frequency']}
- **Coverage:** {spec['data_sources']['financial_data']['coverage']}
- **Time Period:** {spec['data_sources']['financial_data']['time_period']}

### News Data
- **Sources:** {', '.join(spec['data_sources']['news_data']['sources'])}
- **Frequency:** {spec['data_sources']['news_data']['frequency']}
- **Languages:** {', '.join(spec['data_sources']['news_data']['languages'])}

### Technical Indicators
- **Library:** {spec['data_sources']['technical_indicators']['calculation_library']}
- **Categories:** Trend, Momentum, Volatility, Volume indicators

## Event Definitions

### Price Events
- **Major Price Increase:** >= 5% increase (Label: 1)
- **Major Price Decrease:** >= 5% decrease (Label: -1)
- **Minor Price Changes:** 2-5% changes (Labels: ±2)

### Volume Events
- **Extreme Volume:** >= 5x average (Label: 3)
- **High Volume:** >= 3x average (Label: 2)
- **Moderate Volume:** >= 2x average (Label: 1)

### Volatility Events
- **Extreme:** > 95th percentile (Label: 3)
- **High:** > 90th percentile (Label: 2)
- **Moderate:** > 75th percentile (Label: 1)

## Feature Engineering

### Temporal Features
- Time of day, day of week, month, quarter
- Market timing indicators
- Time since/until market events

### Rolling Statistics
- Multi-timeframe volatility measures
- Rolling means and standard deviations
- Momentum indicators

### Cross-Asset Features
- Sector correlations
- Market beta coefficients
- Relative strength indicators

### News Features
- Multi-timeframe news volume
- Sentiment trends and volatility
- Weighted impact scores

## Data Quality

### Validation Measures
- OHLC price consistency checks
- Volume non-negativity validation
- Timestamp chronological ordering
- Missing value analysis and handling

### Preprocessing Methods
- Multiple normalization approaches
- Outlier detection and treatment
- Time series stationarity testing
- Feature scaling and encoding

## Experimental Design

### Data Splitting
- **Training:** 70% (time-based)
- **Validation:** 15%
- **Testing:** 15%

### Cross-Validation
- Time series cross-validation
- 5-fold with 30-day test periods
- 7-day gaps between folds

### Evaluation Metrics
- **Classification:** Accuracy, Precision, Recall, F1-Score, AUC-ROC
- **Regression:** MAE, MSE, RMSE, MAPE, R²
- **Financial:** Sharpe Ratio, Max Drawdown, Profit Factor

## Usage Guidelines

1. **Data Loading:** Use provided SQLite database or CSV files
2. **Preprocessing:** Apply appropriate scaling based on experiment
3. **Feature Selection:** Consider temporal dependencies
4. **Model Training:** Use time-aware train/validation splits
5. **Evaluation:** Report multiple metrics for comprehensive assessment

## Citation

```bibtex
@dataset{{dataset2024,
    title = {{{spec['dataset_metadata']['title']}}},
    author = {{Authors et al.}},
    year = {{2024}},
    version = {{{spec['dataset_metadata']['version']}}},
    url = {{https://github.com/authors/sp500-event-detection}}
}}
```

---
*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        with open(f'{self.paper_dir}/DATASET_SPECIFICATION.md', 'w') as f:
            f.write(markdown_content)

if __name__ == "__main__":
    spec_generator = PaperDatasetSpecification()
    specification = spec_generator.save_comprehensive_specification()
    
    print("논문용 데이터셋 상세 명세서 생성 완료!")
    print(f"- JSON 형식: {spec_generator.paper_dir}/comprehensive_dataset_specification.json")
    print(f"- 마크다운 형식: {spec_generator.paper_dir}/DATASET_SPECIFICATION.md")
    print(f"- 시각화: {spec_generator.paper_dir}/figures/data_distributions.png")