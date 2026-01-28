from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List

from app.database import get_db
from app.models import Store, Plant
from app.schemas import StoreCreate, StoreUpdate, StoreResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/stores", tags=["Stores"])

# ============================================================================
# STORE ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[StoreResponse])
async def get_stores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    plant_id: Optional[int] = None,
    status: Optional[str] = Query(None, regex='^(active|inactive|maintenance)$'),
    store_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all stores with filtering
    """
    query = db.query(Store)
    
    # Plant filter
    if plant_id:
        query = query.filter(Store.plant_id == plant_id)
    
    # Status filter
    if status:
        query = query.filter(Store.status == status)
    
    # Store type filter
    if store_type:
        query = query.filter(Store.store_type == store_type)
    
    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Store.store_name.like(search_pattern),
                Store.store_code.like(search_pattern),
                Store.location_details.like(search_pattern),
                Store.store_manager.like(search_pattern)
            )
        )
    
    # Order by name
    query = query.order_by(Store.store_name.asc())
    
    # Pagination
    stores = query.offset(skip).limit(limit).all()
    
    # Add plant info and computed fields to each store
    from app.models import Inventory
    for store in stores:
        plant = db.query(Plant).filter(Plant.plant_id == store.plant_id).first()
        if plant:
            store.plant_name = plant.plant_name
            store.plant_code = plant.plant_code
        
        # Calculate current_items from inventory (use setattr for dynamic attribute)
        current_items_count = db.query(func.sum(Inventory.quantity)).filter(
            Inventory.store_id == store.store_id
        ).scalar() or 0
        setattr(store, 'current_items', int(current_items_count))
        
        # Calculate utilization percentage if capacity exists
        if store.capacity and store.capacity > 0:
            setattr(store, 'utilization_percentage', (store.current_items / store.capacity) * 100)
        else:
            setattr(store, 'utilization_percentage', 0.0)
    
    return stores

@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get single store by ID
    """
    store = db.query(Store).filter(Store.store_id == store_id).first()
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Add plant info and computed fields
    from app.models import Inventory
    plant = db.query(Plant).filter(Plant.plant_id == store.plant_id).first()
    if plant:
        store.plant_name = plant.plant_name
        store.plant_code = plant.plant_code
    
    # Calculate current_items from inventory (use setattr for dynamic attribute)
    current_items_count = db.query(func.sum(Inventory.quantity)).filter(
        Inventory.store_id == store.store_id
    ).scalar() or 0
    setattr(store, 'current_items', int(current_items_count))
    
    # Calculate utilization percentage if capacity exists
    if store.capacity and store.capacity > 0:
        setattr(store, 'utilization_percentage', (store.current_items / store.capacity) * 100)
    else:
        setattr(store, 'utilization_percentage', 0.0)
    
    return store

