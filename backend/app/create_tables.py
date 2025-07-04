from app.database import engine
from app.models import SQLModel


def create_all_tables():
    SQLModel.metadata.create_all(engine)


if __name__ == "__main__":
    create_all_tables()
