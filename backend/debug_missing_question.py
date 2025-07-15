#!/usr/bin/env python3
"""
Debug the missing question issue
"""

import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.ai.comprehensive_analyzer import ComprehensiveESGAnalyzer


def debug_missing_question():
    """Debug why ESG-Environment-04b is not being extracted"""
    # The problematic line
    problem_line = "Environment  Emissions ESG-Environment-04b:  If yes, to whom is it reported? Mandatory"
    
    print(f"Debugging line: {problem_line}")
    
    analyzer = ComprehensiveESGAnalyzer()
    
    # Test the extraction step by step
    print("\n1. Testing _extract_question_from_line()...")
    result = analyzer._extract_question_from_line(problem_line, 9)
    
    if result:
        print(f"   ✅ _extract_question_from_line() returned:")
        for key, value in result.items():
            print(f"      {key}: {value}")
    else:
        print(f"   ❌ _extract_question_from_line() returned None")
        
        # Let's debug why
        print("\n2. Testing individual components...")
        
        # Test section header check
        is_section = analyzer._is_section_header(problem_line)
        print(f"   _is_section_header(): {is_section}")
        
        # Test excel metadata check
        is_excel_meta = analyzer._is_excel_metadata(problem_line)
        print(f"   _is_excel_metadata(): {is_excel_meta}")
        
        # Test reference match
        import re
        reference_match = re.search(r'(ESG-(Environment|Social|Governance)-\\d+[a-z]?):', problem_line, re.IGNORECASE)
        print(f"   reference_match: {reference_match.group(1) if reference_match else None}")
        
        # Test question mark
        has_question_mark = '?' in problem_line
        print(f"   has_question_mark: {has_question_mark}")
        
        # Test question text extraction
        question_text = analyzer._extract_clean_question_from_line(problem_line)
        print(f"   question_text: '{question_text}' (length: {len(question_text)})")
        
        if len(question_text) < 8:
            print(f"   ❌ Question text too short (< 8 chars): '{question_text}'")
        else:
            print(f"   ✅ Question text length OK")
    
    # Test with a few more variations to see the pattern
    print("\n3. Testing similar questions...")
    
    test_lines = [
        "Environment  Energy  ESG-Environment-03b: If yes, to whom is it reported? Mandatory",
        "Environment  Water ESG-Environment-08b:  Who is it reported to?",
        "Environment  Emissions ESG-Environment-04b:  If yes, to whom is it reported? Mandatory"
    ]
    
    for i, test_line in enumerate(test_lines, 1):
        print(f"\n   Test {i}: {test_line[:50]}...")
        result = analyzer._extract_question_from_line(test_line, i)
        if result:
            print(f"      ✅ Extracted: '{result['question_text']}'")
        else:
            print(f"      ❌ Failed to extract")
            question_text = analyzer._extract_clean_question_from_line(test_line)
            print(f"         Clean text: '{question_text}' (length: {len(question_text)})")


if __name__ == "__main__":
    debug_missing_question()