'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import TopHeader from '@/components/layout/TopHeader';
import FloatingIslandNav from '@/components/layout/FloatingIslandNav';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { authService } from '@/lib/auth';

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Mobile sidebar removed - using bottom navigation instead

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (!authenticated) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header />
        </div>
        {/* Mobile Top Header */}
        <div className="lg:hidden">
          <TopHeader />
        </div>
        <main className="flex-1 overflow-y-auto custom-scrollbar min-w-0 bg-gray-50 dark:bg-gray-900 pb-safe-bottom lg:pb-0 transition-colors">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      {/* Floating Island Navigation (Mobile Only) */}
      <FloatingIslandNav />
    </div>
  );
}

