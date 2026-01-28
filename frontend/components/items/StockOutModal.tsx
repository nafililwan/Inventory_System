'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArchiveBoxIcon, BuildingStorefrontIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { boxesService, Box } from '@/lib/api/boxes';
import { storesService, Store } from '@/lib/api/stores';
import { itemsService, Item } from '@/lib/api/items';
import { inventoryService, Inventory } from '@/lib/api/items';
import { stockTransactionsService } from '@/lib/api/items';
import { safeToast } from '@/lib/utils/safeToast';

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export default function StockOutModal({
  isOpen,
  onClose,
  onSuccess,
}: StockOutModalProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [boxItems, setBoxItems] = useState<Inventory[]>([]);
  const [boxContents, setBoxContents] = useState<any[]>([]); // Store box contents with quantities
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [availableQuantity, setAvailableQuantity] = useState<number>(0);
  const [boxSearch, setBoxSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stockOutAllItems, setStockOutAllItems] = useState<boolean>(true); // Default: stock out all items

  // Filter boxes based on search
  const filteredBoxes = useMemo(() => {
    if (!boxSearch.trim()) return boxes;
    const searchLower = boxSearch.toLowerCase();
    return boxes.filter(box => 
      box.box_code.toLowerCase().includes(searchLower) ||
      box.supplier?.toLowerCase().includes(searchLower) ||
      box.po_number?.toLowerCase().includes(searchLower)
    );
  }, [boxes, boxSearch]);

  useEffect(() => {
    if (isOpen) {
      fetchStores();
      // Reset form
      setSelectedBox(null);
      setBoxItems([]);
      setBoxContents([]);
      setSelectedItem(null);
      setStoreId(null);
      setQuantity(0);
      setAvailableQuantity(0);
      setStockOutAllItems(true);
      setBoxSearch('');
      setBoxes([]); // Reset boxes until store is selected
    }
  }, [isOpen]);

  // Fetch boxes when store is selected
  useEffect(() => {
    if (isOpen && storeId) {
      fetchBoxes();
    } else {
      setBoxes([]);
      setSelectedBox(null);
      setBoxItems([]);
      setBoxContents([]);
      setSelectedItem(null);
    }
  }, [isOpen, storeId]);

  const fetchBoxes = async () => {
    if (!storeId) {
      setBoxes([]);
      return;
    }
    
    setLoading(true);
    try {
      // Only fetch boxes with status 'checked_in' in the selected store
      const response = await boxesService.list({ status: 'checked_in', store_id: storeId });
      const boxesData = response?.data || response || [];
      setBoxes(Array.isArray(boxesData) ? boxesData : []);
    } catch (error) {
      console.error('Failed to load boxes:', error);
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const storesData = await storesService.list({ status: 'active' });
      setStores(storesData || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const fetchBoxItems = async (boxId: number, storeId: number) => {
    try {
      const boxData = await boxesService.get(boxId);
      if (boxData?.data?.contents) {
        // Store box contents with quantities
        setBoxContents(boxData.data.contents);
        
        // Extract unique item_ids from box contents
        const itemIds = [...new Set(boxData.data.contents.map((c: any) => c.item_id))];
        
        // Fetch inventory for these items in the selected store
        const inventoryPromises = itemIds.map(async (itemId: number) => {
          const inventoryList = await inventoryService.list({ 
            item_id: itemId, 
            store_id: storeId 
          });
          return inventoryList?.find((inv: Inventory) => inv.item_id === itemId && inv.store_id === storeId);
        });
        
        const inventories = (await Promise.all(inventoryPromises)).filter(Boolean) as Inventory[];
        const availableInventories = inventories.filter(inv => (inv.quantity || 0) > 0);
        setBoxItems(availableInventories);
        
        // Auto-select item if only one item available
        if (availableInventories.length === 1) {
          setSelectedItem(availableInventories[0]);
          const availQty = availableInventories[0].available_quantity ?? availableInventories[0].quantity ?? 0;
          setAvailableQuantity(availQty);
          setQuantity(availQty); // Auto-set to max available
        } else {
          setSelectedItem(null);
          setQuantity(0);
          setAvailableQuantity(0);
        }
      }
    } catch (error) {
      console.error('Failed to load box items:', error);
      setBoxItems([]);
      setBoxContents([]);
    }
  };

  const handleStoreChange = async (newStoreId: number) => {
    setStoreId(newStoreId || null);
    // Reset box and items when store changes
    setSelectedBox(null);
    setBoxItems([]);
    setBoxContents([]);
    setSelectedItem(null);
    setQuantity(0);
    setAvailableQuantity(0);
    setStockOutAllItems(true);
    // Boxes will be fetched automatically via useEffect when storeId changes
  };

  const handleBoxSelect = async (boxId: number) => {
    if (boxId > 0 && storeId) {
      const box = boxes.find(b => b.box_id === boxId);
      setSelectedBox(box || null);
      await fetchBoxItems(boxId, storeId);
    } else {
      setSelectedBox(null);
      setBoxItems([]);
      setBoxContents([]);
      setSelectedItem(null);
      setQuantity(0);
      setAvailableQuantity(0);
      setStockOutAllItems(true);
    }
  };

  const handleItemSelect = (inventoryId: number) => {
    const inv = boxItems.find(i => i.inventory_id === inventoryId);
    setSelectedItem(inv || null);
    if (inv) {
      const availQty = inv.available_quantity ?? inv.quantity ?? 0;
      setAvailableQuantity(availQty);
      setQuantity(availQty); // Auto-set to max available
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBox) {
      safeToast.error('Please select a box');
      return;
    }
    
    if (!storeId) {
      safeToast.error('Please select a store');
      return;
    }

    setSubmitting(true);
    try {
      if (stockOutAllItems && boxItems.length > 0) {
        // Stock out all items in the box
        let successCount = 0;
        let errorCount = 0;

        for (const inv of boxItems) {
          try {
            const qtyToStockOut = inv.available_quantity ?? inv.quantity ?? 0;
            if (qtyToStockOut > 0) {
              await stockTransactionsService.create({
                transaction_type: 'stock_out',
                item_id: inv.item_id,
                from_store_id: storeId,
                quantity: qtyToStockOut,
                box_id: selectedBox.box_id,
                reference_number: selectedBox.box_code,
                reference_type: 'BOX',
                employee_name: 'Quick Stock Out',
                employee_id: 'QUICK',
                department: 'Warehouse',
                notes: `Stock out from box ${selectedBox.box_code} - All items`,
              });
              successCount++;
            }
          } catch (error: any) {
            console.error(`Failed to create transaction for item ${inv.item_id}:`, error);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          safeToast.success(`Successfully stocked out ${successCount} item(s) from box ${selectedBox.box_code}`);
        } else if (successCount > 0) {
          safeToast.error(`Partially completed: ${successCount} succeeded, ${errorCount} failed`);
        } else {
          safeToast.error('Failed to stock out items');
          return;
        }
      } else {
        // Stock out single selected item
        if (!selectedItem) {
          safeToast.error('Please select an item');
          return;
        }
        
        if (!quantity || quantity <= 0) {
          safeToast.error('Please enter a valid quantity');
          return;
        }

        if (quantity > availableQuantity) {
          safeToast.error(`Insufficient stock. Available: ${availableQuantity}`);
          return;
        }

        await stockTransactionsService.create({
          transaction_type: 'stock_out',
          item_id: selectedItem.item_id,
          from_store_id: storeId,
          quantity: quantity,
          box_id: selectedBox.box_id,
          reference_number: selectedBox.box_code,
          reference_type: 'BOX',
          employee_name: 'Quick Stock Out',
          employee_id: 'QUICK',
          department: 'Warehouse',
          notes: `Stock out from box ${selectedBox.box_code}`,
        });

        safeToast.success('Stock out transaction created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to create stock out transaction';
      safeToast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Out</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select a checked-in box to stock out items
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
            {/* Store Selection - First Step */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Store <span className="text-red-500">*</span>
              </label>
              <select
                value={storeId || 0}
                onChange={(e) => handleStoreChange(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value={0}>Select Store</option>
                {stores.map((store) => (
                  <option key={store.store_id} value={store.store_id}>
                    {store.store_name}
                  </option>
                ))}
              </select>
              {storeId && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Select a box from this store to stock out items
                </p>
              )}
            </div>

            {/* Box Selection - Only show after store is selected */}
            {storeId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Box (Checked In) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search boxes..."
                    value={boxSearch}
                    onChange={(e) => setBoxSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                {loading ? (
                  <div className="mt-2 text-sm text-gray-500">Loading boxes...</div>
                ) : filteredBoxes.length === 0 ? (
                  <div className="mt-2 text-sm text-gray-500">No boxes available for stock out in this store</div>
                ) : (
                  <select
                    value={selectedBox?.box_id || 0}
                    onChange={(e) => handleBoxSelect(parseInt(e.target.value))}
                    className="w-full mt-2 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value={0}>Select Box</option>
                    {filteredBoxes.map((box) => (
                      <option key={box.box_id} value={box.box_id}>
                        {box.box_code} {box.supplier && `- ${box.supplier}`} {box.po_number && `(PO: ${box.po_number})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Stock Out Mode Selection */}
            {selectedBox && boxItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Out Mode
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStockOutAllItems(true)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                      stockOutAllItems
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Stock Out All Items ({boxItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockOutAllItems(false)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                      !stockOutAllItems
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Select Single Item
                  </button>
                </div>
              </div>
            )}

            {/* Item Selection - Only show if not stocking out all items */}
            {selectedBox && boxItems.length > 0 && !stockOutAllItems && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Item <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedItem?.inventory_id || 0}
                  onChange={(e) => handleItemSelect(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value={0}>Select Item</option>
                  {boxItems.map((inv) => (
                    <option key={inv.inventory_id} value={inv.inventory_id}>
                      {inv.item_name} ({inv.item_code}) - Qty: {inv.quantity}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Available Quantity - Only show if not stocking out all items */}
            {selectedItem && !stockOutAllItems && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Available Quantity:</span>{' '}
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{availableQuantity}</span>
                </div>
              </div>
            )}

            {/* Quantity - Only show if not stocking out all items */}
            {selectedItem && !stockOutAllItems && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableQuantity}
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(availableQuantity)}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Set to max ({availableQuantity})
                </button>
              </div>
            )}

            {/* Box Items Summary - Show when stocking out all items */}
            {selectedBox && stockOutAllItems && boxItems.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Items to be stocked out:
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {boxItems.map((inv, index) => {
                    const qty = inv.available_quantity ?? inv.quantity ?? 0;
                    return (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {inv.item_name} ({inv.item_code})
                        </span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          Qty: {qty}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons - Sticky for mobile */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 -mx-6 px-6 mt-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting || 
                    !selectedBox || 
                    !storeId || 
                    (stockOutAllItems ? boxItems.length === 0 : (!selectedItem || !quantity || quantity > availableQuantity))
                  }
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting 
                    ? 'Processing...' 
                    : stockOutAllItems 
                      ? `Stock Out All Items (${boxItems.length})` 
                      : 'Stock Out'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

