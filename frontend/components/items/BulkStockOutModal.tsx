'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowTrendingDownIcon, BuildingStorefrontIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Inventory } from '@/lib/api/items';
import { storesService, Store } from '@/lib/api/stores';
import { stockTransactionsService } from '@/lib/api/items';
import { safeToast } from '@/lib/utils/safeToast';

interface BulkStockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedInventories: Inventory[];
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
} as const;

export default function BulkStockOutModal({
  isOpen,
  onClose,
  onSuccess,
  selectedInventories,
}: BulkStockOutModalProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [stockOutQuantities, setStockOutQuantities] = useState<Record<number, number>>({});
  const [formData, setFormData] = useState({
    reason: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Group inventories by store_id - only include items with quantity > 0
  // Also deduplicate by item_id + store_id to avoid duplicates after transfer
  const inventoriesByStore = useMemo(() => {
    // First, filter and deduplicate: keep only one record per (item_id, store_id) combination
    // Prefer the one with highest quantity (in case of duplicates)
    const deduplicated = selectedInventories
      .filter(inv => (inv.quantity || 0) > 0) // Only items with available stock
      .reduce((acc, inv) => {
        const key = `${inv.item_id}_${inv.store_id}`;
        const existing = acc.get(key);
        if (!existing || (inv.quantity || 0) > (existing.quantity || 0)) {
          acc.set(key, inv);
        }
        return acc;
      }, new Map<string, Inventory>());
    
    // Then group by store_id
    return Array.from(deduplicated.values()).reduce((acc, inv) => {
      const storeId = inv.store_id;
      if (!acc[storeId]) {
        acc[storeId] = [];
      }
      acc[storeId].push(inv);
      return acc;
    }, {} as Record<number, Inventory[]>);
  }, [selectedInventories]);

  const storeIds = useMemo(() => Object.keys(inventoriesByStore).map(Number), [inventoriesByStore]);
  const hasMultipleStores = storeIds.length > 1;

  // Get current inventories for selected store (before conditional logic)
  const currentInventories = useMemo(() => {
    return storeId ? inventoriesByStore[storeId] || [] : [];
  }, [storeId, inventoriesByStore]);

  // Auto-detect unique box references from selected items (must be before conditional returns)
  const uniqueBoxReferences = useMemo(() => {
    const boxRefs = new Set<string>();
    currentInventories.forEach(inv => {
      if (inv.box_reference) {
        boxRefs.add(inv.box_reference);
      }
    });
    return Array.from(boxRefs);
  }, [currentInventories]);
  
  const boxCount = uniqueBoxReferences.length; // Auto-detect number of boxes

  // Calculate total quantity with box count multiplier if applicable (must be before conditional return)
  const baseTotalQuantity = useMemo(() => {
    return currentInventories.reduce((sum, inv) => {
      return sum + (stockOutQuantities[inv.inventory_id] || 0);
    }, 0);
  }, [currentInventories, stockOutQuantities]);
  
  const totalQuantity = useMemo(() => {
    return boxCount > 0 ? baseTotalQuantity * boxCount : baseTotalQuantity;
  }, [baseTotalQuantity, boxCount]);

  const selectedStore = stores.find(s => s.store_id === storeId);
  const totalItems = currentInventories.length;

  useEffect(() => {
    if (isOpen) {
      fetchStores();
      
      // Auto-detect store if all selected items are from same store
      if (storeIds.length === 1) {
        setStoreId(storeIds[0]);
        // Initialize quantities with available quantity (default to max)
        const quantities: Record<number, number> = {};
        inventoriesByStore[storeIds[0]].forEach(inv => {
          quantities[inv.inventory_id] = inv.available_quantity || inv.quantity || 0;
        });
        setStockOutQuantities(quantities);
      } else {
        // Multiple stores - user needs to select
        setStoreId(null);
        setStockOutQuantities({});
      }
      
      // Reset form
      setFormData({
        reason: '',
        notes: '',
      });
    }
  }, [isOpen, selectedInventories, storeIds, inventoriesByStore]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const data = await storesService.list({ status: 'active' });
      setStores(data || []);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load stores';
      safeToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (inventoryId: number, quantity: number) => {
    setStockOutQuantities(prev => ({
      ...prev,
      [inventoryId]: Math.max(0, quantity),
    }));
  };

  const handleSetMax = (inventoryId: number, maxQuantity: number) => {
    setStockOutQuantities(prev => ({
      ...prev,
      [inventoryId]: maxQuantity,
    }));
  };

  const handleSetMaxAll = () => {
    if (!storeId) return;
    
    const quantities: Record<number, number> = {};
    inventoriesByStore[storeId].forEach(inv => {
      const available = inv.available_quantity || inv.quantity || 0;
      quantities[inv.inventory_id] = available;
    });
    setStockOutQuantities(quantities);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeId) {
      safeToast.error('Please select a store');
      return;
    }

    // Get inventories for selected store
    const inventoriesToStockOut = inventoriesByStore[storeId] || [];
    
    if (inventoriesToStockOut.length === 0) {
      safeToast.error('No items selected for stock out');
      return;
    }

    // Validate quantities
    const stockOuts = inventoriesToStockOut
      .map(inv => ({
        inventory: inv,
        quantity: stockOutQuantities[inv.inventory_id] || 0,
      }))
      .filter(t => t.quantity > 0);

    if (stockOuts.length === 0) {
      safeToast.error('Please specify quantities to stock out');
      return;
    }

    // Validate quantities don't exceed available stock
    for (const stockOut of stockOuts) {
      const available = stockOut.inventory.available_quantity || stockOut.inventory.quantity || 0;
      if (stockOut.quantity > available) {
        safeToast.error(`${stockOut.inventory.item_name}${stockOut.inventory.size ? ` - ${stockOut.inventory.size}` : ''}: Quantity exceeds available stock (${available})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Execute all stock out transactions
      // Apply box count multiplier (auto-detected from unique box references)
      const stockOutPromises = stockOuts.map(stockOut => {
        // Multiply quantity by number of unique boxes
        const finalQuantity = boxCount > 0 ? stockOut.quantity * boxCount : stockOut.quantity;
        
        return stockTransactionsService.create({
          transaction_type: 'stock_out',
          item_id: stockOut.inventory.item_id,
          from_store_id: storeId,
          quantity: finalQuantity,
          employee_name: 'Quick Stock Out', // Default untuk quick operation
          employee_id: 'QUICK',
          department: 'Warehouse',
          reason: formData.reason || undefined,
          notes: formData.notes || undefined,
          reference_number: stockOut.inventory.box_reference || undefined,
          reference_type: stockOut.inventory.box_reference ? 'BOX' : undefined,
        });
      });

      await Promise.all(stockOutPromises);
      
      safeToast.success(`Successfully stocked out ${stockOuts.length} item(s)`);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to stock out items';
      safeToast.error(errorMsg);
    } finally {
      setSubmitting(false);
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            style={{
              paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
              paddingTop: 'calc(1rem + env(safe-area-inset-top))',
            }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                    <ArrowTrendingDownIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Bulk Stock Out
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Stock out {selectedInventories.length} selected item(s)
                      {boxCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                          📦 {boxCount} box{boxCount !== 1 ? 'es' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={submitting}
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Store Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Store <span className="text-red-500">*</span>
                    </label>
                    {hasMultipleStores ? (
                      <select
                        value={storeId || ''}
                        onChange={(e) => {
                          const newStoreId = Number(e.target.value);
                          setStoreId(newStoreId);
                          // Initialize quantities for selected store
                          const quantities: Record<number, number> = {};
                          inventoriesByStore[newStoreId].forEach(inv => {
                            quantities[inv.inventory_id] = inv.available_quantity || inv.quantity || 0;
                          });
                          setStockOutQuantities(quantities);
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-400"
                        required
                        disabled={submitting || loading}
                      >
                        <option value="">Select store...</option>
                        {storeIds.map(sId => {
                          const store = stores.find(s => s.store_id === sId);
                          const count = inventoriesByStore[sId]?.length || 0;
                          return (
                            <option key={sId} value={sId}>
                              {store?.store_name || `Store ${sId}`} ({count} item{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
                        <span>{selectedStore?.store_name || 'Unknown Store'}</span>
                      </div>
                    )}
                  </div>

                  {/* Box Information (Auto-detected) */}
                  {boxCount > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📦</span>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          {boxCount} Box{boxCount !== 1 ? 'es' : ''} Detected
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {uniqueBoxReferences.map((boxRef, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 rounded text-xs font-mono border border-blue-300 dark:border-blue-700"
                          >
                            {boxRef}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reason and Notes (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason <span className="text-gray-500 text-xs">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.reason}
                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Reason for stock out (optional)"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes <span className="text-gray-500 text-xs">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Additional notes (optional)"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  {storeId && currentInventories.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Items to Stock Out ({totalItems} items, Total: {totalQuantity} unit{totalQuantity !== 1 ? 's' : ''})
                        </label>
                        <button
                          type="button"
                          onClick={handleSetMaxAll}
                          disabled={submitting || currentInventories.length === 0}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Max All
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {currentInventories.map((inv) => {
                          const availableQty = inv.available_quantity || inv.quantity || 0;
                          const stockOutQty = stockOutQuantities[inv.inventory_id] || 0;
                          const isMax = stockOutQty === availableQty;
                          
                          return (
                            <div
                              key={inv.inventory_id}
                              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                    {inv.item_name}
                                    {inv.size && <span className="text-gray-600 dark:text-gray-400"> - {inv.size}</span>}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {inv.item_code || 'N/A'}
                                  </p>
                                  {inv.box_reference && (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      📦 {inv.box_reference}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Available: <span className="font-semibold">{availableQty}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={availableQty}
                                    value={stockOutQty}
                                    onChange={(e) => handleQuantityChange(inv.inventory_id, Number(e.target.value))}
                                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    disabled={submitting}
                                  />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">/ {availableQty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSetMax(inv.inventory_id, availableQty)}
                                    disabled={submitting || isMax || availableQty === 0}
                                    className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    title="Set to maximum available quantity"
                                  >
                                    {isMax ? 'Max' : 'Max'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Info Message */}
                  {hasMultipleStores && !storeId && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Selected items are from multiple stores. Please select the source store to continue.
                      </p>
                    </div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={submitting || !storeId || currentInventories.length === 0 || totalQuantity === 0}
                  className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Stocking Out...</span>
                    </>
                  ) : (
                    <>
                      <ArrowTrendingDownIcon className="w-5 h-5" />
                      <span>Stock Out Items ({totalQuantity} unit{totalQuantity !== 1 ? 's' : ''})</span>
                    </>
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

