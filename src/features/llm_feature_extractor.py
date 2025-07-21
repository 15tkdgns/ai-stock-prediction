import os
import pandas as pd
import google.generativeai as genai
from tqdm import tqdm
from google.api_core.exceptions import GoogleAPIError, NotFound
from google.generativeai.types import BlockedPromptException

# Configure the generative AI model
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash-latest')

def extract_llm_features(news_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extracts features from news data using a large language model.
    """
    
    llm_features = []
    
    for index, row in tqdm(news_df.iterrows(), total=news_df.shape[0], desc="Extracting LLM Features"):
        current_date = row.get('date', 'Unknown Date')
        current_title = row.get('title', 'Unknown Title')

        try:
            prompt = f"""
            Analyze the following news headline and provide a structured analysis in the following format:

            Headline: "{current_title}"

            **Analysis Format:**
            - llm_sentiment_score: A float between -1.0 (very negative) and 1.0 (very positive).
            - uncertainty_score: A float between 0.0 (very certain) and 1.0 (very uncertain).
            - market_sentiment: One of 'Bullish', 'Bearish', or 'Neutral'.
            - event_category: One of 'M&A', 'Product Launch', 'Regulation', 'Financials', 'Other'.

            **Analysis:**
            """
            
            response = model.generate_content(prompt)
            
            if not response.text:
                print(f"Warning: Empty response for row {index} (Date: {current_date}, Title: {current_title}). Skipping feature extraction for this row.")
                features = {}
            else:
                features = {}
                for line in response.text.split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        key = key.strip().replace('-', '').strip()
                        features[key] = value.strip()

            llm_features.append({
                'date': current_date,
                'title': current_title,
                'llm_sentiment_score': float(features.get('llm_sentiment_score', 0.0)),
                'uncertainty_score': float(features.get('uncertainty_score', 0.0)),
                'market_sentiment': features.get('market_sentiment', 'Neutral'),
                'event_category': features.get('event_category', 'Other')
            })
        except (NotFound, GoogleAPIError) as api_e:
            print(f"API Error processing row {index} (Date: {current_date}, Title: {current_title}): {api_e}. Assigning default values.")
            llm_features.append({
                'date': current_date,
                'title': current_title,
                'llm_sentiment_score': 0.0,
                'uncertainty_score': 0.0,
                'market_sentiment': 'Neutral',
                'event_category': 'Other'
            })
        except BlockedPromptException as blocked_e:
            print(f"Prompt Blocked for row {index} (Date: {current_date}, Title: {current_title}): {blocked_e}. Assigning default values.")
            llm_features.append({
                'date': current_date,
                'title': current_title,
                'llm_sentiment_score': 0.0,
                'uncertainty_score': 0.0,
                'market_sentiment': 'Neutral',
                'event_category': 'Other'
            })
        except Exception as e:
            print(f"Unexpected Error processing row {index} (Date: {current_date}, Title: {current_title}): {e}. Assigning default values.")
            llm_features.append({
                'date': current_date,
                'title': current_title,
                'llm_sentiment_score': 0.0,
                'uncertainty_score': 0.0,
                'market_sentiment': 'Neutral',
                'event_category': 'Other'
            })
            
    return pd.DataFrame(llm_features)

if __name__ == "__main__":
    # Load the raw news data
    try:
        news_data = pd.read_csv("data/raw/news_data.csv")
    except FileNotFoundError:
        print("Error: 'data/raw/news_data.csv' not found.")
        exit()
        
    # Extract features
    llm_enhanced_features = extract_llm_features(news_data)
    
    # Save the new features
    output_path = "data/processed/llm_enhanced_features.csv"
    llm_enhanced_features.to_csv(output_path, index=False)
    
    print(f"LLM-enhanced features saved to {output_path}")