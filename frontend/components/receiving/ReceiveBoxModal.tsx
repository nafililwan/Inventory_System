'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import BaseModal from '@/components/common/BaseModal';
import { boxesService, BoxContentInput } from '@/lib/api/boxes';
import { itemTypesService, ItemType } from '@/lib/api/item-types';
import { categoryService, Category } from '@/lib/categories';

type BoxContentFormRow = {
  category_id: number | null;
  type_id: number | null;
  year_code: string;
  quantities: Record<string, number>;
  color?: string;
};

interface ReceiveBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReceiveBoxModal({ isOpen, onClose, onSuccess }: ReceiveBoxModalProps) {
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplier: '',
    po_number: '',
    do_number: '',
    invoice_number: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [boxContents, setBoxContents] = useState<BoxContentFormRow[]>([
    {
      category_id: null,
      type_id: null,
      year_code: new Date().getFullYear().toString().slice(-2),
      quantities: {},
      color: undefined,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [typesRes, categoriesRes] = await Promise.all([
        itemTypesService.list({ status: 'active' }),
        categoryService.getAll({ status: 'active' }),
      ]);
      setItemTypes(typesRes.data);
      setCategories(categoriesRes);
    } catch (error) {
      toast.error('Failed to load reference data');
      console.error('Error loading initial data:', error);
    }
  };

  const handleAddContent = () => {
    setBoxContents((prev) => [
      ...prev,
      {
        category_id: null,
        type_id: null,
        year_code: new Date().getFullYear().toString().slice(-2),
        quantities: {},
        color: undefined,
      },
    ]);
  };

  const handleRemoveContent = (index: number) => {
    setBoxContents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (index: number, category_id: number | null) => {
    const newContents = [...boxContents];
    newContents[index].category_id = category_id;
    newContents[index].type_id = null;
    newContents[index].quantities = {};
    newContents[index].color = undefined;
    setBoxContents(newContents);
  };

  const handleTypeChange = (index: number, type_id: number | null) => {
    const newContents = [...boxContents];
    newContents[index].type_id = type_id;
    newContents[index].quantities = {};
    newContents[index].color = undefined;
    setBoxContents(newContents);
  };

  const handleYearChange = (index: number, year_code: string) => {
    const newContents = [...boxContents];
    newContents[index].year_code = year_code;
    setBoxContents(newContents);
  };

  const handleColorChange = (index: number, color: string | undefined) => {
    const newContents = [...boxContents];
    newContents[index].color = color;
    setBoxContents(newContents);
  };

  const handleQuantityChange = (index: number, size: string, quantity: string | number) => {
    const newContents = [...boxContents];
    const parsedQty =
      typeof quantity === 'string' ? (quantity === '' ? 0 : parseInt(quantity) || 0) : quantity || 0;

    if (parsedQty <= 0) {
      const { [size]: _, ...rest } = newContents[index].quantities;
      newContents[index].quantities = rest;
    } else {
      newContents[index].quantities = {
        ...newContents[index].quantities,
        [size]: parsedQty,
      };
    }
    setBoxContents(newContents);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const contents: BoxContentInput[] = [];

      boxContents.forEach((content) => {
        if (!content.type_id) return;

        if (Object.keys(content.quantities).length > 0) {
          Object.entries(content.quantities).forEach(([size, qty]) => {
            if (qty > 0) {
              contents.push({
                type_id: content.type_id as number,
                year_code: content.year_code,
                size,
                color: content.color,
                quantity: qty,
              });
            }
          });
        } else {
          toast.error(
            `Please enter quantities for ${
              itemTypes.find((t) => t.type_id === content.type_id)?.type_name || 'selected item type'
            }`
          );
          setLoading(false);
          return;
        }
      });

      if (contents.length === 0) {
        toast.error('Please enter at least one item with quantity');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        contents,
      };

      await boxesService.create(payload);
      toast.success('Box received successfully!');
      
      // Reset form
      setFormData({
        supplier: '',
        po_number: '',
        do_number: '',
        invoice_number: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setBoxContents([
        {
          category_id: null,
          type_id: null,
          year_code: new Date().getFullYear().toString().slice(-2),
          quantities: {},
          color: undefined,
        },
      ]);

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to receive box');
      console.error('Error receiving box:', error);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pb-safe">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="receive-box-form"
        disabled={loading}
        className="px-6 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Receiving...</span>
          </>
        ) : (
          <>
            <PlusIcon className="w-5 h-5" />
            <span>Receive & Generate QR</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Receive New Stock"
      size="xl"
      footer={footer}
      maxHeight="max-h-[95vh]"
    >
      <form id="receive-box-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
        {/* Box Details */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
            Box Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="ABC Textile"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Received Date <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={formData.received_date}
                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">PO Number</label>
              <input
                type="text"
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                placeholder="PO-2024-123"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">DO Number</label>
              <input
                type="text"
                value={formData.do_number}
                onChange={(e) => setFormData({ ...formData, do_number: e.target.value })}
                placeholder="DO-2024-456"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Any remarks..."
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Box Contents */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Box Contents</h3>
            <button
              type="button"
              onClick={handleAddContent}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors touch-manipulation"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Add Another Type</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {boxContents.map((content, index) => {
            const selectedType = itemTypes.find((t) => t.type_id === content.type_id);
            const filteredTypes = content.category_id
              ? itemTypes.filter((t) => t.category_id === content.category_id)
              : itemTypes;
            const availableSizes = selectedType?.available_sizes || [];
            const availableColors = selectedType?.available_colors || [];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Item #{index + 1}</h4>
                  {boxContents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContent(index)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={content.category_id || ''}
                      onChange={(e) =>
                        handleCategoryChange(
                          index,
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Item Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={content.type_id || ''}
                      onChange={(e) =>
                        handleTypeChange(index, e.target.value ? parseInt(e.target.value) : null)
                      }
                      disabled={!content.category_id}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Type</option>
                      {filteredTypes.map((type) => (
                        <option key={type.type_id} value={type.type_id}>
                          {type.type_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Year Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={2}
                      value={content.year_code}
                      onChange={(e) => handleYearChange(index, e.target.value)}
                      placeholder="27 (for 2027)"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      20{content.year_code} = {2000 + (parseInt(content.year_code || '0') || 0)}
                    </p>
                  </div>

                  {selectedType?.has_color && availableColors.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
                      <select
                        value={content.color || ''}
                        onChange={(e) => handleColorChange(index, e.target.value || undefined)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                      >
                        <option value="">Select Color (Optional)</option>
                        {availableColors.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedType && selectedType.has_size && availableSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantities by Size (check sizes in box)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {availableSizes.map((size) => (
                        <div key={size} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                          <label className="flex items-center space-x-2 mb-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={content.quantities[size] !== undefined}
                              onChange={(e) => {
                                if (!e.target.checked) {
                                  const newContents = [...boxContents];
                                  const { [size]: _, ...rest } = newContents[index].quantities;
                                  newContents[index].quantities = rest;
                                  setBoxContents(newContents);
                                } else if (content.quantities[size] === undefined) {
                                  handleQuantityChange(index, size, 1);
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-900"
                            />
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{size}</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={
                              content.quantities[size] !== undefined
                                ? content.quantities[size] === 0
                                  ? ''
                                  : content.quantities[size]
                                : ''
                            }
                            onChange={(e) => handleQuantityChange(index, size, e.target.value)}
                            placeholder="0"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        Total: {Object.values(content.quantities).reduce((a, b) => a + b, 0)} pcs
                      </span>
                    </div>
                  </div>
                )}

                {selectedType && !selectedType.has_size && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={content.quantities['Standard'] || ''}
                      onChange={(e) => handleQuantityChange(index, 'Standard', e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter total quantity for this item type.
                    </p>
                  </div>
                )}

                {!selectedType && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                    Select an item type to enter quantities
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </form>
    </BaseModal>
  );
}

