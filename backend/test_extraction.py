#!/usr/bin/env python3
"""
Test the questionnaire extraction from the ESG document
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.ai.comprehensive_analyzer import ComprehensiveESGAnalyzer


def test_extraction():
    """Test questionnaire extraction from sample ESG document"""
    # Sample text that represents the ESG checklist format
    sample_text = """
ESG QUESTIONNAIRES

Category Sub Category Reference Question Mandatory or Optional

Environment Energy ESG-Environment-01a: Does the organisation have a documented energy management policy? Mandatory
Environment Energy ESG-Environment-01b: What are the key objectives outlined in your energy management policy? Mandatory
Environment Energy ESG-Environment-02a: Is there a designated person responsible for energy management within the organization? Mandatory
Environment Energy ESG-Environment-02b: Please specify the job title and department of the person responsible for energy management. Mandatory
Environment Energy ESG-Environment-03a: Does the organization conduct regular energy audits? Mandatory
Environment Energy ESG-Environment-03b: How frequently are energy audits conducted? Mandatory
Environment Energy ESG-Environment-04a: Has the organization set energy efficiency targets? Mandatory
Environment Energy ESG-Environment-04b: What are the specific energy efficiency targets and their timelines? Mandatory
Environment Energy ESG-Environment-05a: Does the organization track and monitor energy consumption data? Mandatory
Environment Energy ESG-Environment-05b: Which systems or tools are used for tracking energy consumption? Mandatory

Social Health ESG-Social-01a: Does the organization have a documented health and safety policy? Mandatory
Social Health ESG-Social-01b: What are the main components of your health and safety policy? Mandatory
Social Health ESG-Social-02a: Is there a designated health and safety officer? Mandatory
Social Health ESG-Social-02b: What are the qualifications and responsibilities of the health and safety officer? Mandatory
Social Health ESG-Social-03a: Does the organization conduct regular safety training for employees? Mandatory
Social Health ESG-Social-03b: How often is safety training conducted and what topics are covered? Mandatory

Governance Management ESG-Governance-01a: Does the organization have a formal governance structure? Mandatory
Governance Management ESG-Governance-01b: Please describe the key components of your governance structure. Mandatory
Governance Management ESG-Governance-02a: Is there a board of directors or equivalent governing body? Mandatory
Governance Management ESG-Governance-02b: How many members are on the board and what are their roles? Mandatory
Governance Management ESG-Governance-03a: Does the organization have documented policies for ethics and compliance? Mandatory
Governance Management ESG-Governance-03b: What specific areas do these ethics and compliance policies cover? Mandatory
"""

    analyzer = ComprehensiveESGAnalyzer()
    
    print("Testing questionnaire extraction...")
    questionnaire_items = analyzer._extract_questionnaire_items(sample_text)
    
    print(f"\nExtracted {len(questionnaire_items)} questionnaire items:")
    
    categories = {"Environmental": 0, "Social": 0, "Governance": 0}
    follow_ups = 0
    
    for i, item in enumerate(questionnaire_items, 1):
        category = item.get("category", "Unknown")
        is_follow_up = item.get("is_follow_up", False)
        reference = item.get("reference_code", "")
        question = item.get("question_text", "")
        
        if category in categories:
            categories[category] += 1
        
        if is_follow_up:
            follow_ups += 1
            
        print(f"{i:2d}. [{category:13}] {reference:25} {'(Follow-up)' if is_follow_up else ''}")
        print(f"    {question[:80]}{'...' if len(question) > 80 else ''}")
        print()
    
    print("\nSummary:")
    print(f"Total questions: {len(questionnaire_items)}")
    print(f"Environmental: {categories['Environmental']}")
    print(f"Social: {categories['Social']}")
    print(f"Governance: {categories['Governance']}")
    print(f"Follow-up questions: {follow_ups}")
    
    # Check if all questions were extracted
    expected_total = 22  # Based on the sample above
    if len(questionnaire_items) == expected_total:
        print(f"✅ SUCCESS: All {expected_total} questions extracted correctly")
    else:
        print(f"❌ ISSUE: Expected {expected_total} questions, got {len(questionnaire_items)}")
        
    return questionnaire_items


if __name__ == "__main__":
    test_extraction()