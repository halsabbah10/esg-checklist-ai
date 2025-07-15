#!/usr/bin/env python3
"""
Test answer detection from Excel format
"""

import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.ai.comprehensive_analyzer import ComprehensiveESGAnalyzer


def test_answer_detection():
    """Test how well the system detects answers in Excel format"""
    
    # Sample text from the Excel showing question and answer structure
    sample_text = """Category Sub Category Reference Question Mandatory or Optional  Assessment Please Provide details Additional Comments
Environment  Energy  ESG-Environment-01a:  Is there a policy for reducing energy consumption?  Mandatory Yes  
Environment  Energy  ESG-Environment-01b:  Does the business unit have its own individual policy or follow the Group's policy? Mandatory   
Environment  Energy  ESG-Environment-02:  Is there any utilization of renewable resources as a source for energy? Mandatory Yes  
Environment  Energy  ESG-Environment-03a:  How is  energy consumption measured and reported?  Mandatory No  
Environment  Energy  ESG-Environment-03b: If yes, to whom is it reported? Mandatory   
Environment  Emissions ESG-Environment-04a:  How are carbon emissions monitored and reported?  Mandatory No  
Environment  Emissions ESG-Environment-04b:  If yes, to whom is it reported? Mandatory   
Environment  Emissions ESG-Environment-05:  5.What are the goals for reducing greenhouse gas (GHG) emissions?  Mandatory Not Available 
Environment  Emissions ESG-Environment-06:  6.Does the business entity have carbon reduction strategies (e.g., carbon offsetting)?  Mandatory No
"""

    analyzer = ComprehensiveESGAnalyzer()
    
    print("Testing answer detection from Excel format...")
    
    # Extract questionnaire items
    questionnaire_items = analyzer._extract_questionnaire_items(sample_text)
    
    print(f"\nExtracted {len(questionnaire_items)} questions")
    
    # Now test completeness evaluation
    from app.ai.scorer import AIScorer
    
    scorer = AIScorer()
    completeness_result = scorer.evaluate_checklist_completeness(sample_text, questionnaire_items)
    
    print(f"\nCompleteness evaluation results:")
    print(f"Total items: {completeness_result.get('summary', {}).get('total', 0)}")
    print(f"Complete: {completeness_result.get('summary', {}).get('complete', 0)}")
    print(f"Incomplete: {completeness_result.get('summary', {}).get('incomplete', 0)}")
    print(f"Missing: {completeness_result.get('summary', {}).get('missing', 0)}")
    print(f"Completion rate: {completeness_result.get('completion_rate', 0.0):.2%}")
    
    # Analyze specific items to see how answers are detected
    print(f"\nDetailed analysis of first 5 items:")
    for i, item in enumerate(completeness_result.get('items', [])[:5], 1):
        question = item.get('question_text', '')[:50] + '...' if len(item.get('question_text', '')) > 50 else item.get('question_text', '')
        status = item.get('status', 'unknown')
        evidence = item.get('evidence_found', [])
        score = item.get('completeness_score', 0.0)
        
        print(f"\n{i}. Question: {question}")
        print(f"   Status: {status} (Score: {score:.2f})")
        if evidence:
            print(f"   Evidence: {evidence[:2]}")  # Show first 2 pieces of evidence
        else:
            print(f"   Evidence: None found")
    
    # Test specific question-answer detection
    print(f"\n" + "="*50)
    print("SPECIFIC ANSWER DETECTION TEST")
    print("="*50)
    
    test_cases = [
        ("Is there a policy for reducing energy consumption?", "Should find 'Yes'"),
        ("How is energy consumption measured and reported?", "Should find 'No'"),
        ("What are the goals for reducing greenhouse gas emissions?", "Should find 'Not Available'"),
    ]
    
    for question, expected in test_cases:
        print(f"\nTesting: {question}")
        print(f"Expected: {expected}")
        
        answer_context = scorer._find_question_answer_context(sample_text.lower(), question)
        print(f"Found context: '{answer_context}'")
        
        if answer_context:
            relevance, quality, evidence = scorer._evaluate_answer_quality(answer_context, question)
            print(f"Relevance: {relevance:.2f}, Quality: {quality:.2f}")
            print(f"Evidence: {evidence}")
        else:
            relevance, evidence = scorer._evaluate_general_relevance(sample_text.lower(), question)
            print(f"General relevance: {relevance:.2f}")
            print(f"General evidence: {evidence}")


if __name__ == "__main__":
    test_answer_detection()