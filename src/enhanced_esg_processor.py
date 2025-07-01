#!/usr/bin/env python3
"""
Enhanced ESG Samples Processor
Specifically designed to process real-world ESG Internal Audit Checklist Excel files
and integrate them into the ESG Checklist AI system for production use.
"""

import pandas as pd
import json
import re
from typing import Dict, List, Any
from pathlib import Path


class EnhancedESGProcessor:
    def __init__(self, samples_folder: Path):
        self.samples_folder = samples_folder
        self.processed_data = {
            "questions": [],
            "categories": set(),
            "subcategories": set(),
            "references": set(),
            "answers": [],
            "project_info": [],
        }

    def clean_column_name(self, col_name: str) -> str:
        """Clean and standardize column names."""
        if pd.isna(col_name) or col_name.startswith("Unnamed"):
            return f"Column_{col_name.split(':')[-1] if ':' in str(col_name) else 'Unknown'}"

        # Clean up the column name
        cleaned = str(col_name).strip()
        cleaned = re.sub(r"\n", " ", cleaned)  # Replace newlines with spaces
        cleaned = re.sub(
            r"\s+", " ", cleaned
        )  # Replace multiple spaces with single space
        cleaned = re.sub(
            r"[^\w\s-]", "", cleaned
        )  # Remove special characters except hyphens

        return cleaned

    def detect_sheet_type(self, sheet_name: str, df: pd.DataFrame) -> str:
        """Detect the type of sheet based on name and content."""
        sheet_name_lower = sheet_name.lower()

        if "project" in sheet_name_lower or "information" in sheet_name_lower:
            return "project_info"
        elif "question" in sheet_name_lower or "checklist" in sheet_name_lower:
            return "questions"
        elif "answer" in sheet_name_lower or "response" in sheet_name_lower:
            return "answers"
        else:
            # Try to detect based on content
            columns = [str(col).lower() for col in df.columns]
            if any("question" in col for col in columns):
                return "questions"
            elif any("answer" in col or "response" in col for col in columns):
                return "answers"
            else:
                return "unknown"

    def process_questions_sheet(
        self, df: pd.DataFrame, file_name: str, sheet_name: str
    ) -> List[Dict[str, Any]]:
        """Process a sheet containing ESG questions."""
        questions = []

        # Clean column names
        df.columns = [self.clean_column_name(col) for col in df.columns]

        # Find key columns
        category_col = None
        subcategory_col = None
        question_col = None
        reference_col = None
        mandatory_col = None

        for col in df.columns:
            col_lower = col.lower()
            if "category" in col_lower and "sub" not in col_lower:
                category_col = col
            elif "sub" in col_lower and "category" in col_lower:
                subcategory_col = col
            elif "question" in col_lower:
                question_col = col
            elif "reference" in col_lower:
                reference_col = col
            elif "mandatory" in col_lower or "optional" in col_lower:
                mandatory_col = col

        # If we can't find standard columns, use positional logic
        if not question_col and len(df.columns) >= 4:
            # Assume common structure: Category, Sub Category, Reference, Question, ...
            for i, col in enumerate(df.columns):
                if i == 0:
                    category_col = col
                elif i == 1:
                    subcategory_col = col
                elif i == 2:
                    reference_col = col
                elif i == 3:
                    question_col = col
                elif i == 4:
                    mandatory_col = col

        print(
            f"  🔍 Identified columns: Category={category_col}, SubCategory={subcategory_col}, Question={question_col}"
        )

        for idx, row in df.iterrows():
            # Skip empty rows
            if row.isna().all():
                continue

            question_data = {
                "source_file": file_name,
                "source_sheet": sheet_name,
                "row_index": idx,
                "category": str(row[category_col])
                if category_col and pd.notna(row[category_col])
                else "Unknown",
                "subcategory": str(row[subcategory_col])
                if subcategory_col and pd.notna(row[subcategory_col])
                else "Unknown",
                "question": str(row[question_col])
                if question_col and pd.notna(row[question_col])
                else "Unknown",
                "reference": str(row[reference_col])
                if reference_col and pd.notna(row[reference_col])
                else "Unknown",
                "mandatory": str(row[mandatory_col])
                if mandatory_col and pd.notna(row[mandatory_col])
                else "Unknown",
                "raw_data": row.to_dict(),
            }

            # Skip header rows and invalid questions
            if (
                question_data["question"].lower() in ["question", "unknown", "nan"]
                or len(question_data["question"]) < 10
            ):
                continue

            questions.append(question_data)

            # Add to global sets
            if question_data["category"] != "Unknown":
                self.processed_data["categories"].add(question_data["category"])
            if question_data["subcategory"] != "Unknown":
                self.processed_data["subcategories"].add(question_data["subcategory"])
            if question_data["reference"] != "Unknown":
                self.processed_data["references"].add(question_data["reference"])

        return questions

    def process_answers_sheet(
        self, df: pd.DataFrame, file_name: str, sheet_name: str
    ) -> List[Dict[str, Any]]:
        """Process a sheet containing answers/responses."""
        answers = []

        # Clean column names
        df.columns = [self.clean_column_name(col) for col in df.columns]

        for idx, row in df.iterrows():
            if row.isna().all():
                continue

            answer_data = {
                "source_file": file_name,
                "source_sheet": sheet_name,
                "row_index": idx,
                "raw_data": row.to_dict(),
            }

            answers.append(answer_data)

        return answers

    def process_project_info_sheet(
        self, df: pd.DataFrame, file_name: str, sheet_name: str
    ) -> List[Dict[str, Any]]:
        """Process a sheet containing project/audit information."""
        project_info = []

        # Clean column names
        df.columns = [self.clean_column_name(col) for col in df.columns]

        for idx, row in df.iterrows():
            if row.isna().all():
                continue

            info_data = {
                "source_file": file_name,
                "source_sheet": sheet_name,
                "row_index": idx,
                "raw_data": row.to_dict(),
            }

            project_info.append(info_data)

        return project_info

    def process_all_files(self) -> Dict[str, Any]:
        """Process all Excel files in the samples folder."""
        excel_files = list(self.samples_folder.glob("*.xlsx"))

        print(f"🔍 Processing {len(excel_files)} Excel files...")

        for excel_file in excel_files:
            print(f"\n{'='*60}")
            print(f"Processing: {excel_file.name}")
            print(f"{'='*60}")

            try:
                excel_data = pd.ExcelFile(excel_file)

                for sheet_name in excel_data.sheet_names:
                    sheet_name_str = str(sheet_name)
                    print(f"\n📋 Processing sheet: {sheet_name_str}")

                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    sheet_type = self.detect_sheet_type(sheet_name_str, df)

                    print(f"  📝 Detected sheet type: {sheet_type}")
                    print(
                        f"  📊 Sheet dimensions: {df.shape[0]} rows × {df.shape[1]} columns"
                    )

                    if sheet_type == "questions":
                        questions = self.process_questions_sheet(
                            df, excel_file.name, sheet_name_str
                        )
                        self.processed_data["questions"].extend(questions)
                        print(f"  ✅ Extracted {len(questions)} questions")

                    elif sheet_type == "answers":
                        answers = self.process_answers_sheet(
                            df, excel_file.name, sheet_name_str
                        )
                        self.processed_data["answers"].extend(answers)
                        print(f"  ✅ Extracted {len(answers)} answers")

                    elif sheet_type == "project_info":
                        project_info = self.process_project_info_sheet(
                            df, excel_file.name, sheet_name_str
                        )
                        self.processed_data["project_info"].extend(project_info)
                        print(
                            f"  ✅ Extracted {len(project_info)} project info entries"
                        )

                    else:
                        print("  ⚠️  Unknown sheet type, skipping...")

            except Exception as e:
                print(f"❌ Error processing {excel_file.name}: {str(e)}")

        # Convert sets to lists for JSON serialization
        self.processed_data["categories"] = list(self.processed_data["categories"])
        self.processed_data["subcategories"] = list(
            self.processed_data["subcategories"]
        )
        self.processed_data["references"] = list(self.processed_data["references"])

        return self.processed_data

    def generate_comprehensive_checklist(self) -> Dict[str, Any]:
        """Generate a comprehensive ESG checklist from processed data."""
        print(f"\n{'='*60}")
        print("🏗️  GENERATING COMPREHENSIVE ESG CHECKLIST")
        print(f"{'='*60}")

        checklist = {
            "metadata": {
                "total_questions": len(self.processed_data["questions"]),
                "categories": len(self.processed_data["categories"]),
                "subcategories": len(self.processed_data["subcategories"]),
                "references": len(self.processed_data["references"]),
                "generated_from_files": len(
                    set([q["source_file"] for q in self.processed_data["questions"]])
                ),
            },
            "categories": {},
            "all_questions": self.processed_data["questions"],
            "reference_standards": list(self.processed_data["references"]),
        }

        # Organize questions by category
        for question in self.processed_data["questions"]:
            category = question["category"]
            subcategory = question["subcategory"]

            if category not in checklist["categories"]:
                checklist["categories"][category] = {
                    "subcategories": {},
                    "question_count": 0,
                }

            if subcategory not in checklist["categories"][category]["subcategories"]:
                checklist["categories"][category]["subcategories"][subcategory] = {
                    "questions": [],
                    "mandatory_count": 0,
                    "optional_count": 0,
                }

            checklist["categories"][category]["subcategories"][subcategory][
                "questions"
            ].append(question)
            checklist["categories"][category]["question_count"] += 1

            if question["mandatory"].lower() in ["mandatory", "yes", "required"]:
                checklist["categories"][category]["subcategories"][subcategory][
                    "mandatory_count"
                ] += 1
            else:
                checklist["categories"][category]["subcategories"][subcategory][
                    "optional_count"
                ] += 1

        print(f"📊 Generated checklist structure:")
        for category, cat_data in checklist["categories"].items():
            print(f"  📁 {category}: {cat_data['question_count']} questions")
            for subcat, subcat_data in cat_data["subcategories"].items():
                question_count = len(subcat_data["questions"])
                mandatory = subcat_data["mandatory_count"]
                optional = subcat_data["optional_count"]
                print(
                    f"    📂 {subcat}: {question_count} questions ({mandatory} mandatory, {optional} optional)"
                )

        return checklist

    def create_ai_training_dataset(self) -> List[Dict[str, Any]]:
        """Create a training dataset for AI model improvement."""
        print(f"\n{'='*60}")
        print("🤖 CREATING AI TRAINING DATASET")
        print(f"{'='*60}")

        training_data = []

        for question in self.processed_data["questions"]:
            training_sample = {
                "input_text": question["question"],
                "category": question["category"],
                "subcategory": question["subcategory"],
                "reference_standard": question["reference"],
                "mandatory": question["mandatory"].lower()
                in ["mandatory", "yes", "required"],
                "esg_domain": self._classify_esg_domain(
                    question["question"], question["category"]
                ),
                "risk_indicators": self._extract_risk_indicators(question["question"]),
                "compliance_keywords": self._extract_compliance_keywords(
                    question["question"]
                ),
                "expected_response_type": self._determine_response_type(
                    question["question"]
                ),
                "metadata": {
                    "source_file": question["source_file"],
                    "source_sheet": question["source_sheet"],
                    "row_index": question["row_index"],
                },
            }

            training_data.append(training_sample)

        print(f"📚 Created {len(training_data)} training samples")

        # Analyze training data distribution
        domains = {}
        categories = {}
        for sample in training_data:
            domain = sample["esg_domain"]
            category = sample["category"]

            domains[domain] = domains.get(domain, 0) + 1
            categories[category] = categories.get(category, 0) + 1

        print(f"📊 Training data distribution:")
        print(
            f"  ESG Domains: {dict(sorted(domains.items(), key=lambda x: x[1], reverse=True))}"
        )
        print(
            f"  Categories: {dict(sorted(categories.items(), key=lambda x: x[1], reverse=True))}"
        )

        return training_data

    def _classify_esg_domain(self, question: str, category: str) -> str:
        """Classify question into ESG domain (Environmental, Social, Governance)."""
        question_lower = question.lower()
        category_lower = category.lower()

        environmental_keywords = [
            "environment",
            "carbon",
            "emission",
            "energy",
            "waste",
            "water",
            "green",
            "sustainability",
            "climate",
            "pollution",
            "renewable",
            "biodiversity",
        ]

        social_keywords = [
            "social",
            "employee",
            "community",
            "safety",
            "diversity",
            "labor",
            "human rights",
            "health",
            "training",
            "workplace",
            "discrimination",
        ]

        governance_keywords = [
            "governance",
            "board",
            "ethics",
            "compliance",
            "audit",
            "risk",
            "policy",
            "transparency",
            "accountability",
            "management",
            "oversight",
            "internal control",
        ]

        text_to_check = f"{question_lower} {category_lower}"

        env_score = sum(
            1 for keyword in environmental_keywords if keyword in text_to_check
        )
        social_score = sum(1 for keyword in social_keywords if keyword in text_to_check)
        gov_score = sum(
            1 for keyword in governance_keywords if keyword in text_to_check
        )

        if env_score > social_score and env_score > gov_score:
            return "Environmental"
        elif social_score > gov_score:
            return "Social"
        elif gov_score > 0:
            return "Governance"
        else:
            return "General"

    def _extract_risk_indicators(self, question: str) -> List[str]:
        """Extract risk-related indicators from question text."""
        risk_keywords = [
            "risk",
            "compliance",
            "violation",
            "non-compliance",
            "breach",
            "failure",
            "incident",
            "audit",
            "control",
            "monitoring",
        ]

        question_lower = question.lower()
        indicators = [keyword for keyword in risk_keywords if keyword in question_lower]

        return indicators

    def _extract_compliance_keywords(self, question: str) -> List[str]:
        """Extract compliance-related keywords from question text."""
        compliance_keywords = [
            "comply",
            "compliant",
            "compliance",
            "standard",
            "regulation",
            "requirement",
            "policy",
            "procedure",
            "guideline",
            "framework",
        ]

        question_lower = question.lower()
        keywords = [
            keyword for keyword in compliance_keywords if keyword in question_lower
        ]

        return keywords

    def _determine_response_type(self, question: str) -> str:
        """Determine expected response type for the question."""
        question_lower = question.lower()

        if any(
            word in question_lower
            for word in ["yes", "no", "does", "is", "are", "has", "have"]
        ):
            return "yes_no"
        elif any(
            word in question_lower
            for word in ["how many", "number", "count", "percentage"]
        ):
            return "numeric"
        elif any(
            word in question_lower for word in ["describe", "explain", "detail", "how"]
        ):
            return "descriptive"
        elif any(word in question_lower for word in ["list", "identify", "name"]):
            return "list"
        else:
            return "open_ended"

    def save_processed_data(self, output_folder: Path):
        """Save all processed data to JSON files."""
        output_folder.mkdir(exist_ok=True)

        # Save comprehensive processed data
        with open(
            output_folder / "processed_esg_data.json", "w", encoding="utf-8"
        ) as f:
            json.dump(self.processed_data, f, indent=2, ensure_ascii=False, default=str)

        # Generate and save comprehensive checklist
        checklist = self.generate_comprehensive_checklist()
        with open(
            output_folder / "comprehensive_esg_checklist.json", "w", encoding="utf-8"
        ) as f:
            json.dump(checklist, f, indent=2, ensure_ascii=False, default=str)

        # Generate and save AI training dataset
        training_data = self.create_ai_training_dataset()
        with open(
            output_folder / "ai_training_dataset.json", "w", encoding="utf-8"
        ) as f:
            json.dump(training_data, f, indent=2, ensure_ascii=False, default=str)

        print(f"\n💾 All processed data saved to: {output_folder}")
        print(
            f"  📄 processed_esg_data.json ({len(self.processed_data['questions'])} questions)"
        )
        print(
            f"  📋 comprehensive_esg_checklist.json ({len(checklist['categories'])} categories)"
        )
        print(f"  🤖 ai_training_dataset.json ({len(training_data)} training samples)")


