from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, Enum, TIMESTAMP, ForeignKey, Numeric, Date, Computed
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    worker = "worker"
    intern = "intern"

class Status(str, enum.Enum):
    active = "active"
    inactive = "inactive"

class NotificationType(str, enum.Enum):
    low_stock = "low_stock"
    out_of_stock = "out_of_stock"
    pending_checkin = "pending_checkin"
    transaction = "transaction"
    system = "system"
    info = "info"
    warning = "warning"
    error = "error"

class NotificationStatus(str, enum.Enum):
    unread = "unread"
    read = "read"

# User model for authentication
class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True)
    full_name = Column(String(100))
    password_hash = Column(String(255), nullable=False)
    profile_photo = Column(String(500), nullable=True)  # URL or path to profile photo
    role = Column(Enum(UserRole), default=UserRole.worker)
    status = Column(Enum(Status), default=Status.active)
    created_at = Column(TIMESTAMP, server_default=func.now())
    last_login = Column(TIMESTAMP, nullable=True)

# Notification model
class Notification(Base):
    __tablename__ = "notifications"
    
    notification_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=True, index=True)  # NULL = all users
    type = Column(Enum(NotificationType), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.unread, index=True)
    link = Column(String(500), nullable=True)  # Optional link to relevant page
    notification_data = Column(JSON, nullable=True)  # Additional data (item_id, store_id, etc.) - renamed from 'metadata' to avoid SQLAlchemy reserved word
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    read_at = Column(TIMESTAMP, nullable=True)
    
    # Relationship
    user = relationship("User", foreign_keys=[user_id])

# Category model
class Category(Base):
    __tablename__ = "categories"
    
    category_id = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    icon = Column(String(50), default='folder')
    color = Column(String(20), default='#3B82F6')
    status = Column(Enum(Status), default=Status.active)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Relationship
    types = relationship("ItemType", back_populates="category", cascade="all, delete-orphan")

# ItemType model
class ItemType(Base):
    __tablename__ = "item_types"
    
    type_id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey('categories.category_id', ondelete='CASCADE'), nullable=False)
    type_name = Column(String(100), nullable=False)
    description = Column(Text)
    has_size = Column(Boolean, default=True)
    available_sizes = Column(JSON)  # ["S","M","L","XL"]
    has_color = Column(Boolean, default=False)
    available_colors = Column(JSON)  # ["Red","Blue","Black"]
    status = Column(Enum(Status), default=Status.active)
    display_order = Column(Integer, default=0)
    min_stock_level = Column(Integer, default=50, comment='Default minimum stock level per store for this item type')
    max_stock_level = Column(Integer, default=1000, comment='Default maximum stock level per store for this item type')
    size_stock_levels = Column(JSON, comment='Stock levels per size: {"S": {"min": 50, "max": 1000}, "M": {"min": 30, "max": 1000}}')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Relationship
    category = relationship("Category", back_populates="types")

# Plant model
class Plant(Base):
    __tablename__ = "plants"
    
    plant_id = Column(Integer, primary_key=True, autoincrement=True)
    plant_code = Column(String(20), unique=True, nullable=False)
    plant_name = Column(String(100), nullable=False)
    location = Column(String(200))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    postcode = Column(String(20))
    country = Column(String(100), default='Malaysia')
    contact_person = Column(String(100))
    contact_number = Column(String(50))
    email = Column(String(100))
    status = Column(Enum(Status), default=Status.active)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Relationships
    stores = relationship("Store", back_populates="plant", cascade="all, delete")

# Store model
class Store(Base):
    __tablename__ = "stores"
    
    store_id = Column(Integer, primary_key=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey('plants.plant_id', ondelete='CASCADE'), nullable=False)
    store_code = Column(String(20), unique=True, nullable=False)
    store_name = Column(String(100), nullable=False)
    location = Column(String(200))  # Keep for backward compatibility
    location_details = Column(String(200), nullable=True)  # New field matching schema
    description = Column(Text)  # Keep for backward compatibility
    notes = Column(Text, nullable=True)  # New field matching schema
    store_type = Column(String(50), nullable=True, default='sub')  # sub, main, warehouse, etc.
    capacity = Column(Integer, nullable=True)  # Store capacity for items
    store_manager = Column(String(100), nullable=True)
    contact_number = Column(String(50), nullable=True)
    status = Column(Enum(Status), default=Status.active)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Relationships
    plant = relationship("Plant", back_populates="stores")
    
    # Dynamic attributes (set by API layer, not stored in DB)
    # current_items and utilization_percentage are set dynamically via setattr()
    # No @property decorator to allow dynamic assignment

