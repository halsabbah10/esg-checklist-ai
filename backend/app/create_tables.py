from app.database import engine
from app.models import SQLModel


def create_all_tables():
    print("Creating tables in database...")
    SQLModel.metadata.create_all(engine)
    print("Done.")


if __name__ == "__main__":
    create_all_tables()
