import pandas as pd
import requests
import yfinance as yf
from datetime import datetime
import os
import json
import numpy as np
from textblob import TextBlob
import ta
from transformers import pipeline
import logging

from tqdm import tqdm

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SP500DataCollector:
    """
    S&P500 주식 관련 데이터를 수집, 처리, 가공하여 모델 훈련용 데이터셋을 생성하는 클래스.

    주요 기능:
    1. S&P500 종목 티커 수집
    2. 개별 종목의 주가 데이터 및 거래량 수집 (yfinance)
    3. 뉴스 데이터 수집 및 감성 분석 (NewsAPI, HuggingFace Transformers)
    4. 기술적 지표 계산 (TA-Lib)
    5. 이벤트 라벨링 (가격, 거래량, 변동성 기반)
    6. 최종 훈련용 데이터셋 생성 및 저장
    """
    def __init__(self, data_dir='data/raw'):
        """
        SP500DataCollector 인스턴스를 초기화합니다.

        Args:
            data_dir (str): 수집된 원본 데이터를 저장할 디렉토리 경로.
        """
        self.data_dir = data_dir
        self.sp500_tickers = []
        # 금융 텍스트에 특화된 FinBERT 모델 로드
        self.sentiment_analyzer = pipeline("sentiment-analysis", model="ProsusAI/finbert")
        
        # 데이터 저장 디렉토리 생성
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def get_sp500_tickers(self):
        """
        S&P500 구성 종목의 최신 티커 목록을 웹에서 가져와 CSV 파일로 저장합니다.
        """
        url = 'https://datahub.io/core/s-and-p-500-companies/r/constituents.csv'
        try:
            df = pd.read_csv(url)
            self.sp500_tickers = df['Symbol'].tolist()
            df.to_csv(f'{self.data_dir}/sp500_constituents.csv', index=False)
            logging.info(f"S&P500 티커 {len(self.sp500_tickers)}개 수집 완료.")
        except Exception as e:
            logging.error(f"S&P500 티커 수집 실패: {e}")

    def collect_stock_data(self, period='1y', num_tickers=10):
        """
        지정된 기간 동안의 주가 및 거래량 데이터를 yfinance를 통해 수집합니다.

        Args:
            period (str): 수집할 데이터 기간 (e.g., '1y', '6mo').
            num_tickers (int): 수집할 티커의 수 (테스트 목적으로 사용).
        """
        if not self.sp500_tickers:
            self.get_sp500_tickers()
        
        # 테스트를 위해 일부 티커만 사용
        tickers_to_fetch = self.sp500_tickers[:num_tickers]
        
        for ticker in tqdm(tickers_to_fetch, desc="Collecting stock data"):
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period=period)
                hist.to_csv(f'{self.data_dir}/stock_{ticker}.csv')
                logging.info(f"{ticker} 주가 데이터 수집 완료.")
            except Exception as e:
                logging.error(f"{ticker} 주가 데이터 수집 실패: {e}")

    def calculate_technical_indicators(self, df):
        """
        주가 데이터프레임에 다양한 기술적 지표를 계산하여 추가합니다.
        """
        df_ti = df.copy()
        # 이동평균, RSI, MACD 등 기본 지표 추가
        df_ti['sma_20'] = ta.trend.sma_indicator(df_ti['Close'], window=20)
        df_ti['sma_50'] = ta.trend.sma_indicator(df_ti['Close'], window=50)
        df_ti['rsi'] = ta.momentum.rsi(df_ti['Close'], window=14)
        df_ti['macd'] = ta.trend.macd_diff(df_ti['Close'])
        # 볼린저 밴드
        df_ti['bb_upper'] = ta.volatility.bollinger_hband(df_ti['Close'])
        df_ti['bb_lower'] = ta.volatility.bollinger_lband(df_ti['Close'])
        # 변동성 및 거래량 관련 지표
        df_ti['atr'] = ta.volatility.average_true_range(df_ti['High'], df_ti['Low'], df_ti['Close'])
        df_ti['volatility'] = df_ti['Close'].rolling(window=20).std()
        df_ti['obv'] = ta.volume.on_balance_volume(df_ti['Close'], df_ti['Volume'])
        
        return df_ti

    def collect_news_and_sentiment(self, api_key, num_tickers=5):
        """
        NewsAPI를 사용하여 뉴스 기사를 수집하고, FinBERT와 TextBlob으로 감성 분석을 수행합니다.
        """
        if not api_key:
            logging.warning("NewsAPI 키가 제공되지 않아 뉴스 수집을 건너뜁니다.")
            return

        all_news = []
        tickers_to_fetch = self.sp500_tickers[:num_tickers]

        for ticker in tickers_to_fetch:
            try:
                url = f'https://newsapi.org/v2/everything?q={ticker}&apiKey={api_key}&pageSize=20'
                response = requests.get(url)
                articles = response.json().get('articles', [])

                for article in articles:
                    text = f"{article['title'] or ''}. {article['description'] or ''}"
                    if not text.strip() or text == ".":
                        continue
                    
                    # FinBERT 분석
                    finbert_sentiment = self.sentiment_analyzer(text[:512])[0]
                    # TextBlob 분석
                    blob = TextBlob(text)

                    all_news.append({
                        'ticker': ticker,
                        'publishedAt': article['publishedAt'],
                        'title': article['title'],
                        'finbert_label': finbert_sentiment['label'],
                        'finbert_score': finbert_sentiment['score'],
                        'textblob_polarity': blob.sentiment.polarity
                    })
                logging.info(f"{ticker} 뉴스 {len(articles)}개 수집 및 분석 완료.")
            except Exception as e:
                logging.error(f"{ticker} 뉴스 처리 중 오류: {e}")
        
        news_df = pd.DataFrame(all_news)
        news_df.to_csv(f'{self.data_dir}/news_sentiment_data.csv', index=False)

    def create_training_dataset(self, num_tickers=10):
        """
        수집된 모든 데이터를 통합하고 가공하여 최종 훈련용 데이터셋을 생성합니다.
        이 과정에는 기술적 지표 추가, 뉴스 감성 데이터 병합, 이벤트 라벨링이 포함됩니다.
        """
        all_features = []
        all_labels = []

        tickers_to_process = self.sp500_tickers[:num_tickers]
        
        # 뉴스 데이터 로드
        try:
            news_df = pd.read_csv(f'{self.data_dir}/news_sentiment_data.csv')
            news_df['publishedAt'] = pd.to_datetime(news_df['publishedAt']).dt.date
        except FileNotFoundError:
            news_df = pd.DataFrame()

        for ticker in tickers_to_process:
            try:
                # 주가 데이터 로드 및 기술적 지표 계산
                stock_df = pd.read_csv(f'{self.data_dir}/stock_{ticker}.csv', parse_dates=['Date'])
                stock_df['Date'] = pd.to_datetime(stock_df['Date'], utc=True).dt.tz_localize(None)
                stock_df_ti = self.calculate_technical_indicators(stock_df)
                stock_df_ti['date_key'] = stock_df_ti['Date'].dt.date

                # 뉴스 데이터와 병합
                if not news_df.empty:
                    ticker_news = news_df[news_df['ticker'] == ticker]
                    daily_sentiment = ticker_news.groupby('publishedAt').agg(
                        news_sentiment=('finbert_score', 'mean'),
                        news_polarity=('textblob_polarity', 'mean'),
                        news_count=('title', 'count')
                    ).reset_index()
                    daily_sentiment.rename(columns={'publishedAt': 'date_key'}, inplace=True)
                    stock_df_ti = pd.merge(stock_df_ti, daily_sentiment, on='date_key', how='left')
                
                # 이벤트 라벨 생성
                stock_df_ti['price_change'] = stock_df_ti['Close'].pct_change()
                stock_df_ti['volume_change'] = stock_df_ti['Volume'].pct_change()
                stock_df_ti['unusual_volume'] = (stock_df_ti['Volume'] > stock_df_ti['Volume'].rolling(window=20).mean() * 2).astype(int)
                stock_df_ti['price_spike'] = (abs(stock_df_ti['price_change']) > 0.05).astype(int)
                
                # 주요 이벤트 정의: 가격 스파이크 또는 이례적 거래량 발생 시
                stock_df_ti['major_event'] = ((stock_df_ti['price_spike'] == 1) | (stock_df_ti['unusual_volume'] == 1)).astype(int)
                
                # 데이터 정리
                stock_df_ti.fillna(0, inplace=True)
                stock_df_ti['ticker'] = ticker
                
                # 특성과 라벨 분리
                feature_cols = [
                    'ticker', 'Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'sma_20', 'sma_50', 'rsi', 'macd',
                    'bb_upper', 'bb_lower', 'atr', 'volatility', 'obv', 'price_change', 'volume_change',
                    'unusual_volume', 'price_spike', 'news_sentiment', 'news_polarity', 'news_count'
                ]
                label_cols = ['ticker', 'Date', 'major_event', 'price_spike', 'unusual_volume']
                
                # news 관련 컬럼이 없는 경우를 대비
                for col in ['news_sentiment', 'news_polarity', 'news_count']:
                    if col not in stock_df_ti:
                        stock_df_ti[col] = 0
                
                all_features.append(stock_df_ti[feature_cols])
                all_labels.append(stock_df_ti[label_cols])

            except FileNotFoundError:
                logging.warning(f"{ticker}의 주가 데이터 파일을 찾을 수 없습니다.")
            except Exception as e:
                logging.error(f"{ticker} 데이터셋 생성 중 오류: {e}")

        # 최종 데이터프레임 생성 및 저장
        features_df = pd.concat(all_features, ignore_index=True)
        labels_df = pd.concat(all_labels, ignore_index=True)
        
        features_df.to_csv(f'{self.data_dir}/training_features.csv', index=False)
        labels_df.to_csv(f'{self.data_dir}/event_labels.csv', index=False)
        logging.info("최종 훈련용 특성 및 라벨 파일 생성 완료.")

if __name__ == "__main__":
    # --- 데이터 수집 파이프라인 실행 ---
    collector = SP500DataCollector()
    
    # 1. S&P500 티커 목록 가져오기
    collector.get_sp500_tickers()
    
    # 2. 주가 데이터 수집
    collector.collect_stock_data(num_tickers=10) # 데모를 위해 10개 종목만 수집
    
    # 3. 뉴스 데이터 수집 및 감성 분석
    # 참고: NewsAPI 키를 환경변수 'NEWS_API_KEY'에 설정해야 합니다.
    news_api_key = os.getenv('NEWS_API_KEY')
    collector.collect_news_and_sentiment(api_key=news_api_key, num_tickers=5)
    
    # 4. 모든 데이터를 통합하여 최종 훈련 데이터셋 생성
    collector.create_training_dataset(num_tickers=10)
