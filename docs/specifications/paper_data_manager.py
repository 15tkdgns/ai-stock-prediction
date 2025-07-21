import pandas as pd
import numpy as np
import json
import os
from datetime import datetime, timedelta
import sqlite3
import logging
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

class PaperDataManager:
    def __init__(self, data_dir='raw_data', paper_dir='paper_data'):
        self.data_dir = data_dir
        self.paper_dir = paper_dir
        
        # 논문 데이터 디렉토리 구조 생성
        self.create_paper_directory_structure()
        
        # 로깅 설정
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{paper_dir}/data_management.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # 데이터베이스 연결
        self.db_path = f'{paper_dir}/paper_dataset.db'
        self.init_database()
        
    def create_paper_directory_structure(self):
        """논문용 데이터 디렉토리 구조 생성"""
        directories = [
            self.paper_dir,
            f'{self.paper_dir}/raw_data',
            f'{self.paper_dir}/processed_data',
            f'{self.paper_dir}/experiment_results',
            f'{self.paper_dir}/model_outputs',
            f'{self.paper_dir}/visualizations',
            f'{self.paper_dir}/statistics',
            f'{self.paper_dir}/evaluation_metrics',
            f'{self.paper_dir}/tables',
            f'{self.paper_dir}/figures'
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
            
        self.logger.info(f"논문 데이터 디렉토리 구조 생성 완료: {self.paper_dir}")
        
    def init_database(self):
        """SQLite 데이터베이스 초기화"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 주가 데이터 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS stock_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    date TEXT NOT NULL,
                    open REAL,
                    high REAL,
                    low REAL,
                    close REAL,
                    volume INTEGER,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 기술적 지표 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS technical_indicators (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    date TEXT NOT NULL,
                    sma_20 REAL,
                    sma_50 REAL,
                    rsi REAL,
                    macd REAL,
                    bb_upper REAL,
                    bb_lower REAL,
                    atr REAL,
                    volatility REAL,
                    obv REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 뉴스 데이터 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS news_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    title TEXT,
                    description TEXT,
                    url TEXT,
                    published_at TEXT,
                    source TEXT,
                    sentiment_label TEXT,
                    sentiment_score REAL,
                    polarity REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 예측 결과 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prediction_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    prediction_date TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    prediction INTEGER,
                    probability REAL,
                    confidence REAL,
                    actual_event INTEGER,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 모델 성능 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT NOT NULL,
                    evaluation_date TEXT NOT NULL,
                    accuracy REAL,
                    precision_val REAL,
                    recall_val REAL,
                    f1_score REAL,
                    dataset_size INTEGER,
                    training_time REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 이벤트 라벨 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS event_labels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    date TEXT NOT NULL,
                    price_event INTEGER,
                    volume_event INTEGER,
                    volatility_event INTEGER,
                    major_event INTEGER,
                    event_score REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            
            self.logger.info("데이터베이스 초기화 완료")
            
        except Exception as e:
            self.logger.error(f"데이터베이스 초기화 실패: {e}")
            
    def import_existing_data(self):
        """기존 데이터 가져오기"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # 1. 주가 데이터 가져오기
            if os.path.exists(f'{self.data_dir}/training_features.csv'):
                df = pd.read_csv(f'{self.data_dir}/training_features.csv')
                
                # 주가 데이터 추출
                stock_columns = ['ticker', 'date', 'open', 'high', 'low', 'close', 'volume']
                if all(col in df.columns for col in stock_columns):
                    stock_data = df[stock_columns].copy()
                    stock_data.to_sql('stock_data', conn, if_exists='replace', index=False)
                    self.logger.info(f"주가 데이터 {len(stock_data)}행 가져오기 완료")
                
                # 기술적 지표 데이터 추출
                technical_columns = ['ticker', 'date', 'sma_20', 'sma_50', 'rsi', 'macd', 
                                   'bb_upper', 'bb_lower', 'atr', 'volatility', 'obv']
                if all(col in df.columns for col in technical_columns):
                    technical_data = df[technical_columns].copy()
                    technical_data.to_sql('technical_indicators', conn, if_exists='replace', index=False)
                    self.logger.info(f"기술적 지표 데이터 {len(technical_data)}행 가져오기 완료")
                    
            # 2. 뉴스 데이터 가져오기
            if os.path.exists(f'{self.data_dir}/news_data.csv'):
                news_df = pd.read_csv(f'{self.data_dir}/news_data.csv')
                news_df.to_sql('news_data', conn, if_exists='replace', index=False)
                self.logger.info(f"뉴스 데이터 {len(news_df)}행 가져오기 완료")
                
            # 3. 이벤트 라벨 가져오기
            if os.path.exists(f'{self.data_dir}/event_labels.csv'):
                events_df = pd.read_csv(f'{self.data_dir}/event_labels.csv')
                events_df.to_sql('event_labels', conn, if_exists='replace', index=False)
                self.logger.info(f"이벤트 라벨 {len(events_df)}행 가져오기 완료")
                
            conn.close()
            return True
            
        except Exception as e:
            self.logger.error(f"기존 데이터 가져오기 실패: {e}")
            return False
            
    def generate_descriptive_statistics(self):
        """기술 통계 생성"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # 주가 데이터 통계
            stock_stats = pd.read_sql_query('''
                SELECT 
                    ticker,
                    COUNT(*) as data_points,
                    AVG(close) as avg_price,
                    STDEV(close) as price_volatility,
                    MIN(close) as min_price,
                    MAX(close) as max_price,
                    AVG(volume) as avg_volume,
                    MIN(date) as start_date,
                    MAX(date) as end_date
                FROM stock_data 
                GROUP BY ticker
            ''', conn)
            
            # 이벤트 발생 통계
            event_stats = pd.read_sql_query('''
                SELECT 
                    ticker,
                    COUNT(*) as total_days,
                    SUM(price_event) as price_events,
                    SUM(volume_event) as volume_events,
                    SUM(volatility_event) as volatility_events,
                    SUM(major_event) as major_events,
                    AVG(event_score) as avg_event_score
                FROM event_labels 
                GROUP BY ticker
            ''', conn)
            
            # 뉴스 감성 통계
            news_stats = pd.read_sql_query('''
                SELECT 
                    ticker,
                    COUNT(*) as news_count,
                    AVG(sentiment_score) as avg_sentiment,
                    AVG(polarity) as avg_polarity,
                    COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) as positive_news,
                    COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) as negative_news,
                    COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) as neutral_news
                FROM news_data 
                GROUP BY ticker
            ''', conn)
            
            # 통계 저장
            stock_stats.to_csv(f'{self.paper_dir}/statistics/stock_statistics.csv', index=False)
            event_stats.to_csv(f'{self.paper_dir}/statistics/event_statistics.csv', index=False)
            news_stats.to_csv(f'{self.paper_dir}/statistics/news_statistics.csv', index=False)
            
            # 전체 데이터셋 요약
            dataset_summary = {
                'total_tickers': len(stock_stats),
                'total_trading_days': stock_stats['data_points'].sum(),
                'total_events': event_stats['major_events'].sum(),
                'total_news_articles': news_stats['news_count'].sum(),
                'date_range': {
                    'start': stock_stats['start_date'].min(),
                    'end': stock_stats['end_date'].max()
                },
                'event_rate': event_stats['major_events'].sum() / event_stats['total_days'].sum(),
                'avg_news_per_ticker': news_stats['news_count'].mean()
            }
            
            with open(f'{self.paper_dir}/statistics/dataset_summary.json', 'w') as f:
                json.dump(dataset_summary, f, indent=2)
                
            conn.close()
            
            self.logger.info("기술 통계 생성 완료")
            return dataset_summary
            
        except Exception as e:
            self.logger.error(f"기술 통계 생성 실패: {e}")
            return None
            
    def generate_correlation_analysis(self):
        """상관관계 분석"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # 기술적 지표 간 상관관계
            technical_data = pd.read_sql_query('''
                SELECT sma_20, sma_50, rsi, macd, atr, volatility, obv
                FROM technical_indicators 
                WHERE sma_20 IS NOT NULL AND sma_50 IS NOT NULL
            ''', conn)
            
            if not technical_data.empty:
                correlation_matrix = technical_data.corr()
                
                # 상관관계 히트맵 생성
                plt.figure(figsize=(10, 8))
                sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0)
                plt.title('Technical Indicators Correlation Matrix')
                plt.tight_layout()
                plt.savefig(f'{self.paper_dir}/figures/correlation_heatmap.png', dpi=300)
                plt.close()
                
                # 상관관계 저장
                correlation_matrix.to_csv(f'{self.paper_dir}/statistics/correlation_matrix.csv')
                
            # 뉴스 감성과 가격 변동 상관관계
            news_price_corr = pd.read_sql_query('''
                SELECT 
                    n.ticker,
                    n.polarity,
                    n.sentiment_score,
                    e.price_event,
                    e.major_event
                FROM news_data n
                JOIN event_labels e ON n.ticker = e.ticker 
                    AND DATE(n.published_at) = e.date
            ''', conn)
            
            if not news_price_corr.empty:
                sentiment_correlations = {
                    'polarity_price_event': news_price_corr['polarity'].corr(news_price_corr['price_event']),
                    'sentiment_score_major_event': news_price_corr['sentiment_score'].corr(news_price_corr['major_event'])
                }
                
                with open(f'{self.paper_dir}/statistics/sentiment_correlations.json', 'w') as f:
                    json.dump(sentiment_correlations, f, indent=2)
                    
            conn.close()
            
            self.logger.info("상관관계 분석 완료")
            return True
            
        except Exception as e:
            self.logger.error(f"상관관계 분석 실패: {e}")
            return False
            
    def generate_time_series_analysis(self):
        """시계열 분석"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # 월별 이벤트 발생 추이
            monthly_events = pd.read_sql_query('''
                SELECT 
                    strftime('%Y-%m', date) as month,
                    COUNT(*) as total_days,
                    SUM(major_event) as major_events,
                    AVG(event_score) as avg_event_score
                FROM event_labels 
                GROUP BY strftime('%Y-%m', date)
                ORDER BY month
            ''', conn)
            
            # 시계열 시각화
            if not monthly_events.empty:
                fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
                
                # 월별 이벤트 수
                ax1.plot(monthly_events['month'], monthly_events['major_events'], marker='o')
                ax1.set_title('Monthly Major Events')
                ax1.set_ylabel('Number of Events')
                ax1.tick_params(axis='x', rotation=45)
                
                # 월별 평균 이벤트 점수
                ax2.plot(monthly_events['month'], monthly_events['avg_event_score'], marker='s', color='red')
                ax2.set_title('Monthly Average Event Score')
                ax2.set_ylabel('Average Event Score')
                ax2.tick_params(axis='x', rotation=45)
                
                plt.tight_layout()
                plt.savefig(f'{self.paper_dir}/figures/time_series_analysis.png', dpi=300)
                plt.close()
                
                # 시계열 데이터 저장
                monthly_events.to_csv(f'{self.paper_dir}/processed_data/monthly_events.csv', index=False)
                
            conn.close()
            
            self.logger.info("시계열 분석 완료")
            return True
            
        except Exception as e:
            self.logger.error(f"시계열 분석 실패: {e}")
            return False
            
    def store_model_results(self, model_name, results_dict):
        """모델 결과 저장"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 모델 성능 저장
            cursor.execute('''
                INSERT INTO model_performance 
                (model_name, evaluation_date, accuracy, precision_val, recall_val, f1_score, dataset_size, training_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                model_name,
                datetime.now().isoformat(),
                results_dict.get('accuracy', 0),
                results_dict.get('precision', 0),
                results_dict.get('recall', 0),
                results_dict.get('f1_score', 0),
                results_dict.get('dataset_size', 0),
                results_dict.get('training_time', 0)
            ))
            
            conn.commit()
            conn.close()
            
            # 결과를 JSON 파일로도 저장
            results_file = f'{self.paper_dir}/experiment_results/{model_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(results_file, 'w') as f:
                json.dump(results_dict, f, indent=2)
                
            self.logger.info(f"모델 결과 저장 완료: {model_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"모델 결과 저장 실패: {e}")
            return False
            
    def generate_paper_tables(self):
        """논문용 테이블 생성"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Table 1: 데이터셋 요약
            dataset_summary = pd.read_sql_query('''
                SELECT 
                    'Stock Data' as data_type,
                    COUNT(DISTINCT ticker) as tickers,
                    COUNT(*) as total_records,
                    MIN(date) as start_date,
                    MAX(date) as end_date
                FROM stock_data
                UNION ALL
                SELECT 
                    'News Data' as data_type,
                    COUNT(DISTINCT ticker) as tickers,
                    COUNT(*) as total_records,
                    MIN(published_at) as start_date,
                    MAX(published_at) as end_date
                FROM news_data
                UNION ALL
                SELECT 
                    'Event Labels' as data_type,
                    COUNT(DISTINCT ticker) as tickers,
                    COUNT(*) as total_records,
                    MIN(date) as start_date,
                    MAX(date) as end_date
                FROM event_labels
            ''', conn)
            
            # Table 2: 모델 성능 비교
            model_comparison = pd.read_sql_query('''
                SELECT 
                    model_name,
                    AVG(accuracy) as avg_accuracy,
                    AVG(precision_val) as avg_precision,
                    AVG(recall_val) as avg_recall,
                    AVG(f1_score) as avg_f1_score,
                    COUNT(*) as experiments
                FROM model_performance
                GROUP BY model_name
            ''', conn)
            
            # Table 3: 이벤트 분포
            event_distribution = pd.read_sql_query('''
                SELECT 
                    ticker,
                    COUNT(*) as total_days,
                    SUM(price_event) as price_events,
                    SUM(volume_event) as volume_events,
                    SUM(volatility_event) as volatility_events,
                    SUM(major_event) as major_events,
                    ROUND(SUM(major_event) * 100.0 / COUNT(*), 2) as event_rate_percent
                FROM event_labels
                GROUP BY ticker
                ORDER BY major_events DESC
            ''', conn)
            
            # 테이블 저장
            dataset_summary.to_csv(f'{self.paper_dir}/tables/table1_dataset_summary.csv', index=False)
            model_comparison.to_csv(f'{self.paper_dir}/tables/table2_model_comparison.csv', index=False)
            event_distribution.to_csv(f'{self.paper_dir}/tables/table3_event_distribution.csv', index=False)
            
            # LaTeX 형식으로도 저장
            with open(f'{self.paper_dir}/tables/latex_tables.tex', 'w') as f:
                f.write("% Table 1: Dataset Summary\n")
                f.write(dataset_summary.to_latex(index=False, escape=False))
                f.write("\n\n% Table 2: Model Comparison\n")
                f.write(model_comparison.to_latex(index=False, escape=False))
                f.write("\n\n% Table 3: Event Distribution\n")
                f.write(event_distribution.to_latex(index=False, escape=False))
                
            conn.close()
            
            self.logger.info("논문용 테이블 생성 완료")
            return True
            
        except Exception as e:
            self.logger.error(f"논문용 테이블 생성 실패: {e}")
            return False
            
    def run_complete_analysis(self):
        """전체 분석 실행"""
        self.logger.info("=== 논문용 데이터 분석 시작 ===")
        
        # 1. 기존 데이터 가져오기
        self.logger.info("1. 기존 데이터 가져오기...")
        if not self.import_existing_data():
            self.logger.error("데이터 가져오기 실패")
            return False
            
        # 2. 기술 통계 생성
        self.logger.info("2. 기술 통계 생성...")
        summary = self.generate_descriptive_statistics()
        
        # 3. 상관관계 분석
        self.logger.info("3. 상관관계 분석...")
        self.generate_correlation_analysis()
        
        # 4. 시계열 분석
        self.logger.info("4. 시계열 분석...")
        self.generate_time_series_analysis()
        
        # 5. 논문용 테이블 생성
        self.logger.info("5. 논문용 테이블 생성...")
        self.generate_paper_tables()
        
        # 6. 분석 요약 저장
        analysis_summary = {
            'analysis_date': datetime.now().isoformat(),
            'dataset_summary': summary,
            'files_generated': {
                'statistics': ['stock_statistics.csv', 'event_statistics.csv', 'news_statistics.csv'],
                'figures': ['correlation_heatmap.png', 'time_series_analysis.png'],
                'tables': ['table1_dataset_summary.csv', 'table2_model_comparison.csv', 'table3_event_distribution.csv'],
                'processed_data': ['monthly_events.csv']
            }
        }
        
        with open(f'{self.paper_dir}/analysis_summary.json', 'w') as f:
            json.dump(analysis_summary, f, indent=2)
            
        self.logger.info("=== 논문용 데이터 분석 완료 ===")
        return True

if __name__ == "__main__":
    manager = PaperDataManager()
    
    print("논문용 데이터 분석을 시작하시겠습니까? (y/n)")
    response = input().lower()
    
    if response == 'y':
        if manager.run_complete_analysis():
            print("논문용 데이터 분석 완료!")
            print(f"결과는 {manager.paper_dir} 디렉토리에 저장되었습니다.")
        else:
            print("분석 실패")
    else:
        print("분석 취소")