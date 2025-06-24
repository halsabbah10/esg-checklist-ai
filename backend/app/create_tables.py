from database import engine
from models import SQLModel

if __name__ == "__main__":
    print("Creating tables in MySQL...")
    SQLModel.metadata.create_all(engine)
    print("Done.")
