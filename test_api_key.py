import os
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument, Unauthenticated, PermissionDenied

api_key = os.environ.get("GOOGLE_API_KEY")

if not api_key:
    print("Error: GOOGLE_API_KEY environment variable is not set.")
else:
    try:
        genai.configure(api_key=api_key)
        # Attempt to get a model to test the API key
        model_info = genai.get_model('gemini-pro')
        print(f"API Key is valid. Successfully accessed model: {model_info.name}")
    except (Unauthenticated, PermissionDenied) as e:
        print(f"API Key is INVALID. Authentication or permission error: {e}")
    except InvalidArgument as e:
        print(f"API Key might be valid, but there was an argument error (e.g., model not found): {e}")
    except Exception as e:
        print(f"An unexpected error occurred while testing API Key: {e}")
