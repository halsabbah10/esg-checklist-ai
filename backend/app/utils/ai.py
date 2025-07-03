import time
import logging
from typing import Tuple, Optional, Dict, Any
from ..config import get_settings, get_ai_config

# Import the new AI abstraction
try:
    from app.ai.scorer import AIScorer
except ImportError:
    # Fallback for development/testing
    AIScorer = None

# Get centralized configuration
settings = get_settings()
ai_config = get_ai_config()

# Configure logging
logger = logging.getLogger(__name__)


# Circuit breaker state with centralized configuration
class CircuitBreaker:
    def __init__(self, 
                 failure_threshold: int = None, 
                 recovery_timeout: int = None):
        self.failure_threshold = failure_threshold or ai_config["circuit_breaker_threshold"]
        self.recovery_timeout = recovery_timeout or ai_config["circuit_breaker_timeout"]
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


def ai_score_text_with_gemini(text: str) -> Tuple[float, str]:
    """
    Enhanced AI scoring function using the new AI abstraction layer.
    Supports multiple AI providers with circuit breaker, retry logic, and comprehensive error handling.
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

        # Use the new AI abstraction
        if AIScorer:
            try:
                scorer = AIScorer()
                start_time = time.time()
                score, feedback = circuit_breaker.call(scorer.score, text)
                processing_time = time.time() - start_time

                logger.info(
                    f"AI scoring completed successfully: score={score:.3f}, "
                    f"provider={scorer.provider}, time={processing_time:.2f}s"
                )

                return score, feedback
            except Exception as e:
                logger.error(f"AI scoring failed with new abstraction: {str(e)}")
                # Fall back to simple scoring
                return _fallback_simple_scoring(text)
        else:
            logger.warning("AIScorer not available, using fallback scoring")
            return _fallback_simple_scoring(text)

    except Exception as e:
        logger.error(f"Unexpected error in AI scoring: {e}")
        return _fallback_simple_scoring(text)


def _fallback_simple_scoring(text: str) -> Tuple[float, str]:
    """
    Simple fallback scoring when AI services are unavailable.
    """
    # Basic heuristic scoring based on content analysis
    text_lower = text.lower()

    # ESG keywords scoring
    environmental_keywords = [
        "environmental",
        "climate",
        "carbon",
        "emission",
        "renewable",
        "sustainability",
        "green",
    ]
    social_keywords = [
        "social",
        "employee",
        "community",
        "diversity",
        "safety",
        "human rights",
        "labor",
    ]
    governance_keywords = [
        "governance",
        "board",
        "ethics",
        "compliance",
        "transparency",
        "accountability",
    ]

    env_score = sum(1 for keyword in environmental_keywords if keyword in text_lower)
    social_score = sum(1 for keyword in social_keywords if keyword in text_lower)
    gov_score = sum(1 for keyword in governance_keywords if keyword in text_lower)

    # Calculate weighted score
    total_keywords = env_score + social_score + gov_score
    content_quality = min(1.0, len(text) / 1000)  # Quality based on content length

    base_score = min(0.95, 0.5 + (total_keywords * 0.05) + (content_quality * 0.2))

    feedback = f"""Fallback ESG Analysis:

**Score: {base_score:.2f}**

**Content Analysis:**
- Environmental aspects: {env_score} indicators found
- Social responsibility: {social_score} indicators found  
- Governance framework: {gov_score} indicators found
- Document length: {len(text)} characters

**Note:** This is a basic analysis. For comprehensive ESG scoring, ensure AI services are properly configured.

