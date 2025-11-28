import uuid
from sqlalchemy import Column, String, TIMESTAMP
from sqlalchemy.sql import func

class UUIDPrimaryKeyMixin:
    """Adds a UUID string primary key column named id."""
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

class TimestampMixin:
    """Adds created_at/updated_at timestamp columns."""
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

