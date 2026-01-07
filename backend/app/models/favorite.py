from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Favorite(Base):
    __tablename__ = 'favorites'
    __table_args__ = (
        UniqueConstraint('user_id', 'book_id', name='uq_fav_user_book'),
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    book_id = Column(String(36), ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship('User', back_populates='favorites')
    book = relationship('Book', back_populates='favorites')