**Recommendations:**
1. Configure AI_SCORER environment variable (gemini/openai/eand)
2. Provide required API keys for selected provider
3. Review document for more specific ESG metrics
"""

    logger.info(f"Fallback scoring completed: score={base_score:.3f}")
    return base_score, feedback


def get_ai_service_status() -> dict:
    """Get the current status of the AI service and provider information"""
    status = {
        "circuit_breaker_state": circuit_breaker.state,
        "failure_count": circuit_breaker.failure_count,
        "last_failure_time": circuit_breaker.last_failure_time,
        "service_available": circuit_breaker.state != "OPEN",
    }

    # Add AI provider information if available
    if AIScorer:
        try:
            scorer = AIScorer()
            provider_info = scorer.get_provider_info()
            status.update(
                {
                    "ai_provider": provider_info["provider"],
                    "provider_available": provider_info["available"],
                    "provider_description": provider_info["description"],
                    "abstraction_layer": "active",
                }
            )
        except Exception as e:
            status.update(
                {
                    "ai_provider": "unknown",
                    "provider_available": False,
                    "provider_error": str(e),
                    "abstraction_layer": "error",
                }
            )
    else:
        status.update(
            {
                "ai_provider": "fallback",
                "provider_available": True,
                "provider_description": "Simple heuristic-based scoring",
                "abstraction_layer": "unavailable",
            }
        )

    return status


# Enhanced ESG scoring based on real Internal Audit Checklist data
REAL_ESG_CATEGORIES = {
    "Environmental": {
        "subcategories": ["Energy", "Emissions", "Water", "Waste"],
        "keywords": [
            "energy",
            "carbon",
            "emission",
            "water",
            "waste",
            "renewable",
            "sustainability",
        ],
        "weight": 0.33,
    },
    "Social": {
        "subcategories": [
            "Diversity",
            "Health and Safety",
            "Learning and Development",
            "Community Engagement",
            "Consumer Rights",
        ],
        "keywords": [
            "diversity",
            "health",
            "safety",
            "training",
            "community",
            "consumer",
            "rights",
        ],
        "weight": 0.33,
    },
    "Governance": {
        "subcategories": [
            "Management",
            "Risk Management",
            "Reporting",
            "Ethical AI",
            "Data Integrity",
            "Procurement",
        ],
        "keywords": [
            "governance",
            "management",
            "risk",
            "reporting",
            "ethics",
            "data",
            "procurement",
        ],
        "weight": 0.34,
    },
}

ENHANCED_SYSTEM_PROMPT = """You are an expert ESG auditor trained on real Internal Audit Checklist data. 
Analyze documents for Environmental, Social, and Governance compliance based on enterprise audit standards.
Focus on specific evidence, policy implementation, and regulatory compliance indicators."""


def calculate_enhanced_esg_score(document_analysis: dict, ai_response: str) -> dict:
    """Calculate ESG score using enhanced rubric based on real data."""

    # Initialize scoring structure
    scores = {
        "Environmental": {"score": 0, "evidence": [], "risks": []},
        "Social": {"score": 0, "evidence": [], "risks": []},
        "Governance": {"score": 0, "evidence": [], "risks": []},
    }

    # Analyze AI response for each category
    response_lower = ai_response.lower()

    for category, category_data in REAL_ESG_CATEGORIES.items():
        category_score = 0
        evidence_count = 0

        # Check for category-specific keywords
        for keyword in category_data["keywords"]:
            if keyword in response_lower:
                evidence_count += 1

        # Check for compliance indicators
        compliance_indicators = [
            "compliant",
            "implemented",
            "established",
            "effective",
            "policy",
        ]
        non_compliance_indicators = [
            "non-compliant",
            "missing",
            "inadequate",
            "no policy",
            "not implemented",
        ]

        compliance_score = sum(
            1 for indicator in compliance_indicators if indicator in response_lower
        )
        non_compliance_score = sum(
            1 for indicator in non_compliance_indicators if indicator in response_lower
        )

        # Calculate category score (0-100)
        if evidence_count > 0:
            base_score = min(evidence_count * 20, 80)  # Max 80 from evidence
            compliance_bonus = min(compliance_score * 10, 20)  # Max 20 from compliance
            compliance_penalty = min(non_compliance_score * 15, 30)  # Max 30 penalty

            category_score = max(0, base_score + compliance_bonus - compliance_penalty)

        scores[category]["score"] = category_score

        # Extract evidence (simple implementation)
        if evidence_count > 0:
            scores[category]["evidence"] = [
                f"Found {evidence_count} relevant indicators"
            ]

        # Assess risks
        if category_score < 50:
            scores[category]["risks"] = [
                "Low compliance score indicates potential risks"
            ]

    # Calculate overall score
    overall_score = sum(
        scores[category]["score"] * REAL_ESG_CATEGORIES[category]["weight"]
        for category in scores
    )

    return {
        "overall_score": round(overall_score, 2),
        "category_scores": scores,
        "risk_level": "High"
        if overall_score < 50
        else "Medium"
        if overall_score < 75
        else "Low",
        "enhanced_scoring": True,
        "data_source": "real_esg_audit_checklists",
    }
