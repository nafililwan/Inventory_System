'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Plant } from '@/lib/plants';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (force: boolean) => Promise<void>;
  plant: Plant | null;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, plant }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(forceDelete);
      onClose();
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && plant && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Delete Plant</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  Are you sure you want to delete <span className="font-semibold">{plant.plant_name}</span>?
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                  This action cannot be undone. If this plant has stores, you may need to delete them first or use force delete.
                </p>

                {/* Force Delete Option */}
                <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <input
                    type="checkbox"
                    id="forceDelete"
                    checked={forceDelete}
                    onChange={(e) => setForceDelete(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 text-red-600 border-gray-300 rounded focus:ring-red-500 flex-shrink-0 touch-manipulation"
                  />
                  <label htmlFor="forceDelete" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                    Force delete (delete even if plant has stores)
                  </label>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-medium touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium touch-manipulation"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

