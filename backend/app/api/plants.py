from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List

from app.database import get_db
from app.models import Plant, Store
from app.schemas import PlantCreate, PlantUpdate, PlantResponse, PlantWithStores, StoreResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/plants", tags=["Plants"])

# ============================================================================
# PLANT ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[PlantResponse])
async def get_plants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None, regex='^(active|inactive)$'),
    search: Optional[str] = None,
    include_counts: bool = Query(True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all plants with optional filtering and store counts
    """
    query = db.query(Plant)
    
    # Status filter
    if status:
        query = query.filter(Plant.status == status)
    
    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Plant.plant_name.like(search_pattern),
                Plant.plant_code.like(search_pattern),
                Plant.location.like(search_pattern),
                Plant.city.like(search_pattern),
                Plant.state.like(search_pattern)
            )
        )
    
    # Order by name
    query = query.order_by(Plant.plant_name.asc())
    
    # Pagination
    plants = query.offset(skip).limit(limit).all()
    
    # Add store counts if requested
    if include_counts:
        for plant in plants:
            store_count = db.query(func.count(Store.store_id)).filter(
                Store.plant_id == plant.plant_id
            ).scalar()
            plant.store_count = store_count
    
    return plants

@router.get("/{plant_id}", response_model=PlantWithStores)
async def get_plant(
    plant_id: int,
    include_stores: bool = Query(True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get single plant by ID with optional stores included
    """
    plant = db.query(Plant).filter(Plant.plant_id == plant_id).first()
    
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant not found"
        )
    
    # Add store count
    store_count = db.query(func.count(Store.store_id)).filter(
        Store.plant_id == plant_id
    ).scalar()
    plant.store_count = store_count
    
    # Include stores if requested
    if include_stores:
        stores = db.query(Store).filter(
            Store.plant_id == plant_id
        ).order_by(Store.store_name.asc()).all()
        
        # Add plant info to each store
        for store in stores:
            store.plant_name = plant.plant_name
            store.plant_code = plant.plant_code
            from app.models import Inventory
            current_items_count = db.query(func.sum(Inventory.quantity)).filter(
                Inventory.store_id == store.store_id
            ).scalar() or 0
            setattr(store, 'current_items', int(current_items_count))
            
            if store.capacity and store.capacity > 0:
                setattr(store, 'utilization_percentage', (store.current_items / store.capacity) * 100)
            else:
                setattr(store, 'utilization_percentage', 0.0)
        
        plant.stores = stores
    
    return plant

@router.post("/", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
async def create_plant(
    plant: PlantCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new plant
    """
    # Check if plant code already exists
    existing = db.query(Plant).filter(
        Plant.plant_code == plant.plant_code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plant code '{plant.plant_code}' already exists"
        )
    
    try:
        new_plant = Plant(
            plant_code=plant.plant_code,
            plant_name=plant.plant_name,
            location=plant.location,
            address=plant.address,
            city=plant.city,
            state=plant.state,
            postcode=plant.postcode,
            country=plant.country,
            contact_person=plant.contact_person,
            contact_number=plant.contact_number,
            email=plant.email,
            status=plant.status.value,
            created_by=current_user.username
        )
        
        db.add(new_plant)
        db.commit()
        db.refresh(new_plant)
        
        new_plant.store_count = 0
        return new_plant
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating plant: {str(e)}"
        )

@router.put("/{plant_id}", response_model=PlantResponse)
async def update_plant(
    plant_id: int,
    plant_update: PlantUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update plant
    """
    plant = db.query(Plant).filter(Plant.plant_id == plant_id).first()
    
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant not found"
        )
    
    # Check if new plant code conflicts with existing
    if plant_update.plant_code and plant_update.plant_code != plant.plant_code:
        existing = db.query(Plant).filter(
            Plant.plant_code == plant_update.plant_code
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Plant code '{plant_update.plant_code}' already exists"
            )
    
    try:
        # Update fields
        update_data = plant_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'status' and value:
                setattr(plant, field, value.value)
            else:
                setattr(plant, field, value)
        
        plant.updated_by = current_user.username
        
        db.commit()
        db.refresh(plant)
        
        # Add store count
        store_count = db.query(func.count(Store.store_id)).filter(
            Store.plant_id == plant_id
        ).scalar()
        plant.store_count = store_count
        
        return plant
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating plant: {str(e)}"
        )

@router.delete("/{plant_id}")
async def delete_plant(
    plant_id: int,
    force: bool = Query(False, description="Force delete even if has stores"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete plant (admin only)
    Will fail if plant has stores unless force=true
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete plants"
        )
    
    plant = db.query(Plant).filter(Plant.plant_id == plant_id).first()
    
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant not found"
        )
    
    # Check if plant has stores
    store_count = db.query(func.count(Store.store_id)).filter(
        Store.plant_id == plant_id
    ).scalar()
    
    if store_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plant has {store_count} store(s). Use force=true to delete anyway or delete stores first"
        )
    
    try:
        plant_code = plant.plant_code
        plant_name = plant.plant_name
        
        # If force, delete all stores first
        if force and store_count > 0:
            db.query(Store).filter(Store.plant_id == plant_id).delete()
        
        db.delete(plant)
        db.commit()
        
        return {
            "message": "Plant deleted successfully",
            "plant_id": plant_id,
            "plant_code": plant_code,
            "plant_name": plant_name,
            "stores_deleted": store_count if force else 0
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting plant: {str(e)}"
        )

@router.get("/{plant_id}/stores", response_model=List[StoreResponse])
async def get_plant_stores(
    plant_id: int,
    status: Optional[str] = Query(None, regex='^(active|inactive|maintenance)$'),
    store_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all stores for a specific plant
    """
    # Verify plant exists
    plant = db.query(Plant).filter(Plant.plant_id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant not found"
        )
    
    query = db.query(Store).filter(Store.plant_id == plant_id)
    
    if status:
        query = query.filter(Store.status == status)
    
    if store_type:
        query = query.filter(Store.store_type == store_type)
    
    stores = query.order_by(Store.store_name.asc()).all()
    
    # Add plant info to each store
    from app.models import Inventory
    for store in stores:
        store.plant_name = plant.plant_name
        store.plant_code = plant.plant_code
        
        # Calculate current_items from inventory
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

@router.get("/stats/count")
async def get_plant_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get plant statistics
    """
    total_plants = db.query(func.count(Plant.plant_id)).scalar()
    active_plants = db.query(func.count(Plant.plant_id)).filter(
        Plant.status == 'active'
    ).scalar()
    total_stores = db.query(func.count(Store.store_id)).scalar()
    
    # Stores by plant
    by_plant = db.query(
        Plant.plant_name,
        func.count(Store.store_id).label('store_count')
    ).outerjoin(
        Store, Plant.plant_id == Store.plant_id
    ).group_by(
        Plant.plant_name
    ).all()
    
    return {
        "total_plants": total_plants,
        "active_plants": active_plants,
        "inactive_plants": total_plants - active_plants,
        "total_stores": total_stores,
        "stores_by_plant": [
            {"plant_name": p[0], "store_count": p[1]}
            for p in by_plant
        ]
    }

