'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon, BuildingStorefrontIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import { boxesService, BoxWithContents, BoxCheckIn } from '@/lib/api/boxes';
import { storesService, Store } from '@/lib/api/stores';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxId: number | null;
  onSuccess?: () => void;
  initialStoreId?: number; // Pre-select store from scan page
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 },
  },
};

export default function CheckInModal({ isOpen, onClose, boxId, onSuccess, initialStoreId }: CheckInModalProps) {
  const [box, setBox] = useState<BoxWithContents | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeSearch, setStoreSearch] = useState('');
  const [formData, setFormData] = useState<BoxCheckIn>({ store_id: 0, location_in_store: '' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && boxId) {
      loadData();
      // Reset form when modal opens, but use initialStoreId if provided
      setFormData({ 
        store_id: initialStoreId || 0, 
        location_in_store: '' 
      });
      setStoreSearch('');
    }
  }, [isOpen, boxId, initialStoreId]);

  const loadData = async () => {
    if (!boxId) return;

    setLoading(true);
    try {
      const [boxRes, storesRes] = await Promise.all([
        boxesService.get(boxId),
        storesService.list(),
      ]);
      setBox(boxRes.data);
      const storesArray = Array.isArray(storesRes) ? storesRes : [];
      setStores(storesArray);

      // Set initial store if provided and not already set
      if (initialStoreId && !formData.store_id) {
        setFormData(prev => ({ ...prev, store_id: initialStoreId }));
      }

      if (storesArray.length === 0) {
        toast.error('No active stores found. Please create a store first.');
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error?.response?.data?.detail || 'Failed to load box');
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!box) return;

    if (!formData.store_id) {
      toast.error('Please select a store');
      return;
    }

    setSubmitting(true);
    try {
      await boxesService.checkIn(box.box_id, formData);
      toast.success('Box checked in successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to check-in box');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredStores = Array.isArray(stores)
    ? stores.filter((store) => {
        if (store.status !== 'active') return false;
        if (storeSearch.trim()) {
          const searchLower = storeSearch.toLowerCase();
          return (
            store.store_name.toLowerCase().includes(searchLower) ||
            store.store_code.toLowerCase().includes(searchLower) ||
            (store.plant_name && store.plant_name.toLowerCase().includes(searchLower))
          );
        }
        return true;
      })
    : [];

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
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-dark-bg-light rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Check-In Box</h2>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                    Confirm store and location for this box
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg-lighter rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto" />
                      <p className="mt-4 text-gray-600 dark:text-gray-300">Loading box...</p>
                    </div>
                  </div>
                ) : !box ? (
                  <div className="text-center py-12">
                    <p className="text-gray-700 dark:text-gray-300">Box not found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Box Info & Contents */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Box Details Card */}
                      <div className="bg-white dark:bg-dark-bg-light rounded-lg shadow-md dark:shadow-xl dark:shadow-black/20 border border-gray-200 dark:border-dark-border p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Box Code</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-dark-text">{box.box_code}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs rounded-full border border-yellow-200 dark:border-yellow-800">
                            Pending Check-In
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-secondary">Supplier</p>
                            <p className="font-medium text-gray-900 dark:text-dark-text">{box.supplier || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-secondary">PO Number</p>
                            <p className="font-medium text-gray-900 dark:text-dark-text">{box.po_number || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-secondary">Received Date</p>
                            <p className="font-medium text-gray-900 dark:text-dark-text">
                              {box.received_date ? new Date(box.received_date).toLocaleDateString() : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-secondary">Total Items</p>
                            <p className="font-medium text-gray-900 dark:text-dark-text">{box.total_items || 0} pcs</p>
                          </div>
                        </div>
                      </div>

                      {/* Contents Card */}
                      <div className="bg-white dark:bg-dark-bg-light rounded-lg shadow-md dark:shadow-xl dark:shadow-black/20 border border-gray-200 dark:border-dark-border p-5">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-dark-text">Contents</h3>
                        <div className="space-y-2">
                          {box.contents.map((content) => (
                            <div
                              key={content.content_id}
                              className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-dark-bg-lighter rounded border border-gray-200 dark:border-dark-border"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                  {content.item_code} - {content.item_name}
                                </p>
                                {content.size && (
                                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Size: {content.size}</p>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">{content.quantity} pcs</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel - Check-In Form */}
                    <div className="bg-white dark:bg-dark-bg-light rounded-lg shadow-md dark:shadow-xl dark:shadow-black/20 border border-gray-200 dark:border-dark-border p-5 h-fit">
                      <div className="flex items-center gap-2 mb-4">
                        <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Check-In Details</h3>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                            Store <span className="text-red-500">*</span>
                          </label>

                          {/* Search Input */}
                          {Array.isArray(stores) && stores.length > 0 && (
                            <div className="relative mb-2">
                              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <input
                                type="text"
                                value={storeSearch}
                                onChange={(e) => setStoreSearch(e.target.value)}
                                placeholder="Search store by name or code..."
                                className="w-full pl-10 pr-3 py-2 text-sm bg-white dark:bg-dark-bg-light border border-gray-300 dark:border-dark-border rounded-lg text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                              />
                            </div>
                          )}

                          {/* Filtered Stores Dropdown */}
                          <select
                            value={formData.store_id}
                            onChange={(e) => {
                              setFormData({ ...formData, store_id: parseInt(e.target.value) });
                              setStoreSearch('');
                            }}
                            className="w-full bg-white dark:bg-dark-bg-light border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:bg-gray-100 dark:disabled:bg-dark-bg-lighter disabled:cursor-not-allowed"
                            disabled={!Array.isArray(stores) || stores.length === 0}
                          >
                            <option value={0} className="bg-white dark:bg-dark-bg-light text-gray-900 dark:text-dark-text">
                              {!Array.isArray(stores) || stores.length === 0
                                ? 'No stores available'
                                : 'Select store'}
                            </option>
                            {filteredStores
                              .sort((a, b) => {
                                if (a.plant_name && b.plant_name) {
                                  if (a.plant_name !== b.plant_name) {
                                    return a.plant_name.localeCompare(b.plant_name);
                                  }
                                }
                                return a.store_name.localeCompare(b.store_name);
                              })
                              .map((store) => (
                                <option key={store.store_id} value={store.store_id} className="bg-white dark:bg-dark-bg-light text-gray-900 dark:text-dark-text">
                                  {store.plant_name ? `[${store.plant_name}] ` : ''}
                                  {store.store_name} ({store.store_code})
                                </option>
                              ))}
                          </select>

                          {/* Show filtered count */}
                          {Array.isArray(stores) && stores.length > 0 && storeSearch && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">
                              Showing {filteredStores.length} of {stores.filter((s) => s.status === 'active').length} stores
                            </p>
                          )}

                          {Array.isArray(stores) && stores.length === 0 && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              No active stores found. Please create a store first.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                            Location in Store
                          </label>
                          <input
                            type="text"
                            value={formData.location_in_store || ''}
                            onChange={(e) => setFormData({ ...formData, location_in_store: e.target.value })}
                            placeholder="e.g., Rack A-1, Shelf B-2"
                            className="w-full bg-white dark:bg-dark-bg-light border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                          />
                        </div>

                        <div className="pt-2 space-y-2">
                          <motion.button
                            type="submit"
                            disabled={submitting}
                            whileHover={{ scale: submitting ? 1 : 1.02 }}
                            whileTap={{ scale: submitting ? 1 : 0.98 }}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                            {submitting ? 'Checking In...' : 'Check-In to Store'}
                          </motion.button>
                          <button
                            type="button"
                            onClick={onClose}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg-lighter transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
