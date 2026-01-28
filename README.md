# HR Store Inventory Management System

Backend has been completely reset and is ready for fresh implementation.

## ✅ Current Status

- **Backend**: Clean slate - only authentication and user management
- **Database**: Only `users` table exists
- **API Routes**: Only `/api/auth/*` and `/api/users/*` endpoints available
- **Ready for**: New implementation

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend**:
   ```bash
   cd backend
   ```

2. **Activate virtual environment**:
   ```bash
   .\venv\Scripts\activate  # Windows
   ```

3. **Reset Database** (if needed):
   ```bash
   # Run the SQL script in MySQL
   mysql -u root -p < reset_and_init.sql
   ```

4. **Start backend**:
   ```bash
   python run.py
   ```

5. **Verify**:
   - Visit: `http://localhost:8000/`
   - API Docs: `http://localhost:8000/docs`
   - Health: `http://localhost:8000/health`

## 🔐 Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📋 Available Endpoints

### Authentication
- `POST /api/auth/login/json` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

## 🗄️ Database

Only one table exists:
- `users` - User accounts and authentication

## 📝 Next Steps

Ready for new implementation! Provide requirements and we'll build from scratch.
