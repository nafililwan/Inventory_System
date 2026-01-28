'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArchiveBoxIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { 
  itemsService, 
  Item, 
  inventoryService
} from '@/lib/api/items';
import { storesService, Store } from '@/lib/api/stores';
import { boxesService, Box } from '@/lib/api/boxes';

interface StockTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data?: {
    item_id: number;
    store_id: number;
    transaction_type: string;
    quantity: number;
    from_store_id?: number;
    to_store_id?: number;
    reference_number?: string;
    reference_type?: string;
    notes?: string;
  }) => Promise<void>;
  itemId?: number;
  storeId?: number;
  transactionType?: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer_out';
  initialQuantity?: number; // Auto-fill quantity
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

const transactionTypes = [
  { value: 'stock_in', label: 'Stock In', description: 'Add stock to inventory', color: 'green' },
  { value: 'stock_out', label: 'Stock Out', description: 'Remove stock from inventory', color: 'red' },
  { value: 'adjustment', label: 'Adjustment', description: 'Adjust stock quantity', color: 'blue' },
  { value: 'transfer_out', label: 'Transfer', description: 'Transfer stock to another store', color: 'orange' },
  // Transfer In removed - Transfer Out now handles both automatically
  // Return disabled as requested
];

export default function StockTransactionModal({
  isOpen,
  onClose,
  onSave,
  itemId,
  storeId,
  transactionType = 'stock_in',
  initialQuantity,
}: StockTransactionModalProps) {
  const [formData, setFormData] = useState({
    item_id: itemId || 0,
    store_id: storeId || 0,
    transaction_type: transactionType,
    quantity: 0,
    from_store_id: 0, // For transfer: source store
    to_store_id: 0, // For transfer: destination store
    reference_number: '',
    reference_type: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
  // Data for dropdowns
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [boxItems, setBoxItems] = useState<Item[]>([]);
  const [selectionMode, setSelectionMode] = useState<'item' | 'box'>('item'); // 'item' or 'box'
  const [itemSearch, setItemSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form data when modal opens
      setFormData({
        item_id: itemId || 0,
        store_id: storeId || 0,
        transaction_type: transactionType,
        quantity: initialQuantity || 0, // Use initialQuantity if provided
        from_store_id: storeId || 0, // Default to current store for transfer_out
        to_store_id: 0, // Will be selected for transfer_in
        reference_number: '',
        reference_type: '',
        notes: '',
      });
      setErrors({});
      setSelectedItem(null);
      setSelectedBox(null);
      setBoxItems([]);
      setSelectionMode('item');
      setItemSearch('');
      setCurrentStock(null);
      
      // Fetch data
      fetchStores();
      if (itemId) {
        fetchItem(itemId);
      } else {
        fetchItems();
      }
    }
  }, [isOpen, itemId, storeId, transactionType, initialQuantity]);

  // Fetch boxes when transaction type changes
  useEffect(() => {
    if (isOpen) {
      fetchBoxes();
    }
  }, [isOpen, formData.transaction_type]);

  useEffect(() => {
    if (formData.item_id && formData.item_id > 0) {
      fetchItem(formData.item_id);
    }
  }, [formData.item_id]);

  useEffect(() => {
    // For transfer_out, check stock in from_store
    // For other types, check stock in store_id
    const storeIdToCheck = formData.transaction_type === 'transfer_out' 
      ? formData.from_store_id 
      : formData.store_id;
    
    if (storeIdToCheck && formData.item_id && storeIdToCheck > 0 && formData.item_id > 0) {
      fetchCurrentStock();
    }
  }, [formData.store_id, formData.from_store_id, formData.item_id, formData.transaction_type]);

  // Auto-fill quantity when stock is loaded and transaction type is stock_out
  useEffect(() => {
    if (
      isOpen &&
      transactionType === 'stock_out' &&
      currentStock !== null &&
      currentStock > 0 &&
      formData.quantity === 0 &&
      !initialQuantity // Don't override if initialQuantity is provided
    ) {
      // Auto-set quantity to 1 for stock_out
      setFormData((prev) => ({ ...prev, quantity: 1 }));
    }
  }, [isOpen, currentStock, transactionType, formData.quantity, initialQuantity]);

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const data = await itemsService.list({ status: 'active' });
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchItem = async (id: number) => {
    try {
      const item = await itemsService.get(id, true);
      setSelectedItem(item);
    } catch (error) {
      console.error('Failed to load item:', error);
    }
  };

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const data = await storesService.list({ status: 'active' });
      setStores(data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoadingStores(false);
    }
  };

  const fetchBoxes = async () => {
    setLoadingBoxes(true);
    try {
      // Filter boxes based on transaction type
      // Stock In: only show boxes with status 'pending_checkin'
      // Stock Out: only show boxes with status 'checked_in' (not yet stocked out)
      const boxStatus = formData.transaction_type === 'stock_in' 
        ? 'pending_checkin' 
        : formData.transaction_type === 'stock_out'
        ? 'checked_in'
        : 'checked_in'; // Default for other transaction types
      
      const response = await boxesService.list({ status: boxStatus });
      // Handle axios response - extract data property
      const boxesData = response?.data || response || [];
      setBoxes(Array.isArray(boxesData) ? boxesData : []);
    } catch (error) {
      console.error('Failed to load boxes:', error);
      setBoxes([]);
    } finally {
      setLoadingBoxes(false);
    }
  };

  const fetchBoxItems = async (boxId: number) => {
    try {
      const boxData = await boxesService.get(boxId);
      if (boxData?.data?.contents) {
        // Extract unique item_ids from box contents
        const itemIds = [...new Set(boxData.data.contents.map((c: any) => c.item_id))];
        // Fetch items
        const itemsPromises = itemIds.map((id: number) => itemsService.get(id, true));
        const itemsData = await Promise.all(itemsPromises);
        setBoxItems(itemsData);
      }
    } catch (error) {
      console.error('Failed to load box items:', error);
    }
  };

  const fetchCurrentStock = async () => {
    try {
      // For transfer_out, check stock in from_store
      // For other types, check stock in store_id
      const storeIdToCheck = formData.transaction_type === 'transfer_out' 
        ? formData.from_store_id 
        : formData.store_id;
      
      const inventory = await inventoryService.list({
        item_id: formData.item_id,
        store_id: storeIdToCheck,
      });
      if (inventory.length > 0) {
        const inv = inventory[0];
        // Use available_quantity if available, otherwise use quantity
        const availableQty = inv.available_quantity ?? inv.quantity ?? 0;
        setCurrentStock(availableQty);
        
        // Auto-fill quantity for stock_out if not set yet and no initialQuantity provided
        if (
          transactionType === 'stock_out' &&
          formData.quantity === 0 &&
          availableQty > 0 &&
          !initialQuantity
        ) {
          setFormData((prev) => ({
            ...prev,
            quantity: 1, // Default to 1 for quick stock out
          }));
        }
      } else {
        setCurrentStock(0);
      }
    } catch (error) {
      console.error('Failed to load current stock:', error);
      setCurrentStock(null);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.item_id || formData.item_id === 0) {
      newErrors.item_id = 'Item is required';
    }

    // Validation based on transaction type
    if (formData.transaction_type === 'transfer_out') {
      // Transfer: need both from_store_id and to_store_id
      if (!formData.from_store_id || formData.from_store_id === 0) {
        newErrors.from_store_id = 'From Store is required';
      }
      if (!formData.to_store_id || formData.to_store_id === 0) {
        newErrors.to_store_id = 'To Store is required';
      }
      if (formData.from_store_id === formData.to_store_id) {
        newErrors.to_store_id = 'To Store must be different from From Store';
      }
      // Check stock availability in from_store
      if (formData.from_store_id && formData.item_id && currentStock !== null) {
        if (formData.quantity > currentStock) {
          newErrors.quantity = `Insufficient stock. Available: ${currentStock}`;
        }
      }
    } else {
      // Stock In/Out/Adjustment: use store_id
      if (!formData.store_id || formData.store_id === 0) {
        newErrors.store_id = 'Store is required';
      }
      
      // Check stock availability for stock_out
      if (formData.transaction_type === 'stock_out' && currentStock !== null) {
        if (formData.quantity > currentStock) {
          newErrors.quantity = `Insufficient stock. Available: ${currentStock}`;
        }
      }
    }

    if (!formData.quantity || formData.quantity === 0) {
      newErrors.quantity = 'Quantity is required';
    } else if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Send quantity as positive (backend handles the logic)
    // For stock_out, backend will subtract from inventory
    // For stock_in, backend will add to inventory
    const quantity = Math.abs(formData.quantity);

    setSaving(true);
    try {
      // Prepare data based on transaction type
      const saveData: any = {
        item_id: formData.item_id,
        transaction_type: formData.transaction_type,
        quantity, // Always send positive quantity
        reference_number: formData.reference_number || undefined,
        reference_type: formData.reference_type || undefined,
        notes: formData.notes || undefined,
      };

      // Set store IDs based on transaction type
      if (formData.transaction_type === 'transfer_out') {
        saveData.from_store_id = formData.from_store_id;
        saveData.to_store_id = formData.to_store_id;
        saveData.store_id = formData.from_store_id; // For backward compatibility
      } else {
        // Stock In/Out/Adjustment: use store_id
        saveData.store_id = formData.store_id;
        saveData.from_store_id = formData.transaction_type === 'stock_out' ? formData.store_id : undefined;
        saveData.to_store_id = formData.transaction_type === 'stock_in' ? formData.store_id : undefined;
      }

      // Add box_id if box is selected
      if (selectedBox && selectedBox.box_id) {
        saveData.box_id = selectedBox.box_id;
      }

      await onSave(saveData);
      onClose();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        setErrors({ submit: error.response.data.detail });
      } else {
        setErrors({ submit: 'Failed to save transaction' });
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
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-4"
            style={{ 
              paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
              paddingTop: 'calc(1rem + env(safe-area-inset-top))'
            }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Stock Transaction
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
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                {errors.submit && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                    {errors.submit}
                  </div>
                )}

                {/* Transaction Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transaction Type <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Simple Info Box for Transfer */}
                  {formData.transaction_type === 'transfer_out' && (
                    <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-xs text-orange-700 dark:text-orange-300">
                        📦 Stock will be deducted from <strong>From Store</strong> and added to <strong>To Store</strong> in one transaction.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {transactionTypes.map((type) => (
                      <label
                        key={type.value}
                        className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.transaction_type === type.value
                            ? type.value === 'stock_in' 
                              ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                              : type.value === 'stock_out'
                              ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                              : type.value === 'adjustment'
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : type.value === 'transfer_out'
                              ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-600'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <input
                          type="radio"
                          value={type.value}
                          checked={formData.transaction_type === type.value}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            // Reset store fields when changing transaction type
                            setFormData({ 
                              ...formData, 
                              transaction_type: newType,
                              from_store_id: newType === 'transfer_out' ? (formData.store_id || formData.from_store_id || 0) : 0,
                              to_store_id: newType === 'transfer_out' ? 0 : 0,
                            });
                          }}
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{type.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selection Mode Toggle */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selection Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectionMode('item');
                        setSelectedBox(null);
                        setBoxItems([]);
                        setFormData({ ...formData, item_id: 0 });
                      }}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                        selectionMode === 'item'
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      Select Item
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectionMode('box');
                        setSelectedItem(null);
                        setFormData({ ...formData, item_id: 0 });
                      }}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                        selectionMode === 'box'
                          ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <ArchiveBoxIcon className="w-4 h-4 inline mr-1" />
                      Select Box
                    </button>
                  </div>
                </div>

                {/* Item Selection */}
                {selectionMode === 'item' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Item <span className="text-red-500">*</span>
                    </label>
                    {/* Search Input */}
                    <div className="relative mb-2">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search items by code or name..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    {loadingItems ? (
                      <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                        Loading items...
                      </div>
                    ) : (
                      <select
                        value={formData.item_id || 0}
                        onChange={(e) => {
                          const id = parseInt(e.target.value);
                          setFormData({ ...formData, item_id: id });
                          setSelectedItem(null);
                        }}
                        disabled={!!itemId}
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                          errors.item_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${itemId ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                      >
                        <option value={0}>Select Item</option>
                        {items
                          .filter(item => 
                            !itemSearch || 
                            item.item_code?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                            item.item_name?.toLowerCase().includes(itemSearch.toLowerCase())
                          )
                          .map((item) => (
                            <option key={item.item_id} value={item.item_id}>
                              {item.item_code} - {item.item_name} {item.size && `(${item.size})`} {item.year_code && `[${item.year_code}]`}
                            </option>
                          ))}
                      </select>
                    )}
                    {errors.item_id && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.item_id}</p>
                    )}
                  </div>
                ) : (
                  /* Box Selection */
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Box <span className="text-red-500">*</span>
                    </label>
                    {loadingBoxes ? (
                      <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                        Loading boxes...
                      </div>
                    ) : (
                      <>
                        <select
                          value={selectedBox?.box_id || 0}
                          onChange={async (e) => {
                            const boxId = parseInt(e.target.value);
                            if (boxId > 0) {
                              const box = boxes.find(b => b.box_id === boxId);
                              setSelectedBox(box || null);
                              await fetchBoxItems(boxId);
                            } else {
                              setSelectedBox(null);
                              setBoxItems([]);
                            }
                          }}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent transition-all"
                        >
                          <option value={0}>Select Box</option>
                          {boxes.map((box) => (
                            <option key={box.box_id} value={box.box_id}>
                              {box.box_code} {box.store_id && `- Store: ${stores.find(s => s.store_id === box.store_id)?.store_name || 'N/A'}`}
                            </option>
                          ))}
                        </select>
                        
                        {/* Box Items Selection */}
                        {selectedBox && boxItems.length > 0 && (
                          <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Select Item from Box:
                            </label>
                            <select
                              value={formData.item_id || 0}
                              onChange={(e) => {
                                const id = parseInt(e.target.value);
                                setFormData({ ...formData, item_id: id });
                                setSelectedItem(null);
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent"
                            >
                              <option value={0}>Select Item</option>
                              {boxItems.map((item) => (
                                <option key={item.item_id} value={item.item_id}>
                                  {item.item_code} - {item.item_name} {item.size && `(${item.size})`} {item.year_code && `[${item.year_code}]`}
                                </option>
                              ))}
                            </select>
                            {errors.item_id && (
                              <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.item_id}</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Store Selection - Different based on transaction type */}
                {formData.transaction_type === 'transfer_out' ? (
                  <>
                    {/* Transfer: From Store and To Store */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        From Store <span className="text-red-500">*</span>
                      </label>
                      {loadingStores ? (
                        <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                          Loading stores...
                        </div>
                      ) : (
                        <select
                          value={formData.from_store_id || 0}
                          onChange={(e) => {
                            const fromStoreId = parseInt(e.target.value);
                            setFormData({ 
                              ...formData, 
                              from_store_id: fromStoreId,
                              store_id: fromStoreId // Also update store_id for backward compatibility
                            });
                          }}
                          disabled={!!storeId}
                          className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                            errors.from_store_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                          } ${storeId ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                        >
                          <option value={0}>Select From Store</option>
                          {stores.map((store) => (
                            <option key={store.store_id} value={store.store_id}>
                              {store.store_code} - {store.store_name}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.from_store_id && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.from_store_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        To Store <span className="text-red-500">*</span>
                      </label>
                      {loadingStores ? (
                        <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                          Loading stores...
                        </div>
                      ) : (
                        <select
                          value={formData.to_store_id || 0}
                          onChange={(e) => setFormData({ ...formData, to_store_id: parseInt(e.target.value) })}
                          className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                            errors.to_store_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value={0}>Select To Store</option>
                          {stores
                            .filter(store => store.store_id !== formData.from_store_id)
                            .map((store) => (
                              <option key={store.store_id} value={store.store_id}>
                                {store.store_code} - {store.store_name}
                              </option>
                            ))}
                        </select>
                      )}
                      {errors.to_store_id && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.to_store_id}</p>
                      )}
                    </div>
                  </>
                ) : (
                  /* Stock In/Out/Adjustment: Single Store */
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Store <span className="text-red-500">*</span>
                    </label>
                    {loadingStores ? (
                      <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                        Loading stores...
                      </div>
                    ) : (
                      <select
                        value={formData.store_id || 0}
                        onChange={(e) => setFormData({ ...formData, store_id: parseInt(e.target.value) })}
                        disabled={!!storeId}
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                          errors.store_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${storeId ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                      >
                        <option value={0}>Select Store</option>
                        {stores.map((store) => (
                          <option key={store.store_id} value={store.store_id}>
                            {store.store_code} - {store.store_name}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.store_id && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.store_id}</p>
                    )}
                  </div>
                )}

                {/* Current Stock Display */}
                {currentStock !== null && formData.item_id && (
                  (formData.transaction_type === 'transfer_out' && formData.from_store_id) ||
                  (formData.transaction_type !== 'transfer_out' && formData.store_id)
                ) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">
                        {formData.transaction_type === 'transfer_out' ? 'Current Stock (From Store):' : 'Current Stock:'}
                      </span>{' '}
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{currentStock}</span>
                      {selectedItem && ` ${selectedItem.unit_type}`}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
                      errors.quantity ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    min="1"
                    placeholder="Enter quantity"
                  />
                  {errors.quantity && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.quantity}</p>
                  )}
                </div>

                {/* Reference Number & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      placeholder="e.g., PO-12345, DO-67890"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reference Type
                    </label>
                    <select
                      value={formData.reference_type}
                      onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                    >
                      <option value="">Select Type</option>
                      <option value="PO">PO (Purchase Order)</option>
                      <option value="DO">DO (Delivery Order)</option>
                      <option value="GRN">GRN (Goods Receipt Note)</option>
                      <option value="Adjustment">Adjustment</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Return">Return</option>
                      <option value="Other">Other</option>
                    </select>
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
                      <span>Processing...</span>
                    </>
                  ) : (
                    'Save Transaction'
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

