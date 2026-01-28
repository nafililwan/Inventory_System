from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import json

from app.database import get_db
from app.models import Category, ItemType
from app.schemas import ItemTypeCreate, ItemTypeUpdate, ItemTypeResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/item-types", tags=["Item Types"])

# ============================================================================
# ITEM TYPE ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[ItemTypeResponse])
async def get_item_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category_id: Optional[int] = None,
    status: Optional[str] = Query(None, regex='^(active|inactive)$'),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all item types with filtering
    """
    query = db.query(ItemType)
    
    # Category filter
    if category_id:
        query = query.filter(ItemType.category_id == category_id)
    
    # Status filter
    if status:
        query = query.filter(ItemType.status == status)
    
    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                ItemType.type_name.like(search_pattern),
                ItemType.description.like(search_pattern)
            )
        )
    
    # Order by display_order
    query = query.order_by(ItemType.display_order.asc(), ItemType.type_name.asc())
    
    # Pagination
    types = query.offset(skip).limit(limit).all()
    
    # Add category names and parse JSON fields
    for type_obj in types:
        category = db.query(Category).filter(
            Category.category_id == type_obj.category_id
        ).first()
        if category:
            type_obj.category_name = category.category_name
        
        # Parse JSON fields
        try:
            if type_obj.available_sizes and isinstance(type_obj.available_sizes, str):
                type_obj.available_sizes = json.loads(type_obj.available_sizes)
            elif type_obj.available_sizes is None:
                type_obj.available_sizes = []
            if type_obj.available_colors and isinstance(type_obj.available_colors, str):
                type_obj.available_colors = json.loads(type_obj.available_colors)
            elif type_obj.available_colors is None:
                type_obj.available_colors = []
            # Handle size_stock_levels - check if column exists first
            if hasattr(type_obj, 'size_stock_levels'):
                if type_obj.size_stock_levels and isinstance(type_obj.size_stock_levels, str):
                    try:
                        type_obj.size_stock_levels = json.loads(type_obj.size_stock_levels)
                    except (json.JSONDecodeError, TypeError):
                        type_obj.size_stock_levels = None
                elif type_obj.size_stock_levels is None:
                    type_obj.size_stock_levels = None
            else:
                # Column doesn't exist yet - set to None
                type_obj.size_stock_levels = None
        except Exception as e:
            print(f"Error parsing JSON fields for type {type_obj.type_id}: {str(e)}")
            # Set defaults
            if not hasattr(type_obj, 'available_sizes') or type_obj.available_sizes is None:
                type_obj.available_sizes = []
            if not hasattr(type_obj, 'available_colors') or type_obj.available_colors is None:
                type_obj.available_colors = []
            if hasattr(type_obj, 'size_stock_levels'):
                type_obj.size_stock_levels = None
        
        type_obj.item_count = 0  # Placeholder for future items count
    
    return types

@router.get("/{type_id}", response_model=ItemTypeResponse)
async def get_item_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get single item type by ID
    """
    type_obj = db.query(ItemType).filter(ItemType.type_id == type_id).first()
    
    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item type not found"
        )
    
    # Add category name
    category = db.query(Category).filter(
        Category.category_id == type_obj.category_id
    ).first()
    if category:
        type_obj.category_name = category.category_name
    
    # Parse JSON fields
    try:
        if type_obj.available_sizes and isinstance(type_obj.available_sizes, str):
            type_obj.available_sizes = json.loads(type_obj.available_sizes)
        elif type_obj.available_sizes is None:
            type_obj.available_sizes = []
        if type_obj.available_colors and isinstance(type_obj.available_colors, str):
            type_obj.available_colors = json.loads(type_obj.available_colors)
        elif type_obj.available_colors is None:
            type_obj.available_colors = []
        # Handle size_stock_levels - check if column exists first
        if hasattr(type_obj, 'size_stock_levels'):
            if type_obj.size_stock_levels and isinstance(type_obj.size_stock_levels, str):
                try:
                    type_obj.size_stock_levels = json.loads(type_obj.size_stock_levels)
                except (json.JSONDecodeError, TypeError):
                    type_obj.size_stock_levels = None
            elif type_obj.size_stock_levels is None:
                type_obj.size_stock_levels = None
        else:
            # Column doesn't exist yet - set to None
            type_obj.size_stock_levels = None
        
        type_obj.item_count = 0  # Placeholder
    except Exception as e:
        print(f"Error parsing JSON fields for type {type_obj.type_id}: {str(e)}")
        # Set defaults
        if not hasattr(type_obj, 'available_sizes') or type_obj.available_sizes is None:
            type_obj.available_sizes = []
        if not hasattr(type_obj, 'available_colors') or type_obj.available_colors is None:
            type_obj.available_colors = []
        if hasattr(type_obj, 'size_stock_levels'):
            type_obj.size_stock_levels = None
        type_obj.item_count = 0
    
    return type_obj

