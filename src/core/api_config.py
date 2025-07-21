import requests
import json
import pandas as pd
from datetime import datetime, timedelta
import time
import yfinance as yf
from textblob import TextBlob
import logging

class APIManager:
    def __init__(self):
        self.apis = {
            'news': {
                'primary': 'yahoo_rss',
                'secondary': 'free_news_api',
                'backup': 'web_scraping'
            },
            'market_data': {
                'primary': 'yfinance',
                'secondary': 'alpha_vantage_free'
            }
        }
        
        self.logger = logging.getLogger(__name__)
        
    def get_news_data_yahoo_rss(self, ticker, limit=10):
        """Yahoo Finance RSS 뉴스 데이터 수집"""
        try:
            import feedparser
            
            # Yahoo Finance RSS URL
            rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
            
            feed = feedparser.parse(rss_url)
            news_data = []
            
            for entry in feed.entries[:limit]:
                # 감성 분석 (TextBlob 사용)
                title = entry.title
                summary = entry.summary if hasattr(entry, 'summary') else ""
                full_text = f"{title} {summary}"
                
                blob = TextBlob(full_text)
                sentiment = blob.sentiment.polarity
                
                # 감성 라벨 변환
                if sentiment > 0.1:
                    sentiment_label = "positive"
                elif sentiment < -0.1:
                    sentiment_label = "negative"
                else:
                    sentiment_label = "neutral"
                
                news_data.append({
                    'ticker': ticker,
                    'title': title,
                    'description': summary,
                    'url': entry.link,
                    'publishedAt': entry.published,
                    'source': 'Yahoo Finance',
                    'sentiment_label': sentiment_label,
                    'sentiment_score': abs(sentiment),
                    'polarity': sentiment,
                    'text_length': len(full_text)
                })
                
            return news_data
            
        except Exception as e:
            self.logger.error(f"Yahoo RSS 뉴스 수집 실패: {e}")
            return []
            
    def get_news_data_free_api(self, ticker, limit=10):
        """무료 뉴스 API 사용"""
        try:
            # NewsData.io 무료 API (일일 200회 제한)
            url = f"https://newsdata.io/api/1/news?apikey=FREE&q={ticker}&language=en&category=business"
            
            response = requests.get(url)
            data = response.json()
            
            if data.get('status') == 'success':
                news_data = []
                
                for article in data.get('results', [])[:limit]:
                    # 감성 분석
                    title = article.get('title', '')
                    description = article.get('description', '')
                    full_text = f"{title} {description}"
                    
                    blob = TextBlob(full_text)
                    sentiment = blob.sentiment.polarity
                    
                    news_data.append({
                        'ticker': ticker,
                        'title': title,
                        'description': description,
                        'url': article.get('link', ''),
                        'publishedAt': article.get('pubDate', ''),
                        'source': article.get('source_id', 'Unknown'),
                        'sentiment_label': 'positive' if sentiment > 0.1 else 'negative' if sentiment < -0.1 else 'neutral',
                        'sentiment_score': abs(sentiment),
                        'polarity': sentiment,
                        'text_length': len(full_text)
                    })
                    
                return news_data
                
        except Exception as e:
            self.logger.error(f"무료 뉴스 API 수집 실패: {e}")
            
        return []
        
    def get_news_data_web_scraping(self, ticker, limit=5):
        """웹 스크래핑 백업 방법"""
        try:
            from bs4 import BeautifulSoup
            
            # Google News 검색
            url = f"https://news.google.com/search?q={ticker}&hl=en-US&gl=US&ceid=US:en"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            news_data = []
            articles = soup.find_all('article')[:limit]
            
            for article in articles:
                try:
                    title_elem = article.find('h3')
                    title = title_elem.get_text() if title_elem else "No title"
                    
                    # 감성 분석
                    blob = TextBlob(title)
                    sentiment = blob.sentiment.polarity
                    
                    news_data.append({
                        'ticker': ticker,
                        'title': title,
                        'description': title,  # 제목만 사용
                        'url': '',
                        'publishedAt': datetime.now().isoformat(),
                        'source': 'Google News',
                        'sentiment_label': 'positive' if sentiment > 0.1 else 'negative' if sentiment < -0.1 else 'neutral',
                        'sentiment_score': abs(sentiment),
                        'polarity': sentiment,
                        'text_length': len(title)
                    })
                    
                except Exception as e:
                    continue
                    
            return news_data
            
        except Exception as e:
            self.logger.error(f"웹 스크래핑 실패: {e}")
            return []
            
    def get_market_data_yfinance(self, ticker, period='1d', interval='1m'):
        """YFinance를 통한 시장 데이터 수집"""
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period, interval=interval)
            
            if hist.empty:
                return None
                
            return hist
            
        except Exception as e:
            self.logger.error(f"YFinance 데이터 수집 실패: {e}")
            return None
            
    def get_market_data_alpha_vantage_free(self, ticker):
        """Alpha Vantage 무료 API"""
        try:
            # 무료 API 키 (제한적)
            api_key = "demo"  # 실제로는 회원가입 필요
            url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={ticker}&apikey={api_key}"
            
            response = requests.get(url)
            data = response.json()
            
            if 'Global Quote' in data:
                quote = data['Global Quote']
                
                # DataFrame 형태로 변환
                df_data = {
                    'Open': [float(quote['02. open'])],
                    'High': [float(quote['03. high'])],
                    'Low': [float(quote['04. low'])],
                    'Close': [float(quote['05. price'])],
                    'Volume': [int(quote['06. volume'])]
                }
                
                df = pd.DataFrame(df_data)
                df.index = [datetime.now()]
                
                return df
                
        except Exception as e:
            self.logger.error(f"Alpha Vantage 데이터 수집 실패: {e}")
            
        return None
        
    def get_news_data(self, ticker, limit=10):
        """뉴스 데이터 수집 (폴백 방식)"""
        # 1차: Yahoo RSS
        news_data = self.get_news_data_yahoo_rss(ticker, limit)
        
        if not news_data:
            # 2차: 무료 API
            news_data = self.get_news_data_free_api(ticker, limit)
            
        if not news_data:
            # 3차: 웹 스크래핑
            news_data = self.get_news_data_web_scraping(ticker, limit)
            
        return news_data
        
    def get_market_data(self, ticker, period='1d', interval='1m'):
        """시장 데이터 수집 (폴백 방식)"""
        # 1차: YFinance
        data = self.get_market_data_yfinance(ticker, period, interval)
        
        if data is None:
            # 2차: Alpha Vantage
            data = self.get_market_data_alpha_vantage_free(ticker)
            
        return data

# 의존성 설치를 위한 추가 요구사항
additional_requirements = """
feedparser>=6.0.0
beautifulsoup4>=4.11.0
requests>=2.28.0
"""

if __name__ == "__main__":
    api_manager = APIManager()
    
    # 테스트
    print("API 테스트 시작...")
    
    # 뉴스 데이터 테스트
    news = api_manager.get_news_data('AAPL', 5)
    print(f"뉴스 데이터: {len(news)}개")
    
    # 시장 데이터 테스트
    market = api_manager.get_market_data('AAPL')
    print(f"시장 데이터: {market is not None}")
    
    print("API 테스트 완료")