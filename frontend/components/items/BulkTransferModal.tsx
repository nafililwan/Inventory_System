'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowPathIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { Inventory } from '@/lib/api/items';
import { storesService, Store } from '@/lib/api/stores';
import { stockTransactionsService } from '@/lib/api/items';
import toast from 'react-hot-toast';

interface BulkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (toStoreId?: number) => void;
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

export default function BulkTransferModal({
  isOpen,
  onClose,
  onSuccess,
  selectedInventories,
}: BulkTransferModalProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [fromStoreId, setFromStoreId] = useState<number | null>(null);
  const [toStoreId, setToStoreId] = useState<number | null>(null);
  const [transferQuantities, setTransferQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Group inventories by from_store_id - use useMemo to recalculate when selectedInventories changes
  // Only include items with quantity > 0 (available stock)
  const inventoriesByStore = useMemo(() => {
    return selectedInventories
      .filter(inv => (inv.quantity || 0) > 0) // Only items with available stock
      .reduce((acc, inv) => {
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

  useEffect(() => {
    if (isOpen) {
      fetchStores();
      
      // Auto-detect from store if all selected items are from same store
      if (storeIds.length === 1) {
        setFromStoreId(storeIds[0]);
        // Auto-max: Initialize quantities with maximum available quantity
        const quantities: Record<number, number> = {};
        inventoriesByStore[storeIds[0]].forEach(inv => {
          quantities[inv.inventory_id] = inv.available_quantity || inv.quantity || 0;
        });
        setTransferQuantities(quantities);
      } else {
        // Multiple stores - user needs to select
        setFromStoreId(null);
        setTransferQuantities({});
      }
      setToStoreId(null);
    }
  }, [isOpen, selectedInventories, storeIds, inventoriesByStore]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const data = await storesService.list({ status: 'active' });
      setStores(data || []);
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load stores';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (inventoryId: number, quantity: number) => {
    setTransferQuantities(prev => ({
      ...prev,
      [inventoryId]: Math.max(0, quantity),
    }));
  };

  const handleSetMax = (inventoryId: number, maxQuantity: number) => {
    setTransferQuantities(prev => ({
      ...prev,
      [inventoryId]: maxQuantity,
    }));
  };

  const handleSetMaxAll = () => {
    if (!fromStoreId) return;
    
    const quantities: Record<number, number> = {};
    inventoriesByStore[fromStoreId].forEach(inv => {
      const available = inv.available_quantity || inv.quantity || 0;
      quantities[inv.inventory_id] = available;
    });
    setTransferQuantities(quantities);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromStoreId || !toStoreId) {
      toast.error('Please select both From Store and To Store');
      return;
    }

    if (fromStoreId === toStoreId) {
      toast.error('From Store and To Store must be different');
      return;
    }

    // Get inventories for selected from store
    const inventoriesToTransfer = inventoriesByStore[fromStoreId] || [];
    
    if (inventoriesToTransfer.length === 0) {
      toast.error('No items selected for transfer');
      return;
    }

    // Validate quantities
    const transfers = inventoriesToTransfer
      .map(inv => ({
        inventory: inv,
        quantity: transferQuantities[inv.inventory_id] || 0,
      }))
      .filter(t => t.quantity > 0);

    if (transfers.length === 0) {
      toast.error('Please specify quantities to transfer');
      return;
    }

    // Validate quantities don't exceed available stock
    for (const transfer of transfers) {
      const available = transfer.inventory.available_quantity || transfer.inventory.quantity || 0;
      if (transfer.quantity > available) {
        toast.error(`${transfer.inventory.item_name}${transfer.inventory.size ? ` - ${transfer.inventory.size}` : ''}: Quantity exceeds available stock (${available})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Execute all transfers
      const transferPromises = transfers.map(transfer => {
        const transferData: any = {
          transaction_type: 'transfer_out',
          item_id: transfer.inventory.item_id,
          from_store_id: fromStoreId,
          to_store_id: toStoreId,
          quantity: transfer.quantity,
        };
        
        // Include box_id if available from inventory
        if (transfer.inventory.box_id) {
          transferData.box_id = transfer.inventory.box_id;
        }
        
        return stockTransactionsService.create(transferData);
      });

      await Promise.all(transferPromises);
      
      toast.success(`Successfully transferred ${transfers.length} item(s)`);
      onSuccess(toStoreId); // Pass destination store ID
      onClose();
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to transfer items';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentInventories = fromStoreId ? inventoriesByStore[fromStoreId] || [] : [];
  const fromStore = stores.find(s => s.store_id === fromStoreId);
  const toStore = stores.find(s => s.store_id === toStoreId);

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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                    <ArrowPathIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Bulk Transfer
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Transfer {selectedInventories.length} selected item(s)
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* From Store */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        From Store <span className="text-red-500">*</span>
                      </label>
                      {hasMultipleStores ? (
                        <select
                          value={fromStoreId || ''}
                          onChange={(e) => {
                            const storeId = Number(e.target.value);
                            setFromStoreId(storeId);
                            // Auto-max: Initialize quantities with maximum available quantity
                            const quantities: Record<number, number> = {};
                            inventoriesByStore[storeId].forEach(inv => {
                              quantities[inv.inventory_id] = inv.available_quantity || inv.quantity || 0;
                            });
                            setTransferQuantities(quantities);
                            setToStoreId(null); // Reset to store when from store changes
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:focus:ring-orange-400"
                          required
                          disabled={submitting || loading}
                        >
                          <option value="">Select store...</option>
                          {storeIds.map(storeId => {
                            const store = stores.find(s => s.store_id === storeId);
                            const count = inventoriesByStore[storeId]?.length || 0;
                            return (
                              <option key={storeId} value={storeId}>
                                {store?.store_name || `Store ${storeId}`} ({count} item{count !== 1 ? 's' : ''})
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
                          <span>{fromStore?.store_name || 'Unknown Store'}</span>
                        </div>
                      )}
                    </div>

                    {/* To Store */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        To Store <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={toStoreId || ''}
                        onChange={(e) => setToStoreId(Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:focus:ring-orange-400"
                        required
                        disabled={submitting || loading || !fromStoreId}
                      >
                        <option value="">Select destination store...</option>
                        {stores
                          .filter(store => store.store_id !== fromStoreId)
                          .map(store => (
                            <option key={store.store_id} value={store.store_id}>
                              {store.store_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Items List */}
                  {fromStoreId && currentInventories.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Items to Transfer ({currentInventories.length})
                        </label>
                        <button
                          type="button"
                          onClick={handleSetMaxAll}
                          disabled={submitting || currentInventories.length === 0}
                          className="px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Max All
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {currentInventories.map((inv) => {
                          const availableQty = inv.available_quantity || inv.quantity || 0;
                          const transferQty = transferQuantities[inv.inventory_id] || 0;
                          const isMax = transferQty === availableQty;
                          
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
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Available: <span className="font-semibold">{availableQty}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={availableQty}
                                    value={transferQty}
                                    onChange={(e) => handleQuantityChange(inv.inventory_id, Number(e.target.value))}
                                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    disabled={submitting}
                                  />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">/ {availableQty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSetMax(inv.inventory_id, availableQty)}
                                    disabled={submitting || isMax || availableQty === 0}
                                    className="px-2.5 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
                  {hasMultipleStores && !fromStoreId && (
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
                  disabled={submitting || !fromStoreId || !toStoreId || currentInventories.length === 0}
                  className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transferring...</span>
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-5 h-5" />
                      <span>Transfer Items</span>
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

