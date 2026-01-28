from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Notification, NotificationType, NotificationStatus, User, Inventory, Item, Box
from app.schemas import NotificationResponse, NotificationCreate, NotificationUpdate
from app.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for current user"""
    query = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.user_id,
            Notification.user_id.is_(None)  # Global notifications
        )
    )
    
    if unread_only:
        query = query.filter(Notification.status == NotificationStatus.unread)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    # Convert to response format with metadata mapping
    return [NotificationResponse.model_validate(n) for n in notifications]

@router.get("/unread-count", response_model=dict)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    count = db.query(Notification).filter(
        and_(
            or_(
                Notification.user_id == current_user.user_id,
                Notification.user_id.is_(None)
            ),
            Notification.status == NotificationStatus.unread
        )
    ).count()
    
    return {"count": count}

@router.post("/", response_model=NotificationResponse)
def create_notification(
    notification: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new notification (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create notifications")
    
    db_notification = Notification(
        user_id=notification.user_id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        link=notification.link,
        notification_data=notification.metadata,  # metadata from schema maps to notification_data in model
        status=NotificationStatus.unread
    )
    
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    
    return NotificationResponse.model_validate(db_notification)

@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        and_(
            Notification.notification_id == notification_id,
            or_(
                Notification.user_id == current_user.user_id,
                Notification.user_id.is_(None)
            )
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.status = NotificationStatus.read
    notification.read_at = datetime.utcnow()
    
    db.commit()
    db.refresh(notification)
    
    return NotificationResponse.model_validate(notification)

@router.put("/read-all", response_model=dict)
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user"""
    updated = db.query(Notification).filter(
        and_(
            or_(
                Notification.user_id == current_user.user_id,
                Notification.user_id.is_(None)
            ),
            Notification.status == NotificationStatus.unread
        )
    ).update({
        Notification.status: NotificationStatus.read,
        Notification.read_at: datetime.utcnow()
    })
    
    db.commit()
    
    return {"updated": updated}

@router.delete("/{notification_id}", response_model=dict)
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        and_(
            Notification.notification_id == notification_id,
            or_(
                Notification.user_id == current_user.user_id,
                Notification.user_id.is_(None)
            )
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"success": True, "message": "Notification deleted"}

