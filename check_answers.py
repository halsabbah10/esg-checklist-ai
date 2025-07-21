import pandas as pd

# Read the Excel file
df = pd.read_excel('ESG-internal Audit-Checklist-Revised Dummy data.2.xlsx')

print("Checking actual answer columns...")

# Find all rows with ESG reference codes
esg_rows = []
for i, row in df.iterrows():
    first_col = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
    if 'ESG-' in first_col and ':' in first_col:
        esg_rows.append(i)

print(f"Found {len(esg_rows)} ESG question rows")

# Check the first few rows to understand the structure
print("\nFirst 10 ESG questions with all columns:")
for i in esg_rows[:10]:
    row = df.iloc[i]
    print(f"Row {i}: {row.iloc[0][:50]}...")
    print(f"  Col 1: '{row.iloc[1]}'")
    print(f"  Col 2: '{row.iloc[2]}'")
    print(f"  Col 3: '{row.iloc[3]}'")
    print(f"  Col 4: '{row.iloc[4]}'")
    print(f"  Col 5: '{row.iloc[5]}'")
    print()

# Now let's check which ones actually have answers
print("Questions with actual answers:")
for i in esg_rows:
    row = df.iloc[i]
    question = str(row.iloc[0])
    
    # Check all columns for actual answers
    has_answer = False
    answer_location = None
    answer_value = None
    
    for col_idx in range(1, 6):
        col_val = str(row.iloc[col_idx]) if pd.notna(row.iloc[col_idx]) else ''
        col_val = col_val.strip()
        
        # Check if this column has an actual answer (not just Mandatory/Optional)
        if col_val and col_val not in ['Mandatory', 'Optional', 'nan', '']:
            has_answer = True
            answer_location = col_idx
            answer_value = col_val
            break
    
    if has_answer:
        print(f"Row {i}: {question[:50]}...")
        print(f"  Answer in col {answer_location}: '{answer_value}'")
        print()

print("\nLet's also check what the structure looks like in the first few rows:")
print(df.head(20).to_string())