@router.post("/", response_model=ItemTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_item_type(
    item_type: ItemTypeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new item type
    """
    # Verify category exists
    category = db.query(Category).filter(
        Category.category_id == item_type.category_id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if type name exists in this category
    existing = db.query(ItemType).filter(
        ItemType.category_id == item_type.category_id,
        ItemType.type_name == item_type.type_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type '{item_type.type_name}' already exists in this category"
        )
    
    try:
        # Validate stock levels
        min_stock = item_type.min_stock_level if item_type.min_stock_level is not None else 50
        max_stock = item_type.max_stock_level if item_type.max_stock_level is not None else 1000
        
        if min_stock < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="min_stock_level must be 0 or greater"
            )
        if max_stock < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="max_stock_level must be 1 or greater"
            )
        if max_stock <= min_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="max_stock_level must be greater than min_stock_level"
            )
        
        # Validate size_stock_levels if provided
        if item_type.size_stock_levels:
            for size, levels in item_type.size_stock_levels.items():
                if levels.min < 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"min_stock_level for size '{size}' must be 0 or greater"
                    )
                if levels.max < 1:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"max_stock_level for size '{size}' must be 1 or greater"
                    )
                if levels.max <= levels.min:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"max_stock_level for size '{size}' must be greater than min_stock_level"
                    )
        
        # Build ItemType with optional size_stock_levels
        type_data = {
            'category_id': item_type.category_id,
            'type_name': item_type.type_name,
            'description': item_type.description,
            'has_size': item_type.has_size if item_type.has_size is not None else False,
            'available_sizes': json.dumps(item_type.available_sizes) if item_type.available_sizes else None,
            'has_color': item_type.has_color if item_type.has_color is not None else False,
            'available_colors': json.dumps(item_type.available_colors) if item_type.available_colors else None,
            'status': item_type.status.value if hasattr(item_type.status, 'value') else str(item_type.status),
            'display_order': item_type.display_order if item_type.display_order is not None else 0,
            'min_stock_level': min_stock,
            'max_stock_level': max_stock,
            'created_by': current_user.username
        }
        # Only add size_stock_levels if column exists (check via model)
        if hasattr(ItemType, 'size_stock_levels'):
            if item_type.size_stock_levels:
                # Convert SizeStockLevel objects to plain dicts for JSON serialization
                size_levels_dict = {}
                for size, levels in item_type.size_stock_levels.items():
                    if hasattr(levels, 'min') and hasattr(levels, 'max'):
                        # It's a SizeStockLevel object, convert to dict
                        size_levels_dict[size] = {
                            'min': levels.min,
                            'max': levels.max
                        }
                    else:
                        # Already a dict
                        size_levels_dict[size] = levels
                type_data['size_stock_levels'] = json.dumps(size_levels_dict)
            else:
                type_data['size_stock_levels'] = None
        
        new_type = ItemType(**type_data)
        
        db.add(new_type)
        db.commit()
        db.refresh(new_type)
        
        # Parse JSON back to lists/dicts for response
        try:
            if new_type.available_sizes:
                new_type.available_sizes = json.loads(new_type.available_sizes)
            else:
                new_type.available_sizes = []
            if new_type.available_colors:
                new_type.available_colors = json.loads(new_type.available_colors)
            else:
                new_type.available_colors = []
            # Handle size_stock_levels - check if column exists
            if hasattr(new_type, 'size_stock_levels'):
                if new_type.size_stock_levels:
                    try:
                        if isinstance(new_type.size_stock_levels, str):
                            new_type.size_stock_levels = json.loads(new_type.size_stock_levels)
                    except (json.JSONDecodeError, TypeError):
                        new_type.size_stock_levels = None
                else:
                    new_type.size_stock_levels = None
            else:
                new_type.size_stock_levels = None
        except Exception as e:
            print(f"Error parsing response for new type: {str(e)}")
            if not hasattr(new_type, 'available_sizes') or new_type.available_sizes is None:
                new_type.available_sizes = []
            if not hasattr(new_type, 'available_colors') or new_type.available_colors is None:
                new_type.available_colors = []
            if hasattr(new_type, 'size_stock_levels'):
                new_type.size_stock_levels = None
        
        new_type.category_name = category.category_name
        new_type.item_count = 0
        
        return new_type
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating item type: {str(e)}"
        )

@router.put("/{type_id}", response_model=ItemTypeResponse)
async def update_item_type(
    type_id: int,
    type_update: ItemTypeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update item type
    """
    type_obj = db.query(ItemType).filter(ItemType.type_id == type_id).first()
    
    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item type not found"
        )
    
    # Check if new name conflicts
    if type_update.type_name and type_update.type_name != type_obj.type_name:
        existing = db.query(ItemType).filter(
            ItemType.category_id == type_obj.category_id,
            ItemType.type_name == type_update.type_name,
            ItemType.type_id != type_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Type '{type_update.type_name}' already exists in this category"
            )
    
    try:
        # Update fields
        update_data = type_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'status' and value:
                setattr(type_obj, field, value.value)
            elif field in ['available_sizes', 'available_colors'] and value:
                setattr(type_obj, field, json.dumps(value))
            elif field == 'size_stock_levels' and value:
                # Convert SizeStockLevel objects to plain dicts for JSON serialization
                size_levels_dict = {}
                for size, levels in value.items():
                    if hasattr(levels, 'min') and hasattr(levels, 'max'):
                        # It's a SizeStockLevel object, convert to dict
                        size_levels_dict[size] = {
                            'min': levels.min,
                            'max': levels.max
                        }
                    else:
                        # Already a dict
                        size_levels_dict[size] = levels
                setattr(type_obj, field, json.dumps(size_levels_dict))
            else:
                setattr(type_obj, field, value)
        
        type_obj.updated_by = current_user.username
        
        db.commit()
        db.refresh(type_obj)
        
        # Parse JSON for response
        try:
            if type_obj.available_sizes:
                type_obj.available_sizes = json.loads(type_obj.available_sizes)
            else:
                type_obj.available_sizes = []
            if type_obj.available_colors:
                type_obj.available_colors = json.loads(type_obj.available_colors)
            else:
                type_obj.available_colors = []
            # Handle size_stock_levels - check if column exists
            if hasattr(type_obj, 'size_stock_levels'):
                if type_obj.size_stock_levels:
                    try:
                        if isinstance(type_obj.size_stock_levels, str):
                            type_obj.size_stock_levels = json.loads(type_obj.size_stock_levels)
                    except (json.JSONDecodeError, TypeError):
                        type_obj.size_stock_levels = None
                else:
                    type_obj.size_stock_levels = None
            else:
                type_obj.size_stock_levels = None
        except Exception as e:
            print(f"Error parsing response for type {type_obj.type_id}: {str(e)}")
            if not hasattr(type_obj, 'available_sizes') or type_obj.available_sizes is None:
                type_obj.available_sizes = []
            if not hasattr(type_obj, 'available_colors') or type_obj.available_colors is None:
                type_obj.available_colors = []
            if hasattr(type_obj, 'size_stock_levels'):
                type_obj.size_stock_levels = None
        
        # Add category name
        category = db.query(Category).filter(
            Category.category_id == type_obj.category_id
        ).first()
        if category:
            type_obj.category_name = category.category_name
        
        type_obj.item_count = 0
        
        return type_obj
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating item type: {str(e)}"
        )