def main():
    """Main function to run the enhanced ESG processor."""
    project_root = Path(__file__).parent.parent
    samples_folder = project_root / "Samples"
    output_folder = project_root / "data"

    print("🚀 ENHANCED ESG CHECKLIST PROCESSOR")
    print("=" * 60)
    print(f"📁 Project root: {project_root}")
    print(f"📂 Samples folder: {samples_folder}")
    print(f"💾 Output folder: {output_folder}")

    if not samples_folder.exists():
        print(f"❌ Samples folder not found: {samples_folder}")
        return

    # Initialize processor
    processor = EnhancedESGProcessor(samples_folder)

    try:
        # Process all files
        processed_data = processor.process_all_files()

        # Save all results
        processor.save_processed_data(output_folder)

        # Print final summary
        print(f"\n{'='*60}")
        print("🎉 ENHANCED PROCESSING COMPLETE!")
        print(f"{'='*60}")
        print(f"✅ Questions extracted: {len(processed_data['questions'])}")
        print(f"📁 Categories identified: {len(processed_data['categories'])}")
        print(f"📂 Subcategories identified: {len(processed_data['subcategories'])}")
        print(f"📚 Reference standards: {len(processed_data['references'])}")
        print(f"📝 Answers processed: {len(processed_data['answers'])}")
        print(f"📊 Project info entries: {len(processed_data['project_info'])}")

        if processed_data["categories"]:
            print(f"\n🏷️  Categories found:")
            for category in sorted(processed_data["categories"]):
                print(f"  • {category}")

    except Exception as e:
        print(f"❌ Error during processing: {str(e)}")
        raise


if __name__ == "__main__":
    main()
