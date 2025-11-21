"""Seed data script for DHU Secondhand Books.
Ensures at least one seed seller user and two books.
Safe to run multiple times (idempotent-ish).
"""
from __future__ import annotations
import os, uuid, hashlib, sys
from decimal import Decimal
from sqlalchemy import text
# Insert project root into sys.path for direct script execution
ROOT_DIR = os.path.dirname(os.path.abspath(__file__)).rsplit('/', 1)[0]
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app.database import SessionLocal, engine
from backend.app.models.user import User
from backend.app.models.book import Book, ConditionLevel, BookStatus

def ensure_hashed_password_column():
    # Try adding hashed_password column if missing (MySQL <8 compatibility fallback)
    try:
        with engine.connect() as conn:
            # Prefer IF NOT EXISTS syntax (MySQL 8)
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(128) NULL"))
                conn.commit()
                return
            except Exception:
                # Fallback: detect manually
                db_name = os.getenv("DB_NAME", "dhu_secondhand_platform")
                exists = conn.execute(text("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:db AND TABLE_NAME='users' AND COLUMN_NAME='hashed_password'"), {"db": db_name}).scalar()
                if exists == 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(128) NULL"))
                    conn.commit()
    except Exception as e:
        print("[WARN] unable to ensure hashed_password column:", e)


def seed():
    db = SessionLocal()
    try:
        ensure_hashed_password_column()
        seller = db.query(User).filter(User.student_id == 'seed_seller').first()
        if not seller:
            seller = User(
                id=str(uuid.uuid4()),
                student_id='seed_seller',
                name='种子卖家',
                phone='13800000001',
                hashed_password=hashlib.sha256(b'seed123').hexdigest(),
            )
            db.add(seller)
            db.commit()
            db.refresh(seller)
            print('[SEED] Created seed seller user:', seller.id)
        # Ensure two demo books
        existing = db.query(Book).count()
        created = 0
        if existing < 2:
            demo_books = [
                dict(isbn='9787111122334', title='数据结构与算法解析', author='张三', original_price=Decimal('59.00'), selling_price=Decimal('25.00'), condition_level=ConditionLevel.good, description='仅封面轻微磨损'),
                dict(isbn='9787111445566', title='计算机操作系统精要', author='李四', original_price=Decimal('72.00'), selling_price=Decimal('30.00'), condition_level=ConditionLevel.fair, description='有少量笔记标记'),
            ]
            for data in demo_books:
                b = Book(
                    id=str(uuid.uuid4()),
                    seller_id=seller.id,
                    status=BookStatus.available,
                    **data,
                )
                db.add(b)
                created += 1
            db.commit()
            print(f'[SEED] Inserted {created} demo books')
        else:
            print('[SEED] Books already present:', existing)
        print('[SEED] Done.')
    finally:
        db.close()

if __name__ == '__main__':
    seed()
