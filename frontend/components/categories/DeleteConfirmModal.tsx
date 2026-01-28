'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Category } from '@/lib/categories';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (force: boolean) => Promise<void>;
  category: Category | null;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  category,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm(forceDelete);
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!category) return null;

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
            className="fixed inset-0 bg-black/30 z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-md flex items-center justify-center flex-shrink-0">
                    <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Delete Category</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-50 rounded-md transition-colors flex-shrink-0 ml-2"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  Are you sure you want to delete <span className="font-semibold">{category.category_name}</span>?
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  This action cannot be undone. If this category has item types, they will also be deleted.
                </p>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={deleting}
                  className="w-full sm:flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    'Delete'
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

