'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArchiveBoxIcon, BuildingStorefrontIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { boxesService, Box } from '@/lib/api/boxes';
import { storesService, Store } from '@/lib/api/stores';
import { itemsService, Item } from '@/lib/api/items';
import { stockTransactionsService } from '@/lib/api/items';
import { safeToast } from '@/lib/utils/safeToast';

interface StockInModalProps {
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

export default function StockInModal({
  isOpen,
  onClose,
  onSuccess,
}: StockInModalProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [boxItems, setBoxItems] = useState<Item[]>([]);
  const [boxContents, setBoxContents] = useState<any[]>([]); // Store box contents with quantities
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [checkInAllItems, setCheckInAllItems] = useState<boolean>(true); // Default: check in all items
  const [boxSearch, setBoxSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      fetchBoxes();
      fetchStores();
      // Reset form
      setSelectedBox(null);
      setBoxItems([]);
      setBoxContents([]);
      setSelectedItem(null);
      setStoreId(null);
      setQuantity(0);
      setCheckInAllItems(true);
      setBoxSearch('');
    }
  }, [isOpen]);

  const fetchBoxes = async () => {
    setLoading(true);
    try {
      // Only fetch boxes with status 'pending_checkin' (from receiving)
      const response = await boxesService.list({ status: 'pending_checkin' });
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

  const fetchBoxItems = async (boxId: number) => {
    try {
      const boxData = await boxesService.get(boxId);
      if (boxData?.data?.contents) {
        // Store box contents with quantities
        setBoxContents(boxData.data.contents);
        
        // Extract unique item_ids from box contents
        const itemIds = [...new Set(boxData.data.contents.map((c: any) => c.item_id))];
        // Fetch items
        const itemsPromises = itemIds.map((id: number) => itemsService.get(id, true));
        const itemsData = await Promise.all(itemsPromises);
        setBoxItems(itemsData);
        
        // Auto-select item if only one item in box
        if (itemsData.length === 1) {
          setSelectedItem(itemsData[0]);
          // Auto-set quantity from box contents
          const content = boxData.data.contents.find((c: any) => c.item_id === itemsData[0].item_id);
          if (content) {
            setQuantity(content.quantity || 0);
          }
        } else {
          setSelectedItem(null);
          setQuantity(0);
        }
      }
    } catch (error) {
      console.error('Failed to load box items:', error);
      setBoxItems([]);
      setBoxContents([]);
    }
  };

  const handleBoxSelect = async (boxId: number) => {
    if (boxId > 0) {
      const box = boxes.find(b => b.box_id === boxId);
      setSelectedBox(box || null);
      if (box?.store_id) {
        setStoreId(box.store_id);
      }
      await fetchBoxItems(boxId);
    } else {
      setSelectedBox(null);
      setBoxItems([]);
      setBoxContents([]);
      setSelectedItem(null);
      setStoreId(null);
      setQuantity(0);
      setCheckInAllItems(true);
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
      if (checkInAllItems && boxContents.length > 0) {
        // Check in all items in the box
        const transactions = [];
        let successCount = 0;
        let errorCount = 0;

        for (const content of boxContents) {
          try {
            await stockTransactionsService.create({
              transaction_type: 'stock_in',
              item_id: content.item_id,
              to_store_id: storeId,
              quantity: content.quantity || 0,
              box_id: selectedBox.box_id,
              reference_number: selectedBox.box_code,
              reference_type: 'BOX',
              notes: `Stock in from box ${selectedBox.box_code} - All items`,
            });
            successCount++;
          } catch (error: any) {
            console.error(`Failed to create transaction for item ${content.item_id}:`, error);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          safeToast.success(`Successfully checked in ${successCount} item(s) from box ${selectedBox.box_code}`);
        } else if (successCount > 0) {
          safeToast.error(`Partially completed: ${successCount} succeeded, ${errorCount} failed`);
        } else {
          safeToast.error('Failed to check in items');
          return;
        }
      } else {
        // Check in single selected item
        if (!selectedItem) {
          safeToast.error('Please select an item');
          return;
        }
        
        if (!quantity || quantity <= 0) {
          safeToast.error('Please enter a valid quantity');
          return;
        }

        await stockTransactionsService.create({
          transaction_type: 'stock_in',
          item_id: selectedItem.item_id,
          to_store_id: storeId,
          quantity: quantity,
          box_id: selectedBox.box_id,
          reference_number: selectedBox.box_code,
          reference_type: 'BOX',
          notes: `Stock in from box ${selectedBox.box_code}`,
        });

        safeToast.success('Stock in transaction created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to create stock in transaction';
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
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Stock In</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select a box from receiving to stock in items
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
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Box Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Box (Pending Check-in) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search boxes..."
                  value={boxSearch}
                  onChange={(e) => setBoxSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {loading ? (
                <div className="mt-2 text-sm text-gray-500">Loading boxes...</div>
              ) : filteredBoxes.length === 0 ? (
                <div className="mt-2 text-sm text-gray-500">No boxes available for stock in</div>
              ) : (
                <select
                  value={selectedBox?.box_id || 0}
                  onChange={(e) => handleBoxSelect(parseInt(e.target.value))}
                  className="w-full mt-2 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

            {/* Store Selection */}
            {selectedBox && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Store <span className="text-red-500">*</span>
                </label>
                <select
                  value={storeId || 0}
                  onChange={(e) => setStoreId(parseInt(e.target.value) || null)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={0}>Select Store</option>
                  {stores.map((store) => (
                    <option key={store.store_id} value={store.store_id}>
                      {store.store_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Check-in Mode Selection */}
            {selectedBox && boxItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Check-in Mode
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckInAllItems(true)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                      checkInAllItems
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Check In All Items ({boxContents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckInAllItems(false)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                      !checkInAllItems
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Select Single Item
                  </button>
                </div>
              </div>
            )}

            {/* Item Selection - Only show if not checking in all items */}
            {selectedBox && boxItems.length > 0 && !checkInAllItems && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Item <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedItem?.item_id || 0}
                  onChange={(e) => {
                    const itemId = parseInt(e.target.value);
                    const item = boxItems.find(i => i.item_id === itemId);
                    setSelectedItem(item || null);
                    // Auto-set quantity from box contents
                    if (item) {
                      const content = boxContents.find((c: any) => c.item_id === item.item_id);
                      if (content) {
                        setQuantity(content.quantity || 0);
                      }
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={0}>Select Item</option>
                  {boxItems.map((item) => {
                    const content = boxContents.find((c: any) => c.item_id === item.item_id);
                    const qty = content?.quantity || 0;
                    return (
                      <option key={item.item_id} value={item.item_id}>
                        {item.item_name} ({item.item_code}) - Qty: {qty}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Quantity - Only show if not checking in all items */}
            {selectedItem && !checkInAllItems && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Box Contents Summary - Show when checking in all items */}
            {selectedBox && checkInAllItems && boxContents.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Items to be checked in:
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {boxContents.map((content, index) => {
                    const item = boxItems.find(i => i.item_id === content.item_id);
                    return (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item ? `${item.item_name} (${item.item_code})` : `Item ID: ${content.item_id}`}
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Qty: {content.quantity || 0}
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
                    (checkInAllItems ? boxContents.length === 0 : (!selectedItem || !quantity))
                  }
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : checkInAllItems ? `Check In All Items (${boxContents.length})` : 'Stock In'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

