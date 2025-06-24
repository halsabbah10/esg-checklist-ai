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
        model = genai.GenerativeModel("gemini-1.5-flash")  # type: ignore
        prompt = f"""
You are an ESG (Environmental, Social, Governance) compliance AI reviewer. Analyze the following evidence text and rate its relevance to ESG policies on a scale from 0.0 to 1.0, where:
- 0.0 = No ESG relevance
- 1.0 = Highly relevant to ESG compliance

Evidence text:
{text}

You must respond with ONLY valid JSON in this exact format:
{{"score": 0.8, "feedback": "Your detailed analysis here"}}

Do not include any other text, explanations, or formatting outside the JSON response.
        """
        response = model.generate_content(prompt)

        # Clean the response text and parse JSON
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = (
                response_text.replace("```json", "").replace("```", "").strip()
            )

        result = json.loads(response_text)
        return float(result["score"]), result["feedback"]
    except json.JSONDecodeError as e:
        return 0.0, f"JSON parsing error: {e}"
    except Exception as e:
        return 0.0, f"AI error: {e}"
