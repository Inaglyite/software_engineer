from sqlalchemy import Column, String, DECIMAL, Enum, TIMESTAMP, ForeignKey, VARCHAR
from sqlalchemy.orm import relationship
from ..database import Base
from .mixins import UUIDPrimaryKeyMixin, TimestampMixin
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

class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'orders'
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
    pickup_location = Column(VARCHAR(200))
    delivery_location = Column(VARCHAR(200))
    payment_method = Column(Enum(PaymentMethod))
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.pending)
    payment_due_at = Column(TIMESTAMP)
    paid_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)
    cancelled_at = Column(TIMESTAMP)

    book = relationship('Book', back_populates='orders')
    buyer = relationship('User', back_populates='orders_as_buyer', foreign_keys=[buyer_id])
    seller = relationship('User', back_populates='orders_as_seller', foreign_keys=[seller_id])
    delivery_task = relationship('DeliveryTask', back_populates='order', uselist=False, cascade='all, delete-orphan')
    reviews = relationship('Review', back_populates='order', cascade='all, delete-orphan')