@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    store: StoreCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new store
    """
    # Verify plant exists
    plant = db.query(Plant).filter(Plant.plant_id == store.plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant not found"
        )
    
    # Check if store code already exists
    existing = db.query(Store).filter(
        Store.store_code == store.store_code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Store code '{store.store_code}' already exists"
        )
    
    try:
        new_store = Store(
            plant_id=store.plant_id,
            store_code=store.store_code,
            store_name=store.store_name,
            store_type=store.store_type.value,
            location_details=store.location_details,
            capacity=store.capacity,
            store_manager=store.store_manager,
            contact_number=store.contact_number,
            notes=store.notes,
            status=store.status.value,
            created_by=current_user.username
        )
        
        db.add(new_store)
        db.commit()
        db.refresh(new_store)
        
        new_store.plant_name = plant.plant_name
        new_store.plant_code = plant.plant_code
        
        # Set computed fields for new store
        setattr(new_store, 'current_items', 0)  # New store has no items yet
        setattr(new_store, 'utilization_percentage', 0.0)
        
        return new_store
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating store: {str(e)}"
        )

@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: int,
    store_update: StoreUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update store
    """
    store = db.query(Store).filter(Store.store_id == store_id).first()
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Check if new store code conflicts
    if store_update.store_code and store_update.store_code != store.store_code:
        existing = db.query(Store).filter(
            Store.store_code == store_update.store_code,
            Store.store_id != store_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Store code '{store_update.store_code}' already exists"
            )
    
    try:
        # Update fields
        update_data = store_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field in ['status', 'store_type'] and value:
                setattr(store, field, value.value)
            else:
                setattr(store, field, value)
        
        store.updated_by = current_user.username
        
        db.commit()
        db.refresh(store)
        
        # Add plant info and computed fields
        from app.models import Inventory
        plant = db.query(Plant).filter(Plant.plant_id == store.plant_id).first()
        if plant:
            store.plant_name = plant.plant_name
            store.plant_code = plant.plant_code
        
        # Calculate current_items from inventory (use setattr for dynamic attribute)
        current_items_count = db.query(func.sum(Inventory.quantity)).filter(
            Inventory.store_id == store.store_id
        ).scalar() or 0
        setattr(store, 'current_items', int(current_items_count))
        
        # Calculate utilization percentage if capacity exists
        if store.capacity and store.capacity > 0:
            setattr(store, 'utilization_percentage', (store.current_items / store.capacity) * 100)
        else:
            setattr(store, 'utilization_percentage', 0.0)
        
        return store
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating store: {str(e)}"
        )

@router.delete("/{store_id}")
async def delete_store(
    store_id: int,
    force: bool = Query(False, description="Force delete even if has inventory"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete store (admin only)
    Will fail if store has inventory unless force=true
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete stores"
        )
    
    store = db.query(Store).filter(Store.store_id == store_id).first()
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Check if store has inventory
    from app.models import Inventory
    current_items_count = db.query(func.sum(Inventory.quantity)).filter(
        Inventory.store_id == store.store_id
    ).scalar() or 0
    current_items = int(current_items_count)
    
    if current_items > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Store has {current_items} item(s) in inventory. Use force=true to delete anyway or move items first"
        )
    
    try:
        store_code = store.store_code
        store_name = store.store_name
        
        db.delete(store)
        db.commit()
        
        return {
            "message": "Store deleted successfully",
            "store_id": store_id,
            "store_code": store_code,
            "store_name": store_name
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting store: {str(e)}"
        )

@router.get("/stats/count")
async def get_store_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get store statistics
    """
    total_stores = db.query(func.count(Store.store_id)).scalar()
    active_stores = db.query(func.count(Store.store_id)).filter(
        Store.status == 'active'
    ).scalar()
    
    # By type
    by_type = db.query(
        Store.store_type,
        func.count(Store.store_id).label('count')
    ).group_by(
        Store.store_type
    ).all()
    
    # By plant
    by_plant = db.query(
        Plant.plant_name,
        func.count(Store.store_id).label('count')
    ).join(
        Store, Plant.plant_id == Store.plant_id
    ).group_by(
        Plant.plant_name
    ).all()
    
    # Total capacity and utilization
    from app.models import Inventory
    total_capacity = db.query(func.sum(Store.capacity)).scalar() or 0
    total_items = db.query(func.sum(Inventory.quantity)).scalar() or 0
    
    return {
        "total_stores": total_stores,
        "active_stores": active_stores,
        "inactive_stores": total_stores - active_stores,
        "by_type": [
            {"type": t[0], "count": t[1]}
            for t in by_type
        ],
        "by_plant": [
            {"plant": p[0], "count": p[1]}
            for p in by_plant
        ],
        "total_capacity": total_capacity,
        "total_items": total_items,
        "utilization_percentage": (total_items / total_capacity * 100) if total_capacity > 0 else 0
    }

@router.get("/by-type/count")
async def get_stores_by_type(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get stores grouped by type
    """
    by_type = db.query(
        Store.store_type,
        func.count(Store.store_id).label('count')
    ).group_by(
        Store.store_type
    ).all()
    
    return {
        "by_type": [
            {"type": t[0], "count": t[1]}
            for t in by_type
        ]
    }

