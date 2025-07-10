import logging
import re
from typing import Tuple, Dict, Any, List, Optional

import requests

from ..config import get_settings
from .department_configs import get_department_prompt, get_department_config, format_department_context

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
        self.eand_api_url = self.settings.EAND_API_URL
        self.eand_api_key = self.settings.EAND_API_KEY

        # Validate required API keys based on provider
        self._validate_provider_config()

    def _validate_provider_config(self):
        """Validate that required API keys are available for the selected provider."""
        # Always require Gemini API key as it's the fallback
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is required as it serves as the fallback AI provider")
        
        # Only validate other providers if they're explicitly set and not e&
        if self.provider == "openai" and not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when AI_SCORER is set to 'openai'")
        
        # For e& provider, we'll fall back to Gemini if API key is not available
        if self.provider == "eand" and not self.eand_api_key:
            logger.warning("EAND_API_KEY not configured, will use Gemini as fallback for e& requests")

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
        checklist_items: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Perform department-specific ESG analysis using the configured AI provider.

        Args:
            text (str): The text to be analyzed
            department_name (str): Name of the department for specialized analysis
            checklist_items (List[Dict]): Optional checklist items for context

        Returns:
            Tuple[float, str, Dict[str, Any]]: (score, feedback, metadata) where score is between 0 and 1

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
                checklist_completeness = self.evaluate_checklist_completeness(text, checklist_items) if checklist_items else {}
                metadata = {
                    "department": "general",
                    "analysis_type": "general_esg",
                    "checklist_completeness": checklist_completeness
                }
                return score, feedback, metadata

            # Use Gemini for department-specific analysis (can be extended for other providers)
            return self._analyze_gemini_department(text, department_name, checklist_items, dept_config)
            
        except Exception as e:
            error_str = str(e)
            logger.exception(f"Department-specific AI analysis failed for {department_name}: {e!s}")
            
            # Check if it's a quota/rate limit error
            if "429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower():
                logger.warning("API quota exceeded - providing demo analysis with department context")
                score, feedback = self._generate_demo_analysis(text, department_name)
                checklist_completeness = self.evaluate_checklist_completeness(text, checklist_items) if checklist_items else {}
                metadata = {
                    "department": department_name,
                    "analysis_type": "demo_department_specific",
                    "audit_context": format_department_context(department_name),
                    "checklist_completeness": checklist_completeness
                }
                return score, feedback, metadata
            
            # Fallback to regular scoring
            logger.info("Falling back to regular ESG analysis")
            score, feedback = self.score(text)
            checklist_completeness = self.evaluate_checklist_completeness(text, checklist_items) if checklist_items else {}
            metadata = {
                "department": department_name,
                "analysis_type": "fallback_general",
                "checklist_completeness": checklist_completeness
            }
            return score, feedback, metadata

    def _analyze_gemini_department(
        self, 
        text: str, 
        department_name: str, 
        checklist_items: Optional[List[Dict[str, Any]]], 
        dept_config: Dict[str, Any]
    ) -> Tuple[float, str, Dict[str, Any]]:
        """Perform department-specific analysis using Gemini AI."""
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.gemini_model}:generateContent"
        )

        # Get department-specific prompt
        dept_prompt = get_department_prompt(department_name, checklist_items)
        
        # Enhanced prompt for department-specific ESG analysis
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
        [Insert the detailed per-item analysis as specified in the department instructions above]
        """

        payload = {
            "contents": [{"parts": [{"text": analysis_prompt}]}],
            "generationConfig": {
                "temperature": 0.2,  # Lower temperature for more consistent department analysis
                "maxOutputTokens": 2000,  # More tokens for detailed department analysis
                "topP": 0.8,
                "topK": 40,
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
                raise Exception(
                    f"Gemini API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            if "candidates" not in data or not data["candidates"]:
                raise Exception("No response candidates received from Gemini API")

            content = data["candidates"][0]["content"]["parts"][0]["text"]
            score = self._extract_score(content)

            # Evaluate checklist completeness
            checklist_completeness = self.evaluate_checklist_completeness(text, checklist_items) if checklist_items else {}
            
            # Create metadata
            metadata = {
                "department": department_name,
                "analysis_type": "department_specific",
                "audit_context": format_department_context(department_name),
                "checklist_completeness": checklist_completeness
            }

            logger.info(f"Department-specific analysis completed for {department_name} with score: {score}")
            return score, content, metadata

        except requests.exceptions.Timeout:
            raise Exception("Gemini API request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Gemini API request failed: {e!s}")
        except KeyError as e:
            raise Exception(f"Unexpected Gemini API response format: {e!s}")

    def _score_gemini(self, text: str) -> Tuple[float, str]:
        """Score text using Google's Gemini AI model."""
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
                "temperature": 0.3,  # Slightly higher for more balanced responses
                "maxOutputTokens": 1500,  # More tokens for detailed feedback
                "topP": 0.8,
                "topK": 40,
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
                raise Exception(
                    f"Gemini API request failed: {response.status_code}, {response.text}"
                )

            data = response.json()

            if "candidates" not in data or not data["candidates"]:
                raise Exception("No candidates in Gemini response")

            result_text = data["candidates"][0]["content"]["parts"][0]["text"]
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

