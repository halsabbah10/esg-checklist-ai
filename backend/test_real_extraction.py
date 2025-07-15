#!/usr/bin/env python3
"""
Test the questionnaire extraction from the real ESG document
"""

import sys
import os
from pathlib import Path
import openpyxl

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.ai.comprehensive_analyzer import ComprehensiveESGAnalyzer


def extract_text_from_excel(file_path):
    """Extract text from Excel file like the AI analysis system does"""
    wb = openpyxl.load_workbook(file_path)
    text = []
    
    # Find the ESG questionnaires sheet
    target_sheet = None
    for ws in wb.worksheets:
        if "esg" in ws.title.lower() and (
            "questionnaire" in ws.title.lower() or "question" in ws.title.lower()
        ):
            target_sheet = ws
            print(f"Found ESG questionnaires sheet: '{ws.title}'")
            break
    
    if target_sheet:
        worksheets_to_process = [target_sheet]
        print(f"Processing only the ESG questionnaires sheet: '{target_sheet.title}'")
    else:
        worksheets_to_process = wb.worksheets
        print("No ESG questionnaires sheet found, processing all sheets")
    
    for ws in worksheets_to_process:
        for row in ws.iter_rows(values_only=True):
            text.append(" ".join([str(cell) if cell else "" for cell in row]))
    
    return "\n".join(text)


def test_real_extraction():
    """Test questionnaire extraction from real ESG document"""
    # Use one of the uploaded files
    esg_file = Path("/Users/axerroce/esg-checklist-ai/backend/uploads/2025/07/3_esg-doc_76a28472_ESG-Internal_Audit-Checklist-_Revised_Dummy_Data.4.xlsx")
    
    if not esg_file.exists():
        print(f"ESG file not found: {esg_file}")
        return
    
    print(f"Testing extraction from: {esg_file.name}")
    
    # Extract text like the AI system does
    document_text = extract_text_from_excel(esg_file)
    print(f"Document text length: {len(document_text)} characters")
    
    # Show sample of the text
    print(f"\nSample text (first 1000 chars):")
    print(document_text[:1000])
    print("\n" + "="*50 + "\n")
    
    analyzer = ComprehensiveESGAnalyzer()
    
    print("Testing questionnaire extraction...")
    questionnaire_items = analyzer._extract_questionnaire_items(document_text)
    
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
        
        if i % 10 == 0:  # Add spacing every 10 items
            print()
    
    print("\nSummary:")
    print(f"Total questions: {len(questionnaire_items)}")
    print(f"Environmental: {categories['Environmental']}")
    print(f"Social: {categories['Social']}")
    print(f"Governance: {categories['Governance']}")
    print(f"Follow-up questions: {follow_ups}")
    
    # Check if all 69 questions were extracted
    expected_total = 69
    if len(questionnaire_items) == expected_total:
        print(f"✅ SUCCESS: All {expected_total} questions extracted correctly")
    else:
        print(f"❌ ISSUE: Expected {expected_total} questions, got {len(questionnaire_items)}")
        print(f"Missing: {expected_total - len(questionnaire_items)} question(s)")
        
        # Let's analyze the document more to find what we're missing
        print("\nAnalyzing document for missed questions...")
        
        lines = document_text.split("\n")
        potential_questions = []
        
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
                
            # Look for ESG reference patterns
            if "ESG-" in line and (":" in line):
                potential_questions.append((line_num, line))
        
        print(f"\nFound {len(potential_questions)} lines with ESG reference patterns:")
        for line_num, line in potential_questions:
            print(f"Line {line_num:3d}: {line[:100]}{'...' if len(line) > 100 else ''}")
        
        print(f"\nTotal potential ESG reference lines: {len(potential_questions)}")
        print(f"Successfully extracted: {len(questionnaire_items)}")
        print(f"Difference: {len(potential_questions) - len(questionnaire_items)}")
        
        # Let's find the specific missing line
        extracted_refs = set()
        for item in questionnaire_items:
            ref = item.get("reference_code", "")
            if ref:
                extracted_refs.add(ref)
        
        print(f"\nAnalyzing missing references...")
        all_refs = set()
        missing_lines = []
        
        for line_num, line in potential_questions:
            # Extract reference from the line
            import re
            ref_match = re.search(r'(ESG-[A-Za-z]+-[0-9]+[a-z]?)', line)
            if ref_match:
                ref = ref_match.group(1)
                all_refs.add(ref)
                if ref not in extracted_refs:
                    missing_lines.append((line_num, line, ref))
        
        if missing_lines:
            print(f"Missing {len(missing_lines)} reference(s):")
            for line_num, line, ref in missing_lines:
                print(f"  Line {line_num}: {ref}")
                print(f"    Content: {line[:150]}{'...' if len(line) > 150 else ''}")
        else:
            print("No missing references found (this might be a duplicate detection issue)")
        
    return questionnaire_items


if __name__ == "__main__":
    test_real_extraction()