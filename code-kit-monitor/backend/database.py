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

    # ── 轻量级 schema 迁移（开发环境）──
    # 添加 agent_memories.domain_id 列（如果不存在）
    try:
        if "sqlite" in DATABASE_URL:
            import sqlite3
            db_path = DATABASE_URL.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(agent_memories)")
            cols = [r[1] for r in cur.fetchall()]
            if "domain_id" not in cols:
                cur.execute("ALTER TABLE agent_memories ADD COLUMN domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL")
                conn.commit()
                print("[migrate] agent_memories.domain_id 列已添加")
            else:
                print("[migrate] agent_memories.domain_id 列已存在，跳过")
            conn.close()
    except Exception as e:
        print(f"[migrate] agent_memories 迁移跳过: {e}")


def get_db() -> Session:
    """FastAPI 依赖注入：获取数据库 session。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