@router.delete("/{type_id}")
async def delete_item_type(
    type_id: int,
    force: bool = Query(False, description="Force delete even if has items"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete item type (admin only)
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete item types"
        )
    
    type_obj = db.query(ItemType).filter(ItemType.type_id == type_id).first()
    
    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item type not found"
        )
    
    # TODO: Check if type has items when items module is implemented
    # For now, allow deletion
    
    try:
        type_name = type_obj.type_name
        db.delete(type_obj)
        db.commit()
        
        return {
            "message": "Item type deleted successfully",
            "type_id": type_id,
            "type_name": type_name
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting item type: {str(e)}"
        )

@router.put("/{type_id}/reorder")
async def reorder_item_type(
    type_id: int,
    new_order: int = Query(..., ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update display order of item type
    """
    type_obj = db.query(ItemType).filter(ItemType.type_id == type_id).first()
    
    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item type not found"
        )
    
    try:
        type_obj.display_order = new_order
        type_obj.updated_by = current_user.username
        db.commit()
        
        return {
            "message": "Item type order updated",
            "type_id": type_id,
            "new_order": new_order
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating order: {str(e)}"
        )

@router.get("/stats/count")
async def get_type_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get item type statistics
    """
    total_types = db.query(func.count(ItemType.type_id)).scalar()
    active_types = db.query(func.count(ItemType.type_id)).filter(
        ItemType.status == 'active'
    ).scalar()
    
    # Count by category
    by_category = db.query(
        Category.category_name,
        func.count(ItemType.type_id).label('count')
    ).join(
        ItemType, Category.category_id == ItemType.category_id
    ).group_by(
        Category.category_name
    ).all()
    
    return {
        "total_types": total_types,
        "active_types": active_types,
        "inactive_types": total_types - active_types,
        "by_category": [
            {"category": cat[0], "count": cat[1]} 
            for cat in by_category
        ]
    }

