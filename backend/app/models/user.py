from sqlalchemy import Column, String, Integer, Boolean, TIMESTAMP
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True)
    student_id = Column(String(20), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True)
    phone = Column(String(20), nullable=False)
    avatar_url = Column(String(500))
    hashed_password = Column(String(128), nullable=True)  # 添加密码哈希用于登录
    credit_score = Column(Integer, default=100)
    total_transactions = Column(Integer, default=0)
    positive_reviews = Column(Integer, default=0)
    negative_reviews = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
