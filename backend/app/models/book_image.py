from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
from .mixins import TimestampMixin

class BookImage(Base, TimestampMixin):
    __tablename__ = 'book_images'
    id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(String(36), ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    image_url = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    book = relationship('Book', back_populates='images')
