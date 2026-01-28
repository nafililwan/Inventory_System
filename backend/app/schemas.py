from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Dict, Any
from datetime import datetime, date
from enum import Enum

# User-related schemas (keep for authentication)
class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    worker = "worker"
    intern = "intern"

class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class NotificationType(str, Enum):
    low_stock = "low_stock"
    out_of_stock = "out_of_stock"
    pending_checkin = "pending_checkin"
    transaction = "transaction"
    system = "system"
    info = "info"
    warning = "warning"
    error = "error"

class NotificationStatus(str, Enum):
    unread = "unread"
    read = "read"

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole = UserRole.worker

class UserCreate(UserBase):
    password: Optional[str] = None  # Optional - will generate temp password if not provided

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    profile_photo: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: Optional[str]
    full_name: Optional[str]
    profile_photo: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    username: str
    password: str

# Alias for compatibility
UserLogin = LoginRequest

# ============================================================================
# CATEGORY SCHEMAS
# ============================================================================

class Status(str, Enum):
    active = "active"
    inactive = "inactive"

class CategoryBase(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str = Field(default='folder', max_length=50)
    color: str = Field(default='#3B82F6', max_length=20)
    status: Status = Status.active

class CategoryCreate(CategoryBase):
    display_order: Optional[int] = 0

class CategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=20)
    status: Optional[Status] = None
    display_order: Optional[int] = None

class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    description: Optional[str]
    icon: str
    color: str
    status: str
    display_order: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    updated_by: Optional[str]
    type_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class CategoryWithTypes(CategoryResponse):
    types: List['ItemTypeResponse'] = []

# ============================================================================
# ITEM TYPE SCHEMAS
# ============================================================================

class SizeStockLevel(BaseModel):
    min: int = Field(..., ge=0)
    max: int = Field(..., ge=1)

class ItemTypeBase(BaseModel):
    type_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    has_size: bool = True
    available_sizes: Optional[List[str]] = Field(default=["S", "M", "L", "XL"])
    has_color: bool = False
    available_colors: Optional[List[str]] = None
    status: Status = Status.active
    min_stock_level: Optional[int] = Field(50, ge=0, description='Default minimum stock level per store')
    max_stock_level: Optional[int] = Field(1000, ge=1, description='Default maximum stock level per store')
    size_stock_levels: Optional[Dict[str, SizeStockLevel]] = Field(None, description='Stock levels per size: {"S": {"min": 50, "max": 1000}}')
    
    @field_validator('available_sizes', mode='before')
    @classmethod
    def validate_sizes(cls, v):
        # Ensure we always return a list
        if v is None:
            return []
        return v
    
    @model_validator(mode='after')
    def validate_colors(self):
        # If has_color is True, ensure colors are provided
        if self.has_color and (not self.available_colors or len(self.available_colors) == 0):
            raise ValueError('available_colors is required when has_color is True')
        # If has_size is True but no sizes provided, default to ["Standard"]
        if self.has_size and (not self.available_sizes or len(self.available_sizes) == 0):
            self.available_sizes = ["Standard"]
        return self

class ItemTypeCreate(ItemTypeBase):
    category_id: int
    display_order: Optional[int] = 0

class ItemTypeUpdate(BaseModel):
    type_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    has_size: Optional[bool] = None
    available_sizes: Optional[List[str]] = None
    has_color: Optional[bool] = None
    available_colors: Optional[List[str]] = None
    status: Optional[Status] = None
    display_order: Optional[int] = None
    min_stock_level: Optional[int] = Field(None, ge=0, description='Default minimum stock level per store')
    max_stock_level: Optional[int] = Field(None, ge=1, description='Default maximum stock level per store')
    size_stock_levels: Optional[Dict[str, SizeStockLevel]] = Field(None, description='Stock levels per size: {"S": {"min": 50, "max": 1000}}')

