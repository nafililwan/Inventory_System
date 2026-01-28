"""
Database initialization script
Creates tables and inserts sample data
"""
from app.database import engine, SessionLocal, Base
from app.models import (
    User, Plant, Store, Category, ItemType, UserRole, Status
)
from app.auth import get_password_hash
from sqlalchemy import func

def init_db():
    """Initialize database with tables and sample data"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if not admin_user:
            # Create default admin user
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                full_name="System Administrator",
                email="admin@jabil.com",
                role=UserRole.admin,
                status=Status.active
            )
            db.add(admin_user)
            db.commit()
            print("SUCCESS: Created default admin user (username: admin, password: admin123)")
        
        # Create sample plants
        if db.query(Plant).count() == 0:
            plants = [
                Plant(plant_name="Jabil Penang", location="Penang, Malaysia", status=Status.active),
                Plant(plant_name="Jabil Johor", location="Johor, Malaysia", status=Status.active),
            ]
            db.add_all(plants)
            db.commit()
            print("SUCCESS: Created sample plants")
        
        # Create sample categories
        if db.query(Category).count() == 0:
            categories = [
                Category(
                    category_name="Uniform",
                    description="Employee uniforms and work attire",
                    icon="shirt",
                    color="#3b82f6",
                    display_order=1,
                    status=Status.active
                ),
                Category(
                    category_name="Safety Equipment",
                    description="Personal protective equipment (PPE)",
                    icon="shield-check",
                    color="#10b981",
                    display_order=2,
                    status=Status.active
                ),
                Category(
                    category_name="Office Supplies",
                    description="General office stationery and supplies",
                    icon="clipboard-list",
                    color="#8b5cf6",
                    display_order=3,
                    status=Status.active
                ),
                Category(
                    category_name="Event Materials",
                    description="Items for company events and activities",
                    icon="calendar-event",
                    color="#f59e0b",
                    display_order=4,
                    status=Status.active
                ),
                Category(
                    category_name="Tools & Equipment",
                    description="Work tools and equipment",
                    icon="tools",
                    color="#6366f1",
                    display_order=5,
                    status=Status.active
                ),
            ]
            db.add_all(categories)
            db.commit()
            print("SUCCESS: Created sample categories")
        
        print("\nDatabase initialization completed successfully!")
        print("\nDefault login credentials:")
        print("  Username: admin")
        print("  Password: admin123")
        print("\nWARNING: Please change the default password after first login!")
        
    except Exception as e:
        print(f"ERROR: Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