# Box model
class Box(Base):
    __tablename__ = "boxes"
    
    box_id = Column(Integer, primary_key=True, autoincrement=True)
    box_code = Column(String(100), unique=True, nullable=False, index=True)
    year_code = Column(String(10), nullable=False, index=True)  # e.g., "2024"
    qr_code = Column(String(100), nullable=True, index=True)
    supplier = Column(String(200), nullable=True)
    po_number = Column(String(100), nullable=True)
    do_number = Column(String(100), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    store_id = Column(Integer, ForeignKey('stores.store_id', ondelete='SET NULL'), nullable=True, index=True)
    location_in_store = Column(String(200), nullable=True)
    status = Column(String(50), default='pending_checkin', index=True)  # pending_checkin, checked_in, checked_out
    received_date = Column(Date, nullable=True)
    received_by = Column(String(100), nullable=True)
    checked_in_date = Column(TIMESTAMP, nullable=True)
    checked_in_at = Column(TIMESTAMP, nullable=True)
    checked_in_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    
    # Relationships
    store = relationship("Store", foreign_keys=[store_id])

# BoxContent model (for tracking items in boxes)
class BoxContent(Base):
    __tablename__ = "box_contents"
    
    content_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    box_id = Column(Integer, ForeignKey('boxes.box_id', ondelete='CASCADE'), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey('items.item_id', ondelete='CASCADE'), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    remaining = Column(Integer, nullable=False, default=1)  # Remaining quantity after stock out
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    box = relationship("Box", foreign_keys=[box_id])
    item = relationship("Item", foreign_keys=[item_id])

# ItemBatch model
class ItemBatch(Base):
    __tablename__ = "item_batches"
    
    batch_id = Column(Integer, primary_key=True, autoincrement=True)
    type_id = Column(Integer, ForeignKey('item_types.type_id', ondelete='CASCADE'), nullable=False, index=True)
    year_code = Column(String(10), nullable=False, index=True)  # e.g., "27" for 2027
    batch_name = Column(String(100), nullable=True)
    specifications = Column(Text, nullable=True)
    production_date = Column(Date, nullable=True)
    status = Column(String(50), default='active', index=True)  # active, discontinued, phasing_out
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    
    # Relationships
    item_type = relationship("ItemType", foreign_keys=[type_id])

# Item model (for master data)
class Item(Base):
    __tablename__ = "items"
    
    item_id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey('item_batches.batch_id', ondelete='CASCADE'), nullable=True, index=True)
    item_code = Column(String(50), unique=True, nullable=False, index=True)
    item_name = Column(String(200), nullable=False)
    category_name = Column(String(100), nullable=True)
    type_name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    has_size = Column(Boolean, default=True)
    has_color = Column(Boolean, default=False)
    size = Column(String(20), nullable=True)
    color = Column(String(50), nullable=True)
    unit_type = Column(String(20), nullable=True, default='pcs')
    qr_code = Column(String(100), nullable=True)
    barcode = Column(String(100), nullable=True)
    min_level = Column(Integer, default=10, comment='Minimum stock level per store')
    max_level = Column(Integer, default=1000, comment='Maximum stock level per store')
    min_stock = Column(Integer, default=50, comment='Minimum stock level')
    max_stock = Column(Integer, default=1000, comment='Maximum stock level')
    unit_price = Column(Numeric(10, 2), nullable=True)
    status = Column(Enum(Status), default=Status.active)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    
    # Relationships
    batch = relationship("ItemBatch", foreign_keys=[batch_id])

# Inventory model (stock per store)
class Inventory(Base):
    __tablename__ = "inventory"
    
    inventory_id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey('items.item_id', ondelete='CASCADE'), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey('stores.store_id', ondelete='CASCADE'), nullable=False, index=True)
    box_id = Column(Integer, ForeignKey('boxes.box_id', ondelete='SET NULL'), nullable=True, index=True)
    box_reference = Column(String(50), nullable=True, index=True)
    quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, nullable=False, default=0)
    available_quantity = Column(Integer, Computed('quantity - reserved_quantity'), nullable=True)
    min_level = Column(Integer, default=10)
    max_level = Column(Integer, default=1000)
    location_in_store = Column(String(200), nullable=True)
    last_counted_at = Column(TIMESTAMP, nullable=True)
    last_counted_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    last_updated = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    updated_by = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    item = relationship("Item", foreign_keys=[item_id])
    store = relationship("Store", foreign_keys=[store_id])
    box = relationship("Box", foreign_keys=[box_id])

# StockTransaction model
class StockTransaction(Base):
    __tablename__ = "stock_transactions"
    
    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey('items.item_id', ondelete='CASCADE'), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey('stores.store_id', ondelete='CASCADE'), nullable=True, index=True)
    from_store_id = Column(Integer, ForeignKey('stores.store_id', ondelete='SET NULL'), nullable=True)
    to_store_id = Column(Integer, ForeignKey('stores.store_id', ondelete='SET NULL'), nullable=True)
    transaction_type = Column(String(50), nullable=False, index=True)  # stock_in, stock_out, transfer_in, transfer_out, box_checkin, adjustment, etc.
    quantity = Column(Integer, nullable=False)
    box_id = Column(Integer, ForeignKey('boxes.box_id', ondelete='SET NULL'), nullable=True)
    transaction_date = Column(TIMESTAMP, server_default=func.now(), index=True)
    reference_number = Column(String(100), nullable=True)
    reference_type = Column(String(50), nullable=True)
    request_by = Column(String(100), nullable=True)
    employee_name = Column(String(100), nullable=True)
    employee_id = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    item = relationship("Item", foreign_keys=[item_id])
    store = relationship("Store", foreign_keys=[store_id])
    from_store = relationship("Store", foreign_keys=[from_store_id])
    to_store = relationship("Store", foreign_keys=[to_store_id])
    box = relationship("Box", foreign_keys=[box_id])
