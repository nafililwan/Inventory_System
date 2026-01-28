'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  UserCircleIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { authService } from '@/lib/auth';
import { getApiUrl } from '@/lib/api';
import NotificationDropdown from '@/components/common/NotificationDropdown';
import { useTheme } from '@/components/providers/ThemeProvider';

interface TopHeaderProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}

export default function TopHeader({ onMenuClick, isMenuOpen = false }: TopHeaderProps) {
  const router = useRouter();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [user, setUser] = useState(authService.getUser());
  const { resolvedTheme, toggleTheme } = useTheme();

  const handleProfileSettings = () => {
    setShowMobileMenu(false);
    router.push('/settings');
  };

  // Update user when profile changes
  useEffect(() => {
    const loadUser = () => {
      setUser(authService.getUser());
    };
    
    // Listen for custom event when profile is updated
    const handleProfileUpdate = () => {
      loadUser();
    };
    
    // Check periodically for updates (every 2 minutes to reduce database connections)
    const interval = setInterval(loadUser, 120000);
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="lg:hidden sticky top-0 z-40">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo - Mobile sidebar removed, using bottom navigation */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">HR</span>
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">HR Inventory</div>
              <div className="text-xs text-blue-100 leading-tight">Jabil Malaysia</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationDropdown isMobile={true} />

            {/* Profile */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMobileMenu(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <UserCircleIcon className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[10000]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 z-[10000] shadow-2xl transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Profile</h2>
                  <motion.button
                    whileTap={{ scale: 0.9, rotate: 90 }}
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                  </motion.button>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-4 mb-8">
                  {user?.profile_photo ? (
                    <img
                      src={user.profile_photo.startsWith('/') 
                        ? `${getApiUrl()}${encodeURI(user.profile_photo)}` 
                        : encodeURI(user.profile_photo)}
                      alt={user?.full_name || 'User'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
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
                    className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold ${user?.profile_photo ? 'hidden' : ''}`}
                  >
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900 dark:text-gray-100">{user?.full_name || 'User'}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{user?.email || 'user@jabil.com'}</div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-2">
                  {/* Theme Toggle */}
                  <motion.button
                    onClick={toggleTheme}
                    whileTap={{ scale: 0.95 }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      {resolvedTheme === 'dark' ? (
                        <SunIcon className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <MoonIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                      <span>Theme</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </motion.button>

                  <button 
                    onClick={handleProfileSettings}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700"
                  >
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-900 dark:text-gray-100">
                    Notifications
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-900 dark:text-gray-100">
                    Help & Support
                  </button>
                  <button
                    onClick={() => authService.logout()}
                    className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

