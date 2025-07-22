import pandas as pd
from tqdm import tqdm
from transformers import pipeline

# Configure the Hugging Face model
# Using a small, instruction-tuned model for demonstration.
# For production, consider a larger, more capable model like 'google/flan-t5-large' or 'meta-llama/Llama-2-7b-chat-hf'
# (requires authentication and sufficient resources).
generator = pipeline("text2text-generation", model="google/flan-t5-small")

def extract_llm_features(news_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extracts features from news data using a large language model (Hugging Face).
    """
    
    llm_features = []
    
    for index, row in tqdm(news_df.iterrows(), total=news_df.shape[0], desc="Extracting LLM Features"):
        current_date = row.get('date') # 기본값을 None으로 변경
        current_title = row.get('title', 'Unknown Title')

        try:
            prompt = f"""
            Analyze the following news headline and provide a structured analysis in the following format:

            Headline: "{current_title}"

            **Analysis Format:**
            llm_sentiment_score: A float between -1.0 (very negative) and 1.0 (very positive).
            uncertainty_score: A float between 0.0 (very certain) and 1.0 (very uncertain).
            market_sentiment: One of 'Bullish', 'Bearish', or 'Neutral'.
            event_category: One of 'M&A', 'Product Launch', 'Regulation', 'Financials', 'Other'.

            **Analysis:**
            """
            
            # Generate response using Hugging Face pipeline
            # max_new_tokens is important to control output length
            response = generator(prompt, max_new_tokens=100, do_sample=False)[0]['generated_text']
            
            if not response:
                print(f"Warning: Empty response for row {index} (Date: {current_date}, Title: {current_title}). Skipping feature extraction for this row.")
                features = {}
            else:
                features = {}
                for line in response.split('\n'):
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
        except Exception as e:
            print(f"Error processing row {index} (Date: {current_date}, Title: {current_title}): {e}. Assigning default values.")
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
        news_data = pd.read_csv("data/raw/news_sentiment_data.csv")
    except FileNotFoundError:
        print("Error: 'data/raw/news_data.csv' not found.")
        exit()
        
    # Extract features
    llm_enhanced_features = extract_llm_features(news_data)
    
    # Save the new features
    output_path = "data/processed/llm_enhanced_features.csv"
    llm_enhanced_features.to_csv(output_path, index=False)
    
    print(f"LLM-enhanced features saved to {output_path}")