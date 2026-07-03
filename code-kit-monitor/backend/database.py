"""SQLAlchemy 数据库引擎与 session 管理."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "..", "platform.db")
)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True if "mysql" in DATABASE_URL else False,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """创建所有表（开发环境使用，生产用 Alembic）。"""
    from models import Base
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """FastAPI 依赖注入：获取数据库 session。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
