from sqlmodel import create_engine, Session
import os
from dotenv import load_dotenv

load_dotenv()  # loads variables from .env

MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_PORT = os.getenv("MYSQL_PORT")
MYSQL_DB = os.getenv("MYSQL_DB")

DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

# Only log the database name for debugging, not credentials
print(f"Using DB: {MYSQL_DB} on {MYSQL_HOST}:{MYSQL_PORT}")

engine = create_engine(DATABASE_URL, echo=False)  # Disable SQL echo in production


def get_session():
    with Session(engine) as session:
        yield session