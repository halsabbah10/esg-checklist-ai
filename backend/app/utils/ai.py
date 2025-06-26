import os
import json
import time
import logging
from typing import Tuple
import google.generativeai as genai  # type: ignore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=api_key)  # type: ignore


# Circuit breaker state
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if (
                self.last_failure_time
                and time.time() - self.last_failure_time > self.recovery_timeout
            ):
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker moved to HALF_OPEN state")
            else:
                raise Exception("Circuit breaker is OPEN - service unavailable")

        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
                logger.info("Circuit breaker moved to CLOSED state")
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(
                    f"Circuit breaker moved to OPEN state after {self.failure_count} failures"
                )

            raise e


# Global circuit breaker instance
circuit_breaker = CircuitBreaker()


def retry_with_backoff(max_retries=3, base_delay=1, max_delay=10):
    """Decorator for retry logic with exponential backoff"""

    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = min(base_delay * (2**attempt), max_delay)
                        logger.warning(
                            f"Attempt {attempt + 1} failed, retrying in {delay}s: {e}"
                        )
                        time.sleep(delay)
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed: {e}")

            if last_exception:
                raise last_exception
            else:
                raise Exception("Function failed with no exception recorded")

        return wrapper

    return decorator


@retry_with_backoff(max_retries=2)
def _call_gemini_api(text: str) -> Tuple[float, str]:
    """Internal function to call Gemini API with retry logic"""
    model = genai.GenerativeModel("gemini-1.5-flash")  # type: ignore

    prompt = f"""
You are an ESG (Environmental, Social, Governance) compliance AI reviewer. Analyze the following evidence text and rate its relevance to ESG policies on a scale from 0.0 to 1.0, where:
- 0.0 = No ESG relevance
- 1.0 = Highly relevant to ESG compliance

Provide specific feedback on:
1. Environmental factors (climate, pollution, resource usage)
2. Social factors (labor practices, community impact, diversity)
3. Governance factors (ethics, transparency, board structure)

Evidence text:
{text[:5000]}  # Limit text to prevent token limits

You must respond with ONLY valid JSON in this exact format:
{{"score": 0.8, "feedback": "Your detailed analysis here covering all ESG aspects"}}

Do not include any other text, explanations, or formatting outside the JSON response.
    """

    response = model.generate_content(prompt)

    # Clean the response text and parse JSON
    response_text = response.text.strip()
    if response_text.startswith("```json"):
        response_text = response_text.replace("```json", "").replace("```", "").strip()

    result = json.loads(response_text)

    # Validate response structure
    if "score" not in result or "feedback" not in result:
        raise ValueError("Invalid response structure from AI model")

    score = float(result["score"])
    if not 0.0 <= score <= 1.0:
        raise ValueError(f"Invalid score value: {score}. Must be between 0.0 and 1.0")

    return score, result["feedback"]


def ai_score_text_with_gemini(text: str) -> Tuple[float, str]:
    """
    Enhanced AI scoring function with circuit breaker, retry logic, and comprehensive error handling
    """
    try:
        # Validate input
        if not text or not text.strip():
            logger.warning("Empty or whitespace-only text provided for AI scoring")
            return 0.0, "No content provided for analysis"

        if len(text) > 50000:  # Reasonable limit for processing
            logger.warning(
                f"Text too long ({len(text)} chars), truncating to 50000 chars"
            )
            text = text[:50000] + "...[truncated for AI processing]"

        # Use circuit breaker to call AI service
        start_time = time.time()
        score, feedback = circuit_breaker.call(_call_gemini_api, text)
        processing_time = time.time() - start_time

        logger.info(
            f"AI scoring completed successfully in {processing_time:.2f}s, score: {score}"
        )

        return score, feedback

    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error in AI response: {e}")
        return 0.0, "AI response parsing error: Could not parse JSON response"

    except ValueError as e:
        logger.error(f"Validation error in AI response: {e}")
        return 0.0, f"AI response validation error: {str(e)}"

    except Exception as e:
        logger.error(f"Unexpected error in AI scoring: {e}")
        return 0.0, f"AI service temporarily unavailable: {str(e)}"


def get_ai_service_status() -> dict:
    """Get the current status of the AI service"""
    return {
        "circuit_breaker_state": circuit_breaker.state,
        "failure_count": circuit_breaker.failure_count,
        "last_failure_time": circuit_breaker.last_failure_time,
        "service_available": circuit_breaker.state != "OPEN",
    }
