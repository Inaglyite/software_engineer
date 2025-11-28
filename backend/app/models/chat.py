from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from .mixins import UUIDPrimaryKeyMixin, TimestampMixin
import enum

class MessageType(enum.Enum):
    text = 'text'
    image = 'image'
    system = 'system'

class ChatSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'chat_sessions'
    user1_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    user2_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    book_id = Column(String(36), ForeignKey('books.id'))
    last_message = Column(Text)
    last_message_at = Column(TIMESTAMP)
    unread_count_user1 = Column(Integer, default=0)
    unread_count_user2 = Column(Integer, default=0)

    user1 = relationship('User', back_populates='chat_sessions_user1', foreign_keys=[user1_id])
    user2 = relationship('User', back_populates='chat_sessions_user2', foreign_keys=[user2_id])
    book = relationship('Book')
    messages = relationship('ChatMessage', back_populates='session', cascade='all, delete-orphan')

class ChatMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = 'chat_messages'
    session_id = Column(String(36), ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.text)
    content = Column(Text, nullable=False)
    image_url = Column(String(500))
    is_read = Column(Boolean, default=False)
    read_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

    session = relationship('ChatSession', back_populates='messages')
    sender = relationship('User', back_populates='chat_messages')

