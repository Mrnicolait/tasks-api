

from sqlalchemy import create_engine
from sqlmodel import Field, SQLModel, Session


postgres_url = "postgresql+psycopg://admin:admin123@localhost:5432/tasks"

connect_args = {}
engine = create_engine(postgres_url, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session