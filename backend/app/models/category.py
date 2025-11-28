from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
from .mixins import TimestampMixin

class BookCategory(Base, TimestampMixin):
    __tablename__ = 'book_categories'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    description = Column(Text)  # TEXT
    parent_id = Column(Integer, ForeignKey('book_categories.id'))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    parent = relationship('BookCategory', remote_side=[id])
    books = relationship('Book', back_populates='category')
