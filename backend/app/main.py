from fastapi import FastAPI, HTTPException, Depends, Request, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel
from typing import List
from .database import get_db, Base, engine, SessionLocal
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, func
from .models.book import Book, ConditionLevel, BookStatus
from .models.user import User
from .models.order import Order, OrderStatus, DeliveryMethod, PaymentMethod, PaymentStatus
from .models.delivery_task import DeliveryTask, DeliveryTaskStatus
from .models.favorite import Favorite
from .models.review import Review, ReviewRole
from .models.category import BookCategory
import os
from pathlib import Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
import hashlib, uuid, datetime, secrets
import json
from .models.book_image import BookImage

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
    publisher: str | None = None
    publish_year: int | None = None
    publish_date: datetime.date | None = None
    edition: str | None = None
    category_id: int | None = None
    category_name: str | None = None
    original_price: float
    selling_price: float
    condition_level: ConditionLevel
    condition_description: str | None = None
    description: str | None = None
    cover_image: str | None = None
    gallery_images: list[str] | None = None
    seller_id: str
    status: BookStatus
    favorite_count: int
    view_count: int
    images: list[dict] | None = None

    class Config:
        from_attributes = True

class BookCreate(BaseModel):
    isbn: str
    title: str
    author: str
    publisher: str | None = None
    publish_year: int | None = None
    publish_date: datetime.date | None = None
    edition: str | None = None
    category_id: int
    original_price: float
    selling_price: float
    condition_level: ConditionLevel
    condition_description: str | None = None
    description: str | None = None
    cover_image: str
    gallery_images: list[str]
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

class UserListOut(BaseModel):
    id: str
    student_id: str
    name: str
    phone: str
    credit_score: int
    is_active: bool

    class Config:
        from_attributes = True

class BookStatusUpdate(BaseModel):
    status: BookStatus

class OrderCreate(BaseModel):
    book_id: str
    buyer_id: str
    delivery_method: DeliveryMethod
    meetup_location: str | None = None
    meetup_time: str | None = None  # ISO datetime
    payment_method: PaymentMethod | None = None
    pickup_location: str | None = None
    delivery_location: str | None = None

class OrderOut(BaseModel):
    id: str
    order_number: str
    book_id: str
    buyer_id: str
    seller_id: str
    book_price: float
    delivery_fee: float
    total_amount: float
    status: OrderStatus
    delivery_method: DeliveryMethod
    meetup_location: str | None = None
    meetup_time: str | None = None
    payment_method: PaymentMethod | None = None
    payment_status: PaymentStatus
    paid_at: datetime.datetime | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    completed_at: datetime.datetime | None = None
    cancelled_at: datetime.datetime | None = None
    payment_due_at: datetime.datetime | None = None
    pickup_location: str | None = None
    delivery_location: str | None = None

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    payment_status: PaymentStatus | None = None

class PaymentConfirmPayload(BaseModel):
    payment_method: PaymentMethod | None = None

class BookUpdate(BaseModel):
    isbn: str | None = None
    title: str | None = None
    author: str | None = None
    publisher: str | None = None
    publish_year: int | None = None
    publish_date: datetime.date | None = None
    edition: str | None = None
    category_id: int | None = None
    original_price: float | None = None
    selling_price: float | None = None
    condition_level: ConditionLevel | None = None
    condition_description: str | None = None
    description: str | None = None
    cover_image: str | None = None
    gallery_images: list[str] | None = None
    status: BookStatus | None = None

class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    is_active: bool | None = None

class UserPasswordUpdate(BaseModel):
    old_password: str
    new_password: str

class LoginPayload(BaseModel):
    student_id: str
    password: str

class AuthToken(BaseModel):
    access_token: str
    user_id: str
    student_id: str
    name: str

# Simple in-memory token store for MVP
TOKEN_STORE: dict[str, dict] = {}
security = HTTPBearer()

# Authentication dependency
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = creds.credentials
    data = TOKEN_STORE.get(token)
    if not data:
        raise HTTPException(status_code=401, detail="Invalid token")
    u = db.query(User).filter(User.id == data['user_id']).first()
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return u

TEMPLATE_DIR = Path(__file__).parent / 'templates'
UPLOAD_DIR = Path(__file__).resolve().parents[1] / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=select_autoescape(['html','xml']))

# Serve uploaded assets
app.mount('/uploads', StaticFiles(directory=str(UPLOAD_DIR)), name='uploads')

PAYMENT_WINDOW_MINUTES = int(os.getenv("PAYMENT_WINDOW_MINUTES", "15"))

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
def list_books(q: str | None = None, category_id: int | None = None, include_status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Book)
    if not include_status:
        query = query.filter(Book.status == BookStatus.available)
    else:
        try:
            statuses = [BookStatus[s.strip()] for s in include_status.split(',') if s.strip()]
            if statuses:
                query = query.filter(Book.status.in_(statuses))
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
    if q:
        like = f"%{q}%"
        query = query.filter((Book.title.ilike(like)) | (Book.author.ilike(like)) | (Book.isbn.ilike(like)))
    if category_id:
        query = query.filter(Book.category_id == category_id)
    books = query.order_by(Book.created_at.desc()).limit(50).all()
    return [serialize_book(b) for b in books]

