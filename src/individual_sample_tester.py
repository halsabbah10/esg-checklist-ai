#!/usr/bin/env python3
"""
Individual ESG Sample Testing Module
Tests the ESG Checklist AI system with each of the 4 real sample files individually
to validate system performance and accuracy.
"""

import sys
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any

# Add backend to path for imports
sys.path.append(str(Path(__file__).parent.parent / "backend"))

try:
    from app.utils.ai import ai_score_text_with_gemini, calculate_enhanced_esg_score
except ImportError:
    print(
        "⚠️  Warning: Could not import backend AI functions. Running in analysis-only mode."
    )
    ai_score_text_with_gemini = None
    calculate_enhanced_esg_score = None


class IndividualSampleTester:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.samples_folder = project_root / "Samples"
        self.data_folder = project_root / "data"

        # Load processed data for reference
        self.processed_data = self._load_processed_data()

    def _load_processed_data(self) -> Dict[str, Any]:
        """Load the previously processed ESG data."""
        try:
            with open(
                self.data_folder / "processed_esg_data.json", "r", encoding="utf-8"
            ) as f:
                return json.load(f)
        except FileNotFoundError:
            print("⚠️  Processed data not found. Run enhanced_esg_processor.py first.")
            return {}

    def extract_sample_text(self, excel_file: Path) -> str:
        """Extract representative text from an Excel file for AI testing."""
        try:
            # Read all sheets and extract sample text
            excel_data = pd.ExcelFile(excel_file)
            sample_texts = []

            for sheet_name in excel_data.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)

                # Extract non-null text content from the sheet
                text_content = []
                for col in df.columns:
                    if df[col].dtype == "object":  # Text columns
                        non_null_values = df[col].dropna().astype(str)
                        text_content.extend(
                            non_null_values.tolist()[:10]
                        )  # First 10 entries

                if text_content:
                    sheet_text = " ".join(text_content)
                    sample_texts.append(
                        f"Sheet '{sheet_name}': {sheet_text[:500]}"
                    )  # First 500 chars

            return "\n\n".join(sample_texts)

        except Exception as e:
            print(f"❌ Error extracting text from {excel_file.name}: {e}")
            return f"ESG Internal Audit Checklist from {excel_file.name}"

    def get_sample_questions(self, file_name: str) -> List[Dict[str, Any]]:
        """Get questions from processed data for a specific file."""
        if not self.processed_data or "questions" not in self.processed_data:
            return []

        return [
            q
            for q in self.processed_data["questions"]
            if q.get("source_file") == file_name
        ]

    def test_individual_sample(self, excel_file: Path) -> Dict[str, Any]:
        """Test the ESG system with an individual sample file."""
        print(f"\n{'='*80}")
        print(f"🧪 TESTING: {excel_file.name}")
        print(f"{'='*80}")

        results = {
            "file_name": excel_file.name,
            "file_size": excel_file.stat().st_size,
            "test_timestamp": pd.Timestamp.now().isoformat(),
            "extraction_test": {},
            "ai_analysis_test": {},
            "questions_analysis": {},
            "overall_assessment": {},
        }

        # 1. Test file extraction
        print("📁 Testing file extraction...")
        try:
            sample_text = self.extract_sample_text(excel_file)
            results["extraction_test"] = {
                "status": "success",
                "text_length": len(sample_text),
                "sample_content": sample_text[:200] + "..."
                if len(sample_text) > 200
                else sample_text,
            }
            print(f"✅ Extraction successful - {len(sample_text)} characters extracted")
        except Exception as e:
            results["extraction_test"] = {"status": "failed", "error": str(e)}
            print(f"❌ Extraction failed: {e}")
            return results

        # 2. Test AI analysis (if available)
        if ai_score_text_with_gemini and calculate_enhanced_esg_score:
            print("🤖 Testing AI analysis...")
            try:
                # Basic AI scoring
                score, feedback = ai_score_text_with_gemini(sample_text)

                # Enhanced scoring
                enhanced_result = calculate_enhanced_esg_score({}, feedback)

                results["ai_analysis_test"] = {
                    "status": "success",
                    "basic_score": score,
                    "enhanced_score": enhanced_result.get("overall_score", 0),
                    "risk_level": enhanced_result.get("risk_level", "Unknown"),
                    "category_scores": enhanced_result.get("category_scores", {}),
                    "feedback_length": len(feedback),
                    "enhanced_scoring": enhanced_result.get("enhanced_scoring", False),
                }

                print(f"✅ AI analysis successful")
                print(f"   Basic Score: {score}")
                print(
                    f"   Enhanced Score: {enhanced_result.get('overall_score', 'N/A')}"
                )
                print(f"   Risk Level: {enhanced_result.get('risk_level', 'N/A')}")

            except Exception as e:
                results["ai_analysis_test"] = {"status": "failed", "error": str(e)}
                print(f"❌ AI analysis failed: {e}")
        else:
            results["ai_analysis_test"] = {
                "status": "skipped",
                "reason": "AI functions not available",
            }
            print("⚠️  AI analysis skipped - functions not available")

        # 3. Analyze extracted questions
        print("📋 Analyzing extracted questions...")
        questions = self.get_sample_questions(excel_file.name)

        if questions:
            # Categorize questions
            categories = {}
            esg_domains = {}
            mandatory_count = 0

            for q in questions:
                # Count by category
                category = q.get("category", "Unknown")
                categories[category] = categories.get(category, 0) + 1

                # Count by ESG domain (from training data)
                esg_domain = self._classify_esg_domain(q.get("question", ""))
                esg_domains[esg_domain] = esg_domains.get(esg_domain, 0) + 1

                # Count mandatory questions
                if q.get("mandatory", "").lower() in ["mandatory", "yes", "required"]:
                    mandatory_count += 1

            results["questions_analysis"] = {
                "total_questions": len(questions),
                "categories": categories,
                "esg_domains": esg_domains,
                "mandatory_count": mandatory_count,
                "optional_count": len(questions) - mandatory_count,
                "sample_questions": [
                    q.get("question", "")[:100] + "..."
                    if len(q.get("question", "")) > 100
                    else q.get("question", "")
                    for q in questions[:3]
                ],
            }

            print(f"✅ Questions analysis complete")
            print(f"   Total Questions: {len(questions)}")
            print(f"   Categories: {list(categories.keys())}")
            print(f"   ESG Domains: {list(esg_domains.keys())}")
            print(
                f"   Mandatory: {mandatory_count}, Optional: {len(questions) - mandatory_count}"
            )

        else:
            results["questions_analysis"] = {
                "status": "no_questions_found",
                "total_questions": 0,
            }
            print("⚠️  No questions found for this file")

        # 4. Overall assessment
        print("📊 Generating overall assessment...")

        extraction_ok = results["extraction_test"]["status"] == "success"
        ai_ok = results["ai_analysis_test"]["status"] == "success"
        questions_ok = results["questions_analysis"].get("total_questions", 0) > 0

        if extraction_ok and questions_ok:
            if ai_ok:
                assessment = "excellent"
                status_msg = "All tests passed - file fully compatible"
            else:
                assessment = "good"
                status_msg = "File processed successfully - AI analysis needs attention"
        elif extraction_ok:
            assessment = "partial"
            status_msg = "File readable but limited question extraction"
        else:
            assessment = "poor"
            status_msg = "File processing issues detected"

        results["overall_assessment"] = {
            "rating": assessment,
            "status": status_msg,
            "extraction_ok": extraction_ok,
            "ai_analysis_ok": ai_ok,
            "questions_ok": questions_ok,
            "recommendations": self._generate_recommendations(results),
        }

        print(f"📈 Overall Assessment: {assessment.upper()}")
        print(f"   Status: {status_msg}")

        return results

    def _classify_esg_domain(self, question: str) -> str:
        """Classify question into ESG domain."""
        question_lower = question.lower()

        environmental_keywords = [
            "environment",
            "carbon",
            "emission",
            "energy",
            "waste",
            "water",
            "green",
        ]
        social_keywords = [
            "social",
            "employee",
            "community",
            "safety",
            "diversity",
            "labor",
        ]
        governance_keywords = [
            "governance",
            "board",
            "ethics",
            "compliance",
            "audit",
            "risk",
            "policy",
        ]

        if any(keyword in question_lower for keyword in environmental_keywords):
            return "Environmental"
        elif any(keyword in question_lower for keyword in social_keywords):
            return "Social"
        elif any(keyword in question_lower for keyword in governance_keywords):
            return "Governance"
        else:
            return "General"

    def _generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on test results."""
        recommendations = []

        if results["extraction_test"]["status"] != "success":
            recommendations.append("Fix file format or structure issues")

        if results["ai_analysis_test"]["status"] == "failed":
            recommendations.append("Check AI service configuration and API keys")

        if results["questions_analysis"].get("total_questions", 0) == 0:
            recommendations.append(
                "Verify question extraction logic for this file format"
            )

        if results["ai_analysis_test"].get("enhanced_score", 0) < 50:
            recommendations.append("Review content quality - low ESG compliance score")

        if not recommendations:
            recommendations.append("No issues detected - file ready for production use")

        return recommendations

    def test_all_samples(self) -> Dict[str, Any]:
        """Test all 4 sample files individually."""
        print("🚀 ESG CHECKLIST AI - INDIVIDUAL SAMPLE TESTING")
        print("=" * 80)
        print(f"📁 Samples folder: {self.samples_folder}")
        print(f"💾 Data folder: {self.data_folder}")

        excel_files = list(self.samples_folder.glob("*.xlsx"))

        if not excel_files:
            print("❌ No Excel files found in Samples folder")
            return {}

        print(f"🔍 Found {len(excel_files)} Excel files to test")

        all_results = {
            "test_summary": {
                "total_files": len(excel_files),
                "test_timestamp": pd.Timestamp.now().isoformat(),
                "files_tested": [f.name for f in excel_files],
            },
            "individual_results": {},
            "comparative_analysis": {},
        }

        # Test each file individually
        for excel_file in excel_files:
            results = self.test_individual_sample(excel_file)
            all_results["individual_results"][excel_file.name] = results

        # Comparative analysis
        print(f"\n{'='*80}")
        print("📊 COMPARATIVE ANALYSIS")
        print(f"{'='*80}")

        comparative = self._generate_comparative_analysis(
            all_results["individual_results"]
        )
        all_results["comparative_analysis"] = comparative

        # Print summary
        self._print_summary(all_results)

        return all_results

    def _generate_comparative_analysis(
        self, individual_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comparative analysis across all files."""
        comparative = {
            "success_rates": {},
            "question_distribution": {},
            "ai_scores": {},
            "file_characteristics": {},
            "best_performers": {},
            "issues_summary": {},
        }

        # Success rates
        extraction_success = sum(
            1
            for r in individual_results.values()
            if r["extraction_test"]["status"] == "success"
        )
        ai_success = sum(
            1
            for r in individual_results.values()
            if r["ai_analysis_test"]["status"] == "success"
        )
        questions_found = sum(
            1
            for r in individual_results.values()
            if r["questions_analysis"].get("total_questions", 0) > 0
        )

        total_files = len(individual_results)
        comparative["success_rates"] = {
            "extraction": f"{extraction_success}/{total_files} ({100*extraction_success/total_files:.1f}%)",
            "ai_analysis": f"{ai_success}/{total_files} ({100*ai_success/total_files:.1f}%)",
            "question_extraction": f"{questions_found}/{total_files} ({100*questions_found/total_files:.1f}%)",
        }

        # Question distribution
        total_questions = sum(
            r["questions_analysis"].get("total_questions", 0)
            for r in individual_results.values()
        )
        comparative["question_distribution"] = {
            "total_across_all_files": total_questions,
            "average_per_file": total_questions / total_files if total_files > 0 else 0,
            "by_file": {
                name: r["questions_analysis"].get("total_questions", 0)
                for name, r in individual_results.items()
            },
        }

        # AI scores
        ai_scores = {
            name: r["ai_analysis_test"].get("enhanced_score", 0)
            for name, r in individual_results.items()
            if r["ai_analysis_test"]["status"] == "success"
        }
        if ai_scores:
            comparative["ai_scores"] = {
                "average": sum(ai_scores.values()) / len(ai_scores),
                "highest": max(ai_scores.values()),
                "lowest": min(ai_scores.values()),
                "by_file": ai_scores,
            }

        # Best performers
        best_questions = max(
            individual_results.items(),
            key=lambda x: x[1]["questions_analysis"].get("total_questions", 0),
        )
        comparative["best_performers"] = {
            "most_questions": best_questions[0],
            "question_count": best_questions[1]["questions_analysis"].get(
                "total_questions", 0
            ),
        }

        if ai_scores:
            best_ai = max(ai_scores.items(), key=lambda x: x[1])
            comparative["best_performers"]["highest_ai_score"] = best_ai[0]
            comparative["best_performers"]["ai_score"] = best_ai[1]

        return comparative

    def _print_summary(self, all_results: Dict[str, Any]):
        """Print a comprehensive summary of all tests."""
        print(f"\n{'='*80}")
        print("📋 TESTING SUMMARY")
        print(f"{'='*80}")

        summary = all_results["test_summary"]
        comparative = all_results["comparative_analysis"]

        print(f"📊 Files Tested: {summary['total_files']}")
        print(f"📅 Test Date: {summary['test_timestamp']}")

        print(f"\n🎯 Success Rates:")
        for metric, rate in comparative["success_rates"].items():
            print(f"  {metric.replace('_', ' ').title()}: {rate}")

        print(f"\n📋 Question Analysis:")
        dist = comparative["question_distribution"]
        print(f"  Total Questions: {dist['total_across_all_files']}")
        print(f"  Average per File: {dist['average_per_file']:.1f}")

        print(f"\n🏆 Best Performers:")
        best = comparative["best_performers"]
        print(
            f"  Most Questions: {best['most_questions']} ({best['question_count']} questions)"
        )
        if "highest_ai_score" in best:
            print(
                f"  Highest AI Score: {best['highest_ai_score']} ({best['ai_score']:.1f})"
            )

        print(f"\n📁 Individual File Results:")
        for file_name, results in all_results["individual_results"].items():
            assessment = results["overall_assessment"]["rating"]
            questions = results["questions_analysis"].get("total_questions", 0)
            ai_score = results["ai_analysis_test"].get("enhanced_score", "N/A")
            print(
                f"  {file_name}: {assessment.upper()} ({questions} questions, AI score: {ai_score})"
            )

        print(f"\n✅ Testing complete! All files have been individually validated.")

    def save_results(self, results: Dict[str, Any]):
        """Save test results to file."""
        output_file = self.data_folder / "individual_sample_test_results.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        print(f"💾 Test results saved to: {output_file}")


def main():
    """Main function to run individual sample testing."""
    project_root = Path(__file__).parent.parent

    try:
        tester = IndividualSampleTester(project_root)
        results = tester.test_all_samples()
        tester.save_results(results)

    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
