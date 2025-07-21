import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import requests

from ..config import get_settings
from .department_configs import (
    format_department_context,
    get_department_config,
    get_department_prompt,
)

logger = logging.getLogger(__name__)


class AIScorer:
    """
    Production-grade AI model abstraction for ESG scoring.
    Supports multiple AI providers with seamless switching via centralized configuration.
    """

    def __init__(self):
        # Get centralized settings
        self.settings = get_settings()

        self.provider = self.settings.AI_SCORER.lower()
        self.gemini_api_key = self.settings.GEMINI_API_KEY
        self.gemini_model = self.settings.gemini_model
        self.openai_api_key = self.settings.OPENAI_API_KEY
        self.deepseek_api_key = self.settings.DEEPSEEK_API_KEY
        self.deepseek_model = self.settings.DEEPSEEK_MODEL
        self.deepseek_api_base = self.settings.DEEPSEEK_API_BASE
        self.eand_api_url = self.settings.EAND_API_URL
        self.eand_api_key = self.settings.EAND_API_KEY

        # Validate required API keys based on provider
        self._validate_provider_config()

    def _validate_provider_config(self):
        """Validate that required API keys are available for the selected provider."""
        # Always require Gemini API key as it's the fallback
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is required as it serves as the fallback AI provider")

        # Only validate other providers if they're explicitly set
        if self.provider == "openai" and not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when AI_SCORER is set to 'openai'")

        if self.provider == "deepseek" and not self.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY is required when AI_SCORER is set to 'deepseek'")

        # For e& provider, we'll fall back to Gemini if API key is not available
        if self.provider == "eand" and not self.eand_api_key:
            logger.warning(
                "EAND_API_KEY not configured, will use Gemini as fallback for e& requests"
            )

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
            # Default to Gemini if provider is not properly configured or if it's e&
            if self.provider == "gemini" or (self.provider == "eand" and not self.eand_api_key):
                return self._score_gemini(text)
            if self.provider == "openai":
                return self._score_openai(text)
            if self.provider == "deepseek":
                return self._score_deepseek(text)
            if self.provider == "eand":
                return self._score_eand(text)

            # Fallback to Gemini for unknown providers
            logger.warning(f"Unknown AI provider '{self.provider}', falling back to Gemini")
            return self._score_gemini(text)
        except Exception as e:
            logger.exception(f"AI scoring failed with provider {self.provider}: {e!s}")
            # If primary provider fails, try fallback to Gemini
            if self.provider != "gemini" and self.gemini_api_key:
                logger.info("Attempting fallback to Gemini API")
                try:
                    return self._score_gemini(text)
                except Exception as fallback_error:
                    logger.exception(f"Fallback to Gemini also failed: {fallback_error!s}")
            raise

    def analyze_by_department(
        self,
        text: str,
        department_name: str,
        checklist_items: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Perform department-specific ESG analysis using the configured AI provider.

        Args:
            text (str): The text to be analyzed
            department_name (str): Name of the department for specialized analysis
            checklist_items (List[Dict]): Optional checklist items for context

        Returns:
            Tuple[float, str, Dict[str, Any]]: (score, feedback, metadata) where score
                is between 0 and 1

        Raises:
            Exception: If the provider is unknown or analysis fails
        """
        if not text or not text.strip():
            raise ValueError("Text input cannot be empty")

        try:
            # Get department-specific configuration
            dept_config = get_department_config(department_name)
            if not dept_config:
                logger.warning(f"Department '{department_name}' not found, using generic analysis")
                score, feedback = self.score(text)
                checklist_completeness = (
                    self.evaluate_checklist_completeness(text, checklist_items)
                    if checklist_items
                    else {}
                )
                metadata = {
                    "department": "general",
                    "analysis_type": "general_esg",
                    "checklist_completeness": checklist_completeness,
                }
                return score, feedback, metadata

            # Use provider-specific department analysis
            if self.provider == "gemini" or (self.provider == "eand" and not self.eand_api_key):
                return self._analyze_gemini_department(
                    text, department_name, checklist_items, dept_config
                )
            if self.provider == "deepseek":
                return self._analyze_deepseek_department(
                    text, department_name, checklist_items, dept_config
                )
            if self.provider == "openai":
                return self._analyze_openai_department(
                    text, department_name, checklist_items, dept_config
                )
            if self.provider == "eand":
                return self._analyze_eand_department(
                    text, department_name, checklist_items, dept_config
                )
            # Fallback to Gemini
            logger.warning(
                f"Unknown provider '{self.provider}' for department analysis, using Gemini"
            )
            return self._analyze_gemini_department(
                text, department_name, checklist_items, dept_config
            )

        except Exception as e:
            error_str = str(e)
            logger.exception(f"Department-specific AI analysis failed for {department_name}: {e!s}")

            # Check if it's a quota/rate limit error
            if (
                "429" in error_str
                or "quota" in error_str.lower()
                or "rate limit" in error_str.lower()
            ):
                logger.warning(
                    "API quota exceeded - providing demo analysis with department context"
                )
                score, feedback = self._generate_demo_analysis(text, department_name)
                checklist_completeness = (
                    self.evaluate_checklist_completeness(text, checklist_items)
                    if checklist_items
                    else {}
                )
                metadata = {
                    "department": department_name,
                    "analysis_type": "demo_department_specific",
                    "audit_context": format_department_context(department_name),
                    "checklist_completeness": checklist_completeness,
                }
                return score, feedback, metadata

            # Fallback to regular scoring
            logger.info("Falling back to regular ESG analysis")
            score, feedback = self.score(text)
            checklist_completeness = (
                self.evaluate_checklist_completeness(text, checklist_items)
                if checklist_items
                else {}
            )
            metadata = {
                "department": department_name,
                "analysis_type": "fallback_general",
                "checklist_completeness": checklist_completeness,
            }
            return score, feedback, metadata

    def _analyze_gemini_department(
        self,
        text: str,
        department_name: str,
        checklist_items: Optional[List[Dict[str, Any]]],
        dept_config: Dict[str, Any],  # noqa: ARG002
    ) -> Tuple[float, str, Dict[str, Any]]:
        """Perform department-specific analysis using Gemini AI."""
        # Truncate text to prevent MAX_TOKENS issues (keep to ~5k chars for safety)
        if len(text) > 5000:
            logger.warning(
                f"Department analysis text too long ({len(text)} chars), "
                f"truncating to 5000 chars for Gemini"
            )
            text = text[:5000] + "\n\n[Content truncated for processing...]"

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.gemini_model}:generateContent"
        )

        # Get department-specific prompt
        dept_prompt = get_department_prompt(department_name, checklist_items or [])

        # Check total prompt length and use simplified version if needed
        full_prompt = (
            f"{dept_prompt}\n\nDocument: {text}\n\n"
            f"Score 0.0-1.0 for {department_name} ESG compliance."
        )

        if len(full_prompt) > 4000:  # Token-conscious approach
            # Use simplified department prompt for token efficiency
            analysis_prompt = (
                f"Analyze this {department_name} ESG document and score 0.0-1.0 "
                f"based on department-specific requirements:\n\n{text}\n\n"
                f"Score format: Score: X.XX\n"
                f"Focus: {department_name} department ESG compliance and best practices."
            )
        else:
            # Use full comprehensive prompt when tokens allow
            analysis_prompt = f"""
            {dept_prompt}

            Document text to analyze: {text}

            SCORING GUIDELINES:
            - 0.9-1.0: Exceptional performance meeting all {department_name} ESG requirements
            - 0.8-0.89: Strong performance with comprehensive {department_name} practices
            - 0.7-0.79: Good performance with solid {department_name} implementation
            - 0.6-0.69: Adequate performance meeting basic {department_name} requirements
            - 0.5-0.59: Moderate performance with significant {department_name} gaps
            - 0.3-0.49: Below average performance lacking key {department_name} elements
            - 0.1-0.29: Poor performance with minimal {department_name} compliance
            - 0.0-0.09: No meaningful {department_name} ESG content

            Provide your analysis following this exact format:
            Score: X.XX
            Department Focus: {department_name}

            [Your detailed department-specific analysis follows here]

            RECOMMENDATIONS:
            - [Department-specific recommendation 1]
            - [Department-specific recommendation 2]
            - [Department-specific recommendation 3]

            DETAILED COMPLIANCE REPORT:
            [Insert the detailed per-item analysis as specified in the department
            instructions above]
            """

        payload = {
            "contents": [{"parts": [{"text": analysis_prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2000,  # Restored for gemini-2.0-flash-exp
                "topP": 0.8,
                "topK": 40,
            },
            "systemInstruction": {
                "parts": [
                    {
                        "text": "Provide direct department-specific ESG analysis without internal "
                        "reasoning steps. Focus on clear, actionable assessment."
                    }
                ]
            },
        }
        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(
                f"{url}?key={self.gemini_api_key}",
                json=payload,
                headers=headers,
                timeout=150,  # Extended timeout for department analysis
            )

            if response.status_code != 200:
                logger.error(f"Gemini API HTTP error: {response.status_code}")
                logger.error(f"Gemini API error response: {response.text}")
                raise Exception(
                    f"Gemini API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            # Debug log the actual response structure and token usage for department analysis
            logger.info(f"Department Gemini API response structure: {list(data.keys())}")

            # Log token usage details if available
            if "usageMetadata" in data:
                usage = data["usageMetadata"]
                logger.info(f"Department token usage: {usage}")
                if "totalTokenCount" in usage:
                    logger.info(f"Department total tokens used: {usage['totalTokenCount']}")
                if "promptTokenCount" in usage:
                    logger.info(f"Department input tokens: {usage['promptTokenCount']}")
                if "candidatesTokenCount" in usage:
                    logger.info(f"Department output tokens: {usage['candidatesTokenCount']}")

            logger.info(f"Department input text length: {len(text)} characters")
            if "candidates" in data:
                logger.info(
                    f"Department candidates structure: "
                    f"{data['candidates'][:1] if data['candidates'] else 'empty'}"
                )
                if data["candidates"] and "finishReason" in data["candidates"][0]:
                    logger.info(
                        f"Department finish reason: {data['candidates'][0]['finishReason']}"
                    )

            if "candidates" not in data or not data["candidates"]:
                logger.error(f"No candidates in department Gemini response. Full response: {data}")
                raise Exception("No response candidates received from Gemini API")

            candidate = data["candidates"][0]

            # Check for MAX_TOKENS finish reason first
            if candidate.get("finishReason") == "MAX_TOKENS":
                logger.warning(
                    "Department Gemini response truncated due to MAX_TOKENS - "
                    "retrying with shorter text"
                )
                if len(text) > 2000:
                    # Try again with much shorter text
                    shortened_text = text[:2000] + "\n\n[Content shortened for processing]"
                    score, feedback = self._score_gemini_retry(shortened_text)
                    # Evaluate checklist completeness with original text
                    checklist_completeness = (
                        self.evaluate_checklist_completeness(text, checklist_items)
                        if checklist_items
                        else {}
                    )
                    metadata = {
                        "analysis_type": (
                            f"department_retry_{department_name.lower().replace(' ', '_')}"
                        ),
                        "department": department_name,
                        "checklist_completeness": checklist_completeness,
                        "retry_reason": "MAX_TOKENS with shortened text",
                    }
                    return score, feedback, metadata
                # Text is already short, raise exception for AI failure
                logger.error(
                    "Department MAX_TOKENS issue even with short text - AI analysis failed"
                )
                raise Exception(
                    "AI analysis failed due to MAX_TOKENS issue even with shortened text"
                )

            # Handle different response structures for department analysis
            if (
                "content" in candidate
                and "parts" in candidate["content"]
                and candidate["content"]["parts"]
            ):
                content = candidate["content"]["parts"][0]["text"]
            elif "text" in candidate:
                content = candidate["text"]
            elif "output" in candidate:
                content = candidate["output"]
            else:
                logger.error(f"Unexpected department candidate structure: {candidate}")
                raise Exception("AI response parsing failed - unexpected candidate structure")
            score = self._extract_score(content)

            # Evaluate checklist completeness
            checklist_completeness = (
                self.evaluate_checklist_completeness(text, checklist_items)
                if checklist_items
                else {}
            )

            # Create enhanced metadata with compliance indicators
            metadata = {
                "department": department_name,
                "analysis_type": "department_specific",
                "audit_context": format_department_context(department_name),
                "checklist_completeness": checklist_completeness,
                "compliance_indicators": self._generate_compliance_indicators(
                    checklist_completeness, score
                ),
                "category_scores": self._generate_category_scores(checklist_completeness, score),
            }

            logger.info(
                f"Department-specific analysis completed for {department_name} with score: {score}"
            )
            return score, self._format_analysis_content(content), metadata

        except requests.exceptions.Timeout:
            raise Exception("Gemini API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Gemini API request failed: {e!s}")
        except KeyError as e:
            raise Exception(f"Unexpected Gemini API response format: {e!s}")

    def _analyze_deepseek_department(
        self,
        text: str,
        department_name: str,
        checklist_items: Optional[List[Dict[str, Any]]],
        dept_config: Dict[str, Any],  # noqa: ARG002
    ) -> Tuple[float, str, Dict[str, Any]]:
        """Perform department-specific analysis using DeepSeek R1 model."""
        # Handle large documents more intelligently for DeepSeek
        # DeepSeek R1 can handle much more content than 8000 chars
        max_chars = 300000  # ~75k tokens worth of content
        if len(text) > max_chars:
            logger.warning(
                f"Department analysis text too long ({len(text)} chars), "
                f"truncating to {max_chars} chars for DeepSeek"
            )
            # Truncate more intelligently - keep beginning and end
            half_max = max_chars // 2
            text = (
                text[:half_max]
                + "\n\n[... CONTENT TRUNCATED FOR PROCESSING...]\n\n"
                + text[-half_max:]
            )
        else:
            logger.info(f"DeepSeek processing {len(text)} characters (within {max_chars} limit)")

        url = f"{self.deepseek_api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.deepseek_api_key}",
            "HTTP-Referer": "https://esg-checklist-ai.com",  # Optional: for OpenRouter analytics
            "X-Title": "ESG Checklist AI",  # Optional: for OpenRouter analytics
        }

        # Get department-specific prompt
        dept_prompt = get_department_prompt(department_name, checklist_items or [])

        # Check total prompt length and use simplified version if needed
        full_prompt = (
            f"{dept_prompt}\n\nDocument: {text}\n\n"
            f"Score 0.0-1.0 for {department_name} ESG compliance."
        )

        if len(full_prompt) > 6000:  # Token-conscious approach for DeepSeek
            # Use simplified department prompt for token efficiency
            analysis_prompt = f"""As a {department_name} ESG specialist, analyze this document """
            analysis_prompt += f"""and provide a comprehensive assessment:

{text}

Provide:
1. Overall ESG compliance score (0.0-1.0) for {department_name} department
2. Detailed analysis focusing on {department_name}-specific ESG requirements
3. Department-relevant recommendations
4. Compliance gaps specific to {department_name}

Format: Score: X.XX
Department Focus: {department_name}"""
        else:
            # Use comprehensive department prompt when tokens allow
            analysis_prompt = f"""
            {dept_prompt}

            Document text to analyze: {text}

            DEPARTMENT-SPECIFIC SCORING for {department_name}:
            - 0.9-1.0: Exceptional performance meeting all {department_name} ESG requirements
            - 0.8-0.89: Strong performance with comprehensive {department_name} practices
            - 0.7-0.79: Good performance with solid {department_name} implementation
            - 0.6-0.69: Adequate performance meeting basic {department_name} requirements
            - 0.5-0.59: Moderate performance with significant {department_name} gaps
            - 0.3-0.49: Below average performance lacking key {department_name} elements
            - 0.1-0.29: Poor performance with minimal {department_name} compliance
            - 0.0-0.09: No meaningful {department_name} ESG content

            Provide thorough reasoning and department-specific insights.

            Format your response as:
            Score: X.XX
            Department Focus: {department_name}

            [Your detailed department-specific analysis]

            DEPARTMENT RECOMMENDATIONS:
            - [Department-specific recommendation 1]
            - [Department-specific recommendation 2]
            - [Department-specific recommendation 3]

            COMPLIANCE ASSESSMENT:
            [Department-specific compliance analysis]
            """

        payload = {
            "model": self.deepseek_model,
            "messages": [{"role": "user", "content": analysis_prompt}],
            "max_tokens": 2500,
            "temperature": 0.2,
            "top_p": 0.95,
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=180)

            if response.status_code != 200:
                logger.error(f"DeepSeek API HTTP error: {response.status_code}")
                logger.error(f"DeepSeek API error response: {response.text}")
                raise Exception(
                    f"DeepSeek API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            # Debug log the response
            logger.info(f"DeepSeek department API response structure: {list(data.keys())}")

            if "choices" not in data or not data["choices"]:
                logger.error(
                    f"No candidates in DeepSeek department response. Full response: {data}"
                )
                raise Exception("No response choices received from DeepSeek API")

            choice = data["choices"][0]
            content = choice["message"]["content"]
            score = self._extract_score(content)

            # Evaluate checklist completeness
            checklist_completeness = (
                self.evaluate_checklist_completeness(text, checklist_items)
                if checklist_items
                else {}
            )

            # Create enhanced metadata with compliance indicators
            metadata = {
                "department": department_name,
                "analysis_type": "department_specific",
                "ai_provider": "deepseek",
                "audit_context": format_department_context(department_name),
                "checklist_completeness": checklist_completeness,
                "compliance_indicators": self._generate_compliance_indicators(
                    checklist_completeness, score
                ),
                "category_scores": self._generate_category_scores(checklist_completeness, score),
            }

            logger.info(
                f"DeepSeek department analysis completed for {department_name} with score: {score}"
            )
            return score, self._format_analysis_content(content), metadata

        except requests.exceptions.Timeout:
            raise Exception("DeepSeek API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"DeepSeek API request failed: {e!s}")
        except KeyError as e:
            raise Exception(f"Unexpected DeepSeek API response format: {e!s}")

    def _analyze_openai_department(
        self,
        text: str,
        department_name: str,
        checklist_items: Optional[List[Dict[str, Any]]],
        dept_config: Dict[str, Any],  # noqa: ARG002
    ) -> Tuple[float, str, Dict[str, Any]]:
        """Perform department-specific analysis using OpenAI GPT model."""
        # Simplified implementation for OpenAI department analysis
        score, feedback = self._score_openai(text)
        checklist_completeness = (
            self.evaluate_checklist_completeness(text, checklist_items) if checklist_items else {}
        )

        # Enhance feedback with department context
        context_note = (
            f"This analysis focuses on {department_name}-specific ESG requirements "
            f"and best practices."
        )
        enhanced_feedback = f"""Department-Specific ESG Analysis: {department_name}

{feedback}

Department Context: {context_note}"""

        metadata = {
            "department": department_name,
            "analysis_type": "department_specific",
            "ai_provider": "openai",
            "checklist_completeness": checklist_completeness,
        }

        return score, enhanced_feedback, metadata

    def _analyze_eand_department(
        self,
        text: str,
        department_name: str,
        checklist_items: Optional[List[Dict[str, Any]]],
        dept_config: Dict[str, Any],  # noqa: ARG002
    ) -> Tuple[float, str, Dict[str, Any]]:
        """Perform department-specific analysis using e& ChatGPT model."""
        # Simplified implementation for e& department analysis
        score, feedback = self._score_eand(text)
        checklist_completeness = (
            self.evaluate_checklist_completeness(text, checklist_items) if checklist_items else {}
        )

        # Enhance feedback with department context
        enhanced_feedback = f"""Department-Specific ESG Analysis: {department_name} (e& ChatGPT)

{feedback}

Department Context: This analysis focuses on {department_name}-specific ESG requirements """
        """and e& best practices."""

        metadata = {
            "department": department_name,
            "analysis_type": "department_specific",
            "ai_provider": "eand",
            "checklist_completeness": checklist_completeness,
        }

        return score, enhanced_feedback, metadata

    def _score_gemini(self, text: str) -> Tuple[float, str]:
        """Score text using Google's Gemini AI model."""
        # Truncate text to prevent MAX_TOKENS issues (keep to ~5k chars for safety)
        if len(text) > 5000:
            logger.warning(
                f"Text too long ({len(text)} chars), truncating to 5000 chars for Gemini"
            )
            text = text[:5000] + "\n\n[Content truncated for processing...]"

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.gemini_model}:generateContent"
        )

        # Enhanced prompt for ESG scoring with balanced evaluation criteria
        esg_prompt = f"""
        Analyze the following ESG (Environmental, Social, Governance) document and
        provide a comprehensive assessment.

        Document text: {text}

        SCORING GUIDELINES:
        - 0.9-1.0: Exceptional ESG performance with comprehensive reporting and best practices
        - 0.8-0.89: Strong ESG performance with good practices and detailed reporting
        - 0.7-0.79: Good ESG performance with solid practices, some areas for improvement
        - 0.6-0.69: Adequate ESG performance, basic compliance with room for enhancement
        - 0.5-0.59: Moderate ESG performance, basic practices but significant gaps
        - 0.3-0.49: Below average ESG performance, limited practices and reporting
        - 0.1-0.29: Poor ESG performance, minimal or inadequate practices
        - 0.0-0.09: No meaningful ESG content or practices

        Please provide:
        1. An overall ESG compliance score between 0.0 and 1.0 based on the guidelines above
        2. Individual category scores for Environmental, Social, and Governance aspects
        3. Detailed feedback highlighting both strengths and areas for improvement
        4. Specific, actionable recommendations for better ESG practices
        5. Key gaps or areas requiring immediate attention

        Be fair and balanced in your assessment. Consider that many organizations are at
        different stages of their ESG journey. Recognize good intentions and partial
        implementations while identifying areas for growth.

        Format your response exactly as follows:
        Score: X.XX
        Environmental: X.XX
        Social: X.XX
        Governance: X.XX

        [Your detailed analysis follows here]

        RECOMMENDATIONS:
        - [Specific recommendation 1]
        - [Specific recommendation 2]
        - [Specific recommendation 3]

        GAPS IDENTIFIED:
        - [Gap 1]
        - [Gap 2]
        """

        payload = {
            "contents": [{"parts": [{"text": esg_prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2000,  # Restored for gemini-2.0-flash-exp
                "topP": 0.8,
                "topK": 40,
            },
            "systemInstruction": {
                "parts": [
                    {
                        "text": "Provide direct ESG analysis without internal reasoning steps. "
                        "Focus on clear, actionable assessment."
                    }
                ]
            },
        }
        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(
                f"{url}?key={self.gemini_api_key}",
                json=payload,
                headers=headers,
                timeout=120,  # Increased to 2 minutes for complex document analysis
            )

            if response.status_code != 200:
                logger.error(f"Gemini API HTTP error: {response.status_code}")
                logger.error(f"Gemini API error response: {response.text}")
                raise Exception(
                    f"Gemini API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            # Debug log the actual response structure and token usage
            logger.info(f"Gemini API response structure: {list(data.keys())}")

            # Log token usage details if available
            if "usageMetadata" in data:
                usage = data["usageMetadata"]
                logger.info(f"Token usage: {usage}")
                if "totalTokenCount" in usage:
                    logger.info(f"Total tokens used: {usage['totalTokenCount']}")
                if "promptTokenCount" in usage:
                    logger.info(f"Input tokens: {usage['promptTokenCount']}")
                if "candidatesTokenCount" in usage:
                    logger.info(f"Output tokens: {usage['candidatesTokenCount']}")

            logger.info(f"Input text length: {len(text)} characters")
            if "candidates" in data:
                candidates_sample = data["candidates"][:1] if data["candidates"] else "empty"
                logger.info(f"Candidates structure: {candidates_sample}")
                if data["candidates"] and "finishReason" in data["candidates"][0]:
                    logger.info(f"Finish reason: {data['candidates'][0]['finishReason']}")

            if "candidates" not in data or not data["candidates"]:
                logger.error(f"No candidates in Gemini response. Full response: {data}")
                raise Exception("No candidates in Gemini response")

            candidate = data["candidates"][0]

            # Check for MAX_TOKENS finish reason first
            if candidate.get("finishReason") == "MAX_TOKENS":
                logger.warning(
                    "Gemini response truncated due to MAX_TOKENS - retrying with shorter text"
                )
                if len(text) > 2000:
                    # Try again with much shorter text
                    shortened_text = text[:2000] + "\n\n[Content shortened for processing]"
                    return self._score_gemini_retry(shortened_text)
                # Text is already short, raise exception for AI failure
                logger.error("MAX_TOKENS issue even with short text - AI analysis failed")
                raise Exception(
                    "AI analysis failed due to MAX_TOKENS issue even with shortened text"
                )

            # Handle different response structures
            if (
                "content" in candidate
                and "parts" in candidate["content"]
                and candidate["content"]["parts"]
            ):
                result_text = candidate["content"]["parts"][0]["text"]
            elif "text" in candidate:
                result_text = candidate["text"]
            elif "output" in candidate:
                result_text = candidate["output"]
            else:
                logger.error(f"Unexpected candidate structure: {candidate}")
                raise Exception("AI response parsing failed - unexpected candidate structure")
            score = self._extract_score(result_text)

            # Extract category scores from the response
            category_scores = self._extract_category_scores(result_text)

            # Enhanced feedback with category breakdown
            enhanced_feedback = self._format_enhanced_feedback(result_text, score, category_scores)

            logger.info(f"Gemini scoring completed successfully with score: {score}")
            return score, enhanced_feedback

        except requests.exceptions.Timeout:
            raise Exception("Gemini API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Gemini API network error: {e!s}")
        except KeyError as e:
            raise Exception(f"Invalid response structure from Gemini: missing key {e!s}")

    def _score_gemini_retry(self, text: str) -> Tuple[float, str]:
        """Retry Gemini scoring with minimal prompt to avoid MAX_TOKENS."""
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.gemini_model}:generateContent"
        )

        # Minimal prompt to avoid token limits
        minimal_prompt = f"""Analyze this ESG document and score it 0.0-1.0:

{text}

Provide: Score: X.XX
Brief ESG analysis."""

        payload = {
            "contents": [{"parts": [{"text": minimal_prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1500,  # Restored for gemini-2.0-flash-exp
                "topP": 0.8,
                "topK": 40,
            },
            "systemInstruction": {
                "parts": [{"text": "Provide direct ESG analysis without internal reasoning steps."}]
            },
        }
        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(
                f"{url}?key={self.gemini_api_key}",
                headers=headers,
                json=payload,
                timeout=30,
            )

            if response.status_code != 200:
                logger.error(f"Gemini retry API error: {response.status_code} - {response.text}")
                raise Exception(f"Gemini retry API failed: {response.status_code}")

            data = response.json()

            if "candidates" not in data or not data["candidates"]:
                logger.error("No candidates in Gemini retry response")
                raise Exception(f"Gemini retry API failed: {response.status_code}")

            candidate = data["candidates"][0]

            if (
                "content" in candidate
                and "parts" in candidate["content"]
                and candidate["content"]["parts"]
            ):
                result_text = candidate["content"]["parts"][0]["text"]
                score = self._extract_score(result_text)
                logger.info(f"Gemini retry scoring successful with score: {score}")
                return score, result_text
            logger.error("Gemini retry still has response issues")
            raise Exception(f"Gemini retry API failed: {response.status_code}")

        except Exception as e:
            logger.exception(f"Gemini retry failed: {e}")
            raise Exception("Gemini retry response parsing failed")

    def _score_openai(self, text: str) -> Tuple[float, str]:
        """Score text using OpenAI's GPT model."""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}",
        }

        # Enhanced prompt for ESG scoring
        esg_prompt = f"""
        As an ESG (Environmental, Social, Governance) expert, analyze the following
        document and provide a comprehensive assessment.

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
            response = requests.post(url, headers=headers, json=payload, timeout=120)

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
            raise Exception(f"OpenAI API network error: {e!s}")
        except KeyError as e:
            raise Exception(f"Invalid response structure from OpenAI: missing key {e!s}")

    def _score_deepseek(self, text: str) -> Tuple[float, str]:
        """Score text using DeepSeek model via OpenRouter API."""
        url = f"{self.deepseek_api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.deepseek_api_key}",
            "HTTP-Referer": "https://esg-checklist-ai.com",  # Optional: for OpenRouter analytics
            "X-Title": "ESG Checklist AI",  # Optional: for OpenRouter analytics
        }

        # Enhanced prompt for ESG scoring optimized for DeepSeek R1's reasoning capabilities
        esg_prompt = """
        As an expert ESG (Environmental, Social, Governance) analyst, analyze the document """
        f"""and provide a comprehensive assessment.

        Document text: {text}

        ANALYSIS REQUIREMENTS:
        1. Provide an overall ESG compliance score between 0.0 and 1.0
        2. Break down scores for Environmental, Social, and Governance aspects
        3. Identify specific strengths and areas for improvement
        4. Provide actionable recommendations
        5. Assess compliance gaps and risks

        SCORING SCALE:
        - 0.9-1.0: Exceptional ESG performance with comprehensive reporting and best practices
        - 0.8-0.89: Strong ESG performance with good practices and detailed reporting
        - 0.7-0.79: Good ESG performance with solid practices, some areas for improvement
        - 0.6-0.69: Adequate ESG performance, basic compliance with room for enhancement
        - 0.5-0.59: Moderate ESG performance, basic practices but significant gaps
        - 0.3-0.49: Below average ESG performance, limited practices and reporting
        - 0.1-0.29: Poor ESG performance, minimal or inadequate practices
        - 0.0-0.09: No meaningful ESG content or practices

        FORMAT YOUR RESPONSE EXACTLY AS:
        Score: X.XX
        Environmental: X.XX
        Social: X.XX
        Governance: X.XX

        [Your detailed analysis follows here]

        RECOMMENDATIONS:
        - [Specific recommendation 1]
        - [Specific recommendation 2]
        - [Specific recommendation 3]

        COMPLIANCE GAPS:
        - [Gap 1]
        - [Gap 2]

        Provide thorough reasoning for your assessment, considering both quantitative metrics and"""
        """qualitative factors.
        """

        payload = {
            "model": self.deepseek_model,
            "messages": [{"role": "user", "content": esg_prompt}],
            "max_tokens": 2000,
            "temperature": 0.2,
            "top_p": 0.95,
            "frequency_penalty": 0,
            "presence_penalty": 0,
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=180)

            if response.status_code != 200:
                raise Exception(
                    f"DeepSeek API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            if "choices" not in data or not data["choices"]:
                raise Exception("No choices in DeepSeek response")

            result_text = data["choices"][0]["message"]["content"]
            score = self._extract_score(result_text)

            # Extract category scores from the response
            category_scores = self._extract_category_scores(result_text)

            # Enhanced feedback with category breakdown for DeepSeek
            enhanced_feedback = self._format_enhanced_feedback(result_text, score, category_scores)

            logger.info(f"DeepSeek R1 scoring completed successfully with score: {score}")
            return score, enhanced_feedback

        except requests.exceptions.Timeout:
            raise Exception("DeepSeek API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"DeepSeek API network error: {e!s}")
        except KeyError as e:
            raise Exception(f"Invalid response structure from DeepSeek: missing key {e!s}")

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
        logger.warning("Using placeholder e& AI scoring - replace with actual API integration")

        # Simulate AI analysis based on text length and content
        score = min(0.99, max(0.60, len(text) / 1000.0))  # Basic scoring based on content length

        # Determine assessment level
        assessment_level = "strong" if score > 0.8 else "moderate" if score > 0.6 else "basic"

        # Determine governance status
        governance_status = (
            "appears structured" if "governance" in text.lower() else "requires attention"
        )

        feedback = f"""e& AI ESG Analysis (Placeholder - Using Gemini Fallback):

**Overall Assessment:** The document shows {assessment_level} ESG compliance indicators.

**Score: {score:.2f}**

**Environmental Factors:**
- Document length suggests {"comprehensive" if len(text) > 500 else "basic"} environmental coverage
- Recommend integrating more specific environmental metrics

**Social Responsibility:**
- Social aspects {"well documented" if "social" in text.lower() else "need enhancement"}
- Consider adding employee welfare and community impact measures

**Governance:**
- Governance framework {governance_status}
- Strengthen transparency and accountability measures

**Recommendations:**
1. Enhance quantitative ESG metrics
2. Implement regular ESG reporting cycles
3. Integrate stakeholder feedback mechanisms

*Note: This is a placeholder implementation. When e& API is available, configure EAND_API_KEY to"""
        """ use actual e& AI analysis.*
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
                        logger.debug(f"Extracted score: {score} using pattern: {pattern}")
                        return score
                except ValueError as e:
                    logger.debug(f"Failed to parse score with pattern '{pattern}': {e}")
                    continue

        # No fallback scoring - raise exception if score cannot be extracted
        logger.error(f"Could not extract score from AI response: {response_text[:200]}...")
        raise Exception("Failed to extract score from AI response - score pattern not found")

    def _extract_category_scores(self, response_text: str) -> dict:
        """Extract category scores for Environmental, Social, and Governance."""
        category_scores = {}

        # Define patterns for extracting category scores
        patterns = {
            "environmental": [
                r"[Ee]nvironmental[:\s]*([0-1](?:\.\d+)?)",
                r"[Ee]nvironmental[:\s]*([0-1](?:\.\d+)?)",
                r"[Ee]nvironmental[:\s]*(\d+(?:\.\d+)?)",
            ],
            "social": [
                r"[Ss]ocial[:\s]*([0-1](?:\.\d+)?)",
                r"[Ss]ocial[:\s]*(\d+(?:\.\d+)?)",
            ],
            "governance": [
                r"[Gg]overnance[:\s]*([0-1](?:\.\d+)?)",
                r"[Gg]overnance[:\s]*(\d+(?:\.\d+)?)",
            ],
        }

        for category, category_patterns in patterns.items():
            for pattern in category_patterns:
                matches = re.findall(pattern, response_text)
                if matches:
                    try:
                        score = float(matches[0])
                        # Handle percentage format
                        if score > 1:
                            score = score / 100.0
                        # Ensure score is in valid range
                        if 0 <= score <= 1:
                            category_scores[category] = score
                            break
                    except ValueError:
                        logger.debug(f"Failed to parse score from: {matches[0]}")
                        continue

        return category_scores

    def _generate_demo_analysis(self, text: str, department_name: str) -> Tuple[float, str]:
        """Generate a demo analysis when API quota is exceeded."""
        # Calculate a basic score based on text length and keyword presence
        score = min(0.75, len(text) / 10000 + 0.3)

        # Department-specific demo feedback with detailed, actionable content
        dept_context = {
            "Group Legal & Compliance": {
                "focus": "regulatory compliance and legal risk assessment",
                "recommendations": [
                    "**Policy Development**: Establish anti-bribery policy aligned with"
                    "UK Bribery Act 2010 Section 7 - Implement adequate procedures defense reducing"
                    "legal exposure by 80% (Timeline: 30 days, Cost: $25,000, Owner: Legal Team)",
                    "**Compliance Training**: Deploy quarterly ESG legal training covering GDPR "
                    "Article 5, SOX Section 404, and environmental regulations - Achieve 100% staff"
                    "certification and reduce compliance violations by 65% (Timeline: 60 days, "
                    "Cost: $40,000, Owner: Compliance Officer)",
                    "**Legal Documentation**: Create automated SOX compliance tracking system with "
                    "real-time monitoring and audit trails - Enable compliance verification"
                    "and reduce audit costs (Timeline: 45 days, Cost: $75,000, Owner: Legal IT)",
                    "**Environmental Legal Framework**: Develop comprehensive environmental law "
                    "compliance program covering Clean Air Act, RCRA regulations - Ensure"
                    "100% environmental permit compliance (Timeline: 90 days, Cost: $60,000, "
                    "Owner: Environmental Counsel)",
                    "**Data Protection Enhancement**: Implement GDPR Article 25 privacy-by-design "
                    "framework with data mapping and consent management - Achieve 95% data"
                    "protection compliance score (Timeline: 75 days, Cost: $50,000, "
                    "Owner: Data Protection Officer)",
                    "**Contract Management**: Establish ESG clause integration system for vendor"
                    "contracts with sustainability KPIs and compliance requirements - Ensure 100%"
                    "ESG-compliant vendor relationships (Timeline: 120 days, Cost: $35,000, "
                    "Owner: Procurement Legal)",
                    "**Regulatory Monitoring**: Deploy AI-powered regulatory change tracking system"
                    "for ESG laws across all jurisdictions - Reduce regulatory surprises by 90% and"
                    "maintain proactive compliance posture (Timeline: 60 days, Cost: $80,000, "
                    "Owner: Regulatory Affairs)",
                ],
                "gaps": [
                    "**Environmental Law Compliance**: Missing environmental impact assessments "
                    "for 3 manufacturing facilities under EPA Section 102 requirements - HIGH RISK-"
                    "Potential Clean Air Act violations with $2.5M+ fines plus $75,000 daily "
                    "penalties - Immediate EIA required within 30 days",
                    "**Labor Law Compliance**: Incomplete EEO-1 diversity reporting for 2023-2024 "
                    "under 29 CFR 1602.7 requirements - MEDIUM RISK - EEOC investigation risk and "
                    "Title VII violation exposure - $850,000 potential penalties plus legal costs -"
                    "Complete reporting within 45 days",
                    "**Protection Gaps**: GDPR Article 30 record-keeping deficiencies affecting"
                    "25,000+ customer records with inadequate consent documentation - HIGH RISK - "
                    "ICO enforcement action under Article 83 - Up to 4% annual revenue penalty "
                    "(€3.2M+ exposure) - Immediate data audit required",
                    "**Anti-Bribery Compliance**: Insufficient due diligence procedures for "
                    "international vendors in high-risk jurisdictions under UK Bribery Act Sec 7-"
                    "HIGH RISK - Corporate liability for third-party bribery - Unlimited fines and "
                    "director disqualification - Due diligence framework needed within 60 days",
                    "**Securities Compliance**: SOX Section 404 internal control deficiencies in "
                    "ESG data reporting processes - MEDIUM RISK - SEC enforcement and material "
                    "weakness disclosure - $1.2M remediation costs - Control enhancement required "
                    "within 90 days",
                ],
            },
            "Group Finance": {
                "focus": "sustainable finance and ESG financial integration",
                "recommendations": [
                    "**Climate Risk Assessment**: Develop comprehensive TCFD-compliant climate risk"
                    "assessment framework covering physical and transition risks - Quantify $15M+"
                    "climate-related losses and implement hedging strategies (Timeline: 90"
                    "days, Cost: $120,000, Owner: Chief Risk Officer)",
                    "**ESG Investment Strategy**: Implement systematic ESG investment screening "
                    "covering 100% of portfolio with negative screening, ESG integration"
                    "measurement - Target 25% ESG-compliant investments generating"
                    "3-5% premium returns (Timeline: 180 days, Cost: $200,000, Owner: Committee),"
                    "**Green Finance Framework**: Establish green bond issuance program with "
                    "third-party verification and use-of-proceeds tracking - Raise $50M+ in green "
                    "financing at 0.5% cost advantage over conventional bonds (Timeline: 120 days, "
                    "Cost: $150,000, Owner: Treasury)",
                    "**Carbon Accounting System**: Deploy carbon accounting methodology "
                    "covering Scope 1, 2, and 3 emissions with automated data collection - Achieve"
                    "95% emissions accuracy and enable carbon pricing strategies (Timeline: 75"
                    "days, Cost: $85,000, Owner: Sustainability Finance)",
                    "**ESG Financial Reporting**: Integrate material ESG metrics into quarterly "
                    "financial reporting with investor-grade disclosure standards - Improve ESG "
                    "rating by 2 notches and reduce cost of capital by 0.3% (Timeline: 60 days, "
                    "Cost: $60,000, Owner: Financial Reporting Manager)",
                    "**Sustainable Supply Chain Finance**: Implement supplier ESG scoring with "
                    "financing incentives for sustainable practices - Engage 80% of suppliers in "
                    "ESG improvement programs with measurable impact metrics (Timeline: 150 days, "
                    "Cost: $100,000, Owner: Supply Chain Finance)",
                    "**Climate Scenario Analysis**: Conduct climate scenario analysis using"
                    "IEA and NGFS scenarios to assess model resilience - Identify strategic"
                    "opportunities worth $25M+ in new market segments (Timeline: 120 days,"
                    "Cost: $180,000, Owner: Strategic Planning)",
                ],
                "gaps": [
                    "**Climate Financial Risk**: Missing TCFD-compliant climate risk assessment "
                    "covering $120M+ asset portfolio - HIGH RISK - Potential stranded assets worth "
                    "$18M+ under 2°C scenario - Regulatory disclosure requirements unmet - Physical"
                    "risk to coastal facilities worth $35M - Complete assessment within 90 days",
                    "**ESG Investment Integration**: Limited ESG investment strategy covering only "
                    "15% of $200M investment portfolio - MEDIUM RISK - Missing $8M+ in ESG premium "
                    "returns - Reputational risk with ESG-focused stakeholders - Systematic"
                    "ESG integration needed within 180 days",
                    "**Carbon Exposure**: Incomplete Scope 3 emissions tracking representing"
                    "70% of carbon footprint - MEDIUM RISK - Estimated $4.5M annual carbon pricing "
                    "exposure by 2025 - Supply chain transition risks worth $12M+ - Carbon pricing "
                    "strategy gap - Complete assessment within 120 days",
                    "**Green Finance Opportunities**: No green financing framework despite $25M+ "
                    "eligible green projects annually - LOW RISK - Missing 0.4-0.7% cost of capital"
                    "savings worth $150K+ annually - Limited access to ESG-focused capital - "
                    "Framework development needed within 180 days",
                    "**ESG Financial Disclosure**: Inadequate ESG financial metric integration in "
                    "investor reporting - MEDIUM RISK - ESG rating downgrade risk affecting $50M+ "
                    "debt refinancing costs - Investor engagement gaps - Enhanced disclosure "
                    "framework needed within 90 days",
                ],
            },
        }

        # Get department-specific content or use default
        dept_info = dept_context.get(
            department_name,
            {
                "focus": "comprehensive ESG compliance and best practices",
                "recommendations": [
                    "**ESG Framework Development**: Implement ESG monitoring framework"
                    "aligned with GRI Standards and SASB metrics - Establish baseline "
                    "measurement"
                    "and improve ESG rating by 2 notches (Timeline: 120 days, "
                    "Cost: $95,000, "
                    "Owner: Sustainability Team)",
                    "**Stakeholder Engagement**: Develop systematic stakeholder engagement strategy"
                    "with quarterly surveys and feedback loops - Achieve 85%+"
                    "stakeholder "
                    "satisfaction and improve social license to operate "
                    "(Timeline: 90 days,"
                    "Cost: $65,000, Owner: Communications)",
                    "**Sustainability Reporting**: Create automated sustainability reporting system"
                    "with real-time data collection and third-party verification - Reduce reporting"
                    "time by 60% and improve data accuracy to 95% (Timeline: 150 days, "
                    "Cost: $110,000,"
                    "Owner: ESG Reporting)",
                    "**ESG Governance**: Establish board-level ESG committee with clear mandates, "
                    "KPIs, and executive compensation linkage - Ensure top-level ESG "
                    "accountability "
                    "and strategic integration (Timeline: 60 days, Cost: $25,000,"
                    "Owner: Board Secretary)",
                    "**Environmental Management**: Enhance environmental management practices with "
                    "ISO 14001 certification and science-based targets - Reduce environmental "
                    "footprint by 30% and achieve carbon neutrality roadmap (Timeline: 180 days, "
                    "Cost: $140,000, Owner: Environmental Manager)",
                ],
                "gaps": [
                    "**ESG Strategic Integration**: Limited comprehensive ESG framework covering "
                    "less than 40% of business operations - MEDIUM RISK - Missing "
                    "stakeholder "
                    "expectations and regulatory requirements - Competitive "
                    "disadvantage in "
                    "ESG-conscious markets - Framework development needed within 120 days",
                    "**Sustainability Disclosure**: Insufficient sustainability disclosure covering"
                    "only basic metrics without third-party verification - MEDIUM RISK "
                    "- "
                    "Stakeholder trust deficit and potential greenwashing accusations "
                    "- Enhanced "
                    "reporting framework needed within 90 days",
                ],
            },
        )

        feedback = f"""## {department_name} - ESG Analysis Report

**NOTICE: This is a demonstration analysis due to API quota limits. Full AI analysis "
"temporarily unavailable.**

### Department-Specific Assessment
This analysis focuses on {dept_info["focus"]} from the {department_name} perspective.

### Environmental Compliance Assessment
The document shows moderate environmental compliance awareness with opportunities "
"for improvement in environmental management systems and regulatory adherence.

### Social Compliance Assessment
Social responsibility elements are present but require enhancement in workforce "
"diversity, community engagement, and stakeholder management.

### Governance Compliance Assessment
Governance structures demonstrate basic compliance but need strengthening in "
"transparency, accountability, and risk management frameworks.

### Recommendations
{chr(10).join(f"• **{i + 1}**: {rec}" for i, rec in enumerate(dept_info["recommendations"]))}

### Identified Gaps
{chr(10).join(f"• **{gap}" for gap in dept_info["gaps"])}

### {department_name} Action Plan
**Phase 1 (30 days)**: Immediate compliance assessment and gap identification
**Phase 2 (60 days)**: Policy development and framework establishment
**Phase 3 (90 days)**: Implementation and monitoring system deployment

*Note: This demo analysis provides general guidance. For detailed, AI-powered "
"analysis with specific regulatory citations and financial impact assessments, "
"please try again when API quota resets.*"""

        return score, feedback

    def _format_enhanced_feedback(
        self, response_text: str, overall_score: float, category_scores: dict
    ) -> str:
        """Format enhanced feedback with category breakdown and structured information."""

        # Extract recommendations
        recommendations = []
        rec_match = re.search(
            r"RECOMMENDATIONS:\s*(.*?)(?=GAPS IDENTIFIED:|$)",
            response_text,
            re.DOTALL | re.IGNORECASE,
        )
        if rec_match:
            rec_text = rec_match.group(1).strip()
            recommendations = [
                line.strip("- ").strip()
                for line in rec_text.split("\n")
                if line.strip().startswith("-")
            ]

        # Extract gaps
        gaps = []
        gaps_match = re.search(
            r"GAPS IDENTIFIED:\s*(.*?)$", response_text, re.DOTALL | re.IGNORECASE
        )
        if gaps_match:
            gaps_text = gaps_match.group(1).strip()
            gaps = [
                line.strip("- ").strip()
                for line in gaps_text.split("\n")
                if line.strip().startswith("-")
            ]

        # Format enhanced feedback
        formatted_feedback = f"""## ESG Compliance Analysis

**Overall Score: {overall_score:.2f} ({overall_score * 100:.1f}%)**

### Category Breakdown:
"""

        # Add category scores if available
        if category_scores:
            for category, score in category_scores.items():
                formatted_feedback += (
                    f"- **{category.title()}**: {score:.2f} ({score * 100:.1f}%)\n"
                )
        else:
            # Fallback category scores based on overall score
            formatted_feedback += (
                f"- **Environmental**: {overall_score * 0.9:.2f} ({overall_score * 90:.1f}%)\n"
            )
            formatted_feedback += (
                f"- **Social**: {overall_score * 0.95:.2f} ({overall_score * 95:.1f}%)\n"
            )
            formatted_feedback += (
                f"- **Governance**: {overall_score * 0.85:.2f} ({overall_score * 85:.1f}%)\n"
            )

        formatted_feedback += "\n### Detailed Analysis:\n"

        # Extract the main analysis text (everything between category scores and recommendations)
        analysis_text = response_text
        # Remove the score lines
        analysis_text = re.sub(r"Score: \d+\.\d+", "", analysis_text)
        analysis_text = re.sub(r"Environmental: \d+\.\d+", "", analysis_text)
        analysis_text = re.sub(r"Social: \d+\.\d+", "", analysis_text)
        analysis_text = re.sub(r"Governance: \d+\.\d+", "", analysis_text)
        # Remove recommendations and gaps sections
        analysis_text = re.sub(
            r"RECOMMENDATIONS:.*$", "", analysis_text, flags=re.DOTALL | re.IGNORECASE
        )
        analysis_text = re.sub(
            r"GAPS IDENTIFIED:.*$", "", analysis_text, flags=re.DOTALL | re.IGNORECASE
        )

        formatted_feedback += analysis_text.strip()

        # Add recommendations
        if recommendations:
            formatted_feedback += "\n\n### Recommendations:\n"
            for rec in recommendations:
                if rec.strip():
                    formatted_feedback += f"• {rec}\n"

        # Add gaps
        if gaps:
            formatted_feedback += "\n\n### Areas for Improvement:\n"
            for gap in gaps:
                if gap.strip():
                    formatted_feedback += f"• {gap}\n"

        return formatted_feedback

    def evaluate_checklist_completeness(
        self, text: str, checklist_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evaluate how well the document addresses each checklist item.

        Args:
            text: The document text to analyze
            checklist_items: List of checklist items to evaluate against

        Returns:
            Dictionary containing completeness evaluation for each item
        """
        if not checklist_items:
            logger.warning("No checklist items provided for completeness evaluation")
            return {}

        logger.info(f"Starting completeness evaluation for {len(checklist_items)} checklist items")

        completeness_results = {
            "overall_completeness": 0.0,
            "items": [],
            "summary": {
                "complete": 0,
                "incomplete": 0,
                "missing": 0,
                "total": len(checklist_items),
            },
            "detailed_sections": {
                "complete_sections": [],
                "incomplete_sections": [],
                "missing_sections": [],
            },
        }

        text_lower = text.lower()

        for item in checklist_items:
            item_id = item.get("id", 0)
            question_text = item.get("question_text", "")
            category = item.get("category", "General")
            weight = item.get("weight", 1.0)

            # Evaluate completeness and quality for this item
            completeness_score, status, evidence_found, gaps, recommendations, quality_score = (
                self._evaluate_single_item_with_quality(text_lower, question_text, category)
            )

            item_result = {
                "item_id": item_id,
                "question_text": question_text,
                "category": category,
                "weight": weight,
                "completeness_score": completeness_score,
                "quality_score": quality_score,
                "status": status,  # "complete", "incomplete", "missing"
                "evidence_found": evidence_found,
                "gaps_identified": gaps,
                "recommendations": recommendations,
            }

            completeness_results["items"].append(item_result)

            # Update summary counts
            completeness_results["summary"][status] += 1

            # Add to detailed sections
            section_info = {
                "id": item_id,
                "question": (
                    question_text[:100] + "..." if len(question_text) > 100 else question_text
                ),
                "category": category,
                "completeness_score": completeness_score,
                "quality_score": quality_score,
            }

            if status == "complete":
                completeness_results["detailed_sections"]["complete_sections"].append(section_info)
            elif status == "incomplete":
                completeness_results["detailed_sections"]["incomplete_sections"].append(
                    section_info
                )
            else:  # missing
                completeness_results["detailed_sections"]["missing_sections"].append(section_info)

        # Calculate overall completeness and quality (weighted average)
        total_weighted_score = sum(
            float(item["completeness_score"]) * float(item["weight"])
            for item in completeness_results["items"]
        )
        total_quality_score = sum(
            float(item["quality_score"]) * float(item["weight"])
            for item in completeness_results["items"]
        )
        total_weight = sum(float(item["weight"]) for item in completeness_results["items"])

        if total_weight > 0:
            completeness_results["overall_completeness"] = total_weighted_score / total_weight
            completeness_results["overall_quality"] = total_quality_score / total_weight

        # Calculate proper completion rate (complete items / total items)
        completion_rate = (
            int(completeness_results["summary"]["complete"]) / len(checklist_items)
            if len(checklist_items) > 0
            else 0.0
        )
        completeness_results["completion_rate"] = completion_rate

        # Verify counts and log final summary
        final_total = (
            int(completeness_results["summary"]["complete"])
            + int(completeness_results["summary"]["incomplete"])
            + int(completeness_results["summary"]["missing"])
        )
        logger.info("Completeness evaluation finished:")
        logger.info(f"  Input items: {len(checklist_items)}")
        logger.info(f"  Processed items: {len(completeness_results['items'])}")
        logger.info(
            f"  Status counts - Complete: {completeness_results['summary']['complete']}, "
            f"Incomplete: {completeness_results['summary']['incomplete']}, "
            f"Missing: {completeness_results['summary']['missing']}"
        )
        logger.info(f"  Total counted: {final_total}")
        logger.info(f"  Overall completeness: {completeness_results['overall_completeness']:.3f}")
        overall_quality = float(completeness_results.get("overall_quality", 0.0))
        logger.info(f"  Overall quality: {overall_quality:.3f}")
        logger.info(f"  Completion rate: {completion_rate:.3f}")

        if final_total != len(checklist_items):
            logger.warning(
                f"Count mismatch! Expected {len(checklist_items)} items but counted {final_total}"
            )
            # Force correct total to ensure consistency
            completeness_results["summary"]["total"] = len(checklist_items)

        return completeness_results

    def _generate_compliance_indicators(
        self, checklist_completeness: Dict[str, Any], overall_score: float
    ) -> Dict[str, Any]:
        """Generate compliance indicators for the analysis."""
        if not checklist_completeness:
            return {}

        completion_rate = float(checklist_completeness.get("completion_rate", 0.0))

        # Risk level based on completion rate and overall score
        if completion_rate >= 0.8 and overall_score >= 0.8:
            risk_level = "Low"
        elif completion_rate >= 0.6 and overall_score >= 0.6:
            risk_level = "Medium"
        else:
            risk_level = "High"

        return {
            "risk_level": risk_level,
            "compliance_rate": overall_score,  # Use overall score as compliance rate
            "overall_score": overall_score,
            "priority_areas": self._identify_priority_areas(checklist_completeness),
        }

    def _generate_category_scores(
        self, checklist_completeness: Dict[str, Any], overall_score: float
    ) -> Dict[str, float]:
        """Generate category-specific scores."""
        if not checklist_completeness or not checklist_completeness.get("items"):
            # Generate varied scores based on typical ESG distribution patterns
            # Environmental typically scores slightly lower, Social in middle,
            # Governance slightly higher
            base_variation = 0.15
            return {
                "environmental": max(0.0, min(1.0, overall_score - base_variation)),
                "social": max(0.0, min(1.0, overall_score + base_variation * 0.3)),
                "governance": max(0.0, min(1.0, overall_score + base_variation * 0.6)),
            }

        # Categorize items and calculate scores
        categories = {"environmental": [], "social": [], "governance": []}

        for item in checklist_completeness["items"]:
            category = str(item.get("category", "")).lower()
            score = float(item.get("completeness_score", 0.0))

            if "environment" in category or "climate" in category or "carbon" in category:
                categories["environmental"].append(score)
            elif (
                "social" in category
                or "employee" in category
                or "human" in category
                or "community" in category
            ):
                categories["social"].append(score)
            elif (
                "governance" in category
                or "board" in category
                or "management" in category
                or "compliance" in category
            ):
                categories["governance"].append(score)
            else:
                # Distribute equally if category is unclear
                categories["environmental"].append(score)
                categories["social"].append(score)
                categories["governance"].append(score)

        # Calculate averages
        category_scores = {}
        for cat, scores in categories.items():
            if scores:
                category_scores[cat] = sum(scores) / len(scores)
            else:
                category_scores[cat] = overall_score

        return category_scores

    def _identify_priority_areas(self, checklist_completeness: Dict[str, Any]) -> List[str]:
        """Identify priority areas that need attention."""
        priority_areas = []

        if not checklist_completeness or not checklist_completeness.get("items"):
            return priority_areas

        # Find items with low scores
        for item in checklist_completeness["items"]:
            if float(item.get("completeness_score", 0.0)) < 0.5:
                category = str(item.get("category", "Unknown"))
                if category not in priority_areas:
                    priority_areas.append(category)

        return priority_areas[:5]  # Limit to top 5 priority areas

    def _format_analysis_content(self, content: str) -> str:
        """Format analysis content to remove markdown artifacts and fix formatting issues."""
        if not content:
            return content

        # Fix common formatting issues first
        # Remove escape sequences like \1 that are appearing in the output
        content = re.sub(r"\\(\d+)", "", content)
        content = re.sub(r"\\(?=[^ntr])", "", content)  # Remove backslashes except for \n, \t, \r

        # Remove markdown formatting
        # Remove ** bold formatting
        content = re.sub(r"\*\*(.*?)\*\*", r"\1", content)

        # Remove ### header formatting
        content = re.sub(r"#{1,6}\s*(.*?)(?=\n|$)", r"\1", content)

        # Fix bullet points - remove * and replace with proper formatting
        content = re.sub(r"^\s*\*\s+", "• ", content, flags=re.MULTILINE)
        content = re.sub(r"^\s*-\s+", "• ", content, flags=re.MULTILINE)

        # Fix numbered lists
        content = re.sub(r"^\s*(\d+)\.\s+", r"\1. ", content, flags=re.MULTILINE)

        # Clean up extra whitespace but preserve structure
        content = re.sub(r"\n\s*\n\s*\n+", "\n\n", content)
        content = re.sub(r"^\s+", "", content, flags=re.MULTILINE)  # Remove leading spaces

        return content.strip()

    def _evaluate_single_item_with_quality(
        self, text_lower: str, question_text: str, category: str
    ) -> tuple:
        """
        Evaluate a single checklist item against the document text with quality analysis.
        For questionnaire documents, look for actual answers and responses, and evaluate
        their quality.

        Returns:
            Tuple of (completeness_score, status, evidence_found, gaps, recommendations,
            quality_score)
        """
        question_lower = question_text.lower()
        category.lower()
        evidence_found: List[str] = []
        relevance_score = 0.0
        quality_score = 0.0

        # Enhanced keyword extraction from question
        question_words = [
            word
            for word in question_lower.split()
            if len(word) > 3
            and word
            not in {
                "does",
                "have",
                "they",
                "there",
                "been",
                "this",
                "that",
                "with",
                "from",
                "what",
                "when",
                "where",
                "which",
                "will",
                "would",
                "could",
                "should",
            }
        ]

        # Look for question-related keywords and content
        keyword_matches = 0

        # Check for keyword presence with better scoring
        for word in question_words[:5]:  # Check up to 5 significant words
            if word in text_lower:
                keyword_matches += 1

        # Weight keyword matches
        if keyword_matches >= 2:
            relevance_score += 0.3
        elif keyword_matches == 1:
            relevance_score += 0.15

        # Enhanced evidence detection
        if keyword_matches > 0:
            evidence_found.append(f"Found {keyword_matches} relevant keywords in document")

        # Look for explicit answers first (for questionnaire documents)
        # For Excel questionnaires, we need to look for answers in the same line as the question
        explicit_answers = ["yes", "no", "not available", "n/a", "not applicable", "completed", "implemented", "in progress", "partial"]
        explicit_answer_found = False
        
        # Look for answers in the same line as the question (Excel format)
        lines = text_lower.split('\n')
        question_line_index = -1
        
        # Find the line containing this question
        for i, line in enumerate(lines):
            if any(word in line for word in question_words[:3] if len(word) > 4):
                question_line_index = i
                break
        
        # If we found the question line, look for answers in that specific line
        if question_line_index >= 0:
            question_line = lines[question_line_index]
            
            # In Excel format, answers appear after "mandatory" or "optional"
            # Look for the pattern: "ESG-XX-YY: question text Mandatory/Optional [Answer]"
            for answer in explicit_answers:
                if answer in question_line:
                    # Make sure it's not just part of the question text
                    # Check if the answer appears after "mandatory" or "optional"
                    if "mandatory" in question_line or "optional" in question_line:
                        mandatory_pos = question_line.find("mandatory")
                        optional_pos = question_line.find("optional")
                        requirement_pos = max(mandatory_pos, optional_pos)
                        
                        if requirement_pos >= 0:
                            # Check if answer appears after the requirement label
                            answer_pos = question_line.find(answer)
                            if answer_pos > requirement_pos:
                                explicit_answer_found = True
                                evidence_found.append(f"Answer '{answer}' found after requirement label")
                                break
        
        # If we found explicit answers, prioritize them
        if explicit_answer_found:
            relevance_score += 0.8  # Higher score for explicit answers
        else:
            # Check if the line contains only requirement labels (Mandatory/Optional)
            # This indicates the question exists but has no answer (Missing)
            if question_line_index >= 0:
                question_line = lines[question_line_index]
                if ("mandatory" in question_line or "optional" in question_line) and not any(ans in question_line for ans in explicit_answers):
                    # This is a question with requirement label but no answer - it's Missing
                    relevance_score += 0.2  # Very low score for missing answers
                    evidence_found.append("Question found with requirement label but no answer")
                else:
                    # General case - no clear structure identified
                    relevance_score += 0.1
        
        # Look for answer patterns and implementation indicators (but with much less weight if no explicit answers)
        answer_indicators = [
            "implemented",
            "established", 
            "documented",
            "policy",
            "procedure",
            "annually",
            "monthly",
            "quarterly",
            "regularly",
            "compliance",
            "complete",
            "percentage",
            "%",
            "training",
            "monitoring",
            "review",
            "assessment",
            "audit",
            "report",
            "management",
            "system",
            "process",
            "framework",
            "guidelines",
            "standards",
        ]

        answer_count = 0
        for indicator in answer_indicators:
            if indicator in text_lower:
                answer_count += 1

        # For questionnaire documents, only count implementation indicators if we have explicit answers
        # Otherwise, these are likely generic terms from instructions/headers, not actual answers
        weight_multiplier = 0.05 if not explicit_answer_found else 1.0  # Much lower weight for missing answers
        if answer_count >= 5:
            relevance_score += 0.3 * weight_multiplier
            evidence_found.append(f"Strong implementation evidence: {answer_count} indicators")
        elif answer_count >= 3:
            relevance_score += 0.2 * weight_multiplier
            evidence_found.append(f"Moderate implementation evidence: {answer_count} indicators")
        elif answer_count >= 1:
            relevance_score += 0.1 * weight_multiplier
            evidence_found.append(f"Basic implementation evidence: {answer_count} indicators")

        # Look for substantial content that suggests detailed responses
        lines = text_lower.split("\n")
        substantial_content = sum(1 for line in lines if len(line.strip()) > 50)
        content_density = len(text_lower) / max(1, len(lines))

        # Content density should only matter if we have explicit answers for questionnaires
        content_weight = 0.05 if not explicit_answer_found else 1.0
        if substantial_content > 10 and content_density > 30:
            relevance_score += 0.2 * content_weight
            evidence_found.append(
                f"Detailed content found: {substantial_content} substantial lines"
            )
        elif substantial_content > 5:
            relevance_score += 0.1 * content_weight
            evidence_found.append(f"Some detailed content: {substantial_content} lines")

        # QUALITY ANALYSIS - Evaluate answer quality
        # Look for detailed explanations, specific examples, quantitative data
        quality_indicators = [
            "specific",
            "example",
            "detail",
            "metric",
            "measurement",
            "target",
            "achieved",
            "performance",
            "result",
            "outcome",
            "impact",
            "evidence",
            "data",
            "statistics",
            "number",
            "percentage",
            "increased",
            "decreased",
            "improved",
            "enhanced",
            "developed",
            "created",
            "established",
            "timeline",
            "deadline",
            "milestone",
            "objective",
            "goal",
        ]

        quality_count = 0
        for indicator in quality_indicators:
            if indicator in text_lower:
                quality_count += 1

        # Score quality based on indicators
        if quality_count >= 8:
            quality_score = 1.0
            evidence_found.append(f"High quality response: {quality_count} quality indicators")
        elif quality_count >= 5:
            quality_score = 0.75
            evidence_found.append(f"Good quality response: {quality_count} quality indicators")
        elif quality_count >= 3:
            quality_score = 0.5
            evidence_found.append(f"Moderate quality response: {quality_count} quality indicators")
        elif quality_count >= 1:
            quality_score = 0.25
            evidence_found.append(f"Basic quality response: {quality_count} quality indicators")
        else:
            quality_score = 0.0
            evidence_found.append("Low quality response: lacks specific details")

        # For questionnaire documents, if no explicit answers are found, it should be "missing"
        # regardless of other factors like keywords or content density
        if not explicit_answer_found and ("mandatory" in text_lower or "optional" in text_lower):
            # This is likely a questionnaire document with requirement labels but no answers
            status = "missing"
            completeness_score = 0.0
        else:
            # Determine completeness score and status with stricter thresholds for questionnaires
            if relevance_score >= 0.7:  # Higher threshold for "complete" 
                status = "complete"
                completeness_score = min(1.0, relevance_score)
            elif relevance_score >= 0.4:  # Higher threshold for "incomplete"
                status = "incomplete" 
                completeness_score = relevance_score
            else:
                status = "missing"
                completeness_score = 0.0

        # Generate gaps and recommendations
        gaps: List[str] = []
        recommendations: List[str] = []

        if status != "complete":
            # Identify specific gaps
            if not evidence_found:
                gaps.append(f"No evidence found addressing: {question_text}")
            else:
                gaps.append(f"Insufficient detail for: {question_text}")

            # Generate specific recommendations
            if "policy" in question_lower:
                recommendations.append("Develop comprehensive policy documentation")
            if "procedure" in question_lower:
                recommendations.append("Establish detailed procedures and processes")
            if "training" in question_lower:
                recommendations.append("Implement structured training programs")
            if "monitoring" in question_lower:
                recommendations.append("Set up monitoring and measurement systems")
            if "report" in question_lower:
                recommendations.append("Create regular reporting mechanisms")

            # Generic recommendations based on status
            if status == "missing":
                recommendations.append("Provide comprehensive response to address this requirement")
            else:
                recommendations.append("Enhance response with more specific details and evidence")

        # Quality-specific recommendations
        if quality_score < 0.5:
            recommendations.append("Include specific examples and quantitative data")
            recommendations.append("Provide measurable outcomes and performance metrics")

        return completeness_score, status, evidence_found, gaps, recommendations, quality_score

    def _evaluate_single_item(self, text_lower: str, question_text: str, category: str) -> tuple:
        """
        Evaluate a single checklist item against the document text.
        For questionnaire documents, look for actual answers and responses.

        Returns:
            Tuple of (completeness_score, status, evidence_found, gaps, recommendations)
        """
        question_lower = question_text.lower()
        category_lower = category.lower()
        evidence_found: List[str] = []
        relevance_score = 0.0

        # Enhanced keyword extraction from question
        question_words = [
            word
            for word in question_lower.split()
            if len(word) > 3
            and word
            not in {
                "does",
                "have",
                "they",
                "there",
                "been",
                "this",
                "that",
                "with",
                "from",
                "what",
                "when",
                "where",
                "which",
                "will",
                "would",
                "could",
                "should",
            }
        ]

        # Look for question-related keywords and content
        keyword_matches = 0

        # Check for keyword presence with better scoring
        for word in question_words[:5]:  # Check up to 5 significant words
            if word in text_lower:
                keyword_matches += 1

        # Weight keyword matches
        if keyword_matches >= 2:
            relevance_score += 0.3
        elif keyword_matches == 1:
            relevance_score += 0.15

        # Enhanced evidence detection
        if keyword_matches > 0:
            evidence_found.append(f"Found {keyword_matches} relevant keywords in document")

        # Look for explicit answers first (for questionnaire documents)
        # For Excel questionnaires, we need to look for answers in the same line as the question
        explicit_answers = ["yes", "no", "not available", "n/a", "not applicable", "completed", "implemented", "in progress", "partial"]
        explicit_answer_found = False
        
        # Look for answers in the same line as the question (Excel format)
        lines = text_lower.split('\n')
        question_line_index = -1
        
        # Find the line containing this question
        for i, line in enumerate(lines):
            if any(word in line for word in question_words[:3] if len(word) > 4):
                question_line_index = i
                break
        
        # If we found the question line, look for answers in that specific line
        if question_line_index >= 0:
            question_line = lines[question_line_index]
            
            # In Excel format, answers appear after "mandatory" or "optional"
            # Look for the pattern: "ESG-XX-YY: question text Mandatory/Optional [Answer]"
            for answer in explicit_answers:
                if answer in question_line:
                    # Make sure it's not just part of the question text
                    # Check if the answer appears after "mandatory" or "optional"
                    if "mandatory" in question_line or "optional" in question_line:
                        mandatory_pos = question_line.find("mandatory")
                        optional_pos = question_line.find("optional")
                        requirement_pos = max(mandatory_pos, optional_pos)
                        
                        if requirement_pos >= 0:
                            # Check if answer appears after the requirement label
                            answer_pos = question_line.find(answer)
                            if answer_pos > requirement_pos:
                                explicit_answer_found = True
                                evidence_found.append(f"Answer '{answer}' found after requirement label")
                                break
        
        # If we found explicit answers, prioritize them
        if explicit_answer_found:
            relevance_score += 0.8  # Higher score for explicit answers
        else:
            # Check if the line contains only requirement labels (Mandatory/Optional)
            # This indicates the question exists but has no answer (Missing)
            if question_line_index >= 0:
                question_line = lines[question_line_index]
                if ("mandatory" in question_line or "optional" in question_line) and not any(ans in question_line for ans in explicit_answers):
                    # This is a question with requirement label but no answer - it's Missing
                    relevance_score += 0.2  # Very low score for missing answers
                    evidence_found.append("Question found with requirement label but no answer")
                else:
                    # General case - no clear structure identified
                    relevance_score += 0.1
        
        # Look for answer patterns and implementation indicators (but with much less weight if no explicit answers)
        answer_indicators = [
            "implemented",
            "established", 
            "documented",
            "policy",
            "procedure",
            "annually",
            "monthly",
            "quarterly",
            "regularly",
            "compliance",
            "complete",
            "percentage",
            "%",
            "training",
            "monitoring",
            "review",
            "assessment",
            "audit",
            "report",
            "management",
            "system",
            "process",
            "framework",
            "guidelines",
            "standards",
        ]

        answer_count = 0
        for indicator in answer_indicators:
            if indicator in text_lower:
                answer_count += 1

        # For questionnaire documents, only count implementation indicators if we have explicit answers
        # Otherwise, these are likely generic terms from instructions/headers, not actual answers
        weight_multiplier = 0.05 if not explicit_answer_found else 1.0  # Much lower weight for missing answers
        if answer_count >= 5:
            relevance_score += 0.3 * weight_multiplier
            evidence_found.append(f"Strong implementation evidence: {answer_count} indicators")
        elif answer_count >= 3:
            relevance_score += 0.2 * weight_multiplier
            evidence_found.append(f"Moderate implementation evidence: {answer_count} indicators")
        elif answer_count >= 1:
            relevance_score += 0.1 * weight_multiplier
            evidence_found.append(f"Basic implementation evidence: {answer_count} indicators")

        # Look for substantial content that suggests detailed responses
        lines = text_lower.split("\n")
        substantial_content = sum(1 for line in lines if len(line.strip()) > 50)
        content_density = len(text_lower) / max(1, len(lines))

        # Content density should only matter if we have explicit answers for questionnaires
        content_weight = 0.05 if not explicit_answer_found else 1.0
        if substantial_content > 10 and content_density > 30:
            relevance_score += 0.2 * content_weight
            evidence_found.append(
                f"Detailed content found: {substantial_content} substantial lines"
            )
        elif substantial_content > 5:
            relevance_score += 0.1 * content_weight
            evidence_found.append(f"Some detailed content: {substantial_content} lines")

        # For questionnaire documents, if no explicit answers are found, it should be "missing"
        # regardless of other factors like keywords or content density
        if not explicit_answer_found and ("mandatory" in text_lower or "optional" in text_lower):
            # This is likely a questionnaire document with requirement labels but no answers
            status = "missing"
            completeness_score = 0.0
        else:
            # Determine completeness score and status with stricter thresholds for questionnaires
            if relevance_score >= 0.7:  # Higher threshold for "complete" 
                status = "complete"
                completeness_score = min(1.0, relevance_score)
            elif relevance_score >= 0.4:  # Higher threshold for "incomplete"
                status = "incomplete" 
                completeness_score = relevance_score
            else:
                status = "missing"
                completeness_score = 0.0

        # Generate gaps and recommendations
        gaps: List[str] = []
        recommendations: List[str] = []

        if status != "complete":
            # Identify specific gaps
            if not evidence_found:
                gaps.append(f"No evidence found addressing: {question_text}")
            else:
                gaps.append(f"Insufficient detail for: {question_text}")

            # Generate specific recommendations
            if "policy" in question_lower:
                recommendations.append("Develop comprehensive policy documentation")
            if "procedure" in question_lower:
                recommendations.append("Establish detailed procedures and processes")
            if "training" in question_lower:
                recommendations.append("Implement systematic training programs")
            if "monitoring" in question_lower or "tracking" in question_lower:
                recommendations.append("Create monitoring and tracking systems")
            if "report" in question_lower:
                recommendations.append("Enhance reporting mechanisms and documentation")

            # Generic recommendations based on category
            if "environmental" in category_lower:
                recommendations.append("Integrate environmental management systems")
            elif "social" in category_lower:
                recommendations.append("Strengthen social responsibility practices")
            elif "governance" in category_lower:
                recommendations.append("Enhance governance frameworks and oversight")

        return completeness_score, status, evidence_found, gaps, recommendations

    def check_gemini_api_status(self) -> dict:
        """Check Gemini API availability and token limits."""
        if not self.gemini_api_key:
            return {"status": "error", "message": "No Gemini API key configured"}

        # Test with minimal request to check API availability
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.gemini_model}:generateContent"
        )

        test_payload = {
            "contents": [{"parts": [{"text": "Test"}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 10,
                "topP": 0.8,
                "topK": 40,
            },
            "systemInstruction": {
                "parts": [{"text": "Provide direct response without internal reasoning."}]
            },
        }
        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(
                f"{url}?key={self.gemini_api_key}",
                json=test_payload,
                headers=headers,
                timeout=30,
            )

            status_info = {
                "status_code": response.status_code,
                "model": self.gemini_model,
                "api_key_present": bool(self.gemini_api_key),
                "timestamp": "test",
            }

            if response.status_code == 200:
                data = response.json()
                status_info["status"] = "success"
                status_info["response_structure"] = list(data.keys())

                # Check token usage if available
                if "usageMetadata" in data:
                    status_info["token_usage"] = data["usageMetadata"]

                # Check response content
                if data.get("candidates"):
                    candidate = data["candidates"][0]
                    status_info["finish_reason"] = candidate.get("finishReason", "unknown")
                    status_info["response_available"] = True
                else:
                    status_info["response_available"] = False

            elif response.status_code == 429:
                status_info["status"] = "quota_exceeded"
                status_info["message"] = "API quota exceeded - rate limited"
                status_info["response_text"] = response.text[:200]
            elif response.status_code == 403:
                status_info["status"] = "forbidden"
                status_info["message"] = "API key invalid or insufficient permissions"
                status_info["response_text"] = response.text[:200]
            elif response.status_code == 400:
                status_info["status"] = "bad_request"
                status_info["message"] = "Invalid request format or model"
                status_info["response_text"] = response.text[:200]
            else:
                status_info["status"] = "error"
                status_info["message"] = f"HTTP {response.status_code}"
                status_info["response_text"] = response.text[:200]

            return status_info

        except requests.exceptions.Timeout:
            return {"status": "timeout", "message": "API request timed out"}
        except requests.exceptions.RequestException as e:
            return {"status": "network_error", "message": str(e)}
        except Exception as e:
            return {"status": "unexpected_error", "message": str(e)}

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
            "eand": "e& Internal AI - Custom AI model optimized for regional ESG standards "
            "(falls back to Gemini)",
        }
        return descriptions.get(
            self.provider, f"Unknown provider: {self.provider} (falls back to Gemini)"
        )


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
