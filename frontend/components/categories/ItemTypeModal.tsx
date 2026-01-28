'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ItemType, ItemTypeCreate, ItemTypeUpdate, SizeStockLevel } from '@/lib/categories';

interface ItemTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ItemTypeCreate | ItemTypeUpdate) => Promise<void>;
  mode: 'create' | 'edit';
  categoryId: number;
  itemType?: ItemType | null;
}

const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'];
const commonColors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Gray', 'Brown'];

export default function ItemTypeModal({
  isOpen,
  onClose,
  onSave,
  mode,
  categoryId,
  itemType,
}: ItemTypeModalProps) {
  const [formData, setFormData] = useState<ItemTypeCreate>({
    category_id: categoryId,
    type_name: '',
    description: '',
    has_size: false,
    available_sizes: [],
    has_color: false,
    available_colors: [],
    status: 'active',
    min_stock_level: 50,
    max_stock_level: 1000,
    size_stock_levels: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');

  useEffect(() => {
    if (itemType && mode === 'edit') {
      setFormData({
        category_id: categoryId,
        type_name: itemType.type_name,
        description: itemType.description || '',
        has_size: itemType.has_size,
        available_sizes: itemType.available_sizes || [],
        has_color: itemType.has_color,
        available_colors: itemType.available_colors || [],
        status: itemType.status,
        min_stock_level: itemType.min_stock_level || 50,
        max_stock_level: itemType.max_stock_level || 1000,
        size_stock_levels: itemType.size_stock_levels || {},
      });
    } else {
      setFormData({
        category_id: categoryId,
        type_name: '',
        description: '',
        has_size: false,
        available_sizes: [],
        has_color: false,
        available_colors: [],
        status: 'active',
        min_stock_level: 50,
        max_stock_level: 1000,
        size_stock_levels: {},
      });
    }
    setErrors({});
    setSizeInput('');
    setColorInput('');
  }, [itemType, mode, isOpen, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.type_name.trim()) {
      setErrors({ type_name: 'Type name is required' });
      return;
    }

    // Validate stock levels
    if (!formData.min_stock_level || formData.min_stock_level < 0) {
      setErrors({ general: 'Default Min Stock must be 0 or greater' });
      return;
    }

    if (!formData.max_stock_level || formData.max_stock_level < 1) {
      setErrors({ general: 'Default Max Stock must be 1 or greater' });
      return;
    }

    if (formData.max_stock_level <= formData.min_stock_level) {
      setErrors({ general: 'Default Max Stock must be greater than Default Min Stock' });
      return;
    }

    // Validate size stock levels if exists
    if (formData.size_stock_levels) {
      for (const [size, levels] of Object.entries(formData.size_stock_levels)) {
        if (levels.min < 0) {
          setErrors({ general: `Min stock for size ${size} must be 0 or greater` });
          return;
        }
        if (levels.max < 1) {
          setErrors({ general: `Max stock for size ${size} must be 1 or greater` });
          return;
        }
        if (levels.max <= levels.min) {
          setErrors({ general: `Max stock for size ${size} must be greater than Min stock` });
          return;
        }
      }
    }

    // Prepare data for API
    const submitData = {
      ...formData,
      // Ensure arrays are not null
      available_sizes: formData.available_sizes || [],
      available_colors: formData.available_colors || [],
      // Ensure size_stock_levels is properly formatted
      size_stock_levels: formData.size_stock_levels && Object.keys(formData.size_stock_levels).length > 0 
        ? formData.size_stock_levels 
        : undefined,
    };

    setSaving(true);
    try {
      await onSave(submitData);
      onClose();
    } catch (error: any) {
      console.error('Error saving item type:', error);
      if (error.response?.data?.detail) {
        setErrors({ general: error.response.data.detail });
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to save item type. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const addSize = () => {
    if (sizeInput.trim() && !formData.available_sizes?.includes(sizeInput.trim())) {
      const newSize = sizeInput.trim();
      const newSizes = [...(formData.available_sizes || []), newSize];
      // Initialize stock levels for new size with default values
      const currentSizeLevels = formData.size_stock_levels || {};
      const newSizeLevels = {
        ...currentSizeLevels,
        [newSize]: {
          min: formData.min_stock_level || 50,
          max: formData.max_stock_level || 1000,
        },
      };
      setFormData({
        ...formData,
        available_sizes: newSizes,
        size_stock_levels: newSizeLevels,
      });
      setSizeInput('');
    }
  };

  const removeSize = (size: string) => {
    const newSizes = formData.available_sizes?.filter(s => s !== size) || [];
    // Remove stock levels for removed size
    const currentSizeLevels = formData.size_stock_levels || {};
    const newSizeLevels = { ...currentSizeLevels };
    delete newSizeLevels[size];
    setFormData({
      ...formData,
      available_sizes: newSizes,
      size_stock_levels: newSizeLevels,
    });
  };

  const addColor = () => {
    if (colorInput.trim() && !formData.available_colors?.includes(colorInput.trim())) {
      setFormData({
        ...formData,
        available_colors: [...(formData.available_colors || []), colorInput.trim()],
      });
      setColorInput('');
    }
  };

  const removeColor = (color: string) => {
    setFormData({
      ...formData,
      available_colors: formData.available_colors?.filter(c => c !== color) || [],
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[100]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          />
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-4"
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">
              {mode === 'create' ? 'Create Item Type' : 'Edit Item Type'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 sm:space-y-4 custom-scrollbar">
            {errors.general && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                {errors.general}
              </div>
            )}

            {/* Type Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Type Name *
              </label>
              <input
                type="text"
                value={formData.type_name}
                onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.type_name ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., Shirt, Helmet, Safety Shoes"
              />
              {errors.type_name && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.type_name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description of this item type"
              />
            </div>

            {/* Size Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_size"
                  checked={formData.has_size}
                  onChange={(e) => setFormData({ ...formData, has_size: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="has_size" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Support Sizes
                </label>
              </div>

              {formData.has_size && (
                <div className="ml-6 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                      placeholder="Add size (e.g., M)"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addSize}
                      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commonSizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          if (!formData.available_sizes?.includes(size)) {
                            const newSizes = [...(formData.available_sizes || []), size];
                            // Initialize stock levels for new size with default values
                            const currentSizeLevels = formData.size_stock_levels || {};
                            const newSizeLevels = {
                              ...currentSizeLevels,
                              [size]: {
                                min: formData.min_stock_level || 50,
                                max: formData.max_stock_level || 1000,
                              },
                            };
                            setFormData({
                              ...formData,
                              available_sizes: newSizes,
                              size_stock_levels: newSizeLevels,
                            });
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          formData.available_sizes?.includes(size)
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {formData.available_sizes && formData.available_sizes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.available_sizes.map(size => (
                        <span
                          key={size}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                        >
                          {size}
                          <button
                            type="button"
                            onClick={() => removeSize(size)}
                            className="hover:text-blue-900 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Color Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_color"
                  checked={formData.has_color}
                  onChange={(e) => setFormData({ ...formData, has_color: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="has_color" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Support Colors
                </label>
              </div>

              {formData.has_color && (
                <div className="ml-6 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                      placeholder="Add color (e.g., Blue)"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addColor}
                      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commonColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          if (!formData.available_colors?.includes(color)) {
                            setFormData({
                              ...formData,
                              available_colors: [...(formData.available_colors || []), color],
                            });
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          formData.available_colors?.includes(color)
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                  {formData.available_colors && formData.available_colors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.available_colors.map(color => (
                        <span
                          key={color}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                        >
                          {color}
                          <button
                            type="button"
                            onClick={() => removeColor(color)}
                            className="hover:text-blue-900 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stock Levels */}
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Stock Level Settings</h3>
              <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">📌 Default Stock Levels:</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Digunakan untuk item yang TIDAK ada size, atau sebagai nilai default untuk semua size. 
                  Contoh: Jika item type "Helmet" tidak ada size, gunakan nilai ini.
                </p>
              </div>
              
              {/* Default Stock Levels (for items without sizes) */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Default Min Stock *
                  </label>
                  <input
                    type="number"
                    value={formData.min_stock_level || 50}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0) {
                        setFormData({ ...formData, min_stock_level: value });
                      } else if (e.target.value === '') {
                        setFormData({ ...formData, min_stock_level: 50 });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    placeholder="50"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nilai minimum stok default</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Default Max Stock *
                  </label>
                  <input
                    type="number"
                    value={formData.max_stock_level || 1000}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1) {
                        setFormData({ ...formData, max_stock_level: value });
                      } else if (e.target.value === '') {
                        setFormData({ ...formData, max_stock_level: 1000 });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nilai maksimum stok default</p>
                </div>
              </div>

              {/* Per-Size Stock Levels */}
              {formData.has_size && formData.available_sizes && formData.available_sizes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Stock Levels by Size</h4>
                  <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-800 dark:text-green-200">
                    <p className="font-medium mb-1">📏 Stock Levels per Size:</p>
                    <p className="text-green-700 dark:text-green-300">
                      Tetapkan nilai min/max khusus untuk setiap size. Jika tidak ditetapkan, akan menggunakan nilai default di atas.
                      Contoh: Size "XS" mungkin perlu min=100, max=500, manakala "XL" mungkin min=50, max=2000.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {formData.available_sizes.map((size) => {
                      const currentSizeLevels = formData.size_stock_levels || {};
                      const sizeLevels = currentSizeLevels[size] || {
                        min: formData.min_stock_level || 50,
                        max: formData.max_stock_level || 1000,
                      };
                      
                      return (
                        <div key={size} className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Size: {size}</span>
                            {currentSizeLevels[size] && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newSizeLevels = { ...currentSizeLevels };
                                  delete newSizeLevels[size];
                                  setFormData({ ...formData, size_stock_levels: newSizeLevels });
                                }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                Reset to Default
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Min Stock
                              </label>
                              <input
                                type="number"
                                value={sizeLevels.min}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  const newSizeLevels = {
                                    ...currentSizeLevels,
                                    [size]: {
                                      ...sizeLevels,
                                      min: (!isNaN(value) && value >= 0) ? value : 0,
                                    },
                                  };
                                  setFormData({ ...formData, size_stock_levels: newSizeLevels });
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Max Stock
                              </label>
                              <input
                                type="number"
                                value={sizeLevels.max}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  const newSizeLevels = {
                                    ...currentSizeLevels,
                                    [size]: {
                                      ...sizeLevels,
                                      max: (!isNaN(value) && value >= 1) ? value : 1000,
                                    },
                                  };
                                  setFormData({ ...formData, size_stock_levels: newSizeLevels });
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Inactive</span>
                </label>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
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
                mode === 'create' ? 'Create' : 'Save Changes'
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

