from sqlalchemy import Column, String, Integer, Boolean, DECIMAL, Enum, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from .mixins import UUIDPrimaryKeyMixin, TimestampMixin
from ..database import Base
import enum

class CourierStatus(enum.Enum):
    pending = 'pending'
    approved = 'approved'
    rejected = 'rejected'
    suspended = 'suspended'

class Courier(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'couriers'
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    id_card_number = Column(String(20), nullable=False)
    id_card_front = Column(String(500))
    id_card_back = Column(String(500))
    student_card = Column(String(500))
    status = Column(Enum(CourierStatus), nullable=False, default=CourierStatus.pending)
    total_orders = Column(Integer, default=0)
    completed_orders = Column(Integer, default=0)
    rating = Column(DECIMAL(3,2), default=5.0)
    is_online = Column(Boolean, default=False)
    last_online_time = Column(TIMESTAMP)

    user = relationship('User', back_populates='courier_profile')
    tasks = relationship('DeliveryTask', back_populates='courier')

