from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from .database import get_db, Base, engine, SessionLocal
from sqlalchemy.orm import Session
from .models.book import Book, ConditionLevel, BookStatus
from .models.user import User
from sqlalchemy import text
import os

app = FastAPI(title="DHU Secondhand Books API", version="0.2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables if not exist for MVP simplicity (in production use alembic)
Base.metadata.create_all(bind=engine)

class BookOut(BaseModel):
    id: str
    isbn: str
    title: str
    author: str
    original_price: float
    selling_price: float
    condition_level: ConditionLevel
    description: str | None = None
    seller_id: str
    status: BookStatus

    class Config:
        from_attributes = True

class BookCreate(BaseModel):
    isbn: str
    title: str
    author: str
    original_price: float
    selling_price: float
    condition_level: ConditionLevel
    description: str | None = None
    seller_id: str

class UserCreate(BaseModel):
    student_id: str
    name: str
    phone: str
    password: str

class UserOut(BaseModel):
    id: str
    student_id: str
    name: str
    phone: str
    credit_score: int

    class Config:
        from_attributes = True

@app.get("/")
def root():
    return {"message": "DHU Secondhand Books API running", "docs": "/docs", "health": "/api/health"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    # Simple uniqueness checks
    if db.query(User).filter(User.student_id == payload.student_id).first():
        raise HTTPException(status_code=400, detail="student_id exists")
    import uuid, hashlib
    user = User(
        id=str(uuid.uuid4()),
        student_id=payload.student_id,
        name=payload.name,
        phone=payload.phone,
        hashed_password=hashlib.sha256(payload.password.encode()).hexdigest(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.get("/api/books", response_model=List[BookOut])
def list_books(q: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Book)
    if q:
        like = f"%{q}%"
        query = query.filter((Book.title.ilike(like)) | (Book.author.ilike(like)) | (Book.isbn.ilike(like)))
    return query.order_by(Book.created_at.desc()).limit(50).all()

@app.get("/api/books/{book_id}", response_model=BookOut)
def get_book(book_id: str, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")
    return b

@app.post("/api/books", response_model=BookOut)
def create_book(payload: BookCreate, db: Session = Depends(get_db)):
    seller = db.query(User).filter(User.id == payload.seller_id).first()
    if not seller:
        raise HTTPException(status_code=400, detail="Seller not found")
    import uuid
    new_book = Book(
        id=str(uuid.uuid4()),
        isbn=payload.isbn,
        title=payload.title,
        author=payload.author,
        original_price=payload.original_price,
        selling_price=payload.selling_price,
        condition_level=payload.condition_level,
        description=payload.description,
        seller_id=payload.seller_id,
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    return new_book

@app.on_event("startup")
def seed_data():
    # Ensure missing column hashed_password exists (added after initial schema)
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(128) NULL"))
                conn.commit()
            except Exception:
                # Fallback: check information_schema then add without IF NOT EXISTS if needed
                col_exists = conn.execute(text("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:db AND TABLE_NAME='users' AND COLUMN_NAME='hashed_password'"), {"db": os.getenv("DB_NAME", "dhu_secondhand_platform")}).scalar()
                if col_exists == 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(128) NULL"))
                    conn.commit()
    except Exception as e:
        print("[WARN] Unable to ensure hashed_password column:", e)
    db = SessionLocal()
    try:
        seller = db.query(User).filter(User.student_id == 'seed_seller').first()
        if not seller:
            import uuid, hashlib
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
        count = db.query(Book).count()
        if count < 2:
            import uuid
            b1 = Book(
                id=str(uuid.uuid4()),
                isbn='9787111122334',
                title='数据结构与算法解析',
                author='张三',
                original_price=59.00,
                selling_price=25.00,
                condition_level=ConditionLevel.good,
                description='仅封面轻微磨损',
                seller_id=seller.id,
            )
            b2 = Book(
                id=str(uuid.uuid4()),
                isbn='9787111445566',
                title='计算机操作系统精要',
                author='李四',
                original_price=72.00,
                selling_price=30.00,
                condition_level=ConditionLevel.fair,
                description='有少量笔记标记',
                seller_id=seller.id,
            )
            db.add_all([b1, b2])
            db.commit()
    finally:
        db.close()

@app.get("/api/debug/info")
def debug_info(db: Session = Depends(get_db)):
    return {
        "users": db.query(User).count(),
        "books": db.query(Book).count(),
    }
