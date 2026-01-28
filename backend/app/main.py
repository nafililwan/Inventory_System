from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
# Import routes
from app.api import auth, users, categories, item_types, plants, stores, boxes, item_batches, items, notifications
import os
from pathlib import Path
from dotenv import load_dotenv
import traceback

# Load .env file from backend directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)
print(f"[Main] Loading .env from: {env_path}")
print(f"[Main] .env file exists: {env_path.exists()}")

app = FastAPI(
    title="HR Store Inventory API",
    description="Box-Based Inventory Management System with Year Code Tracking",
    version="2.0.0"
)

# CORS middleware - MUST be added before routes
# Get allowed origins from environment variable or use defaults
# Include production domain for CORS
default_origins = "http://localhost:3000,http://localhost:3001,https://jabilinventory.store,http://jabilinventory.store"
cors_origins_env = os.getenv("CORS_ORIGINS", default_origins)
cors_origins = cors_origins_env.split(",")
# Clean up origins (remove empty strings and strip whitespace)
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]
# Debug: Print CORS origins on startup
print(f"[Main] CORS_ORIGINS from env: {cors_origins_env}")
print(f"[Main] Parsed CORS origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Expose all headers including CORS headers
)

# Global exception handler to ensure CORS headers are always sent
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure CORS headers are always sent"""
    try:
        error_msg = str(exc)
        traceback_msg = traceback.format_exc()
        # Safe print for Windows terminal (no emoji/unicode issues)
        print(f"[Global Exception Handler] Error: {error_msg}")
        print(f"[Global Exception Handler] Traceback: {traceback_msg}")
    except UnicodeEncodeError:
        # Fallback if encoding still fails
        print("[Global Exception Handler] Error occurred (encoding issue prevented full message)")
        print(f"[Global Exception Handler] Error type: {type(exc).__name__}")
    # Get origin from request or use first allowed origin
    origin = request.headers.get("origin", cors_origins[0] if cors_origins else "*")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Create tables
try:
    Base.metadata.create_all(bind=engine)
    print("[Main] Database tables created/verified successfully")
except Exception as e:
    print(f"[Main] Warning: Error creating tables: {e}")
    import traceback
    traceback.print_exc()

# Mount static files for uploads
uploads_dir = Path(__file__).parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)

# Custom static file handler with CORS
from fastapi.responses import FileResponse

@app.get("/uploads/{file_path:path}")
async def serve_uploaded_file(file_path: str, request: Request):
    """Serve uploaded files with CORS headers"""
    # Decode URL-encoded file path
    from urllib.parse import unquote
    file_path = unquote(file_path)
    
    file_full_path = uploads_dir / file_path
    
    # Security check - ensure file is within uploads directory
    try:
        file_full_path.resolve().relative_to(uploads_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not file_full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get origin from request (check both 'origin' and 'referer' headers)
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    
    # Debug logging
    print(f"[Upload Handler] Request for: {file_path}")
    print(f"[Upload Handler] Origin header: {origin}")
    print(f"[Upload Handler] Referer header: {referer}")
    
    if not origin:
        # Try to extract from referer if origin not present
        if referer:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
                print(f"[Upload Handler] Extracted origin from referer: {origin}")
            except Exception as e:
                print(f"[Upload Handler] Error extracting origin from referer: {e}")
    
    # Prepare response headers - ALWAYS include CORS headers
    # Check if origin matches any allowed origin (case-insensitive, with/without www)
    allowed_origin = None
    if origin:
        # Check exact match first
        if origin in cors_origins:
            allowed_origin = origin
            print(f"[Upload Handler] Origin matched exactly: {origin}")
        else:
            # Check variations (with/without www, http/https)
            origin_lower = origin.lower()
            for allowed in cors_origins:
                allowed_lower = allowed.lower()
                # Match exact, or match with/without www
                if (origin_lower == allowed_lower or 
                    origin_lower.replace('www.', '') == allowed_lower.replace('www.', '') or
                    origin_lower == allowed_lower.replace('www.', '') or
                    origin_lower.replace('www.', '') == allowed_lower):
                    allowed_origin = origin
                    print(f"[Upload Handler] Origin matched variation: {origin} (allowed: {allowed})")
                    break
    
    # If no match found, default to main frontend domain
    if not allowed_origin:
        allowed_origin = "https://jabilinventory.store"
        print(f"[Upload Handler] No origin match, using default: {allowed_origin}")
    
    # ALWAYS set CORS headers - critical for images to load
    headers = {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "*",
        "Vary": "Origin"  # Important for CORS caching
    }
    
    print(f"[Upload Handler] Setting CORS headers: {headers}")
    
    return FileResponse(
        path=str(file_full_path),
        headers=headers
    )

@app.options("/uploads/{file_path:path}")
async def options_uploaded_file(file_path: str, request: Request):
    """Handle OPTIONS request for CORS preflight"""
    origin = request.headers.get("origin")
    
    # Check if origin matches any allowed origin
    allowed_origin = None
    if origin:
        if origin in cors_origins:
            allowed_origin = origin
        else:
            # Check variations (with/without www, http/https)
            origin_lower = origin.lower()
            for allowed in cors_origins:
                allowed_lower = allowed.lower()
                if (origin_lower == allowed_lower or 
                    origin_lower.replace('www.', '') == allowed_lower.replace('www.', '') or
                    origin_lower == allowed_lower.replace('www.', '') or
                    origin_lower.replace('www.', '') == allowed_lower):
                    allowed_origin = origin
                    break
    
    # If no match found, default to main frontend domain
    if not allowed_origin:
        allowed_origin = "https://jabilinventory.store"
    
    # ALWAYS set CORS headers
    headers = {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "3600",
        "Vary": "Origin"
    }
    return JSONResponse(content={}, headers=headers)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(item_types.router)
app.include_router(plants.router)
app.include_router(stores.router)
app.include_router(boxes.router)
app.include_router(item_batches.router)
app.include_router(items.router)
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

@app.get("/")
def read_root():
    return {
        "message": "HR Store Inventory API",
        "version": "2.0.0",
        "modules": ["auth", "users", "categories", "item_types", "plants", "stores", "boxes", "item_batches", "items", "notifications"],
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0"
    }
