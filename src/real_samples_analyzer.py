#!/usr/bin/env python3
"""
Real ESG Samples Analyzer
Analyzes the actual Excel files in the Samples folder to understand their structure
and prepare them for integration into the ESG Checklist AI system.
"""

import pandas as pd
import json
from typing import Dict, List, Any
from pathlib import Path


class ESGSamplesAnalyzer:
    def __init__(self, samples_folder: Path):
        self.samples_folder = samples_folder
        self.analysis_results = {}

    def analyze_excel_file(self, file_path: Path) -> Dict[str, Any]:
        """Analyze a single Excel file and extract its structure and content."""
        print(f"\n{'='*60}")
        print(f"Analyzing: {file_path.name}")
        print(f"{'='*60}")

        try:
            # Read all sheets
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names

            analysis = {
                "file_name": file_path.name,
                "file_size": file_path.stat().st_size,
                "sheet_count": len(sheet_names),
                "sheet_names": sheet_names,
                "sheets_analysis": {},
            }

            print(
                f"📊 Found {len(sheet_names)} sheets: {', '.join(str(name) for name in sheet_names)}"
            )

            # Analyze each sheet
            for sheet_name in sheet_names:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name)

                    sheet_analysis = {
                        "rows": len(df),
                        "columns": len(df.columns),
                        "column_names": list(df.columns),
                        "sample_data": [],
                        "non_null_rows": df.dropna(how="all").shape[0],
                        "data_types": df.dtypes.to_dict(),
                    }

                    # Get first few non-empty rows as samples
                    non_empty_df = df.dropna(how="all").head(10)
                    for idx, row in non_empty_df.iterrows():
                        sample_row = {}
                        for col in df.columns:
                            value = row[col]
                            if pd.notna(value):
                                sample_row[col] = str(value)[
                                    :100
                                ]  # Truncate long values
                        if sample_row:  # Only add if row has data
                            sheet_analysis["sample_data"].append(sample_row)

                    analysis["sheets_analysis"][sheet_name] = sheet_analysis

                    print(
                        f"  📋 Sheet '{sheet_name}': {len(df)} rows × {len(df.columns)} columns"
                    )
                    print(
                        f"     Columns: {', '.join(list(df.columns)[:5])}"
                        + ("..." if len(df.columns) > 5 else "")
                    )

                except Exception as e:
                    print(f"  ❌ Error reading sheet '{sheet_name}': {str(e)}")
                    analysis["sheets_analysis"][sheet_name] = {"error": str(e)}

            return analysis

        except Exception as e:
            print(f"❌ Error analyzing file: {str(e)}")
            return {"file_name": file_path.name, "error": str(e)}

    def analyze_all_samples(self) -> Dict[str, Any]:
        """Analyze all Excel files in the samples folder."""
        if not self.samples_folder.exists():
            raise FileNotFoundError(f"Samples folder not found: {self.samples_folder}")

        excel_files = list(self.samples_folder.glob("*.xlsx"))

        print(f"🔍 Found {len(excel_files)} Excel files in {self.samples_folder}")
        print(f"Files: {[f.name for f in excel_files]}")

        results = {
            "total_files": len(excel_files),
            "files_analysis": {},
            "summary": {
                "total_sheets": 0,
                "common_columns": set(),
                "all_columns": set(),
                "esg_categories": set(),
            },
        }

        # Analyze each file
        for excel_file in excel_files:
            file_analysis = self.analyze_excel_file(excel_file)
            results["files_analysis"][excel_file.name] = file_analysis

            # Update summary statistics
            if "sheets_analysis" in file_analysis:
                results["summary"]["total_sheets"] += len(
                    file_analysis["sheets_analysis"]
                )

                # Collect all column names
                for sheet_analysis in file_analysis["sheets_analysis"].values():
                    if "column_names" in sheet_analysis:
                        sheet_columns = set(sheet_analysis["column_names"])
                        results["summary"]["all_columns"].update(sheet_columns)

                        # Find common columns across all sheets
                        if not results["summary"]["common_columns"]:
                            results["summary"]["common_columns"] = sheet_columns.copy()
                        else:
                            results["summary"]["common_columns"].intersection_update(
                                sheet_columns
                            )

        # Convert sets to lists for JSON serialization
        results["summary"]["common_columns"] = list(
            results["summary"]["common_columns"]
        )
        results["summary"]["all_columns"] = list(results["summary"]["all_columns"])
        results["summary"]["esg_categories"] = list(
            results["summary"]["esg_categories"]
        )

        return results

    def extract_esg_checklist_structure(
        self, analysis_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract ESG checklist structure from the analysis results."""
        print(f"\n{'='*60}")
        print("🏗️  EXTRACTING ESG CHECKLIST STRUCTURE")
        print(f"{'='*60}")

        checklist_structure = {
            "categories": {},
            "common_fields": [],
            "scoring_methods": [],
            "compliance_indicators": [],
        }

        # Analyze column patterns to identify ESG structure
        all_columns = analysis_results["summary"]["all_columns"]

        # Look for ESG-related patterns
        esg_keywords = {
            "environmental": [
                "environment",
                "carbon",
                "emission",
                "energy",
                "waste",
                "water",
                "green",
            ],
            "social": [
                "social",
                "employee",
                "community",
                "safety",
                "diversity",
                "labor",
            ],
            "governance": [
                "governance",
                "board",
                "ethics",
                "compliance",
                "audit",
                "risk",
                "policy",
            ],
        }

        for column in all_columns:
            column_lower = column.lower()
            for category, keywords in esg_keywords.items():
                if any(keyword in column_lower for keyword in keywords):
                    if category not in checklist_structure["categories"]:
                        checklist_structure["categories"][category] = []
                    checklist_structure["categories"][category].append(column)

        # Look for scoring/compliance patterns
        scoring_patterns = [
            "score",
            "rating",
            "compliance",
            "status",
            "result",
            "grade",
        ]
        compliance_patterns = [
            "yes",
            "no",
            "compliant",
            "non-compliant",
            "pass",
            "fail",
        ]

        for column in all_columns:
            column_lower = column.lower()
            if any(pattern in column_lower for pattern in scoring_patterns):
                checklist_structure["scoring_methods"].append(column)
            if any(pattern in column_lower for pattern in compliance_patterns):
                checklist_structure["compliance_indicators"].append(column)

        # Common fields are likely to be important
        checklist_structure["common_fields"] = analysis_results["summary"][
            "common_columns"
        ]

        print("📊 ESG Categories found:")
        for category, fields in checklist_structure["categories"].items():
            print(f"  {category.upper()}: {len(fields)} fields")
            print(f"    {', '.join(fields[:3])}" + ("..." if len(fields) > 3 else ""))

        print(f"📈 Scoring methods: {len(checklist_structure['scoring_methods'])}")
        print(
            f"✅ Compliance indicators: {len(checklist_structure['compliance_indicators'])}"
        )
        print(f"🔗 Common fields: {len(checklist_structure['common_fields'])}")

        return checklist_structure

    def generate_training_data(
        self, analysis_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate training data from the real samples for AI model improvement."""
        print(f"\n{'='*60}")
        print("🤖 GENERATING TRAINING DATA")
        print(f"{'='*60}")

        training_data = []

        for file_name, file_analysis in analysis_results["files_analysis"].items():
            if "sheets_analysis" not in file_analysis:
                continue

            for sheet_name, sheet_analysis in file_analysis["sheets_analysis"].items():
                if "sample_data" not in sheet_analysis:
                    continue

                # Create training samples from each row
                for row_data in sheet_analysis["sample_data"]:
                    training_sample = {
                        "source_file": file_name,
                        "source_sheet": sheet_name,
                        "data": row_data,
                        "esg_categories": self._identify_esg_categories(row_data),
                        "compliance_status": self._extract_compliance_status(row_data),
                        "risk_level": self._assess_risk_level(row_data),
                    }
                    training_data.append(training_sample)

        print(f"📚 Generated {len(training_data)} training samples")
        return training_data

    def _identify_esg_categories(self, row_data: Dict[str, str]) -> List[str]:
        """Identify ESG categories present in a row of data."""
        categories = []

        esg_keywords = {
            "Environmental": [
                "environment",
                "carbon",
                "emission",
                "energy",
                "waste",
                "water",
                "green",
            ],
            "Social": [
                "social",
                "employee",
                "community",
                "safety",
                "diversity",
                "labor",
            ],
            "Governance": [
                "governance",
                "board",
                "ethics",
                "compliance",
                "audit",
                "risk",
                "policy",
            ],
        }

        row_text = " ".join(str(v) for v in row_data.values()).lower()

        for category, keywords in esg_keywords.items():
            if any(keyword in row_text for keyword in keywords):
                categories.append(category)

        return categories

    def _extract_compliance_status(self, row_data: Dict[str, str]) -> str:
        """Extract compliance status from row data."""
        row_text = " ".join(str(v) for v in row_data.values()).lower()

        if any(
            word in row_text for word in ["compliant", "yes", "pass", "satisfactory"]
        ):
            return "Compliant"
        elif any(
            word in row_text
            for word in ["non-compliant", "no", "fail", "unsatisfactory"]
        ):
            return "Non-Compliant"
        else:
            return "Unknown"

    def _assess_risk_level(self, row_data: Dict[str, str]) -> str:
        """Assess risk level from row data."""
        row_text = " ".join(str(v) for v in row_data.values()).lower()

        if any(word in row_text for word in ["high", "critical", "severe"]):
            return "High"
        elif any(word in row_text for word in ["medium", "moderate"]):
            return "Medium"
        elif any(word in row_text for word in ["low", "minimal"]):
            return "Low"
        else:
            return "Unknown"

    def save_analysis_results(self, results: Any, output_file: Path):
        """Save analysis results to a JSON file."""
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        print(f"💾 Analysis results saved to: {output_file}")


def main():
    """Main function to run the ESG samples analysis."""
    # Set up paths
    project_root = Path(__file__).parent.parent
    samples_folder = project_root / "Samples"
    output_folder = project_root / "data"

    print("🚀 ESG CHECKLIST AI - REAL SAMPLES ANALYZER")
    print("=" * 60)
    print(f"📁 Project root: {project_root}")
    print(f"📂 Samples folder: {samples_folder}")
    print(f"💾 Output folder: {output_folder}")

    # Create output directory if it doesn't exist
    output_folder.mkdir(exist_ok=True)

    # Initialize analyzer
    analyzer = ESGSamplesAnalyzer(samples_folder)

    try:
        # Analyze all samples
        analysis_results = analyzer.analyze_all_samples()

        # Extract ESG checklist structure
        checklist_structure = analyzer.extract_esg_checklist_structure(analysis_results)

        # Generate training data
        training_data = analyzer.generate_training_data(analysis_results)

        # Save results
        analyzer.save_analysis_results(
            analysis_results, output_folder / "real_samples_analysis.json"
        )

        analyzer.save_analysis_results(
            checklist_structure, output_folder / "esg_checklist_structure.json"
        )

        analyzer.save_analysis_results(
            training_data, output_folder / "esg_training_data.json"
        )

        # Print summary
        print(f"\n{'='*60}")
        print("📊 ANALYSIS SUMMARY")
        print(f"{'='*60}")
        print(f"✅ Files analyzed: {analysis_results['total_files']}")
        print(f"📋 Total sheets: {analysis_results['summary']['total_sheets']}")
        print(
            f"🔗 Common columns: {len(analysis_results['summary']['common_columns'])}"
        )
        print(f"📊 All columns: {len(analysis_results['summary']['all_columns'])}")
        print(f"🏗️  ESG categories: {len(checklist_structure['categories'])}")
        print(f"🤖 Training samples: {len(training_data)}")
        print("\n🎉 Real ESG samples analysis complete!")

    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}")
        raise


if __name__ == "__main__":
    main()
