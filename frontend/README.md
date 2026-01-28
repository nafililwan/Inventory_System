# HR Store Inventory Management System - Frontend

Modern, professional frontend built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## 🚀 Features

- **Modern UI/UX**: Professional design with smooth animations
- **PWA Support**: Progressive Web App with offline capabilities
- **Mobile First**: Fully responsive design
- **Animations**: Framer Motion animations throughout
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling

## 📦 Tech Stack

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Axios**: HTTP client
- **React Hot Toast**: Notifications
- **Heroicons**: Icons
- **next-pwa**: PWA support

## 🏃 Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Development Server

```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## 📱 PWA Features

- Installable on mobile devices
- Offline support
- Service worker caching
- App shortcuts

## 🎨 Design System

- **Primary Color**: Blue (#3b82f6)
- **Font**: Inter & Poppins
- **Animations**: Smooth transitions with Framer Motion
- **Responsive**: Mobile-first approach

## 📁 Project Structure

```
frontend/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── auth/         # Authentication components
│   ├── categories/   # Category management
│   └── layout/       # Layout components
├── lib/              # Utilities & API clients
└── public/           # Static assets
```

## 🔐 Default Login

- **Username**: `admin`
- **Password**: `admin123`

## 📝 Available Pages

- `/login` - Login page
- `/dashboard` - Main dashboard
- `/categories` - Category management
- `/users` - User management (coming soon)
- `/plants` - Plant management (coming soon)
- `/stores` - Store management (coming soon)
- `/items` - Item management (coming soon)
- `/inventory` - Inventory view (coming soon)
