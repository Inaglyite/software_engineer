from sqlalchemy import Column, String, Integer, Boolean, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from .mixins import UUIDPrimaryKeyMixin, TimestampMixin

class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'users'
    student_id = Column(String(20), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True)
    phone = Column(String(20), nullable=False)
    avatar_url = Column(String(500))
    hashed_password = Column(String(128), nullable=True)
    credit_score = Column(Integer, default=100)
    total_transactions = Column(Integer, default=0)
    positive_reviews = Column(Integer, default=0)
    negative_reviews = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    books = relationship('Book', back_populates='seller', foreign_keys='Book.seller_id')
    orders_as_buyer = relationship('Order', back_populates='buyer', foreign_keys='Order.buyer_id')
    orders_as_seller = relationship('Order', back_populates='seller', foreign_keys='Order.seller_id')
    favorites = relationship('Favorite', back_populates='user', cascade='all, delete-orphan')
    reviews_written = relationship('Review', back_populates='reviewer', foreign_keys='Review.reviewer_id')
    reviews_received = relationship('Review', back_populates='reviewed', foreign_keys='Review.reviewed_id')
    courier_profile = relationship('Courier', back_populates='user', uselist=False, cascade='all, delete-orphan')
    chat_sessions_user1 = relationship('ChatSession', back_populates='user1', foreign_keys='ChatSession.user1_id')
    chat_sessions_user2 = relationship('ChatSession', back_populates='user2', foreign_keys='ChatSession.user2_id')
    chat_messages = relationship('ChatMessage', back_populates='sender')
    announcements = relationship('Announcement', back_populates='author')
