'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { ItemCreate, itemService } from '@/lib/items';
import { categoryService, Category, itemTypeService, ItemType, ItemTypeCreate } from '@/lib/categories';
import toast from 'react-hot-toast';

interface AllInOneItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onItemCreated?: (item: any, itemTypeName: string, size?: string, quantity?: string) => void;
}

const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const commonColors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Gray', 'Brown', 'Navy', 'Pink'];

export default function AllInOneItemForm({ isOpen, onClose, onSuccess, onItemCreated }: AllInOneItemFormProps) {
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  
  // Form states
  const [step, setStep] = useState<'category' | 'type' | 'item' | 'variants'>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(null);
  
  // Quick create states
  const [showQuickCreateCategory, setShowQuickCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showQuickCreateType, setShowQuickCreateType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeHasSize, setNewTypeHasSize] = useState(false);
  const [newTypeHasColor, setNewTypeHasColor] = useState(false);
  const [newTypeSizes, setNewTypeSizes] = useState<string[]>([]);
  const [newTypeColors, setNewTypeColors] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  
  // Item form
  const [itemForm, setItemForm] = useState<ItemCreate & { type_id?: number; item_code?: string; brand?: string; box_quantity?: number; notes?: string; status?: string }>({
    item_name: '',
    category: '',
    type: '',
    unit_type: 'pcs',
    sizes: [],
    type_id: 0,
    item_code: '',
    brand: '',
    box_quantity: 1,
    notes: '',
    status: 'active',
  });
  const [itemQuantity, setItemQuantity] = useState<number>(0); // Quantity based on unit type
  
  // Variants with quantities (for stock that arrived)
  const [stockVariants, setStockVariants] = useState<Array<{ size?: string; color?: string; quantity: number }>>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [variantQuantity, setVariantQuantity] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchItemTypes(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (selectedTypeId) {
      const type = itemTypes.find(t => t.type_id === selectedTypeId);
      setSelectedItemType(type || null);
      setItemForm(prev => ({ ...prev, type_id: selectedTypeId }));
      
      // Reset stock variants when type changes
      setStockVariants([]);
      setSelectedSize('');
      setSelectedColor('');
      setVariantQuantity(0);
    }
  }, [selectedTypeId, itemTypes]);

  const resetForm = () => {
    setStep('category');
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSelectedItemType(null);
    setShowQuickCreateCategory(false);
    setShowQuickCreateType(false);
    setNewCategoryName('');
    setNewTypeName('');
    setNewTypeHasSize(false);
    setNewTypeHasColor(false);
    setNewTypeSizes([]);
    setNewTypeColors([]);
    setItemForm({
      item_name: '',
      category: '',
      type: '',
      unit_type: 'pcs',
      sizes: [],
      type_id: 0,
      item_code: '',
      brand: '',
      box_quantity: 1,
      notes: '',
      status: 'active',
    });
    setItemQuantity(0);
    setStockVariants([]);
    setSelectedSize('');
    setSelectedColor('');
    setVariantQuantity(0);
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchItemTypes = async (categoryId: number) => {
    try {
      const data = await itemTypeService.getByCategory(categoryId, 'active');
      setItemTypes(data);
    } catch (error) {
      console.error('Failed to load item types:', error);
      setItemTypes([]);
    }
  };

  const handleQuickCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setCreating(true);
    try {
      const newCategory = await categoryService.create({
        category_name: newCategoryName.trim(),
        status: 'active',
      });
      toast.success('Category created!');
      await fetchCategories();
      setSelectedCategoryId(newCategory.category_id);
      setShowQuickCreateCategory(false);
      setNewCategoryName('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const handleQuickCreateType = async () => {
    if (!newTypeName.trim() || !selectedCategoryId) {
      toast.error('Type name and category are required');
      return;
    }

    setCreating(true);
    try {
      const typeData: ItemTypeCreate = {
        category_id: selectedCategoryId,
        type_name: newTypeName.trim(),
        has_size: newTypeHasSize,
        has_color: newTypeHasColor,
        available_sizes: newTypeHasSize ? newTypeSizes : undefined,
        available_colors: newTypeHasColor ? newTypeColors : undefined,
        status: 'active',
      };
      
      const newType = await itemTypeService.create(selectedCategoryId, typeData);
      toast.success('Item Type created!');
      await fetchItemTypes(selectedCategoryId);
      setSelectedTypeId(newType.type_id);
      setShowQuickCreateType(false);
      setNewTypeName('');
      setNewTypeHasSize(false);
      setNewTypeHasColor(false);
      setNewTypeSizes([]);
      setNewTypeColors([]);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create item type');
    } finally {
      setCreating(false);
    }
  };

  const handleAddStockVariant = () => {
    if (!selectedItemType) return;

    // Validate based on item type requirements
    if (selectedItemType.has_size && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (selectedItemType.has_color && !selectedColor) {
      toast.error('Please select a color');
      return;
    }
    if (variantQuantity <= 0) {
      toast.error('Please enter quantity');
      return;
    }

    // Check for duplicate
    const exists = stockVariants.some(
      sv => sv.size === selectedSize && sv.color === selectedColor
    );
    if (exists) {
      toast.error('This size/color combination already added');
      return;
    }

    // Add to stock variants
    const newVariant: { size?: string; color?: string; quantity: number } = {
      quantity: variantQuantity,
    };
    if (selectedItemType.has_size && selectedSize) {
      newVariant.size = selectedSize;
    }
    if (selectedItemType.has_color && selectedColor) {
      newVariant.color = selectedColor;
    }

    setStockVariants([...stockVariants, newVariant]);
    setSelectedSize('');
    setSelectedColor('');
    setVariantQuantity(0);
  };

  const handleRemoveStockVariant = (index: number) => {
    setStockVariants(stockVariants.filter((_, i) => i !== index));
  };

  const handleStockVariantQuantityChange = (index: number, quantity: number) => {
    const newVariants = [...stockVariants];
    newVariants[index] = { ...newVariants[index], quantity: Math.max(0, quantity) };
    setStockVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTypeId) {
      toast.error('Please select an Item Type');
      return;
    }

    // Validate quantity - if no variants, itemQuantity must be > 0
    if (stockVariants.length === 0 && itemQuantity <= 0) {
      toast.error('Please enter quantity for this item');
      return;
    }

    // Auto-add variant if user has selected size/color and entered quantity but hasn't clicked Add
    let finalStockVariants = [...stockVariants];
    
    if (selectedItemType && (selectedItemType.has_size || selectedItemType.has_color)) {
      // Check if there's a pending variant to add
      const hasPendingVariant = 
        (selectedItemType.has_size ? selectedSize : true) &&
        (selectedItemType.has_color ? selectedColor : true) &&
        variantQuantity > 0;
      
      if (hasPendingVariant) {
        // Check if this combination is not already added
        const exists = finalStockVariants.some(
          sv => sv.size === selectedSize && sv.color === selectedColor
        );
        if (!exists) {
          // Auto-add the pending variant
          const newVariant: { size?: string; color?: string; quantity: number } = {
            quantity: variantQuantity,
          };
          if (selectedItemType.has_size && selectedSize) {
            newVariant.size = selectedSize;
          }
          if (selectedItemType.has_color && selectedColor) {
            newVariant.color = selectedColor;
          }
          finalStockVariants = [...finalStockVariants, newVariant];
          // Update state for UI
          setStockVariants(finalStockVariants);
          // Clear the input fields
          setSelectedSize('');
          setSelectedColor('');
          setVariantQuantity(0);
        }
      }

      // Validate stock variants after auto-add
      if (finalStockVariants.length === 0) {
        toast.error('Please add at least one size/color with quantity');
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Create Item
      const createdItem = await itemService.create(itemForm);
      toast.success('Item created successfully!');

      // 2. Create Variants (without stock IN - will be done via QR scan)
      if (selectedItemType && (selectedItemType.has_size || selectedItemType.has_color)) {
        // Create variants for each size/color combination
        // Note: Variant creation is handled by backend when items are created
        // Variants will be created automatically when stock is checked in
        if (finalStockVariants.length > 0) {
          toast.success(`Item created! Use QR scan to check in stock with ${finalStockVariants.length} variant(s).`);
        } else {
          toast.success('Item created!');
        }
      } else {
        // Item without size/color - variants will be created automatically
        toast.success('Item created! Use QR scan to check in stock.');
      }

      // Get first variant's size and quantity for QR generation
      let qrSize = '';
      let qrQuantity = '';
      
      if (finalStockVariants.length > 0) {
        // Use variant quantity (untuk baju/variants)
        const firstVariant = finalStockVariants[0];
        qrSize = firstVariant.size || '';
        qrQuantity = firstVariant.quantity > 0 ? firstVariant.quantity.toString() : '0';
      } else {
        // No variants - use itemQuantity based on unit type
        // If box, quantity = box quantity, if pcs, quantity = pcs quantity
        qrQuantity = itemQuantity > 0 ? itemQuantity.toString() : '0';
      }

      // Call callback with item data for QR generation
      if (onItemCreated && selectedItemType) {
        onItemCreated(createdItem, selectedItemType.type_name, qrSize, qrQuantity);
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

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
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Create Item (All-in-One)</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Quick setup: Category → Type → Item → Variants</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
                {/* Step 1: Category */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900">
                      1. Category <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCreateCategory(!showQuickCreateCategory)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      <PlusIcon className="w-3 h-3" />
                      <span>Quick Create</span>
                    </button>
                  </div>

                  {showQuickCreateCategory ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name (e.g., Uniform, Safety)"
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickCreateCategory())}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleQuickCreateCategory}
                          disabled={creating}
                          className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {creating ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowQuickCreateCategory(false);
                            setNewCategoryName('');
                          }}
                          className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={selectedCategoryId || ''}
                      onChange={(e) => setSelectedCategoryId(parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 2: Item Type */}
                {selectedCategoryId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-900">
                        2. Item Type <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickCreateType(!showQuickCreateType)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        <PlusIcon className="w-3 h-3" />
                        <span>Quick Create</span>
                      </button>
                    </div>

                    {showQuickCreateType ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          placeholder="Item Type name (e.g., T-Shirt, Safety Helmet)"
                          className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newTypeHasSize}
                              onChange={(e) => setNewTypeHasSize(e.target.checked)}
                              className="w-4 h-4 text-green-600 rounded"
                            />
                            <span className="text-xs text-gray-700">Has Sizes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newTypeHasColor}
                              onChange={(e) => setNewTypeHasColor(e.target.checked)}
                              className="w-4 h-4 text-green-600 rounded"
                            />
                            <span className="text-xs text-gray-700">Has Colors</span>
                          </label>
                        </div>

                        {newTypeHasSize && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Available Sizes</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={sizeInput}
                                onChange={(e) => setSizeInput(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (sizeInput.trim() && !newTypeSizes.includes(sizeInput.trim())) {
                                      setNewTypeSizes([...newTypeSizes, sizeInput.trim()]);
                                      setSizeInput('');
                                    }
                                  }
                                }}
                                placeholder="Add size (e.g., M)"
                                className="flex-1 px-2 py-1 text-xs border border-green-300 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (sizeInput.trim() && !newTypeSizes.includes(sizeInput.trim())) {
                                    setNewTypeSizes([...newTypeSizes, sizeInput.trim()]);
                                    setSizeInput('');
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Add
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {commonSizes.map(size => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    if (!newTypeSizes.includes(size)) {
                                      setNewTypeSizes([...newTypeSizes, size]);
                                    }
                                  }}
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    newTypeSizes.includes(size)
                                      ? 'bg-green-600 text-white'
                                      : 'bg-white border border-green-300 text-gray-700 hover:bg-green-50'
                                  }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                            {newTypeSizes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {newTypeSizes.map(size => (
                                  <span key={size} className="px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded flex items-center gap-1">
                                    {size}
                                    <button
                                      type="button"
                                      onClick={() => setNewTypeSizes(newTypeSizes.filter(s => s !== size))}
                                      className="hover:text-green-900"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {newTypeHasColor && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Available Colors</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={colorInput}
                                onChange={(e) => setColorInput(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (colorInput.trim() && !newTypeColors.includes(colorInput.trim())) {
                                      setNewTypeColors([...newTypeColors, colorInput.trim()]);
                                      setColorInput('');
                                    }
                                  }
                                }}
                                placeholder="Add color (e.g., Blue)"
                                className="flex-1 px-2 py-1 text-xs border border-green-300 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (colorInput.trim() && !newTypeColors.includes(colorInput.trim())) {
                                    setNewTypeColors([...newTypeColors, colorInput.trim()]);
                                    setColorInput('');
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Add
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {commonColors.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => {
                                    if (!newTypeColors.includes(color)) {
                                      setNewTypeColors([...newTypeColors, color]);
                                    }
                                  }}
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    newTypeColors.includes(color)
                                      ? 'bg-green-600 text-white'
                                      : 'bg-white border border-green-300 text-gray-700 hover:bg-green-50'
                                  }`}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                            {newTypeColors.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {newTypeColors.map(color => (
                                  <span key={color} className="px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded flex items-center gap-1">
                                    {color}
                                    <button
                                      type="button"
                                      onClick={() => setNewTypeColors(newTypeColors.filter(c => c !== color))}
                                      className="hover:text-green-900"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleQuickCreateType}
                            disabled={creating || !newTypeName.trim()}
                            className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {creating ? 'Creating...' : 'Create Type'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickCreateType(false);
                              setNewTypeName('');
                              setNewTypeHasSize(false);
                              setNewTypeHasColor(false);
                              setNewTypeSizes([]);
                              setNewTypeColors([]);
                            }}
                            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={selectedTypeId || ''}
                        onChange={(e) => setSelectedTypeId(parseInt(e.target.value) || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Item Type</option>
                        {itemTypes.map((type) => (
                          <option key={type.type_id} value={type.type_id}>
                            {type.type_name}
                            {type.has_size && ' (Has Sizes)'}
                            {type.has_color && ' (Has Colors)'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Step 3: Item Details */}
                {selectedTypeId && (
                  <>
                    <div className="pt-4 border-t border-gray-200 space-y-4">
                      <h3 className="text-sm font-medium text-gray-900">3. Item Details</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item Code
                          </label>
                          <input
                            type="text"
                            value={itemForm.item_code || ''}
                            onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Auto-generated if empty"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Brand
                          </label>
                          <input
                            type="text"
                            value={itemForm.brand || ''}
                            onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Nike, Adidas"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit Type
                          </label>
                          <select
                            value={itemForm.unit_type || 'pcs'}
                            onChange={(e) => setItemForm({ ...itemForm, unit_type: e.target.value as any })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="piece">Piece</option>
                            <option value="box">Box</option>
                            <option value="set">Set</option>
                            <option value="pair">Pair</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity ({itemForm.unit_type === 'box' ? 'box' : 'pcs'}) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={itemQuantity || ''}
                            onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`0 ${itemForm.unit_type === 'box' ? 'box' : 'pcs'}`}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Total quantity untuk item ini ({itemForm.unit_type === 'box' ? 'box' : 'pcs'})
                          </p>
                        </div>

                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={itemForm.notes || ''}
                          onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Additional notes..."
                        />
                      </div>
                    </div>

                    {/* Step 4: Stock Variants (Size/Color dengan Quantity) */}
                    {selectedItemType && (selectedItemType.has_size || selectedItemType.has_color) && (
                      <div className="pt-4 border-t border-gray-200 space-y-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          4. Add Size/Color yang ada dalam stock
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">
                          Pilih size/color dan masukkan quantity untuk stock yang sampai. Stock akan di-check in melalui QR scan.
                        </p>

                        {/* Add Stock Variant Form */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                          <p className="text-xs font-medium text-gray-700">
                            Add Size/Color yang ada dalam stock:
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {selectedItemType.has_size && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Size
                                </label>
                                <select
                                  value={selectedSize}
                                  onChange={(e) => setSelectedSize(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select Size</option>
                                  {selectedItemType.available_sizes?.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {selectedItemType.has_color && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Color
                                </label>
                                <select
                                  value={selectedColor}
                                  onChange={(e) => setSelectedColor(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select Color</option>
                                  {selectedItemType.available_colors?.map(color => (
                                    <option key={color} value={color}>{color}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Quantity (pcs) <span className="text-red-500">*</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={variantQuantity || ''}
                                  onChange={(e) => setVariantQuantity(parseInt(e.target.value) || 0)}
                                  className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddStockVariant}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium touch-manipulation"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stock Variants List */}
                        {stockVariants.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700">
                              Stock yang akan di-create:
                            </p>
                            {stockVariants.map((stockVariant, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                              >
                                <div className="flex-1 flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {stockVariant.size && `Size: ${stockVariant.size}`}
                                      {stockVariant.size && stockVariant.color && ' • '}
                                      {stockVariant.color && `Color: ${stockVariant.color}`}
                                      {!stockVariant.size && !stockVariant.color && 'Default Variant'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={stockVariant.quantity}
                                      onChange={(e) => handleStockVariantQuantityChange(index, parseInt(e.target.value) || 0)}
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <span className="text-xs text-gray-600">pcs</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStockVariant(index)}
                                  className="p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-xs text-green-800">
                                <strong>Total:</strong> {stockVariants.reduce((sum, sv) => sum + sv.quantity, 0)} pcs akan di-Stock IN ke store
                              </p>
                            </div>
                          </div>
                        )}

                        {stockVariants.length === 0 && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                            <p className="text-xs text-blue-800">
                              Variants akan dibuat. Gunakan QR scan untuk check in stock ke store.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* For items without size/color */}
                    {selectedItemType && !selectedItemType.has_size && !selectedItemType.has_color && (
                      <div className="pt-4 border-t border-gray-200 space-y-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          4. Stock Information
                        </h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-800">
                            Item akan dibuat dengan default variant. Gunakan QR scan untuk check in stock ke store.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-medium touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !selectedTypeId}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium touch-manipulation"
                  >
                    {loading ? 'Creating...' : 'Create Item & Variants'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