@app.get("/api/books/{book_id}", response_model=BookOut)
def get_book(book_id: str, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")
    return serialize_book(b)

@app.post("/api/books", response_model=BookOut)
def create_book(payload: BookCreate, db: Session = Depends(get_db)):
    seller = db.query(User).filter(User.id == payload.seller_id).first()
    if not seller:
        raise HTTPException(status_code=400, detail="Seller not found")
    category = db.query(BookCategory).filter(BookCategory.id == payload.category_id, BookCategory.is_active == True).first()  # noqa: E712
    if not category:
        raise HTTPException(status_code=400, detail="分类不存在或已停用")
    import uuid
    new_book = Book(
        id=str(uuid.uuid4()),
        isbn=payload.isbn,
        title=payload.title,
        author=payload.author,
        publisher=payload.publisher,
        publish_date=payload.publish_date,
        publish_year=payload.publish_year,
        edition=payload.edition,
        original_price=payload.original_price,
        selling_price=payload.selling_price,
        condition_level=payload.condition_level,
        condition_description=payload.condition_description,
        description=payload.description,
        cover_image=payload.cover_image,
        gallery_images=json.dumps(payload.gallery_images),
        seller_id=payload.seller_id,
        category_id=payload.category_id,
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    return serialize_book(new_book)

@app.on_event("startup")
def seed_data():
    # Ensure missing column hashed_password exists (added after initial schema)
    try:
        with engine.connect() as conn:
            db_name = os.getenv("DB_NAME", "dhu_secondhand_platform")
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(128) NULL"))
                conn.commit()
            except Exception:
                # Fallback: check information_schema then add without IF NOT EXISTS if needed
                col_exists = conn.execute(text("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:db AND TABLE_NAME='users' AND COLUMN_NAME='hashed_password'"), {"db": db_name}).scalar()
                if col_exists == 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(128) NULL"))
                    conn.commit()
            order_columns = []
            # Ensure books table has newer columns added after initial schema
            book_columns = [
                ("publish_date", "DATE NULL"),
                ("publish_year", "INT NULL"),
                ("edition", "VARCHAR(50) NULL"),
                ("category_id", "INT NULL"),
                ("cover_image", "TEXT NULL"),
                ("gallery_images", "TEXT NULL"),
                ("condition_description", "TEXT NULL"),
            ]
            for column, ddl in book_columns:
                try:
                    conn.execute(text(f"ALTER TABLE books ADD COLUMN IF NOT EXISTS {column} {ddl}"))
                    conn.commit()
                except Exception:
                    exists = conn.execute(text("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:db AND TABLE_NAME='books' AND COLUMN_NAME=:col"), {"db": db_name, "col": column}).scalar()
                    if exists == 0:
                        conn.execute(text(f"ALTER TABLE books ADD COLUMN {column} {ddl}"))
                        conn.commit()
            # Ensure reviews table has book_id column for joins used by ORM
            review_columns = [
                ("book_id", "VARCHAR(36) NULL"),
            ]
            for column, ddl in review_columns:
                try:
                    conn.execute(text(f"ALTER TABLE reviews ADD COLUMN IF NOT EXISTS {column} {ddl}"))
                    conn.commit()
                except Exception:
                    exists = conn.execute(text("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:db AND TABLE_NAME='reviews' AND COLUMN_NAME=:col"), {"db": db_name, "col": column}).scalar()
                    if exists == 0:
                        conn.execute(text(f"ALTER TABLE reviews ADD COLUMN {column} {ddl}"))
                        conn.commit()
            try:
                conn.execute(text("UPDATE reviews r JOIN orders o ON r.order_id = o.id SET r.book_id = o.book_id WHERE r.book_id IS NULL"))
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        print("[WARN] Unable to ensure schema columns:", e)
    db = SessionLocal()
    try:
        if db.query(BookCategory).count() == 0:
            base_categories = [
                ("教材类", "各专业课程教材", 1),
                ("教辅类", "考试辅导书籍", 2),
                ("文学类", "小说、散文等文学作品", 3),
                ("科技类", "计算机、工程技术等", 4),
                ("经济类", "经济、管理、金融", 5),
                ("艺术类", "美术、音乐、设计", 6),
                ("外语类", "外语学习书籍", 7),
                ("其他", "其他类别书籍", 8),
            ]
            for name, desc, order in base_categories:
                db.add(BookCategory(name=name, description=desc, sort_order=order))
            db.commit()
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

@app.get("/api/users", response_model=List[UserListOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).limit(100).all()

@app.patch("/api/books/{book_id}/status", response_model=BookOut)
def update_book_status(book_id: str, payload: BookStatusUpdate, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")
    b.status = payload.status
    db.commit()
    db.refresh(b)
    return b

@app.post("/api/orders", response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == payload.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.status != BookStatus.available:
        raise HTTPException(status_code=400, detail="Book not available")
    if book.seller_id == payload.buyer_id:
        raise HTTPException(status_code=400, detail="Cannot purchase your own listing")
    buyer = db.query(User).filter(User.id == payload.buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    seller = db.query(User).filter(User.id == book.seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    import uuid, datetime
    # Simple order number: YYYYMMDDHHMMSS + 6 hex
    order_number = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:6]
    if payload.delivery_method == DeliveryMethod.delivery and (not payload.pickup_location or not payload.delivery_location):
        raise HTTPException(status_code=400, detail="配送方式需要取书和送书地址")
    delivery_fee = 0 if payload.delivery_method == DeliveryMethod.meetup else 5
    total_amount = float(book.selling_price) + delivery_fee
    meetup_time_dt = None
    if payload.meetup_time:
        try:
            meetup_time_dt = datetime.datetime.fromisoformat(payload.meetup_time.replace('Z','+00:00'))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid meetup_time format")
    new_order = Order(
        id=str(uuid.uuid4()),
        order_number=order_number,
        book_id=book.id,
        buyer_id=buyer.id,
        seller_id=seller.id,
        book_price=book.selling_price,
        delivery_fee=delivery_fee,
        total_amount=total_amount,
        status=OrderStatus.pending,
        delivery_method=payload.delivery_method,
        meetup_location=payload.meetup_location,
        meetup_time=meetup_time_dt,
        payment_method=payload.payment_method,
        payment_status=PaymentStatus.pending,
    )
    book.status = BookStatus.reserved
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    db.refresh(book)
    if payload.delivery_method == DeliveryMethod.delivery:
        task = DeliveryTask(
            id=str(uuid.uuid4()),
            order_id=new_order.id,
            pickup_location=payload.pickup_location,
            delivery_location=payload.delivery_location,
            delivery_fee=delivery_fee,
            status=DeliveryTaskStatus.pending
        )
        db.add(task)
        db.commit()
    return new_order

def serialize_order_with_delivery(order: Order, db: Session) -> dict:
    """将订单和配送任务合并序列化"""
    order_dict = {
        'id': order.id,
        'order_number': order.order_number,
        'book_id': order.book_id,
        'buyer_id': order.buyer_id,
        'seller_id': order.seller_id,
        'book_price': float(order.book_price),
        'delivery_fee': float(order.delivery_fee),
        'total_amount': float(order.total_amount),
        'status': order.status,
        'delivery_method': order.delivery_method,
        'meetup_location': order.meetup_location,
        'meetup_time': order.meetup_time.isoformat() if order.meetup_time else None,
        'payment_method': order.payment_method,
        'payment_status': order.payment_status,
        'paid_at': order.paid_at.isoformat() if order.paid_at else None,
        'created_at': order.created_at.isoformat() if order.created_at else None,
        'updated_at': order.updated_at.isoformat() if order.updated_at else None,
        'completed_at': order.completed_at.isoformat() if order.completed_at else None,
        'cancelled_at': order.cancelled_at.isoformat() if order.cancelled_at else None,
        'payment_due_at': None,
        'pickup_location': None,
        'delivery_location': None,
    }

    # 计算支付截止时间（创建后15分钟）
    if order.payment_status == PaymentStatus.pending and order.created_at:
        import datetime
        due = order.created_at + datetime.timedelta(minutes=15)
        order_dict['payment_due_at'] = due.isoformat()

    # 如果是配送订单，从delivery_task获取地点信息
    if order.delivery_method == DeliveryMethod.delivery:
        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order.id).first()
        if task:
            order_dict['pickup_location'] = task.pickup_location
            order_dict['delivery_location'] = task.delivery_location

    return order_dict

@app.get("/api/orders", response_model=List[OrderOut])
def list_orders(buyer_id: str | None = None, seller_id: str | None = None, status: OrderStatus | None = None, db: Session = Depends(get_db)):
    q = db.query(Order)
    if buyer_id:
        q = q.filter(Order.buyer_id == buyer_id)
    if seller_id:
        q = q.filter(Order.seller_id == seller_id)
    if status:
        q = q.filter(Order.status == status)
    orders = q.order_by(Order.created_at.desc()).limit(100).all()
    return [serialize_order_with_delivery(o, db) for o in orders]

@app.get("/api/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order_with_delivery(o, db)

@app.patch("/api/orders/{order_id}", response_model=OrderOut)
def update_order(order_id: str, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    # Basic transitions
    o.status = payload.status
    if payload.payment_status:
        o.payment_status = payload.payment_status
    if payload.status == OrderStatus.completed:
        import datetime
        o.completed_at = datetime.datetime.utcnow()
        book = db.query(Book).filter(Book.id == o.book_id).first()
        if book:
            book.status = BookStatus.sold
    elif payload.status == OrderStatus.cancelled:
        import datetime
        o.cancelled_at = datetime.datetime.utcnow()
        book = db.query(Book).filter(Book.id == o.book_id).first()
        if book and book.status != BookStatus.sold:
            book.status = BookStatus.available
    db.commit()
    db.refresh(o)
    return o

class OrderDeliveryRequest(BaseModel):
    pickup_location: str
    delivery_location: str
    delivery_fee: float
    preferred_time: str | None = None

@app.post('/api/orders/{order_id}/delivery_request', response_model=OrderOut)
def request_order_delivery(
    order_id: str,
    payload: OrderDeliveryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """申请配送服务，更新订单配送信息并创建/更新配送任务"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail='无权操作此订单')
    if order.payment_status != PaymentStatus.pending:
        raise HTTPException(status_code=400, detail='订单已支付，无法修改配送')

    # 更新订单配送信息
    order.delivery_method = DeliveryMethod.delivery
    order.delivery_fee = payload.delivery_fee
    if payload.preferred_time:
        order.meetup_time = payload.preferred_time

    # 重新计算总金额
    order.total_amount = float(order.book_price) + float(payload.delivery_fee)

    # 检查是否已存在配送任务
    existing_task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order_id).first()

    if existing_task:
        # 更新现有任务
        existing_task.pickup_location = payload.pickup_location
        existing_task.delivery_location = payload.delivery_location
        existing_task.delivery_fee = payload.delivery_fee
    else:
        # 创建新配送任务
        new_task = DeliveryTask(
            id=str(uuid.uuid4()),
            order_id=order.id,
            pickup_location=payload.pickup_location,
            delivery_location=payload.delivery_location,
            delivery_fee=payload.delivery_fee,
            status=DeliveryTaskStatus.pending
        )
        db.add(new_task)

    db.commit()
    db.refresh(order)
    return serialize_order_with_delivery(order, db)

@app.get('/admin', response_class=HTMLResponse)
def admin_books(db: Session = Depends(get_db)):
    books = db.query(Book).order_by(Book.created_at.desc()).limit(100).all()
    categories = db.query(BookCategory).order_by(BookCategory.sort_order.asc(), BookCategory.id.asc()).all()
    tpl = _env.get_template('admin_books.html')
    return tpl.render(
        page_title='书籍管理',
        active='books',
        books=books,
        categories=categories,
        year=__import__('datetime').datetime.utcnow().year,
    )

@app.get('/admin/categories', response_class=HTMLResponse)
def admin_categories(db: Session = Depends(get_db)):
    categories = db.query(BookCategory).order_by(BookCategory.sort_order.asc(), BookCategory.id.asc()).all()
    counts = dict(db.query(Book.category_id, func.count('*')).group_by(Book.category_id).all())
    tpl = _env.get_template('admin_categories.html')
    return tpl.render(page_title='书籍分类编辑', active='categories', categories=categories, counts=counts, year=__import__('datetime').datetime.utcnow().year)

@app.get('/admin/books/new', response_class=HTMLResponse)
def admin_book_new(db: Session = Depends(get_db)):
    categories = db.query(BookCategory).filter(BookCategory.is_active == True).order_by(BookCategory.sort_order.asc(), BookCategory.id.asc()).all()
    tpl = _env.get_template('admin_book_form.html')
    return tpl.render(page_title='添加书籍', active='books', categories=categories, book=None, action='/admin/books/create', year=__import__('datetime').datetime.utcnow().year)

@app.get('/admin/books/{book_id}/edit', response_class=HTMLResponse)
def admin_book_edit(book_id: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail='Book not found')
    categories = db.query(BookCategory).filter(BookCategory.is_active == True).order_by(BookCategory.sort_order.asc(), BookCategory.id.asc()).all()
    tpl = _env.get_template('admin_book_form.html')
    return tpl.render(page_title='编辑书籍', active='books', categories=categories, book=book, action=f'/admin/books/{book_id}/edit', year=__import__('datetime').datetime.utcnow().year)

# Admin create book
@app.post('/admin/books/create', response_class=HTMLResponse)
async def admin_create_book(request: Request, cover_file: UploadFile | None = File(None), db: Session = Depends(get_db)):
    form = await request.form()
    required = ['isbn','title','author','original_price','selling_price','condition_level','seller_id']
    for f in required:
        if not form.get(f):
            raise HTTPException(status_code=400, detail=f'{f} required')
    seller = db.query(User).filter(User.id == form['seller_id']).first()
    if not seller:
        raise HTTPException(status_code=400, detail='seller_id invalid')
    cat_id = form.get('category_id')
    category = None
    if cat_id:
        category = db.query(BookCategory).filter(BookCategory.id == int(cat_id)).first()
    cover_url = form.get('cover_image') or None
    if cover_file and cover_file.filename:
        ext = Path(cover_file.filename).suffix.lower()
        allowed = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        if ext not in allowed:
            raise HTTPException(status_code=400, detail='不支持的图片格式')
        data = await cover_file.read()
        if len(data) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail='图片大小不能超过5MB')
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / filename
        with open(dest, 'wb') as f:
            f.write(data)
        cover_url = f"/uploads/{filename}"
    b = Book(
        id=str(uuid.uuid4()),
        isbn=form['isbn'].strip(),
        title=form['title'].strip(),
        author=form['author'].strip(),
        original_price=float(form['original_price']),
        selling_price=float(form['selling_price']),
        condition_level=ConditionLevel(form['condition_level']),
        description=form.get('description'),
        seller_id=form['seller_id'],
        category_id=category.id if category else None,
        cover_image=cover_url,
    )
    db.add(b); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />创建成功')

@app.post('/admin/books/{book_id}/edit', response_class=HTMLResponse)
async def admin_edit_book(book_id: str, request: Request, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Book not found')
    form = await request.form()
    updatable = ['isbn','title','author','original_price','selling_price','condition_level','description','cover_image','publisher','edition']
    for field in updatable:
        val = form.get(field)
        if val is not None and val != '':
            if field in ['original_price','selling_price']:
                setattr(b, field, float(val))
            elif field == 'condition_level':
                setattr(b, field, ConditionLevel(val))
            else:
                setattr(b, field, val.strip())
    cat_id = form.get('category_id')
    if cat_id is not None:
        if cat_id == '':
            b.category_id = None
        else:
            cat = db.query(BookCategory).filter(BookCategory.id == int(cat_id), BookCategory.is_active == True).first()  # noqa: E712
            if not cat:
                raise HTTPException(status_code=400, detail='分类不存在或已停用')
            b.category_id = cat.id
    status_val = form.get('status')
    if status_val:
        b.status = BookStatus(status_val)
    db.commit(); db.refresh(b)
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />已更新')

# Admin category create
@app.post('/admin/book_categories/create', response_class=HTMLResponse)
async def admin_create_category(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    name = form.get('name', '').strip()
    if not name:
        raise HTTPException(status_code=400, detail='分类名称必填')
    desc = form.get('description') or None
    sort_order = int(form.get('sort_order') or 0)
    is_active = form.get('is_active') == 'on'
    cat = BookCategory(name=name, description=desc, sort_order=sort_order, is_active=is_active)
    db.add(cat); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />分类创建成功')

@app.post('/admin/book_categories/{category_id}/update', response_class=HTMLResponse)
async def admin_update_category(category_id: int, request: Request, db: Session = Depends(get_db)):
    cat = db.query(BookCategory).filter(BookCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail='Category not found')
    form = await request.form()
    name = form.get('name')
    desc = form.get('description')
    sort_order = form.get('sort_order')
    is_active = form.get('is_active')
    if name is not None:
        cat.name = name.strip()
    if desc is not None:
        cat.description = desc or None
    if sort_order is not None:
        try:
            cat.sort_order = int(sort_order)
        except ValueError:
            pass
    if is_active is not None:
        cat.is_active = is_active == 'on'
    db.commit(); db.refresh(cat)
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />分类已更新')

@app.post('/admin/book_categories/{category_id}/delete', response_class=HTMLResponse)
def admin_delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(BookCategory).filter(BookCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail='Category not found')
    in_use = db.query(Book).filter(Book.category_id == category_id).count()
    if in_use:
        raise HTTPException(status_code=400, detail='分类下仍有书籍，无法删除')
    db.delete(cat); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />分类已删除')

@app.get('/admin/users', response_class=HTMLResponse)
def admin_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).limit(100).all()
    tpl = _env.get_template('admin_users.html')
    return tpl.render(page_title='用户管理', active='users', users=users, year=__import__('datetime').datetime.utcnow().year)

@app.get('/admin/orders', response_class=HTMLResponse)
def admin_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).limit(100).all()
    tpl = _env.get_template('admin_orders.html')
    return tpl.render(page_title='订单管理', active='orders', orders=orders, year=__import__('datetime').datetime.utcnow().year)

@app.patch('/api/books/{book_id}', response_model=BookOut)
def api_update_book(book_id: str, payload: BookUpdate, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Book not found')
    for field, value in payload.dict(exclude_unset=True).items():
        if field == 'category_id' and value is not None:
            category = db.query(BookCategory).filter(BookCategory.id == value, BookCategory.is_active == True).first()  # noqa: E712
            if not category:
                raise HTTPException(status_code=400, detail='分类不存在或已停用')
        if field == 'gallery_images' and value is not None:
            setattr(b, field, json.dumps(value))
        else:
            setattr(b, field, value)
    db.commit(); db.refresh(b)
    return serialize_book(b)

@app.delete('/api/books/{book_id}')
def api_delete_book(book_id: str, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Book not found')
    db.delete(b); db.commit()
    return {'deleted': True}

@app.patch('/api/users/{user_id}', response_model=UserOut)
def api_update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail='User not found')
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(u, field, value)
    db.commit(); db.refresh(u)
    return u

@app.delete('/api/users/{user_id}')
def api_delete_user(user_id: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail='User not found')
    db.delete(u); db.commit()
    return {'deleted': True}


@app.post('/admin/books/{book_id}/delete', response_class=HTMLResponse)
def admin_delete_book(book_id: str, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Book not found')
    db.delete(b); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />已删除')

@app.post('/admin/books/{book_id}/status/{new_status}', response_class=HTMLResponse)
def admin_set_book_status(book_id: str, new_status: str, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Book not found')
    if new_status not in [s.value for s in BookStatus]:
        raise HTTPException(status_code=400, detail='invalid status')
    b.status = BookStatus(new_status)
    db.commit();
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />状态已更新')

@app.get('/admin/categories', response_class=HTMLResponse)
def admin_categories(db: Session = Depends(get_db)):
    categories = db.query(BookCategory).order_by(BookCategory.sort_order.asc(), BookCategory.id.asc()).all()
    counts = dict(db.query(Book.category_id, func.count('*')).group_by(Book.category_id).all())
    tpl = _env.get_template('admin_categories.html')
    return tpl.render(page_title='分类管理', active='categories', categories=categories, counts=counts, year=__import__('datetime').datetime.utcnow().year)

@app.post('/admin/books/{book_id}/category', response_class=HTMLResponse)
def admin_set_book_category(book_id: str, category_id: int = Form(...), db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail='Book not found')
    if category_id:
        cat = db.query(BookCategory).filter(BookCategory.id == category_id, BookCategory.is_active == True).first()  # noqa: E712
        if not cat:
            raise HTTPException(status_code=400, detail='分类不存在或已停用')
        book.category_id = category_id
    else:
        book.category_id = None
    db.commit(); db.refresh(book)
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />分类已更新')

# Admin delivery tasks management
@app.get('/admin/delivery-tasks', response_class=HTMLResponse)
def admin_delivery_tasks(db: Session = Depends(get_db)):
    tasks = db.query(DeliveryTask).order_by(DeliveryTask.created_at.desc()).limit(100).all()
    tpl = _env.get_template('admin_delivery_tasks.html')
    return tpl.render(
        page_title='配送订单管理',
        active='delivery',
        tasks=tasks,
        year=__import__('datetime').datetime.utcnow().year,
    )

@app.post('/admin/delivery-tasks/{task_id}/cancel', response_class=HTMLResponse)
def admin_cancel_delivery_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail='配送任务不存在')

    # 取消配送任务
    task.status = DeliveryTaskStatus.cancelled

    # 将对应订单的配送方式改回自提，并清除配送费
    order = db.query(Order).filter(Order.id == task.order_id).first()
    if order:
        order.delivery_method = DeliveryMethod.meetup
        order.delivery_fee = 0
        order.total_amount = float(order.book_price)

    db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin/delivery-tasks" />配送已取消')

# Admin user create
@app.post('/admin/users/create', response_class=HTMLResponse)
async def admin_create_user(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    required = ['student_id','name','phone','password']
    for f in required:
        if not form.get(f):
            raise HTTPException(status_code=400, detail=f'{f} required')
    if db.query(User).filter(User.student_id == form['student_id']).first():
        raise HTTPException(status_code=400, detail='student_id exists')
    import uuid, hashlib
    u = User(
        id=str(uuid.uuid4()),
        student_id=form['student_id'].strip(),
        name=form['name'].strip(),
        phone=form['phone'].strip(),
        hashed_password=hashlib.sha256(form['password'].encode()).hexdigest(),
    )
    db.add(u); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin/users" />创建用户成功')

@app.post('/admin/users/{user_id}/toggle', response_class=HTMLResponse)
def admin_toggle_user(user_id: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail='User not found')
    u.is_active = not u.is_active
    db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin/users" />已切换状态')

@app.post('/admin/users/{user_id}/delete', response_class=HTMLResponse)
def admin_delete_user(user_id: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail='User not found')
    db.delete(u); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin/users" />已删除')

# Admin order create
@app.post('/admin/orders/create', response_class=HTMLResponse)
async def admin_create_order(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    required = ['book_id','buyer_id','delivery_method']
    for f in required:
        if not form.get(f):
            raise HTTPException(status_code=400, detail=f'{f} required')
    book = db.query(Book).filter(Book.id == form['book_id']).first()
    if not book:
        raise HTTPException(status_code=404, detail='Book not found')
    buyer = db.query(User).filter(User.id == form['buyer_id']).first()
    if not buyer:
        raise HTTPException(status_code=404, detail='Buyer not found')
    seller = db.query(User).filter(User.id == book.seller_id).first()
    import uuid, datetime
    order_number = datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S') + uuid.uuid4().hex[:6]
    delivery_fee = 0 if form['delivery_method'] == 'meetup' else 5
    total_amount = float(book.selling_price) + delivery_fee
    o = Order(
        id=str(uuid.uuid4()),
        order_number=order_number,
        book_id=book.id,
        buyer_id=buyer.id,
        seller_id=seller.id,
        book_price=book.selling_price,
        delivery_fee=delivery_fee,
        total_amount=total_amount,
        status=OrderStatus.pending,
        delivery_method=DeliveryMethod(form['delivery_method']),
        payment_status=PaymentStatus.pending
    )
    book.status = BookStatus.reserved
    db.add(o); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin/orders" />订单创建成功')

@app.post('/admin/orders/{order_id}/status/{new_status}', response_class=HTMLResponse)
def admin_order_status(order_id: str, new_status: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail='Order not found')
    if new_status not in [s.value for s in OrderStatus]:
        raise HTTPException(status_code=400, detail='invalid status')
    o.status = OrderStatus(new_status)
    if o.status == OrderStatus.completed:
        book = db.query(Book).filter(Book.id == o.book_id).first()
        if book:
            book.status = BookStatus.sold
    if o.status == OrderStatus.cancelled:
        book = db.query(Book).filter(Book.id == o.book_id).first()
        if book and book.status == BookStatus.reserved:
            book.status = BookStatus.available
    db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin/orders" />状态更新成功')

@app.post('/admin/orders/{order_id}/delete', response_class=HTMLResponse)
def admin_order_delete(order_id: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail='Order not found')
    book = db.query(Book).filter(Book.id == o.book_id).first()
    if book and book.status == BookStatus.reserved:
        book.status = BookStatus.available
    db.delete(o); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin/orders" />订单已删除')

@app.post('/api/login', response_model=AuthToken)
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.student_id == payload.student_id).first()
    if not u:
        raise HTTPException(status_code=400, detail='student_id or password error')
    expected = hashlib.sha256(payload.password.encode()).hexdigest()
    if u.hashed_password != expected:
        raise HTTPException(status_code=400, detail='student_id or password error')
    token = secrets.token_hex(32)
    TOKEN_STORE[token] = {'user_id': u.id, 'ts': datetime.datetime.utcnow().isoformat()}
    return AuthToken(access_token=token, user_id=u.id, student_id=u.student_id, name=u.name)


@app.post('/api/books/{book_id}/purchase', response_model=OrderOut)
def purchase_book(book_id: str, delivery_method: DeliveryMethod = DeliveryMethod.meetup, meetup_location: str | None = None, pickup_location: str | None = None, delivery_location: str | None = None, delivery_fee: float | None = None, desired_delivery_time: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail='Book not found')
    if book.status != BookStatus.available:
        raise HTTPException(status_code=400, detail='Book not available')
    seller = db.query(User).filter(User.id == book.seller_id).first()
    if not seller:
        raise HTTPException(status_code=400, detail='Seller missing')
    if book.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail='Cannot purchase your own listing')
    order_number = datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S') + uuid.uuid4().hex[:6]
    if delivery_method == DeliveryMethod.delivery and (not pickup_location or not delivery_location):
        raise HTTPException(status_code=400, detail='配送方式需要填写取书和送书地点')
    auto_fee = 0 if delivery_method == DeliveryMethod.meetup else 5
    final_fee = delivery_fee if delivery_fee is not None else auto_fee
    total_amount = float(book.selling_price) + float(final_fee)
    order = Order(
        id=str(uuid.uuid4()),
        order_number=order_number,
        book_id=book.id,
        buyer_id=current_user.id,
        seller_id=seller.id,
        book_price=book.selling_price,
        delivery_fee=final_fee,
        total_amount=total_amount,
        status=OrderStatus.pending,
        delivery_method=delivery_method,
        meetup_location=meetup_location,
        payment_status=PaymentStatus.pending,
    )
    book.status = BookStatus.reserved
    db.add(order)
    db.commit(); db.refresh(order); db.refresh(book)
    if delivery_method == DeliveryMethod.delivery:
        task = DeliveryTask(
            id=str(uuid.uuid4()),
            order_id=order.id,
            pickup_location=pickup_location,
            delivery_location=delivery_location,
            delivery_fee=final_fee,
            status=DeliveryTaskStatus.pending
        )
        db.add(task)
        db.commit(); db.refresh(task)
    return serialize_order_with_delivery(order, db)

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.id not in (o.buyer_id, o.seller_id):
        raise HTTPException(status_code=403, detail="无权删除该订单")
    book = db.query(Book).filter(Book.id == o.book_id).first()
    if book and book.status == BookStatus.reserved:
        book.status = BookStatus.available
    delivery_task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order_id).first()
    if delivery_task:
        db.delete(delivery_task)
    db.delete(o)
    db.commit()
    return {"deleted": True}

class DeliveryTaskOut(BaseModel):
    id: str
    order_id: str
    courier_id: str | None
    pickup_location: str
    delivery_location: str
    delivery_fee: float
    status: DeliveryTaskStatus
    pickup_image: str | None = None
    delivery_image: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    class Config:
        from_attributes = True

class DeliveryTaskCreate(BaseModel):
    order_id: str
    pickup_location: str
    delivery_location: str
    delivery_fee: float = 0

@app.post('/api/delivery_tasks', response_model=DeliveryTaskOut)
def create_delivery_task(payload: DeliveryTaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order.status not in [OrderStatus.pending, OrderStatus.confirmed]:
        raise HTTPException(status_code=400, detail='Order not eligible for delivery task')
    task = DeliveryTask(
        id=str(uuid.uuid4()),
        order_id=order.id,
        pickup_location=payload.pickup_location,
        delivery_location=payload.delivery_location,
        delivery_fee=payload.delivery_fee,
        status=DeliveryTaskStatus.pending
    )
    db.add(task); db.commit(); db.refresh(task)

    # 手动序列化返回
    return {
        'id': task.id,
        'order_id': task.order_id,
        'courier_id': task.courier_id if task.courier_id else None,
        'pickup_location': task.pickup_location,
        'delivery_location': task.delivery_location,
        'delivery_fee': float(task.delivery_fee),
        'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None,
    }

@app.get('/api/delivery_tasks', response_model=List[DeliveryTaskOut])
def list_delivery_tasks(status: DeliveryTaskStatus | None = None, db: Session = Depends(get_db)):
    try:
        q = db.query(DeliveryTask)
        if status:
            q = q.filter(DeliveryTask.status == status)
        tasks = q.order_by(DeliveryTask.created_at.desc()).limit(200).all()

        # 手动序列化，避免外键关系问题
        result = []
        for task in tasks:
            result.append({
                'id': task.id,
                'order_id': task.order_id,
                'courier_id': task.courier_id if task.courier_id else None,
                'pickup_location': task.pickup_location,
                'delivery_location': task.delivery_location,
                'delivery_fee': float(task.delivery_fee),
                'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
                'pickup_image': task.pickup_code if task.pickup_code else None,
                'delivery_image': task.delivery_code if task.delivery_code else None,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'updated_at': task.updated_at.isoformat() if task.updated_at else None,
            })
        return result
    except Exception as e:
        import traceback
        print(f"Error listing delivery tasks: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to load delivery tasks: {str(e)}")

@app.post('/api/delivery_tasks/{task_id}/accept', response_model=DeliveryTaskOut)
def accept_delivery_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail='Task not found')
    if task.status != DeliveryTaskStatus.pending:
        raise HTTPException(status_code=400, detail='Task already accepted')
    task.status = DeliveryTaskStatus.accepted
    task.courier_id = current_user.id
    db.commit(); db.refresh(task)

    # 手动序列化返回
    return {
        'id': task.id,
        'order_id': task.order_id,
        'courier_id': task.courier_id,
        'pickup_location': task.pickup_location,
        'delivery_location': task.delivery_location,
        'delivery_fee': float(task.delivery_fee),
        'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
        'pickup_image': task.pickup_code if task.pickup_code else None,
        'delivery_image': task.delivery_code if task.delivery_code else None,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None,
    }

@app.post('/api/delivery_tasks/{task_id}/cancel', response_model=DeliveryTaskOut)
def cancel_delivery_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """取消配送任务，重新上架到配送订单列表"""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail='配送任务不存在')

    # 只有配送员或订单买家可以取消
    order = db.query(Order).filter(Order.id == task.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail='关联订单不存在')

    if task.courier_id and task.courier_id != current_user.id and order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail='无权取消该配送任务')

    # 取消配送任务，重新变为pending状态以便其他人接单
    task.status = DeliveryTaskStatus.pending
    task.courier_id = None  # 清除配送员信息
    task.accepted_at = None
    db.commit(); db.refresh(task)

    return {
        'id': task.id,
        'order_id': task.order_id,
        'courier_id': None,
        'pickup_location': task.pickup_location,
        'delivery_location': task.delivery_location,
        'delivery_fee': float(task.delivery_fee),
        'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
        'pickup_image': task.pickup_code if task.pickup_code else None,
        'delivery_image': task.delivery_code if task.delivery_code else None,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None,
    }

@app.get('/api/me', response_model=UserOut)
def api_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.patch('/api/me', response_model=UserOut)
def api_me_update(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit(); db.refresh(current_user)
    return current_user

@app.patch('/api/me/password')
def api_me_password(payload: UserPasswordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expected = hashlib.sha256(payload.old_password.encode()).hexdigest()
    if current_user.hashed_password != expected:
        raise HTTPException(status_code=400, detail='旧密码不正确')
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail='新密码长度至少6位')
    current_user.hashed_password = hashlib.sha256(payload.new_password.encode()).hexdigest()
    db.commit()
    return {'status': 'ok'}

@app.get('/api/me/books', response_model=List[BookOut])
def api_me_books(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    books = db.query(Book).filter(Book.seller_id == current_user.id, Book.status.in_([BookStatus.available, BookStatus.reserved])).order_by(Book.created_at.desc()).all()
    return [serialize_book(b) for b in books]

@app.get('/api/me/orders', response_model=List[OrderOut])
def api_me_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Order).filter(Order.buyer_id == current_user.id).order_by(Order.created_at.desc()).all()

@app.get('/api/me/sales', response_model=List[OrderOut])
def api_me_sales(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Order).filter(Order.seller_id == current_user.id).order_by(Order.created_at.desc()).all()

@app.get('/api/me/delivery-tasks', response_model=List[DeliveryTaskOut])
def api_me_delivery_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取我接的配送订单"""
    tasks = db.query(DeliveryTask).filter(DeliveryTask.courier_id == current_user.id).order_by(DeliveryTask.created_at.desc()).all()

    result = []
    for task in tasks:
        result.append({
            'id': task.id,
            'order_id': task.order_id,
            'courier_id': task.courier_id,
            'pickup_location': task.pickup_location,
            'delivery_location': task.delivery_location,
            'delivery_fee': float(task.delivery_fee),
            'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
            'pickup_image': task.pickup_code if task.pickup_code else None,
            'delivery_image': task.delivery_code if task.delivery_code else None,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'updated_at': task.updated_at.isoformat() if task.updated_at else None,
        })
    return result

@app.get('/api/delivery_tasks/{task_id}', response_model=DeliveryTaskOut)
def get_delivery_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取配送任务详情"""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail='配送任务不存在')

    # 检查权限：配送员或订单买家可以查看
    order = db.query(Order).filter(Order.id == task.order_id).first()
    if task.courier_id != current_user.id and order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail='无权查看该配送任务')

    return {
        'id': task.id,
        'order_id': task.order_id,
        'courier_id': task.courier_id,
        'pickup_location': task.pickup_location,
        'delivery_location': task.delivery_location,
        'delivery_fee': float(task.delivery_fee),
        'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
        'pickup_image': task.pickup_code if task.pickup_code else None,
        'delivery_image': task.delivery_code if task.delivery_code else None,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None,
    }

@app.post('/api/delivery_tasks/{task_id}/complete')
def complete_delivery_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """完成配送任务"""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail='配送任务不存在')

    if task.courier_id != current_user.id:
        raise HTTPException(status_code=403, detail='只有配送员可以完成配送')

    if task.status != DeliveryTaskStatus.accepted:
        raise HTTPException(status_code=400, detail='只能完成已接单的配送任务')

    # 更新配送任务状态
    task.status = DeliveryTaskStatus.delivered
    task.delivered_at = datetime.datetime.utcnow()

    # 更新关联订单状态
    order = db.query(Order).filter(Order.id == task.order_id).first()
    if order:
        order.status = OrderStatus.completed
        order.completed_at = datetime.datetime.utcnow()

    db.commit()

    return {
        'id': task.id,
        'order_id': task.order_id,
        'courier_id': task.courier_id,
        'pickup_location': task.pickup_location,
        'delivery_location': task.delivery_location,
        'delivery_fee': float(task.delivery_fee),
        'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
        'pickup_image': task.pickup_code if task.pickup_code else None,
        'delivery_image': task.delivery_code if task.delivery_code else None,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None,
    }

@app.delete('/api/me/delivery-tasks/{task_id}')
def delete_my_delivery_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """删除我的配送订单"""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id, DeliveryTask.courier_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail='配送任务不存在')

    db.delete(task)
    db.commit()
    return {'deleted': True}

@app.post('/api/delivery_tasks/{task_id}/upload-image')
async def upload_delivery_image(
    task_id: str,
    file: UploadFile = File(...),
    image_type: str = Form(...),  # 'pickup' or 'delivery'
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传配送图片（取货图片或送达图片）"""
    task = db.query(DeliveryTask).filter(DeliveryTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail='配送任务不存在')

    if task.courier_id != current_user.id:
        raise HTTPException(status_code=403, detail='只有配送员可以上传图片')

    if not file.filename:
        raise HTTPException(status_code=400, detail='文件名无效')

    ext = Path(file.filename).suffix.lower()
    allowed = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail='不支持的图片格式')

    data = await file.read()
    max_size = 5 * 1024 * 1024
    if len(data) > max_size:
        raise HTTPException(status_code=400, detail='图片大小不能超过5MB')

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with open(dest, 'wb') as f:
        f.write(data)

    url_path = f"/uploads/{filename}"

    # 将图片URL存储在数据库中（使用pickup_code和delivery_code字段临时存储）
    if image_type == 'pickup':
        task.pickup_code = url_path
    elif image_type == 'delivery':
        task.delivery_code = url_path
    else:
        raise HTTPException(status_code=400, detail='无效的图片类型')

    db.commit()

    return {'url': url_path, 'type': image_type}

@app.delete('/api/me/books/{book_id}')
def api_me_delete_book(book_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == book_id, Book.seller_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=404, detail='Book not found or not owned by user')
    if db.query(Order).filter(Order.book_id == book.id).count() > 0:
        # safety: prevent deleting if orders reference it
        raise HTTPException(status_code=400, detail='存在关联订单，无法删除')
    db.delete(book)
    db.commit()
    return {'deleted': True}

@app.post('/api/orders/{order_id}/pay', response_model=OrderOut)
def pay_order(order_id: str, payload: PaymentConfirmPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.buyer_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order.status != OrderStatus.pending or order.payment_status != PaymentStatus.pending:
        raise HTTPException(status_code=400, detail='Order not awaiting payment')

    # 验证配送方式是否正确配置
    if order.delivery_method == DeliveryMethod.delivery:
        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order_id).first()
        if not task:
            raise HTTPException(status_code=400, detail='配送订单必须先配置配送信息')
        # 确保订单总额正确
        order.total_amount = float(order.book_price) + float(order.delivery_fee or 0)

    order.payment_method = payload.payment_method
    order.payment_status = PaymentStatus.paid
    order.status = OrderStatus.confirmed
    order.paid_at = datetime.datetime.utcnow()
    db.commit(); db.refresh(order)
    book = db.query(Book).filter(Book.id == order.book_id).first()
    if book:
        book.status = BookStatus.sold
        db.commit(); db.refresh(book)
    return serialize_order_with_delivery(order, db)

@app.post('/api/orders/{order_id}/cancel', response_model=OrderOut)
def cancel_order(order_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """取消订单，将书籍状态改回available，删除配送任务"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    # 只有买家和卖家能取消订单
    if order.buyer_id != current_user.id and order.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail='无权操作此订单')

    # 只有pending状态的订单可以取消
    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail='只能取消待支付的订单')

    # 更新订单状态
    order.status = OrderStatus.cancelled
    order.cancelled_at = datetime.datetime.utcnow()

    # 将书籍状态改回available
    book = db.query(Book).filter(Book.id == order.book_id).first()
    if book and book.status == BookStatus.reserved:
        book.status = BookStatus.available

    # 删除相关的配送任务
    delivery_task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order_id).first()
    if delivery_task:
        db.delete(delivery_task)

    db.commit()
    db.refresh(order)

    return serialize_order_with_delivery(order, db)

@app.post('/api/uploads/images')
async def upload_image(file: UploadFile = File(...), book_id: str | None = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not file.filename:
        raise HTTPException(status_code=400, detail='文件名无效')
    ext = Path(file.filename).suffix.lower()
    allowed = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail='不支持的图片格式')
    data = await file.read()
    max_size = 5 * 1024 * 1024
    if len(data) > max_size:
        raise HTTPException(status_code=400, detail='图片大小不能超过5MB')
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with open(dest, 'wb') as f:
        f.write(data)
    url_path = f"/uploads/{filename}"
    saved_image = None
    if book_id:
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail='Book not found')
        # First image defaults to primary and cover
        is_primary = len(book.images or []) == 0
        saved_image = BookImage(
            book_id=book.id,
            image_url=url_path,
            sort_order=(len(book.images or []) + 1),
            is_primary=is_primary,
        )
        db.add(saved_image)
        if is_primary:
            book.cover_image = url_path
        db.commit(); db.refresh(saved_image); db.refresh(book)
    return {'url': url_path, 'filename': filename, 'image': saved_image.id if saved_image else None}

class FavoriteOut(BaseModel):
    id: int
    user_id: str
    book_id: str
    created_at: datetime.datetime | None = None
    book: BookOut

    class Config:
        from_attributes = True

class ReviewOut(BaseModel):
    id: str
    order_id: str
    reviewer_id: str
    reviewed_id: str
    book_id: str | None = None
    role: ReviewRole
    rating: int
    content: str | None = None
    tags: list[str] | None = None
    is_anonymous: bool
    created_at: datetime.datetime | None = None

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    rating: int
    content: str | None = None
    tags: list[str] | None = None
    is_anonymous: bool = False

class CategoryOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    sort_order: int
    is_active: bool

    class Config:
        from_attributes = True

class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None
    is_active: bool | None = True

class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None


def serialize_book(book: Book) -> BookOut:
    payload = {**book.__dict__}
    payload.pop('_sa_instance_state', None)
    payload['gallery_images'] = json.loads(book.gallery_images or '[]')
    payload['category_name'] = book.category.name if book.category else None
    payload['images'] = [
        {
            'id': img.id,
            'image_url': img.image_url,
            'sort_order': img.sort_order,
            'is_primary': img.is_primary,
        }
        for img in sorted(book.images or [], key=lambda x: (0 if x.is_primary else 1, x.sort_order or 0, x.id))
    ]
    return BookOut(**payload)

@app.get("/api/book_categories", response_model=List[CategoryOut])
def list_categories(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(BookCategory)
    if active_only:
        query = query.filter(BookCategory.is_active == True)  # noqa: E712
    return query.order_by(BookCategory.sort_order.asc(), BookCategory.id.asc()).all()

@app.post("/api/book_categories", response_model=CategoryOut)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    cat = BookCategory(
        name=payload.name,
        description=payload.description,
        parent_id=payload.parent_id,
        sort_order=payload.sort_order or 0,
        is_active=True if payload.is_active is None else payload.is_active,
    )
    db.add(cat)
    db.commit(); db.refresh(cat)
    return cat

@app.patch("/api/book_categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    cat = db.query(BookCategory).filter(BookCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    updates = payload.dict(exclude_unset=True)
    for field, value in updates.items():
        setattr(cat, field, value)
    db.commit(); db.refresh(cat)
    return cat

@app.delete("/api/book_categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(BookCategory).filter(BookCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    in_use = db.query(Book).filter(Book.category_id == category_id).count()
    if in_use:
        raise HTTPException(status_code=400, detail="分类下仍有书籍，无法删除")
    db.delete(cat)
    db.commit()
    return {"deleted": True}

@app.post('/admin/books/{book_id}/upload', response_class=HTMLResponse)
async def admin_upload_images(book_id: str, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail='Book not found')
    allowed = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    for f in files:
        if not f.filename:
            continue
        ext = Path(f.filename).suffix.lower()
        if ext not in allowed:
            continue
        data = await f.read()
        if len(data) > 5 * 1024 * 1024:
            continue
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / filename
        with open(dest, 'wb') as fp:
            fp.write(data)
        url_path = f"/uploads/{filename}"
        img = BookImage(
            book_id=book.id,
            image_url=url_path,
            sort_order=(len(book.images or []) + 1),
            is_primary=False,
        )
        db.add(img)
        # set cover if missing
        if not book.cover_image:
            book.cover_image = url_path
    db.commit()
    return HTMLResponse(f'<meta http-equiv="refresh" content="0; url=/admin/books/{book_id}/edit" />上传完成')
