from sqlalchemy import Column, String, DECIMAL, Enum, TIMESTAMP, ForeignKey, Integer
from sqlalchemy.sql import func
from ..database import Base
import enum

class DeliveryTaskStatus(enum.Enum):
    pending = 'pending'
    accepted = 'accepted'
    picked_up = 'picked_up'
    delivering = 'delivering'
    delivered = 'delivered'
    cancelled = 'cancelled'

class DeliveryTask(Base):
    __tablename__ = 'delivery_tasks'
    id = Column(String(36), primary_key=True)
    order_id = Column(String(36), ForeignKey('orders.id'), nullable=False)
    courier_id = Column(String(36), ForeignKey('users.id'))
    pickup_location = Column(String(200), nullable=False)
    delivery_location = Column(String(200), nullable=False)
    delivery_fee = Column(DECIMAL(10,2), nullable=False, default=0)
    status = Column(Enum(DeliveryTaskStatus), nullable=False, default=DeliveryTaskStatus.pending)
    pickup_code = Column(String(10))
    delivery_code = Column(String(10))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

