import os
import requests
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


class AIScorer:
    """
    Production-grade AI model abstraction for ESG scoring.
    Supports multiple AI providers with seamless switching via environment variables.
    """

    def __init__(self):
        self.provider = os.getenv("AI_SCORER", "gemini").lower()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.eand_api_url = os.getenv(
            "EAND_API_URL"
        )  # To be used for future integration
        self.eand_api_key = os.getenv(
            "EAND_API_KEY"
        )  # To be used for future integration

        # Validate required API keys based on provider
        self._validate_provider_config()

    def _validate_provider_config(self):
        """Validate that required API keys are available for the selected provider."""
        if self.provider == "gemini" and not self.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY is required when AI_SCORER is set to 'gemini'"
            )
        elif self.provider == "openai" and not self.openai_api_key:
            raise ValueError(
                "OPENAI_API_KEY is required when AI_SCORER is set to 'openai'"
            )
        elif self.provider == "eand" and not self.eand_api_key:
            raise ValueError("EAND_API_KEY is required when AI_SCORER is set to 'eand'")

    def score(self, text: str) -> Tuple[float, str]:
        """
        Score the given text using the configured AI provider.

        Args:
            text (str): The text to be scored

        Returns:
            Tuple[float, str]: (score, feedback) where score is between 0 and 1

        Raises:
            Exception: If the provider is unknown or scoring fails
        """
        if not text or not text.strip():
            raise ValueError("Text input cannot be empty")

        try:
            if self.provider == "gemini":
                return self._score_gemini(text)
            elif self.provider == "openai":
                return self._score_openai(text)
            elif self.provider == "eand":
                return self._score_eand(text)
            else:
                raise Exception(
                    f"Unknown AI provider specified in AI_SCORER: {self.provider}"
                )
        except Exception as e:
            logger.error(f"AI scoring failed with provider {self.provider}: {str(e)}")
            raise

    def _score_gemini(self, text: str) -> Tuple[float, str]:
        """Score text using Google's Gemini AI model."""
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

        # Enhanced prompt for ESG scoring
        esg_prompt = f"""
        Analyze the following ESG (Environmental, Social, Governance) document and provide a comprehensive assessment.
        
        Document text: {text}
        
        Please provide:
        1. An overall ESG compliance score between 0.0 and 1.0 (where 1.0 is excellent compliance)
        2. Detailed feedback on strengths and areas for improvement
        3. Specific recommendations for better ESG practices
        
        Format your response with the score clearly indicated as "Score: X.XX" followed by your detailed analysis.
        """

        payload = {
            "contents": [{"parts": [{"text": esg_prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
                "topP": 0.9,
                "topK": 1,
            },
        }
        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(
                f"{url}?key={self.gemini_api_key}",
                json=payload,
                headers=headers,
                timeout=30,
            )

            if response.status_code != 200:
                raise Exception(
                    f"Gemini API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            if "candidates" not in data or not data["candidates"]:
                raise Exception("No candidates in Gemini response")

            result_text = data["candidates"][0]["content"]["parts"][0]["text"]
            score = self._extract_score(result_text)
            feedback = result_text

            logger.info(f"Gemini scoring completed successfully with score: {score}")
            return score, feedback

        except requests.exceptions.Timeout:
            raise Exception("Gemini API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Gemini API network error: {str(e)}")
        except KeyError as e:
            raise Exception(
                f"Invalid response structure from Gemini: missing key {str(e)}"
            )

    def _score_openai(self, text: str) -> Tuple[float, str]:
        """Score text using OpenAI's GPT model."""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}",
        }

        # Enhanced prompt for ESG scoring
        esg_prompt = f"""
        As an ESG (Environmental, Social, Governance) expert, analyze the following document and provide a comprehensive assessment.
        
        Document: {text}
        
        Provide:
        1. Overall ESG compliance score (0.0 to 1.0, where 1.0 is excellent)
        2. Detailed analysis of environmental, social, and governance aspects
        3. Specific recommendations for improvement
        
        Start your response with "Score: X.XX" followed by your detailed analysis.
        """

        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": esg_prompt}],
            "max_tokens": 800,
            "temperature": 0.2,
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)

            if response.status_code != 200:
                raise Exception(
                    f"OpenAI API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            if "choices" not in data or not data["choices"]:
                raise Exception("No choices in OpenAI response")

            result_text = data["choices"][0]["message"]["content"]
            score = self._extract_score(result_text)
            feedback = result_text

            logger.info(f"OpenAI scoring completed successfully with score: {score}")
            return score, feedback

        except requests.exceptions.Timeout:
            raise Exception("OpenAI API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"OpenAI API network error: {str(e)}")
        except KeyError as e:
            raise Exception(
                f"Invalid response structure from OpenAI: missing key {str(e)}"
            )

    def _score_eand(self, text: str) -> Tuple[float, str]:
        """
        Score text using e& internal AI model.

        Note: This is a placeholder implementation. Update with e&'s actual API
        integration once their endpoint becomes available.
        """
        # Placeholder implementation
        # TODO: Replace with actual e& API integration
        #
        # Example implementation when e& API is available:
        # url = self.eand_api_url
        # headers = {
        #     "Authorization": f"Bearer {self.eand_api_key}",
        #     "Content-Type": "application/json"
        # }
        # payload = {
        #     "text": text,
        #     "task": "esg_scoring",
        #     "parameters": {
        #         "scoring_type": "comprehensive",
        #         "include_recommendations": True
        #     }
        # }
        #
        # try:
        #     response = requests.post(url, headers=headers, json=payload, timeout=30)
        #     if response.status_code != 200:
        #         raise Exception(f"e& API request failed: {response.status_code}")
        #
        #     data = response.json()
        #     score = data.get("score", 0.0)
        #     feedback = data.get("analysis", "No feedback available")
        #
        #     return score, feedback
        # except Exception as e:
        #     raise Exception(f"e& API error: {str(e)}")

        # Temporary implementation returning static high-quality response
        logger.warning(
            "Using placeholder e& AI scoring - replace with actual API integration"
        )

        # Simulate AI analysis based on text length and content
        score = min(
            0.99, max(0.60, len(text) / 1000.0)
        )  # Basic scoring based on content length
        feedback = f"""e& AI ESG Analysis (Integration Pending):

**Overall Assessment:** The document shows {'strong' if score > 0.8 else 'moderate' if score > 0.6 else 'basic'} ESG compliance indicators.

**Score: {score:.2f}**

**Environmental Factors:**
- Document length suggests {'comprehensive' if len(text) > 500 else 'basic'} environmental coverage
- Recommend integrating more specific environmental metrics

**Social Responsibility:**
- Social aspects {'well documented' if 'social' in text.lower() else 'need enhancement'}
- Consider adding employee welfare and community impact measures

**Governance:**
- Governance framework {'appears structured' if 'governance' in text.lower() else 'requires attention'}
- Strengthen transparency and accountability measures

**Recommendations:**
1. Enhance quantitative ESG metrics
2. Implement regular ESG reporting cycles
3. Integrate stakeholder feedback mechanisms

*Note: This analysis uses e& AI placeholder. Full integration pending API availability.*
"""

        return score, feedback

    def _extract_score(self, response_text: str) -> float:
        """
        Extract a score between 0 and 1 from the AI response text.

        Args:
            response_text (str): The AI model's response text

        Returns:
            float: Extracted score between 0.0 and 1.0
        """
        import re

        # Try multiple patterns to extract score
        patterns = [
            r"[Ss]core:\s*([0-1](?:\.\d+)?)",  # "Score: 0.85"
            r"[Ss]core\s*=\s*([0-1](?:\.\d+)?)",  # "Score = 0.85"
            r"([0-1](?:\.\d+)?)\s*\/\s*1",  # "0.85/1"
            r"([0-1](?:\.\d+)?)\s*out\s*of\s*1",  # "0.85 out of 1"
            r"(\d+(?:\.\d+)?)\s*%",  # "85%" (convert to 0.85)
            r"([0-1](?:\.\d+)?)(?=\s|$|[^\d\.])",  # Standalone decimal between 0-1
        ]

        for pattern in patterns:
            matches = re.findall(pattern, response_text, re.IGNORECASE)
            for match in matches:
                try:
                    score = float(match)

                    # Handle percentage format
                    if "%" in response_text and score > 1:
                        score = score / 100.0

                    # Ensure score is in valid range
                    if 0 <= score <= 1:
                        logger.debug(
                            f"Extracted score: {score} using pattern: {pattern}"
                        )
                        return score
                except ValueError:
                    continue

        # Fallback: analyze sentiment for approximate scoring
        text_lower = response_text.lower()
        positive_words = [
            "excellent",
            "strong",
            "good",
            "compliant",
            "adequate",
            "satisfactory",
        ]
        negative_words = [
            "poor",
            "weak",
            "insufficient",
            "lacking",
            "non-compliant",
            "inadequate",
        ]

        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        if positive_count > negative_count:
            fallback_score = 0.75 + (positive_count - negative_count) * 0.05
        elif negative_count > positive_count:
            fallback_score = 0.65 - (negative_count - positive_count) * 0.05
        else:
            fallback_score = 0.70

        # Ensure fallback score is in valid range
        fallback_score = max(0.0, min(1.0, fallback_score))

        logger.warning(
            f"Could not extract explicit score, using sentiment-based fallback: {fallback_score}"
        )
        return fallback_score

    def get_provider_info(self) -> dict:
        """
        Get information about the current AI provider configuration.

        Returns:
            dict: Provider information including name and availability
        """
        return {
            "provider": self.provider,
            "available": self._is_provider_available(),
            "description": self._get_provider_description(),
        }

    def _is_provider_available(self) -> bool:
        """Check if the current provider is properly configured."""
        try:
            self._validate_provider_config()
            return True
        except ValueError:
            return False

    def _get_provider_description(self) -> str:
        """Get a description of the current provider."""
        descriptions = {
            "gemini": "Google Gemini Pro - Advanced AI model for comprehensive ESG analysis",
            "openai": "OpenAI GPT-3.5-turbo - Reliable AI model for ESG document scoring",
            "eand": "e& Internal AI - Custom AI model optimized for regional ESG standards",
        }
        return descriptions.get(self.provider, f"Unknown provider: {self.provider}")


# Example usage in FastAPI endpoints:
#
# from app.ai.scorer import AIScorer
#
# @app.post("/score-document")
# async def score_document(document_text: str):
#     try:
#         scorer = AIScorer()
#         score, feedback = scorer.score(document_text)
#         return {
#             "score": score,
#             "feedback": feedback,
#             "provider": scorer.get_provider_info()
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
