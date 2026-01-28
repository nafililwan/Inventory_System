'use client';

import { MagnifyingGlassIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/components/providers/ThemeProvider';
import { motion } from 'framer-motion';
import NotificationDropdown from '@/components/common/NotificationDropdown';

export default function Header() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 lg:z-30 transition-colors">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* Search - Hide on mobile, show on desktop */}
          <div className="hidden md:flex flex-1 max-w-lg">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          {/* Mobile: Just show title */}
          <div className="md:hidden flex-1">
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">HR Inventory</h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </motion.button>

            {/* Notifications */}
            <NotificationDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}

