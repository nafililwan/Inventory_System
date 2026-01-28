'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface StockOutConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  boxCode: string;
  boxStatus: string;
  storeName?: string;
  itemCount?: number;
  loading?: boolean;
}

// Haptic feedback for mobile devices
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: [20, 10, 20],
    };
    navigator.vibrate(patterns[type]);
  }
};

export default function StockOutConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  boxCode,
  boxStatus,
  storeName,
  itemCount = 0,
  loading = false,
}: StockOutConfirmationDialogProps) {
  const handleConfirm = () => {
    triggerHaptic('medium');
    onConfirm();
  };

  const handleCancel = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[10000]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />

          {/* Compact Modal */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{
                maxHeight: '85vh',
                marginBottom: 'calc(80px + env(safe-area-inset-bottom))',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Compact Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white leading-tight">
                      Confirm Stock Out
                    </h3>
                    <p className="text-xs text-white/90 mt-0.5">
                      Process stock out for this box?
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact Content */}
              <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
                {/* Box Code - Compact */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">BOX</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Box Code</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono truncate">
                      {boxCode}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full flex-shrink-0">
                    {boxStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Store - Compact */}
                {storeName && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">Store</p>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
                        {storeName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Item Count - Compact */}
                {itemCount > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{itemCount}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {itemCount} item{itemCount !== 1 ? 's' : ''} will be stocked out
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning - Compact */}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      Make sure this is the correct box before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact Actions - Always Visible */}
              <div 
                className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex gap-3"
                style={{
                  paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
                }}
              >
                {/* Cancel Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Cancel
                </motion.button>

                {/* Confirm Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Processing...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      Confirm
                    </span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
