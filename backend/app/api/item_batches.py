from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
import json
import uuid

from app.database import get_db
from app.models import ItemBatch, ItemType, Item
from app.schemas import (
    ItemBatchCreate, ItemBatchUpdate, ItemBatchResponse, ItemResponse
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/item-batches", tags=["Item Batches"])

def generate_item_code(type_code: str, year_code: str, size: str, sequence: int = 1) -> str:
    """
    Generate item code: TYPE-YEAR-SIZE-SEQ
    Example: WS-27-M-001 (White Smock, 2027, Medium, sequence 001)
    """
    # Clean size (remove spaces, uppercase)
    clean_size = size.replace(" ", "").upper()
    return f"{type_code}-{year_code}-{clean_size}-{sequence:03d}"

def generate_qr_code(item_code: str) -> str:
    """Generate QR code (for now just return item code, can enhance later)"""
    return f"QR-{item_code}-{uuid.uuid4().hex[:8].upper()}"

@router.post("/", response_model=ItemBatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_data: ItemBatchCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create year batch and auto-generate items based on available sizes
    """
    # Verify item type exists
    item_type = db.query(ItemType).filter(ItemType.type_id == batch_data.type_id).first()
    if not item_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item type not found"
        )
    
    # Check if batch with same type_id and year_code already exists
    existing = db.query(ItemBatch).filter(
        ItemBatch.type_id == batch_data.type_id,
        ItemBatch.year_code == batch_data.year_code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch for {item_type.type_name} with year code {batch_data.year_code} already exists"
        )
    
    try:
        # Create batch
        new_batch = ItemBatch(
            type_id=batch_data.type_id,
            year_code=batch_data.year_code,
            batch_name=batch_data.batch_name,
            specifications=batch_data.specifications,
            production_date=batch_data.production_date,
            status=batch_data.status if batch_data.status else 'active',
            created_by=current_user.username
        )
        
        db.add(new_batch)
        db.flush()  # Flush to get batch_id without committing
        
        # Get available sizes from item_type
        if not item_type.available_sizes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item type {item_type.type_name} has no sizes configured"
            )
        
        # Parse sizes (JSON array like ["S","M","L","XL","XXL"])
        if isinstance(item_type.available_sizes, str):
            sizes = json.loads(item_type.available_sizes)
        else:
            sizes = item_type.available_sizes
        
        if not sizes or len(sizes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item type {item_type.type_name} has no sizes configured"
            )
        
        # Generate type code (first letter of each word, uppercase)
        type_words = item_type.type_name.split()
        type_code = ''.join([word[0] for word in type_words if word]).upper()
        if len(type_code) < 2:
            type_code = item_type.type_name[:2].upper().replace(" ", "")
        
        # Create items for each size
        items_created = []
        for idx, size in enumerate(sizes, start=1):
            # Check if item already exists (shouldn't happen, but safety check)
            existing_item = db.query(Item).filter(
                Item.batch_id == new_batch.batch_id,
                Item.size == size
            ).first()
            
            if existing_item:
                continue
            
            # Generate item code
            item_code = generate_item_code(type_code, batch_data.year_code, size, idx)
            
            # Check if item_code already exists (should be unique)
            existing_code = db.query(Item).filter(Item.item_code == item_code).first()
            if existing_code:
                # If code exists, try with different sequence
                item_code = generate_item_code(type_code, batch_data.year_code, size, idx + 1000)
            
            # Generate item name
            item_name = f"{item_type.type_name} {batch_data.year_code} - Size {size}"
            
            # Create item
            new_item = Item(
                batch_id=new_batch.batch_id,
                item_code=item_code,
                item_name=item_name,
                size=size,
                unit_type='pcs',
                qr_code=generate_qr_code(item_code),
                status='active',
                created_by=current_user.username
            )
            
            db.add(new_item)
            items_created.append(new_item)
        
        db.commit()
        db.refresh(new_batch)
        
        # Prepare response
        response = ItemBatchResponse(
            batch_id=new_batch.batch_id,
            type_id=new_batch.type_id,
            year_code=new_batch.year_code,
            batch_name=new_batch.batch_name,
            specifications=new_batch.specifications,
            production_date=new_batch.production_date,
            status=new_batch.status,
            created_at=new_batch.created_at,
            updated_at=new_batch.updated_at,
            created_by=new_batch.created_by,
            type_name=item_type.type_name,
            item_count=len(items_created)
        )
        
        return response
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating batch: {str(e)}"
        )

@router.get("/", response_model=List[ItemBatchResponse])
async def get_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type_id: Optional[int] = None,
    year_code: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all item batches with filtering"""
    query = db.query(ItemBatch)
    
    if type_id:
        query = query.filter(ItemBatch.type_id == type_id)
    
    if year_code:
        query = query.filter(ItemBatch.year_code == year_code)
    
    if status:
        query = query.filter(ItemBatch.status == status)
    
    query = query.order_by(ItemBatch.created_at.desc())
    batches = query.offset(skip).limit(limit).all()
    
    result = []
    for batch in batches:
        item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
        item_count = db.query(Item).filter(Item.batch_id == batch.batch_id).count()
        
        response = ItemBatchResponse(
            batch_id=batch.batch_id,
            type_id=batch.type_id,
            year_code=batch.year_code,
            batch_name=batch.batch_name,
            specifications=batch.specifications,
            production_date=batch.production_date,
            status=batch.status,
            created_at=batch.created_at,
            updated_at=batch.updated_at,
            created_by=batch.created_by,
            type_name=item_type.type_name if item_type else None,
            item_count=item_count
        )
        result.append(response)
    
    return result

@router.get("/{batch_id}", response_model=ItemBatchResponse)
async def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get batch details"""
    batch = db.query(ItemBatch).filter(ItemBatch.batch_id == batch_id).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
    item_count = db.query(Item).filter(Item.batch_id == batch.batch_id).count()
    
    response = ItemBatchResponse(
        batch_id=batch.batch_id,
        type_id=batch.type_id,
        year_code=batch.year_code,
        batch_name=batch.batch_name,
        specifications=batch.specifications,
        production_date=batch.production_date,
        status=batch.status,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        created_by=batch.created_by,
        type_name=item_type.type_name if item_type else None,
        item_count=item_count
    )
    
    return response

@router.put("/{batch_id}", response_model=ItemBatchResponse)
async def update_batch(
    batch_id: int,
    batch_data: ItemBatchUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update batch details"""
    batch = db.query(ItemBatch).filter(ItemBatch.batch_id == batch_id).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    # Update fields
    if batch_data.batch_name is not None:
        batch.batch_name = batch_data.batch_name
    if batch_data.specifications is not None:
        batch.specifications = batch_data.specifications
    if batch_data.production_date is not None:
        batch.production_date = batch_data.production_date
    if batch_data.status is not None:
        batch.status = batch_data.status
    
    db.commit()
    db.refresh(batch)
    
    item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
    item_count = db.query(Item).filter(Item.batch_id == batch.batch_id).count()
    
    response = ItemBatchResponse(
        batch_id=batch.batch_id,
        type_id=batch.type_id,
        year_code=batch.year_code,
        batch_name=batch.batch_name,
        specifications=batch.specifications,
        production_date=batch.production_date,
        status=batch.status,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        created_by=batch.created_by,
        type_name=item_type.type_name if item_type else None,
        item_count=item_count
    )
    
    return response

@router.get("/{batch_id}/items", response_model=List[ItemResponse])
async def get_batch_items(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all items in a batch"""
    batch = db.query(ItemBatch).filter(ItemBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    items = db.query(Item).filter(Item.batch_id == batch_id).order_by(Item.size).all()
    
    # Get item type for type_name
    item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
    
    result = []
    for item in items:
        item_response = ItemResponse(
            item_id=item.item_id,
            batch_id=item.batch_id,
            item_code=item.item_code,
            item_name=item.item_name,
            size=item.size,
            color=item.color,
            unit_type=item.unit_type,
            qr_code=item.qr_code,
            barcode=item.barcode,
            min_stock=item.min_stock,
            max_stock=item.max_stock,
            status=item.status,
            created_at=item.created_at,
            updated_at=item.updated_at,
            created_by=item.created_by,
            year_code=batch.year_code,
            type_name=item_type.type_name if item_type else None,
            total_stock=0
        )
        result.append(item_response)
    
    return result

@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete batch (only if no items exist)"""
    batch = db.query(ItemBatch).filter(ItemBatch.batch_id == batch_id).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    # Check if batch has items
    item_count = db.query(Item).filter(Item.batch_id == batch_id).count()
    if item_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete batch with {item_count} items. Delete items first."
        )
    
    db.delete(batch)
    db.commit()
    
    return None

