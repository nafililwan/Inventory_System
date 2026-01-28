from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import json

from app.database import get_db
from app.models import Category, ItemType
from app.schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithTypes,
    ItemTypeResponse
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["Categories"])

# ============================================================================
# CATEGORY ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None, regex='^(active|inactive)$'),
    search: Optional[str] = None,
    include_counts: bool = Query(True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all categories with optional filtering and type counts
    """
    query = db.query(Category)
    
    # Status filter
    if status:
        query = query.filter(Category.status == status)
    
    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Category.category_name.like(search_pattern),
                Category.description.like(search_pattern)
            )
        )
    
    # Order by display_order, then by name
    query = query.order_by(Category.display_order.asc(), Category.category_name.asc())
    
    # Pagination
    categories = query.offset(skip).limit(limit).all()
    
    # Add type counts if requested
    if include_counts:
        for category in categories:
            type_count = db.query(func.count(ItemType.type_id)).filter(
                ItemType.category_id == category.category_id
            ).scalar()
            category.type_count = type_count
    
    return categories

@router.get("/{category_id}", response_model=CategoryWithTypes)
async def get_category(
    category_id: int,
    include_types: bool = Query(True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get single category by ID with optional types included
    """
    category = db.query(Category).filter(Category.category_id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Add type count
    type_count = db.query(func.count(ItemType.type_id)).filter(
        ItemType.category_id == category_id
    ).scalar()
    category.type_count = type_count
    
    # Include types if requested
    if include_types:
        types = db.query(ItemType).filter(
            ItemType.category_id == category_id
        ).order_by(ItemType.display_order.asc(), ItemType.type_name.asc()).all()
        
        # Parse JSON fields for types
        for type_obj in types:
            if type_obj.available_sizes and isinstance(type_obj.available_sizes, str):
                type_obj.available_sizes = json.loads(type_obj.available_sizes)
            if type_obj.available_colors and isinstance(type_obj.available_colors, str):
                type_obj.available_colors = json.loads(type_obj.available_colors)
        
        category.types = types
    
    return category

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new category
    """
    # Check if category name already exists
    existing = db.query(Category).filter(
        Category.category_name == category.category_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category.category_name}' already exists"
        )
    
    try:
        new_category = Category(
            category_name=category.category_name,
            description=category.description,
            icon=category.icon,
            color=category.color,
            status=category.status.value,
            display_order=category.display_order,
            created_by=current_user.username
        )
        
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        
        new_category.type_count = 0
        return new_category
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating category: {str(e)}"
        )

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update category
    """
    category = db.query(Category).filter(Category.category_id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if new name conflicts with existing
    if category_update.category_name and category_update.category_name != category.category_name:
        existing = db.query(Category).filter(
            Category.category_name == category_update.category_name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category_update.category_name}' already exists"
            )
    
    try:
        # Update fields
        update_data = category_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'status' and value:
                setattr(category, field, value.value)
            else:
                setattr(category, field, value)
        
        category.updated_by = current_user.username
        
        db.commit()
        db.refresh(category)
        
        # Add type count
        type_count = db.query(func.count(ItemType.type_id)).filter(
            ItemType.category_id == category_id
        ).scalar()
        category.type_count = type_count
        
        return category
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating category: {str(e)}"
        )

@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    force: bool = Query(False, description="Force delete even if has types"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete category (admin only)
    CASCADE will delete all types under this category
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete categories"
        )
    
    category = db.query(Category).filter(Category.category_id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category has types
    type_count = db.query(func.count(ItemType.type_id)).filter(
        ItemType.category_id == category_id
    ).scalar()
    
    if type_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category has {type_count} type(s). Use force=true to delete anyway"
        )
    
    try:
        category_name = category.category_name
        db.delete(category)
        db.commit()
        
        return {
            "message": "Category deleted successfully",
            "category_id": category_id,
            "category_name": category_name,
            "types_deleted": type_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting category: {str(e)}"
        )

@router.put("/{category_id}/reorder")
async def reorder_category(
    category_id: int,
    new_order: int = Query(..., ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update display order of category
    """
    category = db.query(Category).filter(Category.category_id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    try:
        category.display_order = new_order
        category.updated_by = current_user.username
        db.commit()
        
        return {
            "message": "Category order updated",
            "category_id": category_id,
            "new_order": new_order
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating order: {str(e)}"
        )

# ============================================================================
# CATEGORY TYPES (NESTED ENDPOINTS)
# ============================================================================

@router.get("/{category_id}/types", response_model=List[ItemTypeResponse])
async def get_category_types(
    category_id: int,
    status: Optional[str] = Query(None, regex='^(active|inactive)$'),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all types for a specific category
    """
    # Verify category exists
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    query = db.query(ItemType).filter(ItemType.category_id == category_id)
    
    if status:
        query = query.filter(ItemType.status == status)
    
    types = query.order_by(ItemType.display_order.asc(), ItemType.type_name.asc()).all()
    
    # Parse JSON fields and add category name to each type
    for type_obj in types:
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
            
            type_obj.category_name = category.category_name
            type_obj.item_count = 0  # Will be updated when items module is implemented
        except Exception as e:
            # Log error but continue processing other types
            print(f"Error processing type {type_obj.type_id}: {str(e)}")
            # Set defaults to prevent crashes
            if not hasattr(type_obj, 'available_sizes') or type_obj.available_sizes is None:
                type_obj.available_sizes = []
            if not hasattr(type_obj, 'available_colors') or type_obj.available_colors is None:
                type_obj.available_colors = []
            if hasattr(type_obj, 'size_stock_levels'):
                type_obj.size_stock_levels = None
            type_obj.category_name = category.category_name
            type_obj.item_count = 0
    
    return types

@router.get("/stats/count")
async def get_category_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get category statistics
    """
    total_categories = db.query(func.count(Category.category_id)).scalar()
    active_categories = db.query(func.count(Category.category_id)).filter(
        Category.status == 'active'
    ).scalar()
    total_types = db.query(func.count(ItemType.type_id)).scalar()
    
    return {
        "total_categories": total_categories,
        "active_categories": active_categories,
        "inactive_categories": total_categories - active_categories,
        "total_types": total_types
    }