class ItemTypeResponse(BaseModel):
    type_id: int
    category_id: int
    type_name: str
    description: Optional[str]
    has_size: bool
    available_sizes: List[str]
    has_color: bool
    available_colors: Optional[List[str]]
    status: str
    display_order: int
    min_stock_level: int
    max_stock_level: int
    size_stock_levels: Optional[Dict[str, Dict[str, int]]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    updated_by: Optional[str]
    category_name: Optional[str] = None
    item_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

# Update forward references
CategoryWithTypes.model_rebuild()

# ============================================================================
# PLANT SCHEMAS
# ============================================================================

class PlantStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class StoreType(str, Enum):
    main = "main"
    sub = "sub"
    production = "production"
    warehouse = "warehouse"
    defect = "defect"
    quarantine = "quarantine"

class StoreStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"

class PlantBase(BaseModel):
    plant_code: str = Field(..., min_length=1, max_length=20)
    plant_name: str = Field(..., min_length=1, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postcode: Optional[str] = Field(None, max_length=20)
    country: str = Field(default='Malaysia', max_length=100)
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    status: PlantStatus = PlantStatus.active

class PlantCreate(PlantBase):
    pass

class PlantUpdate(BaseModel):
    plant_code: Optional[str] = Field(None, min_length=1, max_length=20)
    plant_name: Optional[str] = Field(None, min_length=1, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postcode: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    status: Optional[PlantStatus] = None

class PlantResponse(BaseModel):
    plant_id: int
    plant_code: str
    plant_name: str
    location: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    postcode: Optional[str]
    country: str
    contact_person: Optional[str]
    contact_number: Optional[str]
    email: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    updated_by: Optional[str]
    store_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class PlantWithStores(PlantResponse):
    stores: List['StoreResponse'] = []

# ============================================================================
# STORE SCHEMAS
# ============================================================================

class StoreBase(BaseModel):
    store_code: str = Field(..., min_length=1, max_length=20)
    store_name: str = Field(..., min_length=1, max_length=100)
    store_type: StoreType = StoreType.sub
    location_details: Optional[str] = Field(None, max_length=200)
    capacity: Optional[int] = Field(None, ge=0)
    store_manager: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    status: StoreStatus = StoreStatus.active

class StoreCreate(StoreBase):
    plant_id: int

class StoreUpdate(BaseModel):
    store_code: Optional[str] = Field(None, min_length=1, max_length=20)
    store_name: Optional[str] = Field(None, min_length=1, max_length=100)
    store_type: Optional[StoreType] = None
    location_details: Optional[str] = Field(None, max_length=200)
    capacity: Optional[int] = Field(None, ge=0)
    store_manager: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    status: Optional[StoreStatus] = None

class StoreResponse(BaseModel):
    store_id: int
    plant_id: int
    store_code: str
    store_name: str
    store_type: str
    location_details: Optional[str]
    capacity: Optional[int]
    current_items: int
    store_manager: Optional[str]
    contact_number: Optional[str]
    notes: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    updated_by: Optional[str]
    plant_name: Optional[str] = None
    plant_code: Optional[str] = None
    utilization_percentage: Optional[float] = 0.0
    
    class Config:
        from_attributes = True

# Update forward references
PlantWithStores.model_rebuild()

# ============================================================================
# ITEM BATCH SCHEMAS (Year Code Tracking)
# ============================================================================

class BatchStatus(str, Enum):
    active = "active"
    discontinued = "discontinued"
    phasing_out = "phasing_out"

class ItemBatchBase(BaseModel):
    type_id: int
    year_code: str = Field(..., min_length=2, max_length=4)
    batch_name: Optional[str] = Field(None, max_length=100)
    specifications: Optional[str] = None
    production_date: Optional[date] = None
    status: BatchStatus = BatchStatus.active

class ItemBatchCreate(ItemBatchBase):
    pass

class ItemBatchUpdate(BaseModel):
    batch_name: Optional[str] = None
    specifications: Optional[str] = None
    production_date: Optional[date] = None
    status: Optional[BatchStatus] = None

class ItemBatchResponse(BaseModel):
    batch_id: int
    type_id: int
    year_code: str
    batch_name: Optional[str]
    specifications: Optional[str]
    production_date: Optional[date]
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    type_name: Optional[str] = None
    item_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

# ============================================================================
# ITEM SCHEMAS (Master Item Registry)
# ============================================================================

class ItemStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class ItemBase(BaseModel):
    batch_id: int
    item_code: str = Field(..., max_length=50)
    item_name: str = Field(..., max_length=200)
    size: Optional[str] = Field(None, max_length=20)
    color: Optional[str] = Field(None, max_length=50)
    unit_type: str = "pcs"
    min_stock: int = Field(default=50, ge=0)
    max_stock: int = Field(default=1000, ge=0)
    status: str = "active"

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    status: Optional[str] = None

class ItemResponse(BaseModel):
    item_id: int
    batch_id: int
    item_code: str
    item_name: str
    size: Optional[str]
    color: Optional[str]
    unit_type: str
    qr_code: Optional[str]
    barcode: Optional[str]
    min_stock: int
    max_stock: int
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    year_code: Optional[str] = None
    type_name: Optional[str] = None
    total_stock: Optional[int] = 0
    
    class Config:
        from_attributes = True

# ============================================================================
# BOX SCHEMAS (Physical Container Tracking)
# ============================================================================

class BoxStatus(str, Enum):
    pending_checkin = "pending_checkin"
    checked_in = "checked_in"
    in_use = "in_use"
    empty = "empty"
    damaged = "damaged"
    returned = "returned"

class BoxContentInput(BaseModel):
    # New flow: auto-create items
    type_id: Optional[int] = Field(None, description="Item type ID for auto-creation")
    year_code: Optional[str] = Field(None, min_length=2, max_length=4, description="Year code (e.g., 27 for 2027)")
    size: Optional[str] = Field(None, max_length=20, description="Size (e.g., S, M, L, XL)")
    color: Optional[str] = Field(None, max_length=50, description="Color (optional)")
    # Legacy flow: use existing item
    item_id: Optional[int] = Field(None, description="(Legacy) Item ID if already exists")
    quantity: int = Field(..., gt=0, description="Quantity in box")
    
    @model_validator(mode='after')
    def validate_content(self):
        """Ensure either type_id+year_code+size OR item_id is provided"""
        if self.item_id is not None:
            # Legacy flow: item_id provided
            if self.type_id is not None or self.year_code is not None or self.size is not None:
                raise ValueError("Cannot provide both item_id and type_id/year_code/size. Use either legacy (item_id) or new flow (type_id+year_code+size).")
            return self
        elif self.type_id is not None and self.year_code is not None and self.size is not None:
            # New flow: type_id+year_code+size provided
            return self
        else:
            raise ValueError("Must provide either item_id (legacy) OR type_id+year_code+size (new flow)")

class BoxCreate(BaseModel):
    supplier: Optional[str] = Field(None, max_length=200)
    po_number: Optional[str] = Field(None, max_length=100)
    do_number: Optional[str] = Field(None, max_length=100)
    invoice_number: Optional[str] = Field(None, max_length=100)
    received_date: date
    contents: List[BoxContentInput] = Field(..., min_items=1)
    notes: Optional[str] = None

class BoxCheckIn(BaseModel):
    store_id: int
    location_in_store: Optional[str] = Field(None, max_length=200)

class BoxResponse(BaseModel):
    box_id: int
    box_code: str
    qr_code: str
    supplier: Optional[str]
    po_number: Optional[str]
    do_number: Optional[str]
    invoice_number: Optional[str]
    store_id: Optional[int]
    location_in_store: Optional[str]
    status: str
    received_date: date
    received_by: str
    checked_in_at: Optional[datetime]
    checked_in_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    total_items: Optional[int] = 0
    store_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class BoxContentResponse(BaseModel):
    content_id: int
    box_id: int
    item_id: int
    quantity: int
    remaining: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    size: Optional[str] = None
    
    class Config:
        from_attributes = True

class BoxWithContents(BoxResponse):
    contents: List[BoxContentResponse] = []

# ============================================================================
# INVENTORY SCHEMAS (Current Stock Per Store)
# ============================================================================

class InventoryResponse(BaseModel):
    inventory_id: int
    store_id: int
    item_id: int
    quantity: int
    reserved_quantity: int
    available_quantity: int
    min_level: int
    max_level: int
    location_in_store: Optional[str]
    last_counted_at: Optional[datetime]
    last_counted_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    store_name: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    size: Optional[str] = None
    year_code: Optional[str] = None
    box_reference: Optional[str] = None  # Box code (e.g., BOX-2025-0005)
    box_id: Optional[int] = None  # Box ID for linking to box details
    
    class Config:
        from_attributes = True

# ============================================================================
# STOCK TRANSACTION SCHEMAS (All Stock Movements)
# ============================================================================

class TransactionType(str, Enum):
    box_checkin = "box_checkin"
    stock_out = "stock_out"
    transfer_out = "transfer_out"
    transfer_in = "transfer_in"
    adjustment = "adjustment"
    return_item = "return"
    damage = "damage"
    disposal = "disposal"

class StockOutCreate(BaseModel):
    item_id: int
    store_id: int
    quantity: int = Field(..., gt=0)
    reference_number: Optional[str] = None
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

class StockTransactionCreate(BaseModel):
    transaction_type: str
    item_id: int
    from_store_id: Optional[int] = None
    to_store_id: Optional[int] = None
    quantity: int = Field(..., gt=0, description="Quantity must be positive. Backend handles subtraction for stock_out.")
    reference_number: Optional[str] = None
    reference_type: Optional[str] = None
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    box_id: Optional[int] = None

class StockTransactionResponse(BaseModel):
    transaction_id: int
    transaction_type: str
    box_id: Optional[int]
    item_id: int
    from_store_id: Optional[int]
    to_store_id: Optional[int]
    quantity: int
    reference_number: Optional[str]
    reference_type: Optional[str]
    request_by: Optional[str]
    employee_name: Optional[str]
    employee_id: Optional[str]
    department: Optional[str]
    reason: Optional[str]
    notes: Optional[str]
    created_by: str
    created_at: datetime
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    from_store_name: Optional[str] = None
    to_store_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# Notification schemas
class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    user_id: Optional[int] = None  # NULL = all users

class NotificationUpdate(BaseModel):
    status: Optional[NotificationStatus] = None

class NotificationResponse(BaseModel):
    notification_id: int
    user_id: Optional[int]
    type: str
    title: str
    message: str
    status: str
    link: Optional[str]
    metadata: Optional[Dict[str, Any]] = None  # Maps from notification_data in DB
    
    class Config:
        from_attributes = True
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Map notification_data (from DB) to metadata (for API response)
        if hasattr(obj, '__dict__'):
            obj_dict = dict(obj.__dict__)
            # Remove SQLAlchemy internal attributes
            obj_dict.pop('_sa_instance_state', None)
            # Map notification_data to metadata
            if 'notification_data' in obj_dict:
                obj_dict['metadata'] = obj_dict.pop('notification_data')
            return super().model_validate(obj_dict, **kwargs)
        return super().model_validate(obj, **kwargs)
