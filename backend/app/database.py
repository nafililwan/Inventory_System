from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost:3306/hr_store_inventory")
    
    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()

# Parse and properly encode the database URL to handle special characters in password
def parse_database_url(url: str) -> str:
    """Parse database URL and properly encode password if needed"""
    try:
        # Use rsplit to split from the right (last @ is the separator between credentials and host)
        if '://' in url:
            parts = url.split('://', 1)
            scheme = parts[0]
            rest = parts[1]
            
            # Find the LAST @ which separates credentials from host
            last_at_index = rest.rfind('@')
            if last_at_index != -1:
                credentials = rest[:last_at_index]
                host_db = rest[last_at_index + 1:]
                
                if ':' in credentials:
                    # Split username and password (only first : is the separator)
                    user_pass = credentials.split(':', 1)
                    username = user_pass[0]
                    password = user_pass[1]
                    
                    # URL encode password to handle special characters like @, #, etc.
                    encoded_password = quote_plus(password)
                    
                    # Reconstruct URL
                    return f"{scheme}://{username}:{encoded_password}@{host_db}"
        
        return url
    except Exception as e:
        # If parsing fails, return original URL
        print(f"[Database] Warning: Failed to parse database URL: {e}")
        return url

# Use parsed URL
parsed_database_url = parse_database_url(settings.database_url)

engine = create_engine(
    parsed_database_url,
    pool_pre_ping=True,
    pool_recycle=300,  # Recycle connections after 5 minutes
    pool_size=2,  # Reduced from 5 to minimize connections per worker
    max_overflow=3,  # Reduced from 10 (total = pool_size + max_overflow = 5 per worker)
    pool_timeout=30,  # Timeout when getting connection from pool
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

