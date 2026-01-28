"use client";

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ItemType } from '@/lib/api/item-types';

interface CreateBatchModalProps {
  itemTypes: ItemType[];
  onClose: () => void;
  onCreate: (data: {
    type_id: number;
    year_code: string;
    batch_name?: string;
    specifications?: string;
  }) => Promise<void>;
}

export default function CreateBatchModal({ itemTypes, onClose, onCreate }: CreateBatchModalProps) {
  const [formData, setFormData] = useState({
    type_id: '',
    year_code: new Date().getFullYear().toString().slice(-2),
    batch_name: '',
    specifications: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type_id || !formData.year_code) return;

    setLoading(true);
    try {
      await onCreate({
        type_id: parseInt(formData.type_id),
        year_code: formData.year_code,
        batch_name: formData.batch_name || undefined,
        specifications: formData.specifications || undefined,
      });
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  const selectedType = itemTypes.find(t => t.type_id === parseInt(formData.type_id));
  const sizes = selectedType?.available_sizes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Create Year Batch</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Item Type *
              </label>
              <select
                required
                value={formData.type_id}
                onChange={(e) => setFormData({...formData, type_id: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Select Type</option>
                {itemTypes.map(type => (
                  <option key={type.type_id} value={type.type_id}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Year Code *
              </label>
              <input
                required
                type="text"
                maxLength={2}
                value={formData.year_code}
                onChange={(e) => setFormData({...formData, year_code: e.target.value.replace(/\D/g, '')})}
                placeholder="27 (for 2027)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Last 2 digits of year (e.g., 27 for 2027)</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Batch Name
            </label>
            <input
              type="text"
              value={formData.batch_name}
              onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
              placeholder="2027 New Design"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Specifications
            </label>
            <textarea
              value={formData.specifications}
              onChange={(e) => setFormData({...formData, specifications: e.target.value})}
              placeholder="New logo, cotton blend fabric..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {selectedType && sizes.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
              <h3 className="font-medium mb-2 text-gray-800">
                Will create {sizes.length} items:
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {sizes.map(size => (
                  <div key={size} className="text-sm text-gray-700 flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    {selectedType.type_name} - Size {size}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedType && (!sizes || sizes.length === 0) && (
            <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ This item type has no sizes configured. Please configure sizes first.
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.type_id || !formData.year_code || loading || (selectedType && (!sizes || sizes.length === 0))}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Batch & Items'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

