from sqlalchemy import Column, String, DECIMAL, Enum, TIMESTAMP, ForeignKey, VARCHAR
from sqlalchemy.sql import func
from ..database import Base
import enum

class OrderStatus(enum.Enum):
    pending = 'pending'
    confirmed = 'confirmed'
    paid = 'paid'
    shipping = 'shipping'
    completed = 'completed'
    cancelled = 'cancelled'
    refunded = 'refunded'

class DeliveryMethod(enum.Enum):
    meetup = 'meetup'
    delivery = 'delivery'

class PaymentMethod(enum.Enum):
    wechat = 'wechat'
    alipay = 'alipay'
    cash = 'cash'

class PaymentStatus(enum.Enum):
    pending = 'pending'
    paid = 'paid'
    failed = 'failed'
    refunded = 'refunded'

class Order(Base):
    __tablename__ = 'orders'
    id = Column(String(36), primary_key=True)
    order_number = Column(String(50), unique=True, nullable=False)
    book_id = Column(String(36), ForeignKey('books.id'), nullable=False)
    buyer_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    seller_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    book_price = Column(DECIMAL(10,2), nullable=False)
    delivery_fee = Column(DECIMAL(10,2), nullable=False, default=0)
    total_amount = Column(DECIMAL(10,2), nullable=False)
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.pending)
    delivery_method = Column(Enum(DeliveryMethod), nullable=False)
    meetup_location = Column(VARCHAR(200))
    meetup_time = Column(TIMESTAMP)
    payment_method = Column(Enum(PaymentMethod))
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.pending)
    paid_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    completed_at = Column(TIMESTAMP)
    cancelled_at = Column(TIMESTAMP)

