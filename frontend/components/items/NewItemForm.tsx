'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, TrashIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { itemsV2Service, ItemCreateV2, SizeConfig } from '@/lib/items_v2';
import { categoryService, Category } from '@/lib/categories';
import toast from 'react-hot-toast';

interface NewItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onItemCreated?: (item: any, qrCode: string) => void;
}

const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Standard'];

export default function NewItemForm({ isOpen, onClose, onSuccess, onItemCreated }: NewItemFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Step 1: Item Details
  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [itemType, setItemType] = useState('');
  const [unitType, setUnitType] = useState<'piece' | 'box' | 'set' | 'pair' | 'dozen' | 'carton'>('piece');
  
  // Step 2: Size and Quantity Configuration
  const [sizes, setSizes] = useState<SizeConfig[]>([{ size: 'Standard', quantity: 0 }]);
  
  // Step 3: QR Code (generated after creation)
  const [createdItem, setCreatedItem] = useState<any>(null);
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data.filter(c => c.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const resetForm = () => {
    setStep(1);
    setItemName('');
    setSelectedCategory('');
    setItemType('');
    setUnitType('piece');
    setSizes([{ size: 'Standard', quantity: 0 }]);
    setCreatedItem(null);
    setQrCode('');
  };

  const handleAddSize = () => {
    setSizes([...sizes, { size: 'Standard', quantity: 0 }]);
  };

  const handleRemoveSize = (index: number) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter((_, i) => i !== index));
    }
  };

  const handleSizeChange = (index: number, field: 'size' | 'quantity', value: string | number) => {
    const newSizes = [...sizes];
    newSizes[index] = {
      ...newSizes[index],
      [field]: field === 'quantity' ? Number(value) : value
    };
    setSizes(newSizes);
  };

  const validateStep1 = (): boolean => {
    if (!itemName.trim()) {
      toast.error('Please enter Item Name');
      return false;
    }
    if (!selectedCategory) {
      toast.error('Please select Category');
      return false;
    }
    if (!itemType.trim()) {
      toast.error('Please enter Type');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (sizes.length === 0) {
      toast.error('Please add at least one size');
      return false;
    }
    for (let i = 0; i < sizes.length; i++) {
      if (!sizes[i].size.trim()) {
        toast.error(`Size ${i + 1} cannot be empty`);
        return false;
      }
      if (sizes[i].quantity <= 0) {
        toast.error(`Quantity for ${sizes[i].size} must be greater than 0`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const itemData: ItemCreateV2 = {
        item_name: itemName,
        category: selectedCategory,
        type: itemType,
        unit_type: unitType,
        sizes: sizes,
        status: 'active'
      };

      const created = await itemsV2Service.create(itemData);
      setCreatedItem(created);
      setQrCode(created.qr_code || '');
      setStep(3);
      
      toast.success('Item created successfully!');
      
      if (onItemCreated) {
        onItemCreated(created, created.qr_code || '');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    resetForm();
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Create New Item</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Step {step} of 3: {
                      step === 1 ? 'Item Details' :
                      step === 2 ? 'Size & Quantity Configuration' :
                      'QR Code Generation'
                    }
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="px-4 sm:px-6 pt-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex-1 flex items-center">
                      <div className={`flex-1 h-2 rounded-full ${
                        step >= s ? 'bg-blue-600' : 'bg-gray-200'
                      }`} />
                      {s < 3 && (
                        <div className={`w-2 h-2 rounded-full mx-1 ${
                          step > s ? 'bg-blue-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">Item Details</h3>
                      
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="e.g., Company T-Shirt, Coffee Mug, Notebook"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat.category_id} value={cat.category_name}>
                              {cat.category_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={itemType}
                          onChange={(e) => setItemType(e.target.value)}
                          placeholder="e.g., Shirt, Mug, Notebook"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Unit Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={unitType}
                          onChange={(e) => setUnitType(e.target.value as any)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="piece">Piece</option>
                          <option value="box">Box</option>
                          <option value="set">Set</option>
                          <option value="pair">Pair</option>
                          <option value="dozen">Dozen</option>
                          <option value="carton">Carton</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">Size and Quantity Configuration</h3>
                      <p className="text-sm text-gray-600">
                        Specify size options and quantity for each size. Use "Standard" for items without size variations.
                      </p>

                      <div className="space-y-3">
                        {sizes.map((sizeConfig, index) => (
                          <div key={index} className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Size
                                </label>
                                <select
                                  value={sizeConfig.size}
                                  onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  {commonSizes.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={sizeConfig.quantity}
                                  onChange={(e) => handleSizeChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            {sizes.length > 1 && (
                              <button
                                onClick={() => handleRemoveSize(index)}
                                className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleAddSize}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <PlusIcon className="w-5 h-5" />
                        Add Another Size
                      </button>

                      {/* Total Quantity Display */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">Total Quantity:</span>
                          <span className="text-lg font-bold text-blue-700">
                            {sizes.reduce((sum, s) => sum + s.quantity, 0)} {unitType}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">QR Code Generated</h3>
                      
                      {createdItem && (
                        <div className="space-y-4">
                          {/* Item Summary */}
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Item Name:</span>
                              <span className="text-sm font-semibold text-gray-900">{createdItem.item_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Category:</span>
                              <span className="text-sm text-gray-900">{createdItem.category}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Type:</span>
                              <span className="text-sm text-gray-900">{createdItem.type}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Total Quantity:</span>
                              <span className="text-sm font-bold text-green-600">{createdItem.total_quantity} {createdItem.unit_type}</span>
                            </div>
                          </div>

                          {/* QR Code Display */}
                          {qrCode && (
                            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 text-center">
                              <div className="text-xs text-gray-500 mb-2 font-semibold uppercase">QR Code</div>
                              <div className="text-lg font-mono font-bold text-gray-900 break-all">
                                {qrCode}
                              </div>
                              <p className="text-xs text-gray-500 mt-3">
                                Contains: Item ID, Item Name, Category, Type, Total pieces, Timestamp
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200">
                <button
                  onClick={step > 1 ? handleBack : onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  {step > 1 ? (
                    <>
                      <ChevronLeftIcon className="w-5 h-5" />
                      Back
                    </>
                  ) : (
                    'Cancel'
                  )}
                </button>
                
                {step < 3 && (
                  <button
                    onClick={handleNext}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {step === 2 ? (loading ? 'Creating...' : 'Create Item') : 'Next'}
                    {step < 2 && <ChevronRightIcon className="w-5 h-5" />}
                  </button>
                )}
                
                {step === 3 && (
                  <button
                    onClick={handleFinish}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Finish
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}









