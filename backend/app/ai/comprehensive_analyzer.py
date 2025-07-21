"""
Comprehensive ESG Analysis Engine
Handles unified scoring, category analysis, and recommendations generation.
Integrates with existing AIScorer to provide consistent backend processing.
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from .department_configs import format_department_context
from .scorer import AIScorer

logger = logging.getLogger(__name__)


class ComprehensiveESGAnalyzer:
    """
    Unified ESG analysis engine that processes documents comprehensively
    and generates consistent scoring across all categories.
    Uses existing AIScorer infrastructure with NO fallbacks or mock data.
    """

    def __init__(self):
        self.scorer = AIScorer()

    def analyze_document(
        self,
        document_text: str,
        department_name: str,
        filename: str,
        checklist_items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Perform comprehensive ESG analysis with unified scoring.

        Args:
            document_text: The document content to analyze
            department_name: Department context for analysis
            filename: Original filename for context
            checklist_items: Optional checklist items for completeness analysis

        Returns:
            Dict containing unified analysis results with consistent scoring
        """
        logger.info(
            f"Starting comprehensive ESG analysis for {filename} (department: {department_name})"
        )

        if not document_text or not document_text.strip():
            raise ValueError("Document text cannot be empty")

        if not department_name:
            raise ValueError("Department name is required")

        try:
            # Use existing AIScorer analyze_by_department method
            # This already provides score, feedback, and metadata with checklist completeness
            score, feedback, metadata = self.scorer.analyze_by_department(
                document_text, department_name, checklist_items
            )

            # The existing scorer already provides:
            # - Consistent scoring (0.0 to 1.0)
            # - Department-specific analysis
            # - Checklist completeness (if checklist_items provided)
            # - Compliance indicators
            # - Category scores

            # Format the response to match the expected frontend structure
            comprehensive_result = {
                "analysis_id": None,  # Will be set by the API endpoint
                "score": score,
                "feedback": feedback,
                "processing_time_ms": None,  # Will be set by the API endpoint
                "created_at": datetime.now().isoformat(),
                "model_version": self.scorer.provider,
                "file_info": {
                    "filename": filename,
                    "file_size": len(document_text.encode("utf-8")),
                    "uploaded_at": datetime.now().isoformat(),
                },
                "checklist_info": {
                    "id": None,
                    "title": f"ESG Checklist - {department_name}",
                    "description": f"Department-specific ESG analysis for {department_name}",
                },
                "metadata": self._format_metadata(
                    metadata, department_name, filename, score, feedback, document_text
                ),
            }

            logger.info(f"Comprehensive analysis completed - Overall Score: {score:.3f}")
            return comprehensive_result

        except Exception as e:
            logger.exception(f"Comprehensive analysis failed: {e!s}")
            raise

    def _format_metadata(
        self,
        scorer_metadata: Dict[str, Any],
        department_name: str,
        filename: str,
        score: float,
        feedback: str,
        document_text: str,
    ) -> Dict[str, Any]:
        """
        Format metadata from AIScorer into the expected frontend structure.
        Uses only real data from the AI analysis - no fallbacks or mock data.
        """
        # Start with the existing metadata from the scorer
        formatted_metadata = {
            "department": department_name,
            "analysis_type": "comprehensive",
            "audit_context": format_department_context(department_name),
        }

        # Add existing metadata from scorer
        if scorer_metadata:
            formatted_metadata.update(scorer_metadata)

        # Extract category scores from existing metadata or AI response
        category_scores = self._extract_category_scores(scorer_metadata, score)
        formatted_metadata["category_scores"] = category_scores

        # Extract recommendations from AI feedback
        recommendations = self._extract_recommendations_from_feedback(feedback)
        formatted_metadata["recommendations"] = recommendations

        # Extract gaps from AI feedback
        gaps = self._extract_gaps_from_feedback(feedback)
        formatted_metadata["gaps"] = gaps

        # Use existing checklist completeness if available, otherwise generate proper completeness
        if scorer_metadata and scorer_metadata.get("checklist_completeness"):
            formatted_metadata["checklist_completeness"] = scorer_metadata["checklist_completeness"]
        else:
            # Extract questionnaire from document and evaluate proper completeness
            formatted_metadata["checklist_completeness"] = self._evaluate_document_completeness(
                document_text, filename
            )

        # Generate ESG alignment analysis from AI feedback
        esg_alignment = self._analyze_esg_alignment_from_feedback(feedback, filename)
        formatted_metadata["esg_alignment"] = esg_alignment

        # Use existing compliance indicators from scorer
        if scorer_metadata and scorer_metadata.get("compliance_indicators"):
            formatted_metadata["compliance_indicators"] = scorer_metadata["compliance_indicators"]
        else:
            # Generate compliance indicators only if not provided by scorer
            completeness = formatted_metadata.get("checklist_completeness", {})
            formatted_metadata["compliance_indicators"] = self._generate_compliance_indicators(
                completeness, score
            )

        return formatted_metadata

    def _extract_category_scores(
        self, metadata: Dict[str, Any], overall_score: float
    ) -> Dict[str, float]:
        """
        Extract category scores from existing metadata or AI feedback.
        Uses the existing _generate_category_scores method from AIScorer.
        """
        # Check if category scores are already in metadata
        if metadata and metadata.get("category_scores"):
            return metadata["category_scores"]

        # Use the existing method from AIScorer to generate category scores
        checklist_completeness = metadata.get("checklist_completeness", {}) if metadata else {}
        return self.scorer._generate_category_scores(checklist_completeness, overall_score)

    def _extract_recommendations_from_feedback(self, feedback: str) -> List[str]:
        """
        Extract recommendations from AI feedback using robust patterns.
        Returns empty list if no recommendations found - no fallbacks.
        """
        if not feedback:
            return []

        recommendations = []

        # Try multiple patterns to extract recommendations
        patterns = [
            r"RECOMMENDATIONS?[:\s]*(.*?)(?=GAPS?|IMPROVEMENTS?|COMPLIANCE|ESG|$)",
            r"### RECOMMENDATIONS?[:\s]*(.*?)(?=###|$)",
            r"Recommendations?[:\s]*(.*?)(?=\n\n|\n##|\nGAPS|$)",
            r"ACTIONS?[:\s]*(.*?)(?=GAPS?|IMPROVEMENTS?|$)",
        ]

        for pattern in patterns:
            match = re.search(pattern, feedback, re.DOTALL | re.IGNORECASE)
            if match:
                rec_text = match.group(1).strip()
                # Extract bullet points and numbered items
                lines = rec_text.split("\n")
                for rec_line in lines:
                    rec_line = rec_line.strip()
                    if rec_line and (rec_line.startswith(("-", "•", "*")) or re.match(r"^\d+\.", rec_line)):
                        # Clean up the recommendation text
                        clean_rec = re.sub(r"^[-•*\d\.]\s*", "", rec_line).strip()
                        if (
                            clean_rec and len(clean_rec) > 10
                        ):  # Minimum length for meaningful recommendation
                            recommendations.append(clean_rec)
                if recommendations:
                    break

        # If no structured recommendations found, try to extract from general text
        if not recommendations:
            # Look for sentences with recommendation keywords
            sentences = re.split(r'[.!?]+', feedback)
            for sentence in sentences:
                sentence = sentence.strip()
                if any(keyword in sentence.lower() for keyword in ['recommend', 'suggest', 'should', 'consider', 'improve', 'enhance', 'implement', 'develop', 'establish', 'strengthen']):
                    if len(sentence) > 20 and len(sentence) < 200:  # Reasonable length
                        recommendations.append(sentence)
                        if len(recommendations) >= 8:
                            break

        return recommendations[:8]  # Limit to 8 recommendations

    def _extract_gaps_from_feedback(self, feedback: str) -> List[str]:
        """
        Extract gaps from AI feedback using robust patterns.
        Returns empty list if no gaps found - no fallbacks.
        """
        if not feedback:
            return []

        gaps = []

        # Try multiple patterns to extract gaps
        patterns = [
            r"GAPS?\s+IDENTIFIED[:\s]*(.*?)(?=RECOMMENDATIONS?|IMPROVEMENTS?|$)",
            r"GAPS?[:\s]*(.*?)(?=RECOMMENDATIONS?|IMPROVEMENTS?|$)",
            r"### GAPS?[:\s]*(.*?)(?=###|$)",
            r"IMPROVEMENTS?[:\s]*(.*?)(?=RECOMMENDATIONS?|$)",
            r"DEFICIENCIES[:\s]*(.*?)(?=RECOMMENDATIONS?|$)",
            r"WEAKNESSES[:\s]*(.*?)(?=RECOMMENDATIONS?|$)",
            r"AREAS?\s+FOR\s+IMPROVEMENT[:\s]*(.*?)(?=RECOMMENDATIONS?|$)",
        ]

        for pattern in patterns:
            match = re.search(pattern, feedback, re.DOTALL | re.IGNORECASE)
            if match:
                gap_text = match.group(1).strip()
                # Extract bullet points and numbered items
                lines = gap_text.split("\n")
                for gap_line in lines:
                    gap_line = gap_line.strip()
                    if gap_line and (gap_line.startswith(("-", "•", "*")) or re.match(r"^\d+\.", gap_line)):
                        # Clean up the gap text
                        clean_gap = re.sub(r"^[-•*\d\.]\s*", "", gap_line).strip()
                        if clean_gap and len(clean_gap) > 10:  # Minimum length for meaningful gap
                            gaps.append(clean_gap)
                if gaps:
                    break

        # If no structured gaps found, try to extract from general text
        if not gaps:
            # Look for sentences with gap/issue keywords
            sentences = re.split(r'[.!?]+', feedback)
            for sentence in sentences:
                sentence = sentence.strip()
                if any(keyword in sentence.lower() for keyword in ['lack', 'missing', 'insufficient', 'limited', 'weak', 'poor', 'gap', 'issue', 'problem', 'deficiency', 'absence']):
                    if len(sentence) > 20 and len(sentence) < 200:  # Reasonable length
                        gaps.append(sentence)
                        if len(gaps) >= 6:
                            break

        return gaps[:6]  # Limit to 6 gaps

    def _analyze_esg_alignment_from_feedback(self, feedback: str, filename: str) -> Dict[str, str]:
        """
        Analyze ESG alignment from AI feedback.
        Returns basic analysis structure - no fallbacks or mock data.
        """
        if not feedback:
            return {
                "net_zero_alignment": "No climate alignment analysis available",
                "digital_inclusion": "No digital inclusion analysis available",
                "regulatory_compliance": "No regulatory compliance analysis available",
            }

        feedback_lower = feedback.lower()

        # Extract actual mentions from feedback
        climate_mentioned = any(
            term in feedback_lower
            for term in ["climate", "carbon", "emission", "net zero", "renewable", "environmental"]
        )

        digital_mentioned = any(
            term in feedback_lower
            for term in ["digital", "technology", "innovation", "accessibility", "inclusion"]
        )

        regulatory_mentioned = any(
            term in feedback_lower
            for term in ["compliance", "regulation", "legal", "standard", "regulatory"]
        )

        return {
            "net_zero_alignment": (
                f"Climate-related content identified in {filename}"
                if climate_mentioned
                else "No climate-related content identified"
            ),
            "digital_inclusion": (
                f"Digital/technology content identified in {filename}"
                if digital_mentioned
                else "No digital inclusion content identified"
            ),
            "regulatory_compliance": (
                f"Regulatory compliance content identified in {filename}"
                if regulatory_mentioned
                else "No regulatory compliance content identified"
            ),
        }

    def _evaluate_document_completeness(
        self, document_text: str, filename: str
    ) -> Dict[str, Any]:
        """
        Evaluate checklist completeness based on the actual questionnaire structure
        found in the document. Extracts questions from the document and evaluates
        how well they are addressed.
        """
        logger.info(f"Evaluating document completeness for {filename}")

        # Extract questionnaire items from the document
        questionnaire_items = self._extract_questionnaire_items(document_text)

        if not questionnaire_items:
            logger.warning("No questionnaire items found in document")
            return {
                "total": 0,
                "completed": 0,
                "completion_rate": 0.0,
                "items": [],
                "summary": {"complete": 0, "incomplete": 0, "missing": 0, "total": 0},
            }

        # Use the existing AIScorer completeness evaluation
        completeness_result = self.scorer.evaluate_checklist_completeness(
            document_text, questionnaire_items
        )

        # Ensure the result matches the expected frontend structure
        total_items = len(questionnaire_items)
        completed_items = completeness_result.get("summary", {}).get("complete", 0)

        # Create items array with proper structure for frontend
        items = []
        for item_result in completeness_result.get("items", []):
            items.append(
                {
                    "id": str(item_result.get("item_id", 0)),
                    "question": item_result.get("question_text", ""),
                    "status": item_result.get("status", "Missing").title(),
                    "evidence_found": item_result.get("evidence_found", []),
                    "completeness_score": item_result.get("completeness_score", 0.0),
                    "weight": item_result.get("weight", 1.0),
                    "recommendations": item_result.get("recommendations", []),
                }
            )

        result = {
            "total": total_items,
            "completed": completed_items,
            "completion_rate": completeness_result.get("completion_rate", 0.0),
            "items": items,
            "summary": completeness_result.get(
                "summary",
                {
                    "complete": completed_items,
                    "incomplete": completeness_result.get("summary", {}).get("incomplete", 0),
                    "missing": completeness_result.get("summary", {}).get("missing", 0),
                    "total": total_items,
                },
            ),
        }

        # Verify that counts add up properly
        actual_total = (
            result["summary"]["complete"]
            + result["summary"]["incomplete"]
            + result["summary"]["missing"]
        )
        if actual_total != total_items:
            logger.warning(
                f"Completeness count mismatch: expected {total_items}, got {actual_total}"
            )

        logger.info(
            f"Document completeness evaluation completed: {completed_items}/{total_items} complete"
        )
        return result

    def _extract_questionnaire_items(self, document_text: str) -> List[Dict[str, Any]]:
        """
        Dynamically extract ALL questionnaire items from the document.
        Adapts to any number of questions and handles follow-up questions.
        No hardcoded limits - discovers all questions automatically.
        """
        questionnaire_items = []
        seen_references = set()  # Track duplicates by reference code, not question text

        # Log sample of document text for debugging
        sample_text = document_text[:500] if document_text else ""
        logger.info(f"Document text sample (first 500 chars): {sample_text}")

        lines = document_text.split("\n")
        item_counter = 0

        for line_num, original_line in enumerate(lines, 1):
            line = original_line.strip()
            if not line:
                continue

            # Dynamic question detection - look for multiple patterns
            question_data = self._extract_question_from_line(line, line_num)

            if question_data:
                question_text = question_data["question_text"]
                reference_code = question_data.get("reference", "")

                # Skip if too short or duplicate reference
                if len(question_text) < 8:
                    continue

                # Check for duplicate reference codes instead of question text
                # This allows multiple questions with same text but different references
                if reference_code and reference_code.lower() in seen_references:
                    continue

                if reference_code:
                    seen_references.add(reference_code.lower())
                item_counter += 1

                # Determine category - check original line first for context
                category = self._categorize_question_dynamic(question_text, original_line)

                questionnaire_items.append(
                    {
                        "id": item_counter,
                        "question_text": question_text,
                        "category": category,
                        "weight": 1.0,
                        "question_number": question_data.get("reference", str(item_counter)),
                        "line_number": line_num,
                        "original_text": original_line.strip(),
                        "reference_code": question_data.get("reference"),
                        "is_follow_up": question_data.get("is_follow_up", False),
                        "parent_question": question_data.get("parent_reference"),
                    }
                )
                logger.debug(f"Extracted question {item_counter}: {question_text[:80]}...")

        logger.info(f"Extracted {len(questionnaire_items)} questionnaire items from document")
        return questionnaire_items

    def _extract_question_from_line(self, line: str, line_num: int) -> Optional[Dict[str, Any]]:
        """
        Extract question data from a single line dynamically.
        Handles various question formats and reference codes.
        """
        # Skip obvious non-question content
        if self._is_section_header(line) or self._is_excel_metadata(line):
            return None

        # Look for ESG reference codes (ESG-Environment-01a:, etc.)
        reference_match = re.search(
            r"(ESG-(Environment|Social|Governance)-\d+[a-z]?):", line, re.IGNORECASE
        )

        # Must have either a question mark OR a reference code to be considered a question
        has_question_mark = "?" in line
        has_reference = reference_match is not None

        if not (has_question_mark or has_reference):
            return None

        # Extract the actual question text
        question_text = self._extract_clean_question_from_line(line)

        if not question_text or len(question_text) < 8:
            return None

        # Determine if this is a follow-up question (ends with 'b', 'c', etc.)
        is_follow_up = False
        parent_reference = None
        reference_code = None

        if reference_match:
            reference_code = reference_match.group(1)
            if re.search(r"[b-z]$", reference_code, re.IGNORECASE):
                is_follow_up = True
                # Get parent reference (remove the letter suffix)
                parent_reference = re.sub(r"[b-z]$", "a", reference_code, flags=re.IGNORECASE)

        return {
            "question_text": question_text,
            "reference": reference_code,
            "is_follow_up": is_follow_up,
            "parent_reference": parent_reference,
            "line_number": line_num,
            "has_question_mark": has_question_mark
        }

    def _extract_clean_question_from_line(self, line: str) -> str:
        """
        Extract and clean the actual question text from a line.
        Handles Excel row format: Category | SubCategory | Reference | Question | Mandatory
        """
        # Split the line into parts
        parts = line.split()

        # Look for the question part after reference code
        question_parts = []
        found_reference = False

        for i, part in enumerate(parts):
            # If we find a reference code, question starts after it
            if re.match(r"ESG-(Environment|Social|Governance)-\d+[a-z]?:", part, re.IGNORECASE):
                found_reference = True
                # Collect everything after the reference code
                remaining_parts = parts[i+1:]
                # Remove trailing "Mandatory" or "Optional" if present
                if remaining_parts and remaining_parts[-1].lower() in ["mandatory", "optional"]:
                    remaining_parts = remaining_parts[:-1]
                question_parts = remaining_parts
                break

        # If no reference found, look for question-like content
        if not found_reference:
            # Look for question words to identify the start
            question_start = -1
            for i, part in enumerate(parts):
                question_words = [
                    "is", "does", "do", "are", "has", "have", "what", "how", 
                    "when", "where", "why", "which", "who"
                ]
                if part.lower() in question_words:
                    question_start = i
                    break

            if question_start >= 0:
                question_parts = parts[question_start:]
                # Remove trailing "Mandatory" or "Optional"
                if question_parts and question_parts[-1].lower() in ["mandatory", "optional"]:
                    question_parts = question_parts[:-1]

        # If still no question parts found, use the whole line if it has a question mark
        if not question_parts and "?" in line:
            question_parts = parts
            # Remove obvious non-question words from start
            excluded_words = [
                "environment", "social", "governance", "energy", "emissions", "water", "waste"
            ]
            while question_parts and question_parts[0].lower() in excluded_words:
                question_parts = question_parts[1:]
            # Remove trailing metadata
            if question_parts and question_parts[-1].lower() in ["mandatory", "optional"]:
                question_parts = question_parts[:-1]

        if not question_parts:
            return ""

        question_text = " ".join(question_parts)

        # Final cleanup
        question_text = re.sub(r"\s+", " ", question_text).strip()

        # Ensure proper capitalization
        if question_text and not question_text[0].isupper():
            question_text = question_text[0].upper() + question_text[1:]

        return question_text

    def _categorize_question_dynamic(self, question_text: str, original_line: str) -> str:
        """
        Dynamically categorize questions using both question text and original line context.
        """
        # First, check if the original line contains explicit category information
        original_lower = original_line.lower()

        if "environment" in original_lower:
            return "Environmental"
        if "social" in original_lower:
            return "Social"
        if "governance" in original_lower:
            return "Governance"

        # Fall back to keyword-based categorization
        return self._categorize_question(question_text)

    def _is_potential_question(self, line: str) -> bool:
        """
        Determine if a line contains a potential question or checklist item.
        Uses comprehensive patterns to catch ALL possible questions.
        """
        line_lower = line.lower()

        # Skip obvious section headers (all caps, short lines, etc.)
        if self._is_section_header(line):
            return False

        # Skip Excel header rows and metadata
        if self._is_excel_metadata(line):
            return False

        # Direct question indicators
        if "?" in line:
            return True

        # Numbered or lettered items
        numbered_pattern = re.match(r"^\s*[0-9]+[\.\)\:\-\s]", line)
        lettered_pattern = re.match(r"^\s*[a-z][\.\)\:\-\s]", line, re.IGNORECASE)
        if numbered_pattern or lettered_pattern:
            return True

        # Bullet points and list markers
        if re.match(r"^\s*[\-\*\•\►\→\▪\▫]", line):
            return True

        # Question words at start
        question_starters = [
            "does", "do", "is", "are", "has", "have", "will", "would", "could", "should",
            "can", "may", "might", "must", "shall", "what", "when", "where", "why", "how",
            "which", "who", "whom", "whose"
        ]
        first_word = line_lower.split()[0] if line_lower.split() else ""
        if first_word in question_starters:
            return True

        # Action verbs that indicate requirements
        action_patterns = [
            "describe", "explain", "outline", "detail", "specify", "identify", "list",
            "provide", "include", "contain", "cover", "address", "discuss", "consider",
            "evaluate", "assess", "analyze", "review", "examine", "investigate",
            "establish", "define", "demonstrate", "evidence", "confirm", "verify",
            "validate", "ensure", "implement", "develop", "maintain", "measure",
            "monitor", "report", "disclose"
        ]
        if any(action in line_lower for action in action_patterns):
            return True

        # ESG-specific terms that often appear in questions
        esg_terms = [
            "policy", "procedure", "process", "system", "governance", "compliance",
            "management", "assessment", "monitoring", "reporting", "disclosure", "risk",
            "esg", "environment", "social", "carbon", "emission", "climate", "energy",
            "waste", "employee", "stakeholder", "board", "committee", "audit", "control",
            "training", "documentation", "standard", "framework", "program", "initiative",
            "strategy", "plan", "target", "objective", "metric", "indicator", "performance",
            "impact", "sustainable", "sustainability", "diversity", "inclusion", "safety",
            "ethics", "transparency", "accountability"
        ]
        if any(term in line_lower for term in esg_terms):
            return True

        # Requirements or compliance language
        requirement_patterns = [
            "required", "mandatory", "must", "shall", "need to", "ensure that",
            "comply with", "accordance with", "in line with", "meets the", "satisfies",
            "fulfills", "adheres to", "conforms to"
        ]
        if any(pattern in line_lower for pattern in requirement_patterns):
            return True

        # Conditional statements that often appear in checklists
        conditional_words = ["if", "when", "unless", "provided that", "where applicable"]
        return any(cond in line_lower for cond in conditional_words)

    def _is_section_header(self, line: str) -> bool:
        """
        Identify section headers that should not be treated as questions.
        Now includes subtitle detection for Excel format.
        """
        line_stripped = line.strip()

        # Skip empty lines
        if not line_stripped:
            return True

        # All caps headers (but allow some mixed case)
        if line_stripped.isupper() and len(line_stripped.split()) <= 8:
            return True

        # Common section header patterns
        header_patterns = [
            r"^[A-Z\s]+SECTION$",
            r"^SECTION\s+[A-Z0-9]+",
            r"^[A-Z\s]*(QUESTIONNAIRE|CHECKLIST|ASSESSMENT|REQUIREMENTS|COMPLIANCE)$",
            r"^[A-Z\s]*-\s*[A-Z\s]+$",  # Like "ESG - Environmental"
            r"^\s*={3,}.*={3,}\s*$",     # Surrounded by equals signs
            r"^\s*-{3,}.*-{3,}\s*$",     # Surrounded by dashes
        ]

        for pattern in header_patterns:
            if re.match(pattern, line_stripped, re.IGNORECASE):
                return True

        # Very short lines that are likely headers
        if len(line_stripped.split()) <= 2 and line_stripped.isupper():
            return True

        # Lines that are just numbers or letters (section markers)
        if re.match(r"^\s*[A-Z0-9]+\s*$", line_stripped):
            return True

        # Excel-specific subtitle detection
        # These are subtitles like "Energy", "Environment", "Ethical AI", etc.
        subtitles = [
            "energy", "emissions", "water", "waste", "climate risk", "social risk", 
            "carbon offsetting", "environment", "diversity,equity & inclusion",
            "health and safety", "learning and development", "community engagement",
            "consumer rights", "consumer segmentation", "consumer profiling",
            "governance", "management and leadership", "risk management and control environment",
            "reporting", "ethical ai", "data integrity", "procurement"
        ]
        
        if line_stripped.lower() in subtitles:
            return True

        return False

    def _is_excel_metadata(self, line: str) -> bool:
        """
        Identify Excel metadata and header rows that should not be treated as questions.
        Specifically for the ESG Internal Audit Checklist format.
        """
        line_stripped = line.strip()

        # Skip empty lines
        if not line_stripped:
            return True

        # Skip obvious column headers
        excel_headers = [
            "category sub category reference question mandatory",
            "category sub category reference question",
            "mandatory or optional",
            "assessment notes",
            "reference question mandatory",
            "sub category reference",
        ]

        line_normalized = re.sub(r"\s+", " ", line_stripped.lower())
        for header in excel_headers:
            if header in line_normalized:
                return True

        # Skip lines that are just category names without questions
        if re.match(r"^(environment|social|governance)\s*$", line_stripped, re.IGNORECASE):
            return True

        # Skip reference codes without questions (like "ESG-Environment-01a:")
        esg_ref_pattern = r"^ESG-(Environment|Social|Governance)-\d+[a-z]?:\s*$"
        if re.match(esg_ref_pattern, line_stripped, re.IGNORECASE):
            return True

        # Skip lines that are just "Mandatory" or "Optional"
        if re.match(r"^(mandatory|optional)\s*$", line_stripped, re.IGNORECASE):
            return True

        # Skip very short non-descriptive lines
        if len(line_stripped.split()) <= 2 and "?" not in line_stripped:
            common_short_terms = [
                "yes", "no", "n/a", "none", "na", "environment", "social", "governance"
            ]
            if line_stripped.lower() in common_short_terms:
                return True

        return False

    def _clean_question_text(self, line: str) -> str:
        """
        Clean and normalize question text for consistency.
        Optimized for Excel ESG checklist format.
        """
        # Start with the original line
        text = line.strip()

        # For Excel format, extract just the question part if it's a full row
        # Format: "Category SubCategory Reference Question Mandatory/Optional"
        parts = text.split()
        if len(parts) >= 3:
            # Look for the question part (usually after the reference code)
            question_start = -1
            for i, part in enumerate(parts):
                # If we find a reference code like "ESG-Environment-01a:", question starts after
                if re.match(r"ESG-(Environment|Social|Governance)-\d+[a-z]?:", part, re.IGNORECASE):
                    question_start = i + 1
                    break
                # If we find question words, that might be the start
                question_words = [
                    "is", "does", "do", "are", "has", "have", "what", "how",
                    "when", "where", "why", "which", "who"
                ]
                if part.lower() in question_words:
                    question_start = i
                    break

            if question_start > 0:
                # Extract from question start to before "Mandatory/Optional"
                question_parts = parts[question_start:]
                # Remove trailing "Mandatory" or "Optional" if present
                if question_parts and question_parts[-1].lower() in ["mandatory", "optional"]:
                    question_parts = question_parts[:-1]
                text = " ".join(question_parts)

        # Remove leading numbering, bullets, and formatting
        text = re.sub(r"^\s*[0-9]+[\.\)\:\-\s]+", "", text)  # Numbers
        text = re.sub(r"^\s*[a-z][\.\)\:\-\s]+", "", text, flags=re.IGNORECASE)  # Letters
        text = re.sub(r"^\s*[\-\*\•\►\→\▪\▫]\s*", "", text)  # Bullets

        # Remove Excel-specific prefixes
        excel_prefixes = [
            r"^\s*(Environment|Social|Governance)\s+",
            r"^\s*ESG-(Environment|Social|Governance)-\d+[a-z]?:\s*",
            r"^\s*(Energy|Emissions|Water|Waste|Diversity|Health|Safety|Management|Leadership)\s+",
        ]
        for prefix in excel_prefixes:
            text = re.sub(prefix, "", text, flags=re.IGNORECASE)

        # Remove common prefixes that don't add meaning
        prefixes_to_remove = [
            r"^\s*question\s*:?\s*",
            r"^\s*item\s*:?\s*",
            r"^\s*requirement\s*:?\s*",
            r"^\s*criteria\s*:?\s*",
            r"^\s*check\s*:?\s*",
            r"^\s*verify\s*:?\s*"
        ]
        for prefix in prefixes_to_remove:
            text = re.sub(prefix, "", text, flags=re.IGNORECASE)

        # Remove trailing "Mandatory" or "Optional" that might remain
        text = re.sub(r"\s+(mandatory|optional)\s*$", "", text, flags=re.IGNORECASE)

        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)
        text = text.strip()

        # Ensure proper capitalization
        if text and not text[0].isupper():
            text = text[0].upper() + text[1:]

        return text

    def _categorize_question(self, question_text: str) -> str:
        """
        Categorize a question based on its content into ESG categories.
        """
        question_lower = question_text.lower()

        # Environmental keywords
        environmental_keywords = [
            "environmental",
            "climate",
            "carbon",
            "emission",
            "energy",
            "water",
            "waste",
            "biodiversity",
            "pollution",
            "renewable",
            "sustainable",
            "eco",
            "green",
            "ghg",
            "greenhouse",
            "footprint",
            "conservation",
            "recycling",
            "efficiency",
        ]

        # Social keywords
        social_keywords = [
            "social",
            "human rights",
            "labor",
            "employee",
            "health",
            "safety",
            "diversity",
            "inclusion",
            "training",
            "community",
            "stakeholder",
            "supplier",
            "customer",
            "workplace",
            "discrimination",
            "harassment",
            "wellbeing",
            "development",
        ]

        # Governance keywords
        governance_keywords = [
            "governance",
            "board",
            "management",
            "ethics",
            "compliance",
            "risk",
            "audit",
            "transparency",
            "accountability",
            "corruption",
            "bribery",
            "disclosure",
            "oversight",
            "policy",
            "procedure",
            "control",
            "reporting",
            "leadership",
        ]

        # Count keyword matches
        env_count = sum(1 for keyword in environmental_keywords if keyword in question_lower)
        social_count = sum(1 for keyword in social_keywords if keyword in question_lower)
        governance_count = sum(1 for keyword in governance_keywords if keyword in question_lower)

        # Determine category based on highest count
        if env_count >= social_count and env_count >= governance_count:
            return "Environmental"
        if social_count >= governance_count:
            return "Social"
        return "Governance"

    def _generate_compliance_indicators(
        self, completeness_analysis: Dict[str, Any], overall_score: float
    ) -> Dict[str, Any]:
        """
        Generate compliance indicators using the existing AIScorer method.
        """
        # Use the existing method from AIScorer
        return self.scorer._generate_compliance_indicators(completeness_analysis, overall_score)
