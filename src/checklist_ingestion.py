import pandas as pd


def load_checklist(file_path):
    """
    Load an ESG checklist from Excel into a DataFrame.
    """
    try:
        df = pd.read_excel(file_path)
        print("[INFO] Checklist loaded successfully.")
        return df
    except Exception as e:
        print(f"[ERROR] Failed to load checklist: {e}")
        return None


# Example use
if __name__ == "__main__":
    checklist = load_checklist("../data/sample_checklist.xlsx")
    if checklist is not None:
        print(checklist.head())
