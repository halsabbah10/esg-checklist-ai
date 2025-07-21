import pandas as pd
import re

# Read the Excel file
df = pd.read_excel('ESG-internal Audit-Checklist-Revised Dummy data.2.xlsx')

print("Analyzing document structure...")

# Find all rows with ESG reference codes
esg_rows = []
subtitle_rows = []

for i, row in df.iterrows():
    first_col = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
    
    # Check if it's an ESG question
    if 'ESG-' in first_col and ':' in first_col:
        esg_rows.append(i)
    # Check if it's a subtitle (standalone text, not ESG reference)
    elif first_col.strip() and not any(x in first_col for x in ['ESG-', 'Instructions', 'General Information', 'Audit Code', 'Audit Title', 'Completed by', 'Reviewed by', 'Objective', 'Audit Period', 'Reference Documents', 'CSRD', 'TCFD', 'UNSDG', 'GRI', 'CDP', 'SCA']):
        subtitle_rows.append(i)

print(f"Found {len(esg_rows)} ESG question rows")
print(f"Found {len(subtitle_rows)} subtitle rows")

print("\nSubtitle rows (these should be filtered out):")
for i in subtitle_rows:
    row = df.iloc[i]
    print(f"Row {i}: '{row.iloc[0]}'")

print("\nAnalyzing answer patterns in ESG questions:")
missing_count = 0
incomplete_count = 0
complete_count = 0

for i in esg_rows:
    row = df.iloc[i]
    question = str(row.iloc[0])
    answer_col = str(row.iloc[2]) if pd.notna(row.iloc[2]) else 'NaN'
    
    # Determine status based on answer content
    if answer_col == 'NaN' or answer_col.strip() == '':
        status = "Missing"
        missing_count += 1
    elif answer_col.strip() in ['Mandatory', 'Optional']:
        status = "Missing"  # These are requirement labels, not answers
        missing_count += 1
    elif answer_col.strip() in ['Yes', 'No', 'Not Available']:
        # Check if there are additional details required
        details_col = str(row.iloc[3]) if pd.notna(row.iloc[3]) else 'NaN'
        if '?' in question and details_col == 'NaN':
            status = "Incomplete"  # Answer exists but details are missing
            incomplete_count += 1
        else:
            status = "Complete"
            complete_count += 1
    else:
        # Other types of answers - evaluate based on content
        if len(answer_col.strip()) < 3:
            status = "Incomplete"
            incomplete_count += 1
        else:
            status = "Complete"
            complete_count += 1
    
    print(f"Row {i}: {question[:50]}...")
    print(f"  Answer: '{answer_col}'")
    print(f"  Status: {status}")
    print()

print(f"\nSUMMARY:")
print(f"Total ESG questions: {len(esg_rows)}")
print(f"Complete: {complete_count}")
print(f"Incomplete: {incomplete_count}")
print(f"Missing: {missing_count}")
print(f"Completion rate: {complete_count/len(esg_rows)*100:.1f}%")