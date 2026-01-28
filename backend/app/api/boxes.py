from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import datetime, date
import json

from app.database import get_db
from app.models import (
    Box,
    BoxContent,
    Item,
    ItemBatch,
    ItemType,
    Store,
    Inventory,
    StockTransaction,
)
from app.schemas import (
    BoxCreate,
    BoxResponse,
    BoxWithContents,
    BoxContentResponse,
    BoxCheckIn,
)
from app.auth import get_current_user


router = APIRouter(prefix="/api/boxes", tags=["Boxes"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def generate_box_code(db: Session) -> str:
    """Generate unique box code BOX-YYYY-NNNN"""
    year = datetime.now().year
    last_box = (
        db.query(Box)
        .filter(Box.box_code.like(f"BOX-{year}-%"))
        .order_by(Box.box_id.desc())
        .first()
    )

    if last_box:
        last_num = int(last_box.box_code.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1

    return f"BOX-{year}-{new_num:04d}"


def generate_type_code(type_name: str) -> str:
    """
    Generate short type code from type name
    Examples:
    - "White Smock" → "WS"
    - "Safety Boots" → "SB"
    - "Lab Coat" → "LC"
    """
    words = type_name.split()
    if len(words) >= 2:
        return "".join([word[0] for word in words[:2]]).upper()
    return type_name[:2].upper()


def generate_item_code(type_code: str, year_code: str, size: str, sequence: int = 1) -> str:
    """
    Generate item code: TYPE-YEAR-SIZE-SEQ
    Example: WS-27-M-001
    """
    size_clean = size.replace(" ", "").replace("/", "")
    return f"{type_code}-{year_code}-{size_clean}-{sequence:03d}"


def get_or_create_batch(db: Session, type_id: int, year_code: str, username: str) -> ItemBatch:
    """Get existing batch or create new one"""
    batch = (
        db.query(ItemBatch)
        .filter(ItemBatch.type_id == type_id, ItemBatch.year_code == year_code)
        .first()
    )
    if batch:
        return batch

    item_type = db.query(ItemType).filter(ItemType.type_id == type_id).first()
    if not item_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item type ID {type_id} not found",
        )

    batch = ItemBatch(
        type_id=type_id,
        year_code=year_code,
        batch_name=f"{item_type.type_name} 20{year_code}",
        status="active",
        created_by=username,
    )

    db.add(batch)
    db.flush()
    return batch


def get_or_create_item(
    db: Session,
    batch: ItemBatch,
    size: str,
    color: Optional[str],
    username: str,
) -> Item:
    """Get existing item or create new one"""
    query = db.query(Item).filter(Item.batch_id == batch.batch_id, Item.size == size)
    if color:
        query = query.filter(Item.color == color)

    item = query.first()
    if item:
        return item

    item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
    if not item_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item type ID {batch.type_id} not found",
        )

    type_code = generate_type_code(item_type.type_name)

    existing_count = (
        db.query(func.count(Item.item_id))
        .filter(Item.batch_id == batch.batch_id, Item.size == size)
        .scalar()
    )
    sequence = (existing_count or 0) + 1

    item_code = generate_item_code(type_code, batch.year_code, size, sequence)
    item_name = f"{item_type.type_name} 20{batch.year_code} - Size {size}"
    if color:
        item_name += f" ({color})"

    item = Item(
        batch_id=batch.batch_id,
        item_code=item_code,
        item_name=item_name,
        size=size,
        color=color,
        unit_type="pcs",
        qr_code=item_code,  # QR code same as item code
        status="active",
        created_by=username,
    )

    db.add(item)
    db.flush()
    return item


# ============================================================================
# BOX ENDPOINTS
# ============================================================================


@router.post("/", response_model=BoxWithContents, status_code=status.HTTP_201_CREATED)
async def create_box(
    box_data: BoxCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Receive new box from supplier
    - Auto-creates batches and items if they don't exist
    - Generates box code and QR code
    - Creates box with status PENDING_CHECKIN
    - Returns box details with contents
    """
    try:
        box_code = generate_box_code(db)
        qr_code = box_code

        new_box = Box(
            box_code=box_code,
            qr_code=qr_code,
            supplier=box_data.supplier,
            po_number=box_data.po_number,
            do_number=box_data.do_number,
            invoice_number=box_data.invoice_number,
            received_date=box_data.received_date,
            received_by=current_user.username,
            status="pending_checkin",
            notes=box_data.notes,
        )

        db.add(new_box)
        db.flush()

        total_items = 0
        contents_list: List[BoxContentResponse] = []
        items_created: List[Item] = []
        batches_created: List[ItemBatch] = []

        for content_input in box_data.contents:
            
            # Check if type_id exists and is not None (new auto-create flow)
            if content_input.type_id is not None:
                # Auto-create flow
                batch = get_or_create_batch(
                    db,
                    content_input.type_id,
                    content_input.year_code,
                    current_user.username,
                )

                if batch.batch_id not in [b.batch_id for b in batches_created]:
                    batches_created.append(batch)

                item = get_or_create_item(
                    db,
                    batch,
                    content_input.size,
                    content_input.color,
                    current_user.username,
                )

                if item.item_id not in [i.item_id for i in items_created]:
                    items_created.append(item)
            elif content_input.item_id is not None:
                # Legacy flow: item_id provided
                item = db.query(Item).filter(Item.item_id == content_input.item_id).first()
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Item ID {content_input.item_id} not found",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Either type_id+year_code+size OR item_id must be provided in box contents",
                )

            box_content = BoxContent(
                box_id=new_box.box_id,
                item_id=item.item_id,
                quantity=content_input.quantity,
                remaining=content_input.quantity,
            )

            db.add(box_content)
            total_items += content_input.quantity

            content_response = BoxContentResponse(
                content_id=0,
                box_id=new_box.box_id,
                item_id=item.item_id,
                quantity=content_input.quantity,
                remaining=content_input.quantity,
                item_code=item.item_code,
                item_name=item.item_name,
                size=item.size,
            )
            contents_list.append(content_response)

        db.commit()
        db.refresh(new_box)

        # Ensure required fields have values
        qr_code = new_box.qr_code if new_box.qr_code else new_box.box_code
        received_by = new_box.received_by if new_box.received_by else current_user.username
        
        box_dict = {
            "box_id": new_box.box_id,
            "box_code": new_box.box_code,
            "qr_code": qr_code,
            "supplier": new_box.supplier,
            "po_number": new_box.po_number,
            "do_number": new_box.do_number,
            "invoice_number": new_box.invoice_number,
            "store_id": new_box.store_id,
            "location_in_store": new_box.location_in_store,
            "status": new_box.status,
            "received_date": new_box.received_date or date.today(),
            "received_by": received_by,
            "checked_in_at": new_box.checked_in_at or new_box.checked_in_date,
            "checked_in_by": new_box.checked_in_by,
            "notes": new_box.notes,
            "created_at": new_box.created_at,
            "updated_at": new_box.updated_at,
            "total_items": total_items,
        }
        
        response = BoxWithContents(**box_dict)
        response.contents = contents_list

        return response

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating box: {str(e)}",
        )


@router.get("/pending", response_model=List[BoxWithContents])
async def get_pending_boxes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all boxes waiting to be checked in"""
    query = db.query(Box).filter(Box.status == "pending_checkin")
    query = query.order_by(Box.received_date.desc())

    boxes = query.offset(skip).limit(limit).all()

    result: List[BoxWithContents] = []
    for box in boxes:
        contents = db.query(BoxContent).filter(BoxContent.box_id == box.box_id).all()

        contents_list: List[BoxContentResponse] = []
        total_items = 0

        for content in contents:
            item = db.query(Item).filter(Item.item_id == content.item_id).first()
            if item:
                content_response = BoxContentResponse(
                    content_id=content.content_id,
                    box_id=content.box_id,
                    item_id=content.item_id,
                    quantity=content.quantity,
                    remaining=content.remaining,
                    item_code=item.item_code,
                    item_name=item.item_name,
                    size=item.size,
                )
                contents_list.append(content_response)
                total_items += content.quantity

        # Ensure required fields have values
        qr_code = box.qr_code if box.qr_code else box.box_code
        received_by = box.received_by if box.received_by else box.created_by or "System"
        
        box_dict = {
            "box_id": box.box_id,
            "box_code": box.box_code,
            "qr_code": qr_code,
            "supplier": box.supplier,
            "po_number": box.po_number,
            "do_number": box.do_number,
            "invoice_number": box.invoice_number,
            "store_id": box.store_id,
            "location_in_store": box.location_in_store,
            "status": box.status,
            "received_date": box.received_date or date.today(),
            "received_by": received_by,
            "checked_in_at": box.checked_in_at or box.checked_in_date,
            "checked_in_by": box.checked_in_by,
            "notes": box.notes,
            "created_at": box.created_at,
            "updated_at": box.updated_at,
            "total_items": total_items,
        }
        
        box_response = BoxWithContents(**box_dict)
        box_response.contents = contents_list
        result.append(box_response)

    return result


@router.put("/{box_id}/checkin", response_model=BoxResponse)
async def checkin_box(
    box_id: int,
    checkin_data: BoxCheckIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Check-in box to store
    - Updates box status to CHECKED_IN
    - Creates/updates inventory records
    - Creates transaction records
    """
    box = db.query(Box).filter(Box.box_id == box_id).first()

    if not box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Box not found",
        )

    if box.status != "pending_checkin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Box is already {box.status}, cannot check-in",
        )

    store = db.query(Store).filter(Store.store_id == checkin_data.store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )

    try:
        box.store_id = checkin_data.store_id
        box.location_in_store = checkin_data.location_in_store
        box.status = "checked_in"
        box.checked_in_at = datetime.now()
        box.checked_in_by = current_user.username

        contents = db.query(BoxContent).filter(BoxContent.box_id == box_id).all()

        for content in contents:
            # Get item to determine stock levels
            item = db.query(Item).filter(Item.item_id == content.item_id).first()
            
            # ALWAYS create a new inventory record for each box checkin
            # This ensures items from different boxes remain separate
            # Get min/max levels from item type's size_stock_levels
            min_level = 50
            max_level = 1000
            
            if item:
                # Get batch and item type
                batch = db.query(ItemBatch).filter(ItemBatch.batch_id == item.batch_id).first()
                if batch:
                    item_type = db.query(ItemType).filter(ItemType.type_id == batch.type_id).first()
                    if item_type:
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
                            else:
                                # Use item type default
                                min_level = item_type.min_stock_level or 50
                                max_level = item_type.max_stock_level or 1000
                        else:
                            # Use item type default
                            min_level = item_type.min_stock_level or 50
                            max_level = item_type.max_stock_level or 1000
            
            # Create NEW inventory record for this box (don't merge with existing)
            inventory = Inventory(
                store_id=checkin_data.store_id,
                item_id=content.item_id,
                quantity=content.quantity,
                reserved_quantity=0,
                min_level=min_level,
                max_level=max_level,
            )
            db.add(inventory)
            db.flush()  # Flush to get inventory_id

            transaction = StockTransaction(
                transaction_type="box_checkin",
                box_id=box_id,
                item_id=content.item_id,
                to_store_id=checkin_data.store_id,
                quantity=content.quantity,
                reference_number=box.box_code,
                reference_type="BOX",
                created_by=current_user.username,
            )
            db.add(transaction)

        db.commit()
        db.refresh(box)

        # Ensure required fields have values
        qr_code = box.qr_code if box.qr_code else box.box_code
        received_by = box.received_by if box.received_by else box.created_by or "System"
        
        box_dict = {
            "box_id": box.box_id,
            "box_code": box.box_code,
            "qr_code": qr_code,
            "supplier": box.supplier,
            "po_number": box.po_number,
            "do_number": box.do_number,
            "invoice_number": box.invoice_number,
            "store_id": box.store_id,
            "location_in_store": box.location_in_store,
            "status": box.status,
            "received_date": box.received_date or date.today(),
            "received_by": received_by,
            "checked_in_at": box.checked_in_at or box.checked_in_date,
            "checked_in_by": box.checked_in_by,
            "notes": box.notes,
            "created_at": box.created_at,
            "updated_at": box.updated_at,
            "total_items": sum(c.quantity for c in contents),
        }
        
        response = BoxResponse(**box_dict)
        response.store_name = store.store_name

        return response

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error checking in box: {str(e)}",
        )


@router.get("/{box_id}", response_model=BoxWithContents)
async def get_box(
    box_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get box details with contents"""
    box = db.query(Box).filter(Box.box_id == box_id).first()

    if not box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Box not found",
        )

    contents = db.query(BoxContent).filter(BoxContent.box_id == box_id).all()

    contents_list: List[BoxContentResponse] = []
    total_items = 0

    for content in contents:
        item = db.query(Item).filter(Item.item_id == content.item_id).first()
        if item:
            content_response = BoxContentResponse(
                content_id=content.content_id,
                box_id=content.box_id,
                item_id=content.item_id,
                quantity=content.quantity,
                remaining=content.remaining,
                item_code=item.item_code,
                item_name=item.item_name,
                size=item.size,
            )
            contents_list.append(content_response)
            total_items += content.quantity

    # Ensure required fields have values
    qr_code = box.qr_code if box.qr_code else box.box_code
    received_by = box.received_by if box.received_by else box.created_by or "System"
    
    box_dict = {
        "box_id": box.box_id,
        "box_code": box.box_code,
        "qr_code": qr_code,
        "supplier": box.supplier,
        "po_number": box.po_number,
        "do_number": box.do_number,
        "invoice_number": box.invoice_number,
        "store_id": box.store_id,
        "location_in_store": box.location_in_store,
        "status": box.status,
        "received_date": box.received_date or date.today(),
        "received_by": received_by,
        "checked_in_at": box.checked_in_at or box.checked_in_date,
        "checked_in_by": box.checked_in_by,
        "notes": box.notes,
        "created_at": box.created_at,
        "updated_at": box.updated_at,
        "total_items": total_items,
    }
    
    response = BoxWithContents(**box_dict)
    response.contents = contents_list

    if box.store_id:
        store = db.query(Store).filter(Store.store_id == box.store_id).first()
        if store:
            response.store_name = store.store_name

    return response


@router.get("/{box_id}/inventory")
async def get_box_inventory(
    box_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get inventory records created from this box"""
    # Verify box exists
    box = db.query(Box).filter(Box.box_id == box_id).first()
    if not box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Box not found",
        )
    
    # Get all transactions from this box
    transactions = db.query(StockTransaction).filter(
        StockTransaction.box_id == box_id,
        StockTransaction.transaction_type == 'box_checkin'
    ).all()
    
    # Get inventory records for each transaction
    inventory_list = []
    for transaction in transactions:
        inventory = db.query(Inventory).filter(
            Inventory.item_id == transaction.item_id,
            Inventory.store_id == transaction.to_store_id
        ).first()
        
        if inventory:
            item = db.query(Item).filter(Item.item_id == inventory.item_id).first()
            store = db.query(Store).filter(Store.store_id == inventory.store_id).first()
            
            inventory_list.append({
                "inventory_id": inventory.inventory_id,
                "item_id": inventory.item_id,
                "item_code": item.item_code if item else None,
                "item_name": item.item_name if item else None,
                "size": item.size if item else None,
                "store_id": inventory.store_id,
                "store_name": store.store_name if store else None,
                "quantity": inventory.quantity,
                "available_quantity": inventory.available_quantity or (inventory.quantity - inventory.reserved_quantity),
                "location_in_store": inventory.location_in_store,
                "checked_in_at": transaction.created_at,
            })
    
    return inventory_list


@router.get("/", response_model=List[BoxResponse])
async def get_boxes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    store_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all boxes with filtering"""
    query = db.query(Box)

    if status:
        query = query.filter(Box.status == status)

    if store_id:
        query = query.filter(Box.store_id == store_id)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Box.box_code.like(search_pattern),
                Box.supplier.like(search_pattern),
                Box.po_number.like(search_pattern),
            )
        )

    query = query.order_by(Box.created_at.desc())
    boxes = query.offset(skip).limit(limit).all()

    result: List[BoxResponse] = []
    for box in boxes:
        contents = db.query(BoxContent).filter(BoxContent.box_id == box.box_id).all()
        total_items = sum(c.quantity for c in contents)

        # Ensure required fields have values
        qr_code = box.qr_code if box.qr_code else box.box_code
        received_by = box.received_by if box.received_by else box.created_by or "System"
        
        # Use model_validate for Pydantic v2 compatibility
        box_dict = {
            "box_id": box.box_id,
            "box_code": box.box_code,
            "qr_code": qr_code,
            "supplier": box.supplier,
            "po_number": box.po_number,
            "do_number": box.do_number,
            "invoice_number": box.invoice_number,
            "store_id": box.store_id,
            "location_in_store": box.location_in_store,
            "status": box.status,
            "received_date": box.received_date or date.today(),
            "received_by": received_by,
            "checked_in_at": box.checked_in_at or box.checked_in_date,
            "checked_in_by": box.checked_in_by,
            "notes": box.notes,
            "created_at": box.created_at,
            "updated_at": box.updated_at,
            "total_items": total_items,
        }
        
        box_response = BoxResponse(**box_dict)

        if box.store_id:
            store = db.query(Store).filter(Store.store_id == box.store_id).first()
            if store:
                box_response.store_name = store.store_name

        result.append(box_response)

    return result
