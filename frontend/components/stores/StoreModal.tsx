'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Store, StoreCreate, StoreUpdate } from '@/lib/stores';
import { plantService, Plant } from '@/lib/plants';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StoreCreate | StoreUpdate) => Promise<void>;
  store?: Store | null;
  mode: 'create' | 'edit';
}

export default function StoreModal({ isOpen, onClose, onSubmit, store, mode }: StoreModalProps) {
  const [formData, setFormData] = useState<StoreCreate | StoreUpdate>({
    plant_id: 0,
    store_name: '',
    location: '',
    store_type: 'uniform',
    person_in_charge: '',
    contact_number: '',
    status: 'active',
    stock_out_mode: 'casual',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlants();
      if (mode === 'edit' && store) {
        setFormData({
          plant_id: store.plant_id,
          store_name: store.store_name,
          location: store.location || '',
          store_type: store.store_type || 'uniform',
          person_in_charge: store.person_in_charge || '',
          contact_number: store.contact_number || '',
          status: store.status,
          stock_out_mode: store.stock_out_mode || 'casual',
        });
      } else {
        setFormData({
          plant_id: 0,
          store_name: '',
          location: '',
          store_type: 'uniform',
          person_in_charge: '',
          contact_number: '',
          status: 'active',
          stock_out_mode: 'casual',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, store]);

  const fetchPlants = async () => {
    setLoadingPlants(true);
    try {
      const data = await plantService.getAll({ status: 'active' });
      setPlants(data);
      // Set first plant as default if creating
      if (mode === 'create' && data.length > 0 && !formData.plant_id) {
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
    
    if (!formData.store_name || formData.store_name.trim().length === 0) {
      newErrors.store_name = 'Store name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        setErrors({ submit: error.response.data.detail });
      } else {
        setErrors({ submit: 'Failed to save store' });
      }
    } finally {
      setLoading(false);
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {mode === 'create' ? 'Create Store' : 'Edit Store'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                {/* Plant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plant <span className="text-red-500">*</span>
                  </label>
                  {loadingPlants ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500">
                      Loading plants...
                    </div>
                  ) : (
                    <select
                      value={formData.plant_id || 0}
                      onChange={(e) => setFormData({ ...formData, plant_id: parseInt(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.plant_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={loadingPlants}
                    >
                      <option value={0}>Select Plant</option>
                      {plants.map((plant) => (
                        <option key={plant.plant_id} value={plant.plant_id}>
                          {plant.plant_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.plant_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.plant_id}</p>
                  )}
                </div>

                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.store_name || ''}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.store_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Uniform Store A"
                  />
                  {errors.store_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.store_name}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Building A, Floor 2"
                  />
                </div>

                {/* Store Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Type
                  </label>
                  <select
                    value={formData.store_type || 'uniform'}
                    onChange={(e) => setFormData({ ...formData, store_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="uniform">Uniform</option>
                    <option value="safety">Safety</option>
                    <option value="office">Office</option>
                    <option value="tools">Tools</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Person in Charge */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Person in Charge
                  </label>
                  <input
                    type="text"
                    value={formData.person_in_charge || ''}
                    onChange={(e) => setFormData({ ...formData, person_in_charge: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., John Doe"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_number || ''}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., +60123456789"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Stock Out Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Out Mode
                  </label>
                  <select
                    value={formData.stock_out_mode || 'casual'}
                    onChange={(e) => setFormData({ ...formData, stock_out_mode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="trust">Trust</option>
                    <option value="casual">Casual</option>
                    <option value="strict">Strict</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Trust: No approval needed | Casual: Basic approval | Strict: Full approval required
                  </p>
                </div>

                {/* Error Message */}
                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-medium touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium touch-manipulation"
                  >
                    {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