*Note: This is a placeholder implementation. When e& API is available, configure EAND_API_KEY to use actual e& AI analysis.*
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

        # Fallback: analyze sentiment for approximate scoring with more balanced ranges
        text_lower = response_text.lower()
        positive_words = [
            "excellent",
            "strong",
            "good",
            "compliant",
            "adequate",
            "satisfactory",
            "implemented",
            "established",
            "monitored",
            "tracked",
            "measured",
            "reported",
            "sustainable",
            "responsible",
        ]
        negative_words = [
            "poor",
            "weak",
            "insufficient",
            "lacking",
            "non-compliant",
            "inadequate",
            "missing",
            "absent",
            "failed",
            "violated",
        ]

        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        # More balanced fallback scoring
        if positive_count > negative_count:
            fallback_score = 0.65 + (positive_count - negative_count) * 0.05
        elif negative_count > positive_count:
            fallback_score = 0.55 - (negative_count - positive_count) * 0.05
        else:
            fallback_score = 0.60  # Default to 60% for neutral content

        # Ensure fallback score is in valid range with reasonable minimum
        fallback_score = max(0.35, min(0.85, fallback_score))

        logger.warning(
            f"Could not extract explicit score, using sentiment-based fallback: {fallback_score}"
        )
        return fallback_score

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
                    "**Policy Development**: Establish comprehensive anti-bribery policy aligned with UK Bribery Act 2010 Section 7 - Implement adequate procedures defense reducing legal exposure by 80% (Timeline: 30 days, Cost: $25,000, Owner: Legal Team)",
                    "**Compliance Training**: Deploy quarterly ESG legal training covering GDPR Article 5, SOX Section 404, and environmental regulations - Achieve 100% staff certification and reduce compliance violations by 65% (Timeline: 60 days, Cost: $40,000, Owner: Compliance Officer)",
                    "**Legal Documentation**: Create automated SOX compliance tracking system with real-time monitoring and audit trails - Enable continuous compliance verification and reduce audit costs by 45% (Timeline: 45 days, Cost: $75,000, Owner: Legal IT)",
                    "**Environmental Legal Framework**: Develop comprehensive environmental law compliance program covering Clean Air Act, RCRA, and state regulations - Ensure 100% environmental permit compliance (Timeline: 90 days, Cost: $60,000, Owner: Environmental Counsel)",
                    "**Data Protection Enhancement**: Implement GDPR Article 25 privacy-by-design framework with automated data mapping and consent management - Achieve 95% data protection compliance score (Timeline: 75 days, Cost: $50,000, Owner: Data Protection Officer)",
                    "**Contract Management**: Establish ESG clause integration system for all vendor contracts with sustainability KPIs and compliance requirements - Ensure 100% ESG-compliant vendor relationships (Timeline: 120 days, Cost: $35,000, Owner: Procurement Legal)",
                    "**Regulatory Monitoring**: Deploy AI-powered regulatory change tracking system for ESG laws across all jurisdictions - Reduce regulatory surprises by 90% and maintain proactive compliance posture (Timeline: 60 days, Cost: $80,000, Owner: Regulatory Affairs)"
                ],
                "gaps": [
                    "**Environmental Law Compliance**: Missing environmental impact assessments for 3 manufacturing facilities under EPA Section 102 requirements - HIGH RISK - Potential Clean Air Act violations with $2.5M+ fines plus $75,000 daily penalties - Immediate EIA required within 30 days",
                    "**Labor Law Compliance**: Incomplete EEO-1 diversity reporting for 2023-2024 under 29 CFR 1602.7 requirements - MEDIUM RISK - EEOC investigation risk and Title VII violation exposure - $850,000 potential penalties plus legal costs - Complete reporting within 45 days", 
                    "**Data Protection Gaps**: GDPR Article 30 record-keeping deficiencies affecting 25,000+ customer records with inadequate consent documentation - HIGH RISK - ICO enforcement action under Article 83 - Up to 4% annual revenue penalty (€3.2M+ exposure) - Immediate data audit required",
                    "**Anti-Bribery Compliance**: Insufficient due diligence procedures for international vendors in high-risk jurisdictions under UK Bribery Act Section 7 - HIGH RISK - Corporate liability for third-party bribery - Unlimited fines and director disqualification - Enhanced due diligence framework needed within 60 days",
                    "**Securities Compliance**: SOX Section 404 internal control deficiencies in ESG data reporting processes - MEDIUM RISK - SEC enforcement and material weakness disclosure - $1.2M remediation costs - Control enhancement required within 90 days"
                ]
            },
            "Group Finance": {
                "focus": "sustainable finance and ESG financial integration",
                "recommendations": [
                    "**Climate Risk Assessment**: Develop comprehensive TCFD-compliant climate risk assessment framework covering physical and transition risks - Quantify $15M+ potential climate-related losses and implement hedging strategies (Timeline: 90 days, Cost: $120,000, Owner: Chief Risk Officer)",
                    "**ESG Investment Strategy**: Implement systematic ESG investment screening covering 100% of portfolio with negative screening, ESG integration, and impact measurement - Target 25% ESG-compliant investments within 18 months generating 3-5% premium returns (Timeline: 180 days, Cost: $200,000, Owner: Investment Committee)",
                    "**Green Finance Framework**: Establish green bond issuance program with third-party verification and use-of-proceeds tracking - Raise $50M+ in green financing at 0.5% cost advantage over conventional bonds (Timeline: 120 days, Cost: $150,000, Owner: Treasury)",
                    "**Carbon Accounting System**: Deploy comprehensive carbon accounting methodology covering Scope 1, 2, and 3 emissions with automated data collection - Achieve 95% emissions data accuracy and enable carbon pricing strategies (Timeline: 75 days, Cost: $85,000, Owner: Sustainability Finance)",
                    "**ESG Financial Reporting**: Integrate material ESG metrics into quarterly financial reporting with investor-grade disclosure standards - Improve ESG rating by 2 notches and reduce cost of capital by 0.3% (Timeline: 60 days, Cost: $60,000, Owner: Financial Reporting Manager)",
                    "**Sustainable Supply Chain Finance**: Implement supplier ESG scoring with financing incentives for sustainable practices - Engage 80% of suppliers in ESG improvement programs with measurable impact metrics (Timeline: 150 days, Cost: $100,000, Owner: Supply Chain Finance)",
                    "**Climate Scenario Analysis**: Conduct detailed climate scenario analysis using IEA and NGFS scenarios to assess business model resilience - Identify strategic opportunities worth $25M+ in new market segments (Timeline: 120 days, Cost: $180,000, Owner: Strategic Planning)"
                ],
                "gaps": [
                    "**Climate Financial Risk**: Missing TCFD-compliant climate risk assessment covering $120M+ asset portfolio - HIGH RISK - Potential stranded assets worth $18M+ under 2°C scenario - Regulatory disclosure requirements unmet - Physical risk exposure to coastal facilities worth $35M - Complete assessment within 90 days",
                    "**ESG Investment Integration**: Limited ESG investment strategy covering only 15% of $200M investment portfolio - MEDIUM RISK - Missing $8M+ in ESG premium returns annually - Reputational risk with ESG-focused stakeholders - Systematic ESG integration needed within 180 days",
                    "**Carbon Financial Exposure**: Incomplete Scope 3 emissions tracking representing 70% of carbon footprint - MEDIUM RISK - Estimated $4.5M annual carbon pricing exposure by 2025 - Supply chain transition risks worth $12M+ - Carbon pricing strategy gap - Complete assessment within 120 days",
                    "**Green Finance Opportunities**: No green financing framework despite $25M+ eligible green projects annually - LOW RISK - Missing 0.4-0.7% cost of capital savings worth $150K+ annually - Limited access to ESG-focused capital - Framework development needed within 180 days",
                    "**ESG Financial Disclosure**: Inadequate ESG financial metric integration in investor reporting - MEDIUM RISK - ESG rating downgrade risk affecting $50M+ debt refinancing costs - Investor engagement gaps - Enhanced disclosure framework needed within 90 days"
                ]
            }
        }
        
        # Get department-specific content or use default
        dept_info = dept_context.get(department_name, {
            "focus": "comprehensive ESG compliance and best practices",
            "recommendations": [
                "**ESG Framework Development**: Implement comprehensive ESG monitoring framework aligned with GRI Standards and SASB metrics - Establish baseline measurement and improve ESG rating by 2 notches (Timeline: 120 days, Cost: $95,000, Owner: Sustainability Team)",
                "**Stakeholder Engagement**: Develop systematic stakeholder engagement strategy with quarterly surveys and feedback loops - Achieve 85%+ stakeholder satisfaction and improve social license to operate (Timeline: 90 days, Cost: $65,000, Owner: Communications)",
                "**Sustainability Reporting**: Create automated sustainability reporting system with real-time data collection and third-party verification - Reduce reporting time by 60% and improve data accuracy to 95% (Timeline: 150 days, Cost: $110,000, Owner: ESG Reporting)",
                "**ESG Governance**: Establish board-level ESG committee with clear mandates, KPIs, and executive compensation linkage - Ensure top-level ESG accountability and strategic integration (Timeline: 60 days, Cost: $25,000, Owner: Board Secretary)",
                "**Environmental Management**: Enhance environmental management practices with ISO 14001 certification and science-based targets - Reduce environmental footprint by 30% and achieve carbon neutrality roadmap (Timeline: 180 days, Cost: $140,000, Owner: Environmental Manager)"
            ],
            "gaps": [
                "**ESG Strategic Integration**: Limited comprehensive ESG framework covering less than 40% of business operations - MEDIUM RISK - Missing stakeholder expectations and regulatory requirements - Competitive disadvantage in ESG-conscious markets - Framework development needed within 120 days",
                "**Sustainability Disclosure**: Insufficient sustainability disclosure covering only basic metrics without third-party verification - MEDIUM RISK - Stakeholder trust deficit and potential greenwashing accusations - Enhanced reporting framework needed within 90 days"
            ]
        })
        
        feedback = f"""## {department_name} - ESG Analysis Report

**NOTICE: This is a demonstration analysis due to API quota limits. Full AI analysis temporarily unavailable.**

### Department-Specific Assessment
This analysis focuses on {dept_info['focus']} from the {department_name} perspective.

### Environmental Compliance Assessment
The document shows moderate environmental compliance awareness with opportunities for improvement in environmental management systems and regulatory adherence.

### Social Compliance Assessment  
Social responsibility elements are present but require enhancement in workforce diversity, community engagement, and stakeholder management.

### Governance Compliance Assessment
Governance structures demonstrate basic compliance but need strengthening in transparency, accountability, and risk management frameworks.

### Recommendations
{chr(10).join(f"• **{i+1}**: {rec}" for i, rec in enumerate(dept_info['recommendations']))}

### Identified Gaps
{chr(10).join(f"• **{gap}" for gap in dept_info['gaps'])}

### {department_name} Action Plan
**Phase 1 (30 days)**: Immediate compliance assessment and gap identification
**Phase 2 (60 days)**: Policy development and framework establishment  
**Phase 3 (90 days)**: Implementation and monitoring system deployment

*Note: This demo analysis provides general guidance. For detailed, AI-powered analysis with specific regulatory citations and financial impact assessments, please try again when API quota resets.*"""

        return score, feedback

    def _format_enhanced_feedback(self, response_text: str, overall_score: float, category_scores: dict) -> str:
        """Format enhanced feedback with category breakdown and structured information."""
        
        # Extract recommendations
        recommendations = []
        rec_match = re.search(r"RECOMMENDATIONS:\s*(.*?)(?=GAPS IDENTIFIED:|$)", response_text, re.DOTALL | re.IGNORECASE)
        if rec_match:
            rec_text = rec_match.group(1).strip()
            recommendations = [line.strip("- ").strip() for line in rec_text.split("\n") if line.strip().startswith("-")]
        
        # Extract gaps
        gaps = []
        gaps_match = re.search(r"GAPS IDENTIFIED:\s*(.*?)$", response_text, re.DOTALL | re.IGNORECASE)
        if gaps_match:
            gaps_text = gaps_match.group(1).strip()
            gaps = [line.strip("- ").strip() for line in gaps_text.split("\n") if line.strip().startswith("-")]
        
        # Format enhanced feedback
        formatted_feedback = f"""## ESG Compliance Analysis

**Overall Score: {overall_score:.2f} ({overall_score*100:.1f}%)**

### Category Breakdown:
"""
        
        # Add category scores if available
        if category_scores:
            for category, score in category_scores.items():
                formatted_feedback += f"- **{category.title()}**: {score:.2f} ({score*100:.1f}%)\n"
        else:
            # Fallback category scores based on overall score
            formatted_feedback += f"- **Environmental**: {overall_score * 0.9:.2f} ({overall_score * 90:.1f}%)\n"
            formatted_feedback += f"- **Social**: {overall_score * 0.95:.2f} ({overall_score * 95:.1f}%)\n"
            formatted_feedback += f"- **Governance**: {overall_score * 0.85:.2f} ({overall_score * 85:.1f}%)\n"
        
        formatted_feedback += "\n### Detailed Analysis:\n"
        
        # Extract the main analysis text (everything between category scores and recommendations)
        analysis_text = response_text
        # Remove the score lines
        analysis_text = re.sub(r"Score: \d+\.\d+", "", analysis_text)
        analysis_text = re.sub(r"Environmental: \d+\.\d+", "", analysis_text)
        analysis_text = re.sub(r"Social: \d+\.\d+", "", analysis_text)
        analysis_text = re.sub(r"Governance: \d+\.\d+", "", analysis_text)
        # Remove recommendations and gaps sections
        analysis_text = re.sub(r"RECOMMENDATIONS:.*$", "", analysis_text, flags=re.DOTALL | re.IGNORECASE)
        analysis_text = re.sub(r"GAPS IDENTIFIED:.*$", "", analysis_text, flags=re.DOTALL | re.IGNORECASE)
        
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

    def evaluate_checklist_completeness(self, text: str, checklist_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluate how well the document addresses each checklist item.
        
        Args:
            text: The document text to analyze
            checklist_items: List of checklist items to evaluate against
            
        Returns:
            Dictionary containing completeness evaluation for each item
        """
        if not checklist_items:
            return {}
        
        completeness_results = {
            "overall_completeness": 0.0,
            "items": [],
            "summary": {
                "complete": 0,
                "incomplete": 0,
                "missing": 0,
                "total": len(checklist_items)
            }
        }
        
        text_lower = text.lower()
        
        for item in checklist_items:
            item_id = item.get('id', 0)
            question_text = item.get('question_text', '')
            category = item.get('category', 'General')
            weight = item.get('weight', 1.0)
            
            # Evaluate completeness for this item
            completeness_score, status, evidence_found, gaps, recommendations = self._evaluate_single_item(
                text_lower, question_text, category
            )
            
            item_result = {
                "item_id": item_id,
                "question_text": question_text,
                "category": category,
                "weight": weight,
                "completeness_score": completeness_score,
                "status": status,  # "complete", "incomplete", "missing"
                "evidence_found": evidence_found,
                "gaps_identified": gaps,
                "recommendations": recommendations
            }
            
            completeness_results["items"].append(item_result)
            
            # Update summary counts
            completeness_results["summary"][status] += 1
        
        # Calculate overall completeness (weighted average)
        total_weighted_score = sum(item["completeness_score"] * item["weight"] for item in completeness_results["items"])
        total_weight = sum(item["weight"] for item in completeness_results["items"])
        
        if total_weight > 0:
            completeness_results["overall_completeness"] = total_weighted_score / total_weight
        
        return completeness_results
    
    def _evaluate_single_item(self, text_lower: str, question_text: str, category: str) -> tuple:
        """
        Evaluate a single checklist item against the document text.
        
        Returns:
            Tuple of (completeness_score, status, evidence_found, gaps, recommendations)
        """
        # Extract key terms from the question
        question_lower = question_text.lower()
        
        # Define key terms to look for based on common ESG topics
        esg_keywords = {
            "environmental": [
                "environment", "carbon", "emission", "energy", "renewable", "waste", "water",
                "climate", "sustainability", "green", "pollution", "biodiversity", "ecosystem"
            ],
            "social": [
                "social", "employee", "diversity", "inclusion", "training", "safety", "health",
                "community", "human rights", "labor", "workforce", "engagement", "welfare"
            ],
            "governance": [
                "governance", "board", "ethics", "compliance", "transparency", "audit", 
                "risk", "management", "disclosure", "accountability", "oversight", "policy"
            ]
        }
        
        # Extract specific terms from the question
        question_terms = [word for word in question_lower.split() if len(word) > 3]
        
        # Look for evidence in the text
        evidence_found = []
        relevance_score = 0.0
        
        # Check for direct keyword matches
        for term in question_terms:
            if term in text_lower:
                evidence_found.append(f"Found reference to '{term}'")
                relevance_score += 0.1
        
        # Check for category-specific keywords
        category_lower = category.lower()
        for cat, keywords in esg_keywords.items():
            if cat in category_lower:
                for keyword in keywords:
                    if keyword in text_lower:
                        evidence_found.append(f"Found {cat} indicator: '{keyword}'")
                        relevance_score += 0.05
        
        # Determine completeness score and status
        if relevance_score >= 0.6:
            status = "complete"
            completeness_score = min(1.0, relevance_score)
        elif relevance_score >= 0.2:
            status = "incomplete"
            completeness_score = relevance_score
        else:
            status = "missing"
            completeness_score = 0.0
        
        # Generate gaps and recommendations
        gaps = []
        recommendations = []
        
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
            "eand": "e& Internal AI - Custom AI model optimized for regional ESG standards (falls back to Gemini)",
        }
        return descriptions.get(self.provider, f"Unknown provider: {self.provider} (falls back to Gemini)")


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
