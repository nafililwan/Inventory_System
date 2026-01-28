from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import Optional, List, Tuple
from datetime import datetime
import uuid
import json

from pydantic import BaseModel

from app.database import get_db
from app.models import Item, ItemBatch, Inventory, StockTransaction, ItemType, Store, Box
from app.schemas import (
    ItemCreate, ItemUpdate, ItemResponse,
    InventoryResponse,
    StockTransactionResponse,
    StockTransactionCreate
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/items", tags=["Items"])

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_item_stock_levels(db: Session, item: Item) -> Tuple[int, int]:
    """
    Get min and max stock levels for an item based on its type and size.
    Returns (min_level, max_level) tuple.
    """
    try:
        # Get batch and item type
        batch = db.query(ItemBatch).filter(ItemBatch.batch_id == item.batch_id).first()
        if not batch:
            return (50, 1000)  # Default values
        
        item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
        if not item_type:
            return (50, 1000)  # Default values
        
        # Parse size_stock_levels if exists
        size_stock_levels = None
        if hasattr(item_type, 'size_stock_levels') and item_type.size_stock_levels:
            if isinstance(item_type.size_stock_levels, str):
                try:
                    size_stock_levels = json.loads(item_type.size_stock_levels)
                except (json.JSONDecodeError, TypeError):
                    size_stock_levels = None
            else:
                size_stock_levels = item_type.size_stock_levels
        
        # If item has size and size_stock_levels exists, use size-specific levels
        if item.size and size_stock_levels and isinstance(size_stock_levels, dict):
            size_level = size_stock_levels.get(item.size)
            if size_level and isinstance(size_level, dict):
                min_level = size_level.get('min', item_type.min_stock_level or 50)
                max_level = size_level.get('max', item_type.max_stock_level or 1000)
                return (min_level, max_level)
        
        # Fallback to item type default levels
        return (item_type.min_stock_level or 50, item_type.max_stock_level or 1000)
    except Exception as e:
        print(f"Error getting stock levels for item {item.item_id}: {str(e)}")
        return (50, 1000)  # Default on error

# ============================================================================
# ITEM ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[ItemResponse])
async def get_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    batch_id: Optional[int] = None,
    type_id: Optional[int] = None,
    year_code: Optional[str] = None,
    status: Optional[str] = Query(None, regex='^(active|inactive)$'),
    search: Optional[str] = None,
    include_stock: bool = Query(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all items with optional filtering
    """
    query = db.query(Item)
    
    # Filters
    if batch_id:
        query = query.filter(Item.batch_id == batch_id)
    
    if type_id:
        # Filter by type_id through batch
        query = query.join(ItemBatch).filter(ItemBatch.type_id == type_id)
    
    if year_code:
        # Filter by year_code through batch
        query = query.join(ItemBatch).filter(ItemBatch.year_code == year_code)
    
    if status:
        query = query.filter(Item.status == status)
    
    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Item.item_code.like(search_pattern),
                Item.item_name.like(search_pattern)
            )
        )
    
    # Order by item_code
    query = query.order_by(Item.item_code.asc())
    
    # Pagination
    items = query.offset(skip).limit(limit).all()
    
    # Add additional data
    result = []
    for item in items:
        # Get batch and type information
        batch = db.query(ItemBatch).filter(ItemBatch.batch_id == item.batch_id).first()
        if batch:
            item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
            item.year_code = batch.year_code
            item.type_name = item_type.type_name if item_type else None
        else:
            item.year_code = None
            item.type_name = None
        
        # Get total stock if requested
        if include_stock:
            total_stock = db.query(func.coalesce(func.sum(Inventory.quantity), 0)).filter(
                Inventory.item_id == item.item_id
            ).scalar()
            item.total_stock = total_stock or 0
        else:
            item.total_stock = 0
        
        result.append(item)
    
    return result

# ============================================================================
# INVENTORY ENDPOINTS (MUST BE BEFORE /{item_id} ROUTE)
# ============================================================================

@router.get("/inventory/test")
async def test_inventory_endpoint(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Test endpoint to verify inventory table exists and is accessible
    """
    try:
        count = db.query(Inventory).count()
        return {
            "status": "ok",
            "table_exists": True,
            "record_count": count,
            "message": "Inventory endpoint is working"
        }
    except Exception as e:
        return {
            "status": "error",
            "table_exists": False,
            "error": str(e)
        }

@router.get("/inventory", response_model=List[InventoryResponse])
async def get_inventory(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    item_id: Optional[int] = Query(None),
    store_id: Optional[int] = Query(None),
    low_stock: bool = Query(False, description="Filter for low stock items"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get inventory records with optional filtering
    """
    try:
        
        query = db.query(Inventory)
        
        # Filters
        if item_id:
            query = query.filter(Inventory.item_id == item_id)
        
        if store_id:
            query = query.filter(Inventory.store_id == store_id)
        
        # Low stock filter (quantity < min_level) - stock is low only if below minimum, not equal
        if low_stock:
            query = query.filter(Inventory.quantity > 0, Inventory.quantity < Inventory.min_level)
        
        # Order by store_id, then item_id
        query = query.order_by(Inventory.store_id.asc(), Inventory.item_id.asc())
        
        # Pagination
        inventory_list = query.offset(skip).limit(limit).all()
        
        # Return empty list if no records (FastAPI will serialize this correctly)
        if not inventory_list:
            return []
        
        # Build response with proper serialization
        result = []
        for inv in inventory_list:
            item = db.query(Item).filter(Item.item_id == inv.item_id).first()
            store = db.query(Store).filter(Store.store_id == inv.store_id).first()
            
            # Check if item/store exists
            if not item:
                print(f"[WARNING] Item with item_id={inv.item_id} not found for inventory_id={inv.inventory_id}")
            if not store:
                print(f"[WARNING] Store with store_id={inv.store_id} not found for inventory_id={inv.inventory_id}")
            
            # Calculate available_quantity manually (computed column might not work with SQLAlchemy)
            reserved_qty = inv.reserved_quantity if inv.reserved_quantity is not None else 0
            available_qty = inv.quantity - reserved_qty
            
            # Get min/max levels from item type's size_stock_levels (if available) or use inventory's stored values
            min_level = inv.min_level if inv.min_level is not None else 50
            max_level = inv.max_level if inv.max_level is not None else 1000
            
            # If item exists, try to get updated levels from item type
            if item:
                item_min, item_max = get_item_stock_levels(db, item)
                # Use item type levels if inventory doesn't have custom levels set
                # (inventory.min_level == 50 means it's likely using default)
                if inv.min_level is None or inv.min_level == 50:
                    min_level = item_min
                if inv.max_level is None or inv.max_level == 1000:
                    max_level = item_max
            
            # Get box reference for THIS specific inventory record
            # Find the box_checkin transaction that created this inventory record
            # Since each box checkin creates a new inventory record, match by quantity and time proximity
            box_reference = None
            box_id = None
            
            # Get all matching transactions (same item_id, store_id, quantity)
            matching_transactions = db.query(StockTransaction).filter(
                StockTransaction.item_id == inv.item_id,
                StockTransaction.to_store_id == inv.store_id,
                StockTransaction.transaction_type == 'box_checkin',
                StockTransaction.box_id.isnot(None),
                StockTransaction.quantity == inv.quantity  # Match quantity for accuracy
            ).order_by(StockTransaction.created_at.desc()).all()
            
            # Find the transaction with created_at closest to inventory.created_at
            matching_transaction = None
            if matching_transactions:
                if len(matching_transactions) == 1:
                    # Only one match - use it
                    matching_transaction = matching_transactions[0]
                else:
                    # Multiple matches - find the one with created_at closest to inventory.created_at
                    inv_created_at = inv.created_at
                    min_diff = None
                    for trans in matching_transactions:
                        # Calculate time difference in seconds (simple subtraction)
                        diff_seconds = abs((trans.created_at - inv_created_at).total_seconds())
                        if min_diff is None or diff_seconds < min_diff:
                            min_diff = diff_seconds
                            matching_transaction = trans
            
            # If no match by quantity, fall back to latest transaction (for backward compatibility)
            if not matching_transaction:
                matching_transaction = db.query(StockTransaction).filter(
                    StockTransaction.item_id == inv.item_id,
                    StockTransaction.to_store_id == inv.store_id,
                    StockTransaction.transaction_type == 'box_checkin',
                    StockTransaction.box_id.isnot(None)
                ).order_by(StockTransaction.created_at.desc()).first()
            
            if matching_transaction and matching_transaction.reference_number:
                box_reference = matching_transaction.reference_number  # This is box_code
                box_id = matching_transaction.box_id
            
            # Build response dictionary - ensure all required fields are present
            inv_data = {
                "inventory_id": inv.inventory_id,
                "store_id": inv.store_id,
                "item_id": inv.item_id,
                "quantity": int(inv.quantity) if inv.quantity is not None else 0,
                "reserved_quantity": int(reserved_qty),
                "available_quantity": int(available_qty),
                "min_level": int(min_level),
                "max_level": int(max_level),
                "location_in_store": inv.location_in_store if inv.location_in_store else None,
                "last_counted_at": inv.last_counted_at if inv.last_counted_at else None,
                "last_counted_by": inv.last_counted_by if inv.last_counted_by else None,
                "notes": inv.notes if inv.notes else None,
                "created_at": inv.created_at,
                "updated_at": inv.updated_at,
                "store_name": store.store_name if store else None,
                "item_code": item.item_code if item else None,
                "item_name": item.item_name if item else None,
                "size": item.size if item else None,
                "year_code": None,
                "box_reference": box_reference,  # Box code (e.g., BOX-2025-0005)
                "box_id": box_id,  # Box ID for linking
            }
            
            # Get year code from batch if item exists
            if item:
                batch = db.query(ItemBatch).filter(ItemBatch.batch_id == item.batch_id).first()
                if batch:
                    inv_data["year_code"] = batch.year_code
            
            try:
                result.append(InventoryResponse(**inv_data))
            except Exception as e:
                print(f"[ERROR] Failed to create InventoryResponse for inventory_id={inv.inventory_id}: {str(e)}")
                print(f"[ERROR] inv_data keys: {list(inv_data.keys())}")
                print(f"[ERROR] inv_data values: {inv_data}")
                # Continue to next record instead of failing completely
                continue
        
        return result
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        import traceback
        error_msg = f"Error in get_inventory: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

@router.delete("/inventory/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory(
    inventory_id: int,
    force: bool = Query(False, description="Force delete even if has transactions"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete an inventory record.
    If force=False, will fail if inventory has transactions.
    """
    inventory = db.query(Inventory).filter(Inventory.inventory_id == inventory_id).first()
    
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found"
        )
    
    # Check for transactions related to this inventory
    if not force:
        # Allow delete if inventory is empty (quantity = 0 and reserved_quantity = 0)
        is_empty = (inventory.quantity or 0) == 0 and (inventory.reserved_quantity or 0) == 0
        
        if not is_empty:
            transaction_count = db.query(func.count(StockTransaction.transaction_id)).filter(
                or_(
                    and_(
                        StockTransaction.item_id == inventory.item_id,
                        StockTransaction.from_store_id == inventory.store_id
                    ),
                    and_(
                        StockTransaction.item_id == inventory.item_id,
                        StockTransaction.to_store_id == inventory.store_id
                    )
                )
            ).scalar()
            
            if transaction_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot delete inventory with existing transactions and stock. Use force=true to delete anyway."
                )
    
    try:
        db.delete(inventory)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting inventory: {str(e)}"
        )

class BulkDeleteRequest(BaseModel):
    inventory_ids: List[int]
    force: bool = False

@router.post("/inventory/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_inventory(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Bulk delete inventory records.
    """
    try:
        inventory_ids = request.inventory_ids
        force = request.force
        
        # Validate input
        if not inventory_ids or len(inventory_ids) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="inventory_ids list cannot be empty"
            )
        
        # Ensure all IDs are integers
        try:
            inventory_ids = [int(id) for id in inventory_ids]
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid inventory_ids format: {str(e)}"
            )
        
        inventories = db.query(Inventory).filter(Inventory.inventory_id.in_(inventory_ids)).all()
        
        if len(inventories) != len(inventory_ids):
            found_ids = [inv.inventory_id for inv in inventories]
            missing_ids = [id for id in inventory_ids if id not in found_ids]
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory records not found: {missing_ids}"
            )
        
        # Check for transactions if not forcing
        if not force:
            problematic_inventories = []
            for inventory in inventories:
                # Allow delete if inventory is empty (quantity = 0 and reserved_quantity = 0)
                # This allows deletion of empty inventory records even if they have transaction history
                is_empty = (inventory.quantity or 0) == 0 and (inventory.reserved_quantity or 0) == 0
                
                if is_empty:
                    # Allow deletion of empty inventory records
                    continue
                
                # Check for any transactions related to this inventory (both from_store and to_store)
                transaction_count = db.query(func.count(StockTransaction.transaction_id)).filter(
                    or_(
                        and_(
                            StockTransaction.item_id == inventory.item_id,
                            StockTransaction.from_store_id == inventory.store_id
                        ),
                        and_(
                            StockTransaction.item_id == inventory.item_id,
                            StockTransaction.to_store_id == inventory.store_id
                        )
                    )
                ).scalar()
                
                if transaction_count > 0:
                    problematic_inventories.append(inventory.inventory_id)
            
            if problematic_inventories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Inventory records {problematic_inventories} have existing transactions and are not empty. Use force=true to delete anyway."
                )
        
        # Delete inventories
        deleted_ids = []
        for inventory in inventories:
            deleted_ids.append(inventory.inventory_id)
            db.delete(inventory)
        
        db.commit()
        
        return {
            "message": f"Successfully deleted {len(inventories)} inventory record(s)",
            "deleted_count": len(inventories),
            "deleted_ids": deleted_ids
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting inventory records: {str(e)}"
        )

# ============================================================================
# STOCK TRANSACTION ENDPOINTS (MUST BE BEFORE /{item_id} ROUTE)
# ============================================================================

@router.get("/transactions", response_model=List[StockTransactionResponse])
async def get_stock_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    item_id: Optional[int] = None,
    store_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    reference_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get stock transactions with optional filtering
    """
    query = db.query(StockTransaction)
    
    # Filters
    if item_id:
        query = query.filter(StockTransaction.item_id == item_id)
    
    if store_id:
        query = query.filter(
            or_(
                StockTransaction.from_store_id == store_id,
                StockTransaction.to_store_id == store_id
            )
        )
    
    if transaction_type:
        query = query.filter(StockTransaction.transaction_type == transaction_type)
    
    if reference_number:
        query = query.filter(StockTransaction.reference_number.like(f"%{reference_number}%"))
    
    # Order by created_at desc (newest first)
    query = query.order_by(StockTransaction.created_at.desc())
    
    # Pagination
    transactions = query.offset(skip).limit(limit).all()
    
    # Add item and store names
    result = []
    for trans in transactions:
        item = db.query(Item).filter(Item.item_id == trans.item_id).first()
        
        if item:
            trans.item_code = item.item_code
            trans.item_name = item.item_name
        else:
            trans.item_code = None
            trans.item_name = None
        
        # Get store names
        if trans.from_store_id:
            from_store = db.query(Store).filter(Store.store_id == trans.from_store_id).first()
            trans.from_store_name = from_store.store_name if from_store else None
        else:
            trans.from_store_name = None
        
        if trans.to_store_id:
            to_store = db.query(Store).filter(Store.store_id == trans.to_store_id).first()
            trans.to_store_name = to_store.store_name if to_store else None
        else:
            trans.to_store_name = None
        
        result.append(trans)
    
    return result

@router.post("/transactions", response_model=StockTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_transaction(
    transaction_data: StockTransactionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new stock transaction (stock_out, adjustment, transfer, etc.)
    """
    try:
        # Verify item exists
        item = db.query(Item).filter(Item.item_id == transaction_data.item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with ID {transaction_data.item_id} not found"
            )
        
        # Validate quantity is positive
        if transaction_data.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0"
            )
        
        # For stock_out transactions, verify store and inventory
        if transaction_data.transaction_type == 'stock_out':
            if not transaction_data.from_store_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="from_store_id is required for stock_out transactions"
                )
            
            # Check inventory exists and has enough stock
            inventory = db.query(Inventory).filter(
                Inventory.item_id == transaction_data.item_id,
                Inventory.store_id == transaction_data.from_store_id
            ).first()
            
            if not inventory:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Inventory record not found for this item and store"
                )
            
            available_qty = inventory.quantity - (inventory.reserved_quantity or 0)
            requested_qty = transaction_data.quantity  # Already validated as positive
            
            if requested_qty > available_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock. Available: {available_qty}, Requested: {requested_qty}"
                )
            
            # Update inventory (subtract quantity)
            inventory.quantity -= requested_qty
            if inventory.quantity < 0:
                inventory.quantity = 0
            
            # Update box status to 'stocked_out' if box_id is provided
            if transaction_data.box_id:
                box = db.query(Box).filter(Box.box_id == transaction_data.box_id).first()
                if box and box.status == 'checked_in':
                    box.status = 'stocked_out'
                    db.add(box)  # Ensure box is tracked for commit
        
        # For transfer_out transactions: subtract from from_store AND add to to_store in one transaction
        elif transaction_data.transaction_type == 'transfer_out':
            if not transaction_data.from_store_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="from_store_id is required for transfer transactions"
                )
            
            if not transaction_data.to_store_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="to_store_id is required for transfer transactions"
                )
            
            if transaction_data.from_store_id == transaction_data.to_store_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="from_store_id and to_store_id must be different"
                )
            
            # Check inventory exists and has enough stock in from_store
            from_inventory = db.query(Inventory).filter(
                Inventory.item_id == transaction_data.item_id,
                Inventory.store_id == transaction_data.from_store_id
            ).first()
            
            if not from_inventory:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Inventory record not found for this item in from_store"
                )
            
            available_qty = from_inventory.quantity - (from_inventory.reserved_quantity or 0)
            requested_qty = transaction_data.quantity
            
            if requested_qty > available_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock in from_store. Available: {available_qty}, Requested: {requested_qty}"
                )
            
            # Subtract quantity from from_store
            from_inventory.quantity -= requested_qty
            if from_inventory.quantity < 0:
                from_inventory.quantity = 0
            
            # Add quantity to to_store
            to_inventory = db.query(Inventory).filter(
                Inventory.item_id == transaction_data.item_id,
                Inventory.store_id == transaction_data.to_store_id
            ).first()
            
            # Get box_id and box_reference from source inventory
            # Box reference is determined by latest box_checkin transaction for this item in from_store
            box_id = None
            box_reference = None
            if from_inventory:
                # First, check if box_id is provided directly in transaction_data
                if transaction_data.box_id:
                    box_id = transaction_data.box_id
                    box = db.query(Box).filter(Box.box_id == box_id).first()
                    if box:
                        box_reference = box.box_code
                else:
                    # Fallback: find from latest box_checkin transaction
                    latest_box_transaction = db.query(StockTransaction).filter(
                        StockTransaction.item_id == transaction_data.item_id,
                        StockTransaction.to_store_id == transaction_data.from_store_id,
                        StockTransaction.transaction_type == 'box_checkin',
                        StockTransaction.box_id.isnot(None)
                    ).order_by(StockTransaction.created_at.desc()).first()
                    
                    if latest_box_transaction:
                        box_id = latest_box_transaction.box_id
                        box_reference = latest_box_transaction.reference_number  # This is box_code
            
            if to_inventory:
                # Update existing inventory
                to_inventory.quantity += requested_qty
            else:
                # Create new inventory record
                to_inventory = Inventory(
                    item_id=transaction_data.item_id,
                    store_id=transaction_data.to_store_id,
                    quantity=requested_qty,
                    reserved_quantity=0,
                    min_level=from_inventory.min_level,  # Copy from source inventory
                    max_level=from_inventory.max_level,  # Copy from source inventory
                )
                db.add(to_inventory)
            
            # Update box.store_id to destination store when transferring (if box_id is found)
            if box_id:
                box = db.query(Box).filter(Box.box_id == box_id).first()
                if box:
                    # Update box location to destination store
                    box.store_id = transaction_data.to_store_id
                    db.add(box)  # Ensure box is tracked for commit
                    
                    # If box_reference not found, get it from box
                    if not box_reference:
                        box_reference = box.box_code
            
            # Create a box_checkin transaction in destination store to maintain box reference
            # This ensures box_reference appears correctly in the destination store
            if box_id and box_reference:
                # Check if box_checkin transaction already exists for this box+item in destination store
                existing_checkin = db.query(StockTransaction).filter(
                    StockTransaction.box_id == box_id,
                    StockTransaction.item_id == transaction_data.item_id,
                    StockTransaction.to_store_id == transaction_data.to_store_id,
                    StockTransaction.transaction_type == 'box_checkin'
                ).first()
                
                if not existing_checkin:
                    # Create box_checkin transaction in destination store
                    box_checkin_transaction = StockTransaction(
                        transaction_type='box_checkin',
                        box_id=box_id,
                        item_id=transaction_data.item_id,
                        to_store_id=transaction_data.to_store_id,
                        quantity=0,  # Box checkin doesn't change quantity, it's just a marker
                        reference_number=box_reference,  # Use box_code from source
                        reference_type='BOX',
                        notes=f'Box transferred from store {transaction_data.from_store_id}',
                        created_by=current_user.username
                    )
                    db.add(box_checkin_transaction)
        
        # For stock_in transactions, add to inventory
        elif transaction_data.transaction_type == 'stock_in':
            if not transaction_data.to_store_id:
                # Fallback to store_id for backward compatibility
                store_id_to_use = transaction_data.to_store_id or transaction_data.store_id
                if not store_id_to_use:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="to_store_id or store_id is required for stock_in transactions"
                    )
            else:
                store_id_to_use = transaction_data.to_store_id
            
            # Get or create inventory record
            inventory = db.query(Inventory).filter(
                Inventory.item_id == transaction_data.item_id,
                Inventory.store_id == store_id_to_use
            ).first()
            
            if inventory:
                # Update existing inventory
                inventory.quantity += transaction_data.quantity
            else:
                # Create new inventory record
                inventory = Inventory(
                    item_id=transaction_data.item_id,
                    store_id=store_id_to_use,
                    quantity=transaction_data.quantity,
                    reserved_quantity=0,
                    min_level=50,  # Default, will be updated from item type if available
                    max_level=1000,  # Default
                )
                db.add(inventory)
            
            # Update box status to 'checked_in' if box_id is provided and box is still pending_checkin
            if transaction_data.box_id:
                box = db.query(Box).filter(Box.box_id == transaction_data.box_id).first()
                if box and box.status == 'pending_checkin':
                    box.status = 'checked_in'
                    box.store_id = store_id_to_use  # Set store_id from transaction
                    box.checked_in_at = datetime.now()
                    box.checked_in_by = current_user.username
                    db.add(box)  # Ensure box is tracked for commit
        
        # Create transaction (quantity is always positive, backend handles add/subtract logic)
        new_transaction = StockTransaction(
            transaction_type=transaction_data.transaction_type,
            item_id=transaction_data.item_id,
            from_store_id=transaction_data.from_store_id,
            to_store_id=transaction_data.to_store_id,
            quantity=transaction_data.quantity,  # Always positive
            reference_number=transaction_data.reference_number,
            reference_type=transaction_data.reference_type,
            employee_name=transaction_data.employee_name,
            employee_id=transaction_data.employee_id,
            department=transaction_data.department,
            reason=transaction_data.reason,
            notes=transaction_data.notes,
            box_id=transaction_data.box_id,
            created_by=current_user.username
        )
        
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        
        # Add item information to response
        new_transaction.item_code = item.item_code
        new_transaction.item_name = item.item_name
        
        return new_transaction
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating transaction: {str(e)}"
        )

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int,
    include_stock: bool = Query(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get single item by ID
    """
    item = db.query(Item).filter(Item.item_id == item_id).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found"
        )
    
    # Get batch and type information
    batch = db.query(ItemBatch).filter(ItemBatch.batch_id == item.batch_id).first()
    if batch:
        item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
        item.year_code = batch.year_code
        item.type_name = item_type.type_name if item_type else None
    else:
        item.year_code = None
        item.type_name = None
    
    # Get total stock
    if include_stock:
        total_stock = db.query(func.coalesce(func.sum(Inventory.quantity), 0)).filter(
            Inventory.item_id == item.item_id
        ).scalar()
        item.total_stock = total_stock or 0
    else:
        item.total_stock = 0
    
    return item

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_data: ItemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new item under a batch
    """
    # Check if item_code already exists
    existing = db.query(Item).filter(Item.item_code == item_data.item_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with code '{item_data.item_code}' already exists"
        )
    
    # Verify batch exists
    batch = db.query(ItemBatch).filter(ItemBatch.batch_id == item_data.batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {item_data.batch_id} not found"
        )
    
    # Generate QR code
    qr_code = f"ITEM-{item_data.item_code}-{uuid.uuid4().hex[:8].upper()}"
    
    # Create item
    new_item = Item(
        **item_data.model_dump(),
        qr_code=qr_code,
        created_by=current_user.username
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    # Add batch and type information
    item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
    new_item.year_code = batch.year_code
    new_item.type_name = item_type.type_name if item_type else None
    new_item.total_stock = 0
    
    return new_item

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: int,
    item_data: ItemUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update an existing item
    """
    item = db.query(Item).filter(Item.item_id == item_id).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found"
        )
    
    # Update fields
    update_data = item_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    
    # Add batch and type information
    batch = db.query(ItemBatch).filter(ItemBatch.batch_id == item.batch_id).first()
    if batch:
        item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
        item.year_code = batch.year_code
        item.type_name = item_type.type_name if item_type else None
    else:
        item.year_code = None
        item.type_name = None
    
    item.total_stock = 0
    
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    force: bool = Query(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete an item. If force=False, will fail if item has inventory or transactions.
    """
    item = db.query(Item).filter(Item.item_id == item_id).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found"
        )
    
    # Check for inventory
    inventory_count = db.query(func.count(Inventory.inventory_id)).filter(
        Inventory.item_id == item_id
    ).scalar()
    
    if inventory_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item with existing inventory. Use force=true to delete anyway."
        )
    
    # Check for transactions
    transaction_count = db.query(func.count(StockTransaction.transaction_id)).filter(
        StockTransaction.item_id == item_id
    ).scalar()
    
    if transaction_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item with existing transactions. Use force=true to delete anyway."
        )
    
    db.delete(item)
    db.commit()
    
    return None
