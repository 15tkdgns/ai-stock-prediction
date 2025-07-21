import os
import google.generativeai as genai

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("GOOGLE_API_KEY environment variable not set.")
else:
    genai.configure(api_key=api_key)
    print("Available Models and their Supported Generation Methods:")
    for m in genai.list_models():
        print(f"Model Name: {m.name}")
        print(f"  Supported Methods: {m.supported_generation_methods}")
        print("-" * 30)