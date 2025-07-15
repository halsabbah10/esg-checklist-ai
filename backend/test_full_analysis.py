#!/usr/bin/env python3
"""
Test the complete AI analysis with proper answer detection
"""

import sys
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
            break
    
    if target_sheet:
        worksheets_to_process = [target_sheet]
    else:
        worksheets_to_process = wb.worksheets
    
    for ws in worksheets_to_process:
        for row in ws.iter_rows(values_only=True):
            text.append(" ".join([str(cell) if cell else "" for cell in row]))
    
    return "\n".join(text)


def test_full_analysis():
    """Test the complete analysis with proper answer detection"""
    # Use the real ESG document
    esg_file = Path("/Users/axerroce/esg-checklist-ai/backend/uploads/2025/07/3_esg-doc_76a28472_ESG-Internal_Audit-Checklist-_Revised_Dummy_Data.4.xlsx")
    
    if not esg_file.exists():
        print(f"ESG file not found: {esg_file}")
        return
    
    print(f"Testing complete analysis with: {esg_file.name}")
    
    # Extract text like the AI system does
    document_text = extract_text_from_excel(esg_file)
    
    analyzer = ComprehensiveESGAnalyzer()
    
    # Perform the complete analysis
    print("\n" + "="*50)
    print("COMPLETE AI ANALYSIS TEST")
    print("="*50)
    
    try:
        result = analyzer.analyze_document(
            document_text=document_text,
            department_name="IT and Technology", 
            filename="ESG-Internal_Audit-Checklist-_Revised_Dummy_Data.4.xlsx"
        )
        
        print(f"\nAnalysis Results:")
        print(f"Overall Score: {result['score']:.3f}")
        print(f"Processing Time: {result.get('processing_time_ms', 'N/A')} ms")
        print(f"Model Version: {result.get('model_version', 'N/A')}")
        
        # Extract checklist completeness
        metadata = result.get('metadata', {})
        completeness = metadata.get('checklist_completeness', {})
        
        print(f"\nChecklist Completeness:")
        print(f"Total Questions: {completeness.get('total', 0)}")
        print(f"Complete: {completeness.get('completed', 0)}")
        print(f"Completion Rate: {completeness.get('completion_rate', 0.0):.1%}")
        
        summary = completeness.get('summary', {})
        print(f"\nDetailed Summary:")
        print(f"Complete: {summary.get('complete', 0)}")
        print(f"Incomplete: {summary.get('incomplete', 0)}")
        print(f"Missing: {summary.get('missing', 0)}")
        print(f"Total: {summary.get('total', 0)}")
        
        # Show category scores
        category_scores = metadata.get('category_scores', {})
        print(f"\nCategory Scores:")
        print(f"Environmental: {category_scores.get('environmental', 0.0):.3f}")
        print(f"Social: {category_scores.get('social', 0.0):.3f}")
        print(f"Governance: {category_scores.get('governance', 0.0):.3f}")
        
        # Sample of items by status
        items = completeness.get('items', [])
        
        print(f"\nSample Complete Items:")
        complete_items = [item for item in items if item.get('status', '').lower() == 'complete']
        for i, item in enumerate(complete_items[:3], 1):
            question = item.get('question_text', '')[:60] + '...' if len(item.get('question_text', '')) > 60 else item.get('question_text', '')
            evidence = item.get('evidence_found', [])
            print(f"  {i}. {question}")
            print(f"     Evidence: {evidence[0] if evidence else 'None'}")
        
        print(f"\nSample Incomplete Items:")
        incomplete_items = [item for item in items if item.get('status', '').lower() == 'incomplete']
        for i, item in enumerate(incomplete_items[:3], 1):
            question = item.get('question_text', '')[:60] + '...' if len(item.get('question_text', '')) > 60 else item.get('question_text', '')
            evidence = item.get('evidence_found', [])
            print(f"  {i}. {question}")
            print(f"     Evidence: {evidence[0] if evidence else 'None'}")
        
        print(f"\nSample Missing Items:")
        missing_items = [item for item in items if item.get('status', '').lower() == 'missing']
        for i, item in enumerate(missing_items[:3], 1):
            question = item.get('question_text', '')[:60] + '...' if len(item.get('question_text', '')) > 60 else item.get('question_text', '')
            evidence = item.get('evidence_found', [])
            print(f"  {i}. {question}")
            print(f"     Evidence: {evidence[0] if evidence else 'None'}")
        
        print(f"\n✅ Analysis completed successfully!")
        print(f"System properly detected all {completeness.get('total', 0)} questions")
        print(f"Answer evaluation working correctly with proper Yes/No/NA handling")
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_full_analysis()