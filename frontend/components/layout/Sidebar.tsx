'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  FolderIcon,
  BuildingOfficeIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  InboxIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { authService, User } from '@/lib/auth';
import { getApiUrl } from '@/lib/api';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      // Scan QR - removed, will be added back when implemented
    ],
  },
  {
    title: 'Master Data',
    items: [
      { name: 'Categories', href: '/categories', icon: FolderIcon },
      { name: 'Locations', href: '/locations', icon: BuildingOfficeIcon },
      // Item Types - managed within Categories page
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Receiving', href: '/receiving', icon: InboxIcon },
      { name: 'Inventory', href: '/inventory', icon: BuildingStorefrontIcon },
    ],
  },
  {
    title: 'Reports',
    items: [
      { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
      { name: 'Inventory Table', href: '/inventory/table', icon: TableCellsIcon },
    ],
  },
  
  {
    title: 'System',
    items: [
      { name: 'Users', href: '/users', icon: UserGroupIcon, adminOnly: true },
      { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

interface SidebarProps {
  onMobileMenuToggle?: (isOpen: boolean) => void;
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export default function Sidebar({ onMobileMenuToggle, mobileMenuOpen: externalMobileMenuOpen, onMobileMenuClose }: SidebarProps) {
  const pathname = usePathname();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Use external state if provided, otherwise use internal state
  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen;

  useEffect(() => {
    const loadUser = () => {
      setUser(authService.getUser());
    };
    
    loadUser();
    
    // Listen for storage changes (when user data is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUser();
      }
    };
    
    // Listen for custom event when profile is updated
    const handleProfileUpdate = () => {
      loadUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // Also check periodically (for same-tab updates) - reduced to 2 minutes to prevent too many DB connections
    const interval = setInterval(loadUser, 120000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
  };

  const closeMobileMenu = () => {
    if (externalMobileMenuOpen === undefined) {
      setInternalMobileMenuOpen(false);
    }
    if (onMobileMenuClose) {
      onMobileMenuClose();
    }
    if (onMobileMenuToggle) {
      onMobileMenuToggle(false);
    }
  };

  return (
    <>
      {/* Mobile sidebar - DISABLED: Using bottom navigation instead */}
      {/* Mobile sidebar removed - bottom navigation handles mobile navigation */}

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? '4rem' : '15rem' }}
        className="hidden lg:flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white h-screen sticky top-0"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">HR</span>
                </div>
                <div>
                  <div className="font-bold text-sm">HR Inventory</div>
                  <div className="text-xs text-slate-400">Jabil Malaysia</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5" />
            )}
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-hide">
          {navSections.map((section) => (
            <div key={section.title}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {section.title}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                {section.items
                  .filter((item) => {
                    // Hide admin-only items for non-admin users
                    if (item.adminOnly && user?.role !== 'admin') {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <motion.button
                        key={item.name}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => (window.location.href = item.href)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg'
                            : 'hover:bg-slate-700/50'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="text-sm font-medium whitespace-nowrap"
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="px-2 pb-3 border-t border-slate-700 pt-3 mt-auto">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center px-3 py-2 mb-2"
              >
                {user?.profile_photo ? (
                  <img
                    src={user.profile_photo.startsWith('/') 
                      ? `${getApiUrl()}${encodeURI(user.profile_photo)}` 
                      : encodeURI(user.profile_photo)}
                    alt={user?.full_name || 'User'}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-slate-600"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    loading="lazy"
                    crossOrigin="anonymous"
                  />
                ) : null}
                <div 
                  className={`w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0 ${user?.profile_photo ? 'hidden' : ''}`}
                >
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate capitalize">
                    {user?.role || 'admin'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
            {!collapsed && <span>Logout</span>}
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}

function SidebarContent({
  pathname,
  user,
  onLogout,
}: {
  pathname: string;
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center flex-shrink-0">
          <CubeIcon className="w-5 h-5 text-white" />
        </div>
        <div className="ml-3 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">HR Inventory</h2>
          <p className="text-xs text-gray-500 truncate">Jabil Malaysia</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded transition-colors
                ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-2 pb-3 border-t border-gray-200 pt-3 mt-auto">
        <div className="flex items-center px-3 py-2 mb-2">
          {user?.profile_photo ? (
            <img
              src={user.profile_photo.startsWith('/') 
                ? `${getApiUrl()}${encodeURI(user.profile_photo)}` 
                : encodeURI(user.profile_photo)}
              alt={user?.full_name || 'User'}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-gray-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
              loading="lazy"
              crossOrigin="anonymous"
            />
          ) : null}
          <div 
            className={`w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0 ${user?.profile_photo ? 'hidden' : ''}`}
          >
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate capitalize">{user?.role || 'admin'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
          <span className="truncate">Logout</span>
        </button>
      </div>
    </div>
  );
}

