from sqlalchemy import Column, String, Integer, Boolean, DECIMAL, Enum, Text, ForeignKey, TIMESTAMP, DATE, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from .mixins import UUIDPrimaryKeyMixin, TimestampMixin
import enum

class ConditionLevel(enum.Enum):
    excellent = 'excellent'
    good = 'good'
    fair = 'fair'
    poor = 'poor'

class BookStatus(enum.Enum):
    available = 'available'
    reserved = 'reserved'
    sold = 'sold'
    off_shelf = 'off_shelf'

class Book(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'books'
    __table_args__ = (
        Index('idx_isbn', 'isbn'),
        Index('idx_seller_id', 'seller_id'),
        Index('idx_status', 'status'),
        Index('idx_category_id', 'category_id'),
        Index('idx_price', 'selling_price'),
        Index('idx_created_at', 'created_at'),
    )
    isbn = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    author = Column(String(100), nullable=False)
    publisher = Column(String(100))
    publish_date = Column(DATE)
    publish_year = Column(Integer)
    edition = Column(String(50))
    category_id = Column(Integer, ForeignKey('book_categories.id'))
    cover_image = Column(String(500))
    gallery_images = Column(Text)
    description = Column(Text)
    condition_description = Column(Text)
    original_price = Column(DECIMAL(10,2), nullable=False)
    selling_price = Column(DECIMAL(10,2), nullable=False)
    condition_level = Column(Enum(ConditionLevel), nullable=False)
    seller_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    status = Column(Enum(BookStatus), nullable=False, default=BookStatus.available)
    view_count = Column(Integer, default=0)
    favorite_count = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String(36), ForeignKey('users.id'))
    approved_at = Column(TIMESTAMP)

    seller = relationship('User', back_populates='books', foreign_keys=[seller_id])
    category = relationship('BookCategory', back_populates='books', foreign_keys=[category_id])
    images = relationship('BookImage', back_populates='book', cascade='all, delete-orphan')
    orders = relationship('Order', back_populates='book', cascade='all, delete')
    favorites = relationship('Favorite', back_populates='book', cascade='all, delete-orphan')
    reviews = relationship('Review', back_populates='book', cascade='all, delete-orphan')
