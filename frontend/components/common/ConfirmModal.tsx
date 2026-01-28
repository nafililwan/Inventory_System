'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ExclamationTriangleIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export type ConfirmType = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  isLoading?: boolean;
  showCancel?: boolean;
}

const typeConfig = {
  danger: {
    icon: ExclamationTriangleIcon,
    iconBg: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
    buttonText: 'text-white',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    buttonBg: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700',
    buttonText: 'text-white',
  },
  info: {
    icon: InformationCircleIcon,
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
    buttonText: 'text-white',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
  showCancel = true,
}: ConfirmModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (err: unknown) {
      // Silently handle errors - parent component should handle error display
      // This prevents any potential circular reference issues
      // Error is already handled by parent component's error handling
      // Only log a simple message to console, never serialize the error object
      if (err instanceof Error) {
        console.error('Confirm action error:', err.message);
      } else {
        console.error('Confirm action error: Unknown error');
      }
    }
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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            style={{ 
              paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
              paddingTop: 'calc(1rem + env(safe-area-inset-top))'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${config.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${config.iconColor}`} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    {title}
                  </h2>
                </div>
                {showCancel && (
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 ml-2"
                    disabled={isLoading}
                  >
                    <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </motion.button>
                )}
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                {showCancel && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`w-full ${showCancel ? 'sm:flex-1' : ''} px-4 py-2.5 text-sm font-medium ${config.buttonBg} ${config.buttonText} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation shadow-sm`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

