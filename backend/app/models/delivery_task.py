from sqlalchemy import Column, String, DECIMAL, Enum, TIMESTAMP, ForeignKey, Integer
from sqlalchemy.orm import relationship
from ..database import Base
from .mixins import UUIDPrimaryKeyMixin, TimestampMixin
import enum

class DeliveryTaskStatus(enum.Enum):
    pending = 'pending'
    accepted = 'accepted'
    picked_up = 'picked_up'
    delivering = 'delivering'
    delivered = 'delivered'
    cancelled = 'cancelled'

class DeliveryTask(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'delivery_tasks'
    order_id = Column(String(36), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    courier_id = Column(String(36))  # 配送员用户ID，不使用外键约束
    pickup_location = Column(String(200), nullable=False)
    delivery_location = Column(String(200), nullable=False)
    delivery_fee = Column(DECIMAL(10,2), nullable=False, default=0)
    status = Column(Enum(DeliveryTaskStatus), nullable=False, default=DeliveryTaskStatus.pending)
    estimated_duration = Column(Integer)
    actual_duration = Column(Integer)
    pickup_code = Column(String(10))
    delivery_code = Column(String(10))
    accepted_at = Column(TIMESTAMP)
    picked_up_at = Column(TIMESTAMP)
    delivered_at = Column(TIMESTAMP)

    order = relationship('Order', back_populates='delivery_task')
    # 移除courier关系，因为不再使用外键
