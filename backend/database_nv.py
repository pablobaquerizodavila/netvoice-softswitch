from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
load_dotenv()

DB_HOST     = os.getenv("DB_HOST")
DB_PORT     = os.getenv("DB_PORT", "3306")
DB_USER     = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL_NV = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/netvoice"

engine_nv     = create_engine(DATABASE_URL_NV, pool_pre_ping=True)
SessionNV     = sessionmaker(autocommit=False, autoflush=False, bind=engine_nv)
BaseNV        = declarative_base()

def get_db_nv():
    db = SessionNV()
    try:
        yield db
    finally:
        db.close()
