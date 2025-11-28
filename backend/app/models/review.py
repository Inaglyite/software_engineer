from sqlalchemy import Column, String, Integer, Boolean, Enum, TIMESTAMP, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from .mixins import UUIDPrimaryKeyMixin
import enum

class ReviewRole(enum.Enum):
    buyer = 'buyer'
    seller = 'seller'
    courier = 'courier'

class Review(Base, UUIDPrimaryKeyMixin):
    __tablename__ = 'reviews'
    order_id = Column(String(36), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    reviewer_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    reviewed_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    book_id = Column(String(36), ForeignKey('books.id'))
    role = Column(Enum(ReviewRole), nullable=False)
    rating = Column(Integer, nullable=False)
    content = Column(String)
    tags = Column(JSON)
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    order = relationship('Order', back_populates='reviews')
    reviewer = relationship('User', back_populates='reviews_written', foreign_keys=[reviewer_id])
    reviewed = relationship('User', back_populates='reviews_received', foreign_keys=[reviewed_id])
    book = relationship('Book', back_populates='reviews')
