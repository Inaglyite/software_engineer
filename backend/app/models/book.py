from sqlalchemy import Column, String, Integer, Boolean, DECIMAL, Enum, Text, ForeignKey, TIMESTAMP, DATE
from sqlalchemy.sql import func
from ..database import Base
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

class Book(Base):
    __tablename__ = 'books'
    id = Column(String(36), primary_key=True)
    isbn = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    author = Column(String(100), nullable=False)
    publisher = Column(String(100))
    publish_date = Column(DATE)
    edition = Column(String(50))
    category_id = Column(Integer)
    cover_image = Column(String(500))
    description = Column(Text)
    original_price = Column(DECIMAL(10,2), nullable=False)
    selling_price = Column(DECIMAL(10,2), nullable=False)
    condition_level = Column(Enum(ConditionLevel), nullable=False)
    condition_description = Column(Text)
    seller_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    status = Column(Enum(BookStatus), default=BookStatus.available)
    view_count = Column(Integer, default=0)
    favorite_count = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String(36), ForeignKey('users.id'))
    approved_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

