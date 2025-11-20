from fastapi import FastAPI, HTTPException, Depends, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel
from typing import List
from .database import get_db, Base, engine, SessionLocal
from sqlalchemy.orm import Session
from .models.book import Book, ConditionLevel, BookStatus
from .models.user import User
from .models.order import Order, OrderStatus, DeliveryMethod, PaymentMethod, PaymentStatus
from sqlalchemy import text
import os
from pathlib import Path

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
    created_at: str | None = None
    updated_at: str | None = None
    completed_at: str | None = None
    cancelled_at: str | None = None

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    payment_status: PaymentStatus | None = None

class BookUpdate(BaseModel):
    isbn: str | None = None
    title: str | None = None
    author: str | None = None
    original_price: float | None = None
    selling_price: float | None = None
    condition_level: ConditionLevel | None = None
    description: str | None = None
    status: BookStatus | None = None

class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    is_active: bool | None = None

TEMPLATE_DIR = Path(__file__).parent / 'templates'
_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=select_autoescape(['html','xml']))

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
    buyer = db.query(User).filter(User.id == payload.buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    seller = db.query(User).filter(User.id == book.seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    import uuid, datetime
    # Simple order number: YYYYMMDDHHMMSS + 6 hex
    order_number = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:6]
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
    # Mark book reserved
    book.status = BookStatus.reserved
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    db.refresh(book)
    return new_order

@app.get("/api/orders", response_model=List[OrderOut])
def list_orders(buyer_id: str | None = None, seller_id: str | None = None, status: OrderStatus | None = None, db: Session = Depends(get_db)):
    q = db.query(Order)
    if buyer_id:
        q = q.filter(Order.buyer_id == buyer_id)
    if seller_id:
        q = q.filter(Order.seller_id == seller_id)
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.created_at.desc()).limit(100).all()

@app.get("/api/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o

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
        # Also mark book sold
        book = db.query(Book).filter(Book.id == o.book_id).first()
        if book:
            book.status = BookStatus.sold
    if payload.status == OrderStatus.cancelled:
        import datetime
        o.cancelled_at = datetime.datetime.utcnow()
        # Release book
        book = db.query(Book).filter(Book.id == o.book_id).first()
        if book and book.status == BookStatus.reserved:
            book.status = BookStatus.available
    db.commit()
    db.refresh(o)
    return o

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    book = db.query(Book).filter(Book.id == o.book_id).first()
    if book and book.status == BookStatus.reserved:
        book.status = BookStatus.available
    db.delete(o)
    db.commit()
    return {"deleted": True}

@app.get('/admin', response_class=HTMLResponse)
def admin_books(db: Session = Depends(get_db)):
    books = db.query(Book).order_by(Book.created_at.desc()).limit(100).all()
    tpl = _env.get_template('admin_books.html')
    return tpl.render(page_title='书籍管理', active='books', books=books, year=__import__('datetime').datetime.utcnow().year)

@app.post('/admin/books/{book_id}/off', response_class=HTMLResponse)
def admin_book_off(book_id: str, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Book not found')
    b.status = BookStatus.off_shelf
    db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />书籍已下架, 返回中...')

@app.post('/admin/books/{book_id}/reserve', response_class=HTMLResponse)
def admin_book_reserve(book_id: str, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b:
        raise HTTPException(status_code=404, detail='Book not found')
    if b.status == BookStatus.available:
        b.status = BookStatus.reserved
        db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />操作完成, 返回中...')

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
        setattr(b, field, value)
    db.commit(); db.refresh(b)
    return b

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

# Admin create book
@app.post('/admin/books/create', response_class=HTMLResponse)
async def admin_create_book(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    required = ['isbn','title','author','original_price','selling_price','condition_level','seller_id']
    for f in required:
        if not form.get(f):
            raise HTTPException(status_code=400, detail=f'{f} required')
    seller = db.query(User).filter(User.id == form['seller_id']).first()
    if not seller:
        raise HTTPException(status_code=400, detail='seller_id invalid')
    import uuid
    b = Book(
        id=str(uuid.uuid4()),
        isbn=form['isbn'].strip(),
        title=form['title'].strip(),
        author=form['author'].strip(),
        original_price=float(form['original_price']),
        selling_price=float(form['selling_price']),
        condition_level=ConditionLevel(form['condition_level']),
        description=form.get('description'),
        seller_id=form['seller_id']
    )
    db.add(b); db.commit()
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/admin" />创建成功')

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
