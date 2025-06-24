import os
import json
from typing import Tuple
import google.generativeai as genai  # type: ignore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))  # type: ignore


def ai_score_text_with_gemini(text: str) -> Tuple[float, str]:
    try:
        model = genai.GenerativeModel("gemini-flash")  # type: ignore
        prompt = f"""
        You are an ESG checklist AI reviewer. Analyze the following evidence and rate its relevance (from 0 to 1) to ESG policies, and provide a brief explanation.

        Evidence:
        \"\"\"
        {text}
        \"\"\"

        Respond in JSON as: {{"score": <number>, "feedback": "<string>"}}
        """
        response = model.generate_content(prompt)

        # Parse the JSON response
        result = json.loads(response.text)
        return float(result["score"]), result["feedback"]
    except json.JSONDecodeError as e:
        return 0.0, f"JSON parsing error: {e}"
    except Exception as e:
        return 0.0, f"AI error: {e}"