@router.post("/generate-stock-alerts", response_model=dict)
def generate_stock_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate stock alerts for low stock and out of stock items (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can generate alerts")
    
    # Get all inventory items
    inventories = db.query(Inventory).join(Item).filter(Item.status == "active").all()
    
    alerts_created = 0
    
    for inv in inventories:
        # Check for out of stock
        if inv.quantity == 0:
            # Check if notification already exists (avoid duplicates)
            # Use JSON_EXTRACT or similar for MySQL/MariaDB
            existing = db.query(Notification).filter(
                and_(
                    Notification.type == NotificationType.out_of_stock,
                    Notification.status == NotificationStatus.unread
                )
            ).all()
            
            # Check if this specific item/store combination already has a notification
            existing = next((n for n in existing if n.notification_data and 
                           n.notification_data.get('item_id') == inv.item_id and 
                           n.notification_data.get('store_id') == inv.store_id), None)
            
            if not existing:
                notification = Notification(
                    user_id=None,  # All users
                    type=NotificationType.out_of_stock,
                    title=f"Out of Stock: {inv.item.item_name}",
                    message=f"{inv.item.item_name} is out of stock at {inv.store.store_name}",
                    link=f"/inventory?item_id={inv.item_id}&store_id={inv.store_id}",
                    notification_data={"item_id": inv.item_id, "store_id": inv.store_id, "item_code": inv.item.item_code}
                )
                db.add(notification)
                alerts_created += 1
        
        # Check for low stock
        elif inv.quantity <= inv.min_level:
            existing = db.query(Notification).filter(
                and_(
                    Notification.type == NotificationType.low_stock,
                    Notification.status == NotificationStatus.unread
                )
            ).all()
            
            # Check if this specific item/store combination already has a notification
            existing = next((n for n in existing if n.notification_data and 
                           n.notification_data.get('item_id') == inv.item_id and 
                           n.notification_data.get('store_id') == inv.store_id), None)
            
            if not existing:
                notification = Notification(
                    user_id=None,  # All users
                    type=NotificationType.low_stock,
                    title=f"Low Stock: {inv.item.item_name}",
                    message=f"{inv.item.item_name} is running low ({inv.quantity} remaining) at {inv.store.store_name}",
                    link=f"/inventory?item_id={inv.item_id}&store_id={inv.store_id}",
                    notification_data={"item_id": inv.item_id, "store_id": inv.store_id, "item_code": inv.item.item_code, "quantity": inv.quantity}
                )
                db.add(notification)
                alerts_created += 1
    
    db.commit()
    
    return {"success": True, "alerts_created": alerts_created}

@router.post("/generate-pending-checkin-alerts", response_model=dict)
def generate_pending_checkin_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate alerts for pending check-in boxes (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can generate alerts")
    
    # Get pending check-in boxes
    pending_boxes = db.query(Box).filter(Box.status == "pending_checkin").all()
    
    if not pending_boxes:
        return {"success": True, "alerts_created": 0}
    
    # Check if notification already exists
    existing = db.query(Notification).filter(
        and_(
            Notification.type == NotificationType.pending_checkin,
            Notification.status == NotificationStatus.unread
        )
    ).first()
    
    if existing:
        return {"success": True, "alerts_created": 0}
    
    notification = Notification(
        user_id=None,  # All users
        type=NotificationType.pending_checkin,
        title=f"{len(pending_boxes)} Box(es) Pending Check-In",
        message=f"You have {len(pending_boxes)} box(es) waiting to be checked in",
        link="/receiving",
        notification_data={"count": len(pending_boxes), "box_ids": [b.box_id for b in pending_boxes]}
    )
    
    db.add(notification)
    db.commit()
    
    return {"success": True, "alerts_created": 1}

@router.post("/test-create", response_model=dict)
def create_test_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create test notifications for testing purposes (admin only)
    This endpoint creates sample notifications of different types
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create test notifications")
    
    test_notifications = [
        {
            "user_id": None,  # Global notification
            "type": NotificationType.low_stock,
            "title": "Test: Low Stock Alert",
            "message": "Item 'White Smock Size M' is running low (5 remaining) at Store A",
            "link": "/inventory?item_id=1&store_id=1",
            "notification_data": {"item_id": 1, "store_id": 1, "item_code": "WS-27-M-001", "quantity": 5}
        },
        {
            "user_id": None,
            "type": NotificationType.out_of_stock,
            "title": "Test: Out of Stock Alert",
            "message": "Item 'Safety Boots Size L' is out of stock at Store B",
            "link": "/inventory?item_id=2&store_id=2",
            "notification_data": {"item_id": 2, "store_id": 2, "item_code": "SB-27-L-001"}
        },
        {
            "user_id": None,
            "type": NotificationType.pending_checkin,
            "title": "Test: Pending Check-In",
            "message": "You have 1 box(es) waiting to be checked in",
            "link": "/receiving",
            "notification_data": {"count": 1, "box_ids": [1]}
        },
        {
            "user_id": None,
            "type": NotificationType.info,
            "title": "Test: System Update",
            "message": "System will be updated tonight at 10 PM. Please save your work.",
            "link": "/settings",
            "notification_data": {"update_id": 123, "scheduled_time": "2025-12-20 22:00:00"}
        },
        {
            "user_id": None,
            "type": NotificationType.transaction,
            "title": "Test: New Transaction",
            "message": "Stock out transaction completed: 10 pieces of White Smock",
            "link": "/inventory/transactions",
            "notification_data": {"transaction_id": 1, "quantity": 10}
        }
    ]
    
    created_count = 0
    skipped_count = 0
    
    for notif_data in test_notifications:
        # Check if notification already exists
        existing = db.query(Notification).filter(
            Notification.title == notif_data["title"],
            Notification.status == NotificationStatus.unread
        ).first()
        
        if not existing:
            notification = Notification(
                user_id=notif_data["user_id"],
                type=notif_data["type"],
                title=notif_data["title"],
                message=notif_data["message"],
                link=notif_data["link"],
                notification_data=notif_data["notification_data"],
                status=NotificationStatus.unread
            )
            db.add(notification)
            created_count += 1
        else:
            skipped_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "created": created_count,
        "skipped": skipped_count,
        "message": f"Created {created_count} test notifications, skipped {skipped_count} duplicates"
    }

