'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Item, ItemCreate, ItemUpdate } from '@/lib/api/items';
import { Category, ItemType } from '@/lib/categories';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ItemCreate | ItemUpdate) => Promise<void>;
  mode: 'create' | 'edit';
  item?: Item | null;
  categories: Category[];
  itemTypes: ItemType[];
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

export default function ItemModal({
  isOpen,
  onClose,
  onSave,
  mode,
  item,
  categories,
  itemTypes,
}: ItemModalProps) {
  const [formData, setFormData] = useState<{
    item_name: string;
    category: string;
    type: string;
    unit_type: 'pcs' | 'box' | 'pack';
    sizes: Array<{ size: string; quantity: number }>;
    category_id?: number;
    type_id?: number;
    item_code?: string;
    description?: string;
    unit?: string;
    min_stock?: number;
    max_stock?: number;
    has_variants?: boolean;
    available_sizes?: string[];
    available_colors?: string[];
    barcode?: string;
    image_url?: string;
    status?: string;
  }>({
    item_name: '',
    category: '',
    type: '',
    unit_type: 'pcs',
    sizes: [],
    category_id: 0,
    type_id: 0,
    item_code: '',
    description: '',
    unit: 'pcs',
    min_stock: 0,
    max_stock: undefined,
    has_variants: false,
    available_sizes: [],
    available_colors: [],
    barcode: '',
    image_url: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [filteredTypes, setFilteredTypes] = useState<ItemType[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');

  useEffect(() => {
    if (mode === 'edit' && item) {
      setFormData({
        item_code: item.item_code || '',
        item_name: item.item_name || '',
        category_id: item.category_id,
        type_id: item.type_id,
        description: item.description || '',
        unit: item.unit || 'pcs',
        min_stock: item.min_stock || 0,
        max_stock: item.max_stock,
        has_variants: item.has_variants || false,
        available_sizes: item.available_sizes || [],
        available_colors: item.available_colors || [],
        barcode: item.barcode || '',
        image_url: item.image_url || '',
        status: item.status || 'active',
      });
      setSelectedCategoryId(item.category_id);
    } else {
      setFormData({
        item_code: '',
        item_name: '',
        category_id: 0,
        type_id: 0,
        description: '',
        unit: 'pcs',
        min_stock: 0,
        max_stock: undefined,
        has_variants: false,
        available_sizes: [],
        available_colors: [],
        barcode: '',
        image_url: '',
        status: 'active',
      });
      setSelectedCategoryId(null);
    }
    setErrors({});
  }, [mode, item, isOpen]);

  useEffect(() => {
    if (selectedCategoryId) {
      const filtered = itemTypes.filter(type => type.category_id === selectedCategoryId);
      setFilteredTypes(filtered);
      // Auto-select first type if creating
      if (mode === 'create' && filtered.length > 0 && formData.type_id === 0) {
        setFormData(prev => ({ ...prev, type_id: filtered[0].type_id }));
      }
    } else {
      setFilteredTypes([]);
    }
  }, [selectedCategoryId, itemTypes, mode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.item_code.trim()) {
      newErrors.item_code = 'Item code is required';
    }

    if (!formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required';
    }

    if (!formData.category_id || formData.category_id === 0) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.type_id || formData.type_id === 0) {
      newErrors.type_id = 'Item type is required';
    }

    if (formData.min_stock < 0) {
      newErrors.min_stock = 'Minimum stock cannot be negative';
    }

    if (formData.max_stock !== undefined && formData.max_stock < formData.min_stock) {
      newErrors.max_stock = 'Maximum stock must be greater than minimum stock';
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
        setErrors({ submit: 'Failed to save item' });
      }
    } finally {
      setSaving(false);
    }
  };

  const addSize = () => {
    if (sizeInput.trim() && !formData.available_sizes?.includes(sizeInput.trim())) {
      setFormData({
        ...formData,
        available_sizes: [...(formData.available_sizes || []), sizeInput.trim()]
      });
      setSizeInput('');
    }
  };

  const removeSize = (size: string) => {
    setFormData({
      ...formData,
      available_sizes: formData.available_sizes?.filter(s => s !== size) || []
    });
  };

  const addColor = () => {
    if (colorInput.trim() && !formData.available_colors?.includes(colorInput.trim())) {
      setFormData({
        ...formData,
        available_colors: [...(formData.available_colors || []), colorInput.trim()]
      });
      setColorInput('');
    }
  };

  const removeColor = (color: string) => {
    setFormData({
      ...formData,
      available_colors: formData.available_colors?.filter(c => c !== color) || []
    });
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {mode === 'create' ? 'Create Item' : 'Edit Item'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                    {errors.submit}
                  </div>
                )}

                {/* Item Code & Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.item_code}
                      onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.item_code ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., UNI-SHIRT-001"
                      maxLength={50}
                    />
                    {errors.item_code && (
                      <p className="text-red-600 text-sm mt-1">{errors.item_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.item_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Polo Shirt"
                      maxLength={200}
                    />
                    {errors.item_name && (
                      <p className="text-red-600 text-sm mt-1">{errors.item_name}</p>
                    )}
                  </div>
                </div>

                {/* Category & Type Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category_id || 0}
                      onChange={(e) => {
                        const catId = parseInt(e.target.value);
                        setSelectedCategoryId(catId);
                        setFormData({ ...formData, category_id: catId, type_id: 0 });
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.category_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value={0}>Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                    {errors.category_id && (
                      <p className="text-red-600 text-sm mt-1">{errors.category_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type_id || 0}
                      onChange={(e) => setFormData({ ...formData, type_id: parseInt(e.target.value) })}
                      disabled={!selectedCategoryId || filteredTypes.length === 0}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.type_id ? 'border-red-500' : 'border-gray-300'
                      } ${!selectedCategoryId || filteredTypes.length === 0 ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    >
                      <option value={0}>Select Type</option>
                      {filteredTypes.map((type) => (
                        <option key={type.type_id} value={type.type_id}>
                          {type.type_name}
                        </option>
                      ))}
                    </select>
                    {errors.type_id && (
                      <p className="text-red-600 text-sm mt-1">{errors.type_id}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Item description..."
                  />
                </div>

                {/* Unit, Min Stock, Max Stock Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., pcs, box, kg"
                      maxLength={20}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Stock
                    </label>
                    <input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.min_stock ? 'border-red-500' : 'border-gray-300'
                      }`}
                      min="0"
                    />
                    {errors.min_stock && (
                      <p className="text-red-600 text-sm mt-1">{errors.min_stock}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Stock
                    </label>
                    <input
                      type="number"
                      value={formData.max_stock || ''}
                      onChange={(e) => setFormData({ ...formData, max_stock: e.target.value ? parseInt(e.target.value) : undefined })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.max_stock ? 'border-red-500' : 'border-gray-300'
                      }`}
                      min="0"
                    />
                    {errors.max_stock && (
                      <p className="text-red-600 text-sm mt-1">{errors.max_stock}</p>
                    )}
                  </div>
                </div>

                {/* Has Variants Toggle */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="hasVariants"
                    checked={formData.has_variants}
                    onChange={(e) => setFormData({ ...formData, has_variants: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700 cursor-pointer">
                    This item has variants (size/color)
                  </label>
                </div>

                {/* Variants Configuration */}
                {formData.has_variants && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-gray-900">Available Variants</h3>
                    
                    {/* Sizes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Sizes
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={sizeInput}
                          onChange={(e) => setSizeInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., S, M, L, XL"
                        />
                        <button
                          type="button"
                          onClick={addSize}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.available_sizes?.map((size) => (
                          <span
                            key={size}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm"
                          >
                            {size}
                            <button
                              type="button"
                              onClick={() => removeSize(size)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Colors
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={colorInput}
                          onChange={(e) => setColorInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., Blue, Red, Black"
                        />
                        <button
                          type="button"
                          onClick={addColor}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.available_colors?.map((color) => (
                          <span
                            key={color}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm"
                          >
                            {color}
                            <button
                              type="button"
                              onClick={() => removeColor(color)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Barcode & Image URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barcode
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Barcode number"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="https://..."
                      maxLength={500}
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Inactive</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="discontinued"
                        checked={formData.status === 'discontinued'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Discontinued</span>
                    </label>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full sm:flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    mode === 'create' ? 'Create Item' : 'Save Changes'
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
