'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
    },
    {
      id: 'receiving',
      name: 'Receiving',
      href: '/receiving',
      icon: InboxIcon,
      iconSolid: InboxIconSolid,
    },
    {
      id: 'scan',
      name: 'SCAN',
      href: '/scan',
      icon: QrCodeIcon,
      iconSolid: QrCodeIconSolid,
      isFAB: true,
    },
    {
      id: 'inventory',
      name: 'Inventory',
      href: '/inventory',
      icon: BuildingStorefrontIcon,
      iconSolid: BuildingStorefrontIconSolid,
    },
    {
      id: 'category',
      name: 'Category',
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
      {/* Spacer to prevent content overlap */}
      <div className="h-20 lg:hidden" />

      {/* Mobile Navigation */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 print:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200/50"
        style={{
          paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom))`,
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Navigation Container - PERFECTLY EQUAL SPACING */}
        <div className="relative h-16 flex items-end pb-2">
          {/* Grid with 5 equal columns */}
          <div className="w-full grid grid-cols-5 gap-0">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = active ? item.iconSolid : item.icon;

              // FAB (Scan Button) - CENTER ITEM
              if (item.isFAB) {
                return (
                  <div
                    key={item.id}
                    className="relative flex items-center justify-center"
                  >
                    {/* FAB Container - ALWAYS CENTERED */}
                    <div className="absolute" style={{ bottom: '20px' }}>
                      <motion.button
                        onClick={() => router.push(item.href)}
                        whileTap={{ scale: 0.9 }}
                        className="flex flex-col items-center"
                      >
                        {/* FAB Circle */}
                        <motion.div
                          animate={{
                            scale: active ? 1.05 : 1,
                          }}
                          className={`
                            w-14 h-14 rounded-full flex items-center justify-center
                            shadow-lg transition-all duration-200
                            ${
                              active
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                : 'bg-gradient-to-br from-blue-500 to-blue-600'
                            }
                          `}
                        >
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </motion.div>

                        {/* FAB Label */}
                        <span
                          className={`
                            mt-2 text-[10px] font-bold transition-colors uppercase tracking-wider
                            ${active ? 'text-purple-600' : 'text-gray-600'}
                          `}
                        >
                          {item.name}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                );
              }

              // Regular Nav Items
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-center"
                >
                  <motion.button
                    onClick={() => router.push(item.href)}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center justify-center w-full py-1 relative group"
                  >
                    {/* Active Background */}
                    {active && (
                      <motion.div
                        layoutId={`activeNavBg-${item.id}`}
                        className="absolute inset-0 rounded-xl bg-blue-50/70 mx-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}

                    {/* Icon Container */}
                    <motion.div
                      animate={{
                        y: active ? -2 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                      className={`relative w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors ${
                        active
                          ? 'bg-blue-500 shadow-md shadow-blue-500/25'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}
                    >
                      <Icon
                        className={`
                          w-5 h-5 transition-colors relative z-10
                          ${active ? 'text-white' : 'text-gray-600'}
                        `}
                        strokeWidth={active ? 2.5 : 2}
                      />

                      {/* Active Indicator Dot */}
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full"
                        />
                      )}
                    </motion.div>

                    {/* Label */}
                    <span
                      className={`
                        text-[9px] font-medium transition-colors relative z-10 truncate max-w-full
                        ${active ? 'text-blue-600' : 'text-gray-500'}
                      `}
                    >
                      {item.name}
                    </span>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
