'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Store, StoreCreate } from '@/lib/api/stores';
import { Plant } from '@/lib/api/plants';
import { plantsService } from '@/lib/api/plants';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StoreCreate) => Promise<void>;
  mode: 'create' | 'edit';
  store?: Store | null;
  plantId?: number; // For creating store under specific plant
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

const storeTypes = [
  { value: 'main', label: 'Main Store', description: 'Primary warehouse' },
  { value: 'sub', label: 'Sub Store', description: 'Secondary storage' },
  { value: 'production', label: 'Production Store', description: 'Production area storage' },
  { value: 'warehouse', label: 'Warehouse', description: 'Large storage facility' },
  { value: 'defect', label: 'Defect Store', description: 'Defective items storage' },
  { value: 'quarantine', label: 'Quarantine Store', description: 'Quarantine area' },
];

const storeStatuses = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'inactive', label: 'Inactive', color: 'gray' },
  { value: 'maintenance', label: 'Maintenance', color: 'yellow' },
];

export default function StoreModal({
  isOpen,
  onClose,
  onSave,
  mode,
  store,
  plantId,
}: StoreModalProps) {
  const [formData, setFormData] = useState<StoreCreate>({
    plant_id: plantId || 0,
    store_code: '',
    store_name: '',
    store_type: 'sub',
    location_details: '',
    capacity: undefined,
    store_manager: '',
    contact_number: '',
    notes: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlants();
      if (mode === 'edit' && store) {
        setFormData({
          plant_id: store.plant_id,
          store_code: store.store_code || '',
          store_name: store.store_name || '',
          store_type: store.store_type || 'sub',
          location_details: store.location_details || '',
          capacity: store.capacity || undefined,
          store_manager: store.store_manager || '',
          contact_number: store.contact_number || '',
          notes: store.notes || '',
          status: store.status || 'active',
        });
      } else {
        setFormData({
          plant_id: plantId || 0,
          store_code: '',
          store_name: '',
          store_type: 'sub',
          location_details: '',
          capacity: undefined,
          store_manager: '',
          contact_number: '',
          notes: '',
          status: 'active',
        });
      }
      setErrors({});
    }
  }, [mode, store, isOpen, plantId]);

  const fetchPlants = async () => {
    setLoadingPlants(true);
    try {
      const data = await plantsService.list({ status: 'active' });
      setPlants(data);
      // Set default plant if creating and plantId provided
      if (mode === 'create' && plantId && !formData.plant_id) {
        setFormData(prev => ({ ...prev, plant_id: plantId }));
      } else if (mode === 'create' && data.length > 0 && !formData.plant_id) {
        setFormData(prev => ({ ...prev, plant_id: data[0].plant_id }));
      }
    } catch (error) {
      console.error('Failed to load plants:', error);
    } finally {
      setLoadingPlants(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plant_id || formData.plant_id === 0) {
      newErrors.plant_id = 'Plant is required';
    }

    if (!formData.store_code.trim()) {
      newErrors.store_code = 'Store code is required';
    } else if (formData.store_code.length > 20) {
      newErrors.store_code = 'Store code must be less than 20 characters';
    }

    if (!formData.store_name.trim()) {
      newErrors.store_name = 'Store name is required';
    } else if (formData.store_name.length > 100) {
      newErrors.store_name = 'Store name must be less than 100 characters';
    }

    if (formData.capacity !== undefined && formData.capacity < 0) {
      newErrors.capacity = 'Capacity must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        setErrors({ submit: error.response.data.detail });
      } else {
        setErrors({ submit: 'Failed to save store' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {mode === 'create' ? 'Create Store' : 'Edit Store'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {errors.submit && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                    {errors.submit}
                  </div>
                )}

                {/* Plant Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Plant <span className="text-red-500">*</span>
                  </label>
                  {loadingPlants ? (
                    <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
                      Loading plants...
                    </div>
                  ) : (
                    <select
                      value={formData.plant_id || 0}
                      onChange={(e) => setFormData({ ...formData, plant_id: parseInt(e.target.value) })}
                      disabled={mode === 'edit' || !!plantId}
                      className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                        errors.plant_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } ${mode === 'edit' || plantId ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                    >
                      <option value={0} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Select Plant</option>
                      {plants.map((plant) => (
                        <option key={plant.plant_id} value={plant.plant_id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                          {plant.plant_code} - {plant.plant_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.plant_id && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.plant_id}</p>
                  )}
                </div>

                {/* Store Code & Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Store Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.store_code}
                      onChange={(e) => setFormData({ ...formData, store_code: e.target.value.toUpperCase() })}
                      className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                        errors.store_code ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., PEN-WH-01"
                      maxLength={20}
                    />
                    {errors.store_code && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.store_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Store Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.store_name}
                      onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                      className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                        errors.store_name ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., Main Warehouse"
                      maxLength={100}
                    />
                    {errors.store_name && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.store_name}</p>
                    )}
                  </div>
                </div>

                {/* Store Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Store Type
                  </label>
                  <select
                    value={formData.store_type}
                    onChange={(e) => setFormData({ ...formData, store_type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                  >
                    {storeTypes.map((type) => (
                      <option key={type.value} value={type.value} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location Details
                  </label>
                  <input
                    type="text"
                    value={formData.location_details}
                    onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="e.g., Building A, Ground Floor, Room 101"
                    maxLength={200}
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Capacity (Maximum Items)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                      errors.capacity ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., 10000"
                    min="0"
                  />
                  {errors.capacity && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.capacity}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave empty if capacity is unlimited
                  </p>
                </div>

                {/* Store Manager & Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Store Manager
                    </label>
                    <input
                      type="text"
                      value={formData.store_manager}
                      onChange={(e) => setFormData({ ...formData, store_manager: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      placeholder="e.g., Muthu Kumar"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      placeholder="e.g., 04-6431235"
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all resize-none"
                    placeholder="Additional notes or remarks..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {storeStatuses.map((status) => (
                      <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value={status.value}
                          checked={formData.status === status.value}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full sm:flex-1 px-4 py-2 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    mode === 'create' ? 'Create Store' : 'Save Changes'
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

