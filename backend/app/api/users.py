from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
import secrets
import string
import os
import base64
import uuid
from pathlib import Path
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserUpdate, UserResponse, PasswordChange
from app.auth import get_current_active_user, get_password_hash, require_role, verify_password
from app.email_service import email_service
# Activity logging disabled - ActivityLog model removed during reset

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all users with optional filtering
    - Filter by status (active/inactive)
    - Filter by role (admin/manager)
    - Search by username or full_name
    - Pagination
    """
    query = db.query(User)
    
    if status:
        query = query.filter(User.status == status)
    
    if role:
        query = query.filter(User.role == role)
    
    if search:
        search_filter = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(User.username).like(search_filter),
                func.lower(User.full_name).like(search_filter),
                func.lower(User.email).like(search_filter)
            )
        )
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users

# IMPORTANT: /me routes must be defined BEFORE /{user_id} route
# Otherwise FastAPI will try to match "me" as user_id and fail validation

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile"""
    # Explicitly convert to UserResponse to ensure proper Enum serialization
    return UserResponse.model_validate(current_user)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get single user by ID"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def generate_temporary_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password

@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Create new user
    - Only admins can create users
    - Validate unique username and email
    - Generate temporary password if not provided
    - Send welcome email with credentials
    - Hash password
    """
    print(f"[User API] Creating user: {user.username}, role: {user.role}")
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user.username).first()
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )
    
    # Check if email already exists (if provided)
    if user.email:
        existing_email = db.query(User).filter(User.email == user.email).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )
    
    # Generate temporary password if not provided
    temporary_password = user.password if user.password else generate_temporary_password()
    if not user.password:
        print(f"[User API] Generated temporary password for {user.username}")
    
    # Create new user
    try:
        from app.models import Status
        print(f"[User API] Creating User object with role: {user.role}")
        new_user = User(
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            status=Status.active,  # Default to active
            password_hash=get_password_hash(temporary_password)
        )
        
        print(f"[User API] Adding user to database...")
        db.add(new_user)
        db.commit()
        print(f"[User API] User committed, refreshing...")
        db.refresh(new_user)
        print(f"[User API] User created successfully: {new_user.user_id}")
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        print(f"[User API] ERROR creating user: {error_msg}")
        import traceback
        print(f"[User API] Traceback: {traceback.format_exc()}")
        # Check if it's an enum mismatch error
        if 'worker' in error_msg.lower() or 'intern' in error_msg.lower() or 'enum' in error_msg.lower():
            raise HTTPException(
                status_code=500,
                detail=f"Database enum mismatch. Please run SQL update: {error_msg}. See backend/update_user_roles.sql"
            )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create user: {error_msg}"
        )
    
    # Send welcome email if email is provided
    if user.email:
        print(f"[User API] Attempting to send welcome email to {user.email}")
        try:
            email_sent = email_service.send_welcome_email(
                to_email=user.email,
                username=user.username,
                full_name=user.full_name,
                temporary_password=temporary_password
            )
            if email_sent:
                print(f"[User API] [SUCCESS] Welcome email sent successfully to {user.email}")
            else:
                print(f"[User API] [WARNING] Welcome email failed to send to {user.email} (check email service logs)")
        except Exception as e:
            # Log error but don't fail user creation
            print(f"[User API] [ERROR] Exception sending welcome email: {str(e)}")
            import traceback
            print(f"[User API] Traceback: {traceback.format_exc()}")
    
    # Activity logging disabled - ActivityLog model removed
    # log_activity(...)
    
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update user
    - Users can update their own profile (except role)
    - Admins can update any user
    - Check for username conflicts
    - Update password if provided
    - Log activity
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    is_admin = current_user.role.value == "admin"
    is_own_profile = current_user.user_id == user_id
    
    if not is_admin and not is_own_profile:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own profile"
        )
    
    # Non-admins cannot change role
    if not is_admin and user_update.role is not None:
        raise HTTPException(
            status_code=403,
            detail="You cannot change user roles"
        )
    
    # Check username conflict if username is being changed
    if user_update.username and user_update.username != user.username:
        existing = db.query(User).filter(
            User.username == user_update.username,
            User.user_id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )
    
    # Store old values for logging
    old_values = {
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value
    }
    
    # Update fields
    update_data = user_update.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    # Activity logging disabled - ActivityLog model removed
    # log_activity(...)
    
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Delete user
    - Only admins can delete users
    - Cannot delete own account
    - Log activity
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot delete own account
    if current_user.user_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )
    
    username = user.username
    db.delete(user)
    db.commit()
    
    # Activity logging disabled - ActivityLog model removed
    # log_activity(...)
    
    return {
        "success": True,
        "message": f"User '{username}' deleted successfully"
    }

@router.get("/stats/count")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user statistics"""
    total_users = db.query(func.count(User.user_id)).scalar()
    active_users = db.query(func.count(User.user_id)).filter(User.status == "active").scalar()
    admin_count = db.query(func.count(User.user_id)).filter(User.role == "admin").scalar()
    manager_count = db.query(func.count(User.user_id)).filter(User.role == "manager").scalar()
    
    return {
        "total": total_users,
        "active": active_users,
        "inactive": total_users - active_users,
        "admins": admin_count,
        "managers": manager_count
    }

# ============================================================================
# PROFILE SETTINGS ENDPOINTS
# ============================================================================
# Note: GET /me is defined above before /{user_id} route

@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile (email, full_name, profile_photo)"""
    if user_update.email and user_update.email != current_user.email:
        # Check if email is already taken
        existing_user = db.query(User).filter(
            User.email == user_update.email,
            User.user_id != current_user.user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        current_user.email = user_update.email
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    if user_update.profile_photo is not None:
        current_user.profile_photo = user_update.profile_photo
    
    db.commit()
    db.refresh(current_user)
    # Explicitly convert to UserResponse to ensure proper Enum serialization
    return UserResponse.model_validate(current_user)

@router.post("/me/change-password")
def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change current user's password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/me/upload-photo")
def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload profile photo"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
        )
    
    # Validate file size (max 5MB)
    file_content = file.file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum size is 5MB."
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path(__file__).parent.parent.parent / "uploads" / "profiles"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix or ".jpg"
    filename = f"{current_user.user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Update user profile_photo
    # Store relative path or URL
    profile_url = f"/uploads/profiles/{filename}"
    current_user.profile_photo = profile_url
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile photo uploaded successfully",
        "profile_photo": profile_url,
        "user": UserResponse.model_validate(current_user)
    }

