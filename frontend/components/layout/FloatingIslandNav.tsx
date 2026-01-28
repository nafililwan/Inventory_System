'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  InboxIcon,
  BuildingStorefrontIcon,
  FolderIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  InboxIcon as InboxIconSolid,
  BuildingStorefrontIcon as BuildingStorefrontIconSolid,
  FolderIcon as FolderIconSolid,
  QrCodeIcon as QrCodeIconSolid,
} from '@heroicons/react/24/solid';

export default function FloatingIslandNav() {
  const pathname = usePathname();
  const router = useRouter();

  // 🎨 SINGLE COLOR THEME - All items use blue
  const navItems = [
    {
      id: 'dashboard',
      name: 'Home',
      href: '/dashboard',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
    },
    {
      id: 'receiving',
      name: 'Receive',
      href: '/receiving',
      icon: InboxIcon,
      iconSolid: InboxIconSolid,
    },
    {
      id: 'scan',
      name: 'Scan',
      href: '/scan',
      icon: QrCodeIcon,
      iconSolid: QrCodeIconSolid,
      isFAB: true,
    },
    {
      id: 'inventory',
      name: 'Stock',
      href: '/inventory',
      icon: BuildingStorefrontIcon,
      iconSolid: BuildingStorefrontIconSolid,
    },
    {
      id: 'category',
      name: 'More',
      href: '/categories',
      icon: FolderIcon,
      iconSolid: FolderIconSolid,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind navigation */}
      <div className="h-24 lg:hidden" />

      {/* Floating Island Navigation Container - HIGHER Z-INDEX */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none print:hidden">
        <div className="flex justify-center pb-6 px-4">
          {/* Main Navigation Island */}
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
            }}
            className="pointer-events-auto backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-[28px] shadow-2xl border border-gray-200/50 dark:border-gray-700/50 px-2 py-3"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Navigation Items Container */}
            <div className="flex items-center justify-around gap-1 relative">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = active ? item.iconSolid : item.icon;

                // FAB BUTTON (CENTER) - SPECIAL LARGE BUTTON
                if (item.isFAB) {
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => router.push(item.href)}
                      whileTap={{ scale: 0.85 }}
                      className="relative flex flex-col items-center min-w-[64px] py-2 px-3 -mt-8"
                    >
                      {/* FAB Circle with Gradient */}
                      <motion.div
                        animate={{
                          scale: active ? 1.1 : 1,
                          rotate: active ? 90 : 0,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                        }}
                        className={`
                          w-16 h-16 rounded-full flex items-center justify-center
                          shadow-xl relative overflow-hidden mb-1
                          ${active 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                          }
                        `}
                      >
                        {/* Animated Pulsing Rings (only when active) - BLUE */}
                        <AnimatePresence>
                          {active && (
                            <>
                              {/* Ring 1 */}
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                  scale: [1, 1.3, 1],
                                  opacity: [0.3, 0, 0.3],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                                className="absolute inset-0 rounded-full border-4 border-white"
                              />
                              {/* Ring 2 (delayed) */}
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                  scale: [1, 1.5, 1],
                                  opacity: [0.2, 0, 0.2],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                  delay: 0.5,
                                }}
                                className="absolute inset-0 rounded-full border-4 border-white"
                              />
                            </>
                          )}
                        </AnimatePresence>
                        {/* Icon */}
                        <Icon className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
                      </motion.div>

                      {/* FAB Label Below - BLUE - Aligned with other labels */}
                      <motion.span
                        animate={{
                          scale: active ? 1.05 : 1,
                          fontWeight: active ? 600 : 500,
                        }}
                        className={`
                          text-xs mt-1 transition-colors relative z-10 whitespace-nowrap
                          ${active ? 'text-blue-600 dark:text-blue-400' : 'text-blue-600 dark:text-blue-400'}
                        `}
                      >
                        {item.name}
                      </motion.span>
                    </motion.button>
                  );
                }

                // REGULAR NAV ITEMS
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    whileTap={{ scale: 0.9 }}
                    className="relative flex flex-col items-center min-w-[64px] py-2 px-3"
                  >
                    {/* Active Background Pill - BLUE ONLY */}
                    <AnimatePresence>
                      {active && (
                        <motion.div
                          layoutId="activeTab"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{
                            type: 'spring',
                            bounce: 0.2,
                            duration: 0.6,
                          }}
                          className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl"
                        />
                      )}
                    </AnimatePresence>

                    {/* Icon Container */}
                    <motion.div
                      animate={{
                        scale: active ? 1.1 : 1,
                        y: active ? -2 : 0,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 17,
                      }}
                      className="relative z-10"
                    >
                      {/* Icon */}
                      <Icon
                        className={`
                          w-6 h-6 transition-colors
                          ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                        `}
                        strokeWidth={active ? 2.5 : 2}
                      />

                      {/* Active Indicator Dot - BLUE */}
                      <AnimatePresence>
                        {active && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Label - BLUE when active */}
                    <motion.span
                      animate={{
                        scale: active ? 1.05 : 1,
                        fontWeight: active ? 600 : 500,
                      }}
                      className={`
                        text-xs mt-1 transition-colors relative z-10
                        ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                      `}
                    >
                      {item.name}
                    </motion.span>
                  </motion.button>
                );
              })}
            </div>
          </motion.nav>
        </div>
      </div>
    </>
  );
}

