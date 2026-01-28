'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  BuildingStorefrontIcon, 
  CubeIcon,
  CalendarIcon,
  TagIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Inventory, stockTransactionsService } from '@/lib/api/items';
import { safeToast } from '@/lib/utils/safeToast';

interface InventoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Inventory | null;
  allInventory?: Inventory[]; // For calculating total quantity across boxes
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

export default function InventoryDetailsModal({ 
  isOpen, 
  onClose, 
  inventory,
  allInventory = []
}: InventoryDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && inventory) {
      loadTransactions();
    } else {
      setTransactions([]);
    }
  }, [isOpen, inventory]);

  const loadTransactions = async () => {
    if (!inventory) return;

    try {
      setLoading(true);
      const transactions = await stockTransactionsService.list({
        item_id: inventory.item_id,
        store_id: inventory.store_id,
        limit: 50
      });
      setTransactions(transactions || []);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      safeToast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total quantity across all boxes for this item (same store only)
  // If stock out or transfer happens, total will decrease accordingly
  const sameStoreItems = allInventory.filter(
    inv => inv.item_id === inventory?.item_id && inv.store_id === inventory?.store_id
  );
  
  const totalQuantity = sameStoreItems.reduce((sum, inv) => sum + (inv.quantity || 0), 0);

  // Get all box references for this item across ALL stores (not just same store)
  const allStoreItems = allInventory.filter(
    inv => inv.item_id === inventory?.item_id
  );

  // Get box references with store information
  const boxReferencesWithStore = Array.from(
    new Map(
      allStoreItems
        .filter(inv => inv.box_reference)
        .map(inv => [
          `${inv.box_reference}_${inv.store_id}`, // Unique key: box_reference + store_id
          {
            boxReference: inv.box_reference,
            storeName: inv.store_name,
            storeId: inv.store_id,
            quantity: inv.quantity || 0,
          }
        ])
    ).values()
  );

  // Simple box references list (for backward compatibility)
  const boxReferences = Array.from(
    new Set(
      allStoreItems
        .map(inv => inv.box_reference)
        .filter(Boolean)
    )
  );

  // Count boxes for this item (across all stores)
  const boxCount = boxReferences.length;

  if (!isOpen || !inventory) return null;

  const minLevel = inventory.min_level || 10;
  const stockStatus = 
    (inventory.quantity || 0) === 0 ? 'Stock Out' :
    (inventory.quantity || 0) < minLevel ? 'Low Stock' :
    'In Stock';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-dark-bg-light rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border w-full max-w-3xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Item Details</h2>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                    {inventory.item_name || 'Unknown Item'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg-lighter transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Status Card */}
                <div className={`mb-6 rounded-xl p-4 border-2 ${
                  stockStatus === 'Stock Out' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                  stockStatus === 'Low Stock' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Current Status</p>
                      <p className={`text-2xl font-bold ${
                        stockStatus === 'Stock Out' ? 'text-red-600 dark:text-red-400' :
                        stockStatus === 'Low Stock' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {stockStatus}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                        {inventory.quantity || 0}
                      </p>
                      {boxCount > 1 && totalQuantity > (inventory.quantity || 0) && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Total: {totalQuantity} ({boxCount} boxes)
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {boxReferences.slice(0, 2).join(', ')}
                            {boxReferences.length > 2 && ` +${boxReferences.length - 2} more`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Item Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TagIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-dark-text">Item Information</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Item Code</p>
                        <p className="font-mono font-medium text-gray-900 dark:text-dark-text">{inventory.item_code || 'N/A'}</p>
                      </div>
                      {inventory.size && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Size</p>
                          <p className="font-medium text-gray-900 dark:text-dark-text">{inventory.size}</p>
                        </div>
                      )}
                      {inventory.year_code && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Year</p>
                          <p className="font-medium text-gray-900 dark:text-dark-text">{inventory.year_code}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Min Level</p>
                        <p className="font-medium text-gray-900 dark:text-dark-text">{minLevel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BuildingStorefrontIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-dark-text">Location</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Store</p>
                        <p className="font-medium text-gray-900 dark:text-dark-text">{inventory.store_name || 'N/A'}</p>
                      </div>
                      {boxReferencesWithStore.length > 0 ? (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-2">
                            {boxCount > 1 ? 'Box References (All Stores)' : 'Box Reference'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {boxReferencesWithStore.map((boxInfo, idx) => (
                              <div
                                key={idx}
                                className="inline-flex flex-col gap-0.5"
                              >
                                <span className="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded font-mono text-xs font-medium">
                                  📦 {boxInfo.boxReference}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                  {boxInfo.storeName} ({boxInfo.quantity})
                                </span>
                              </div>
                            ))}
                          </div>
                          {boxCount > 1 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Total: {boxCount} boxes across {new Set(boxReferencesWithStore.map(b => b.storeId)).size} store(s)
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Box Reference</p>
                          <p className="font-medium text-gray-900 dark:text-dark-text">N/A</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ChartBarIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-dark-text">Transaction History</h3>
                  </div>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading transactions...</p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No transaction history found</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {transactions.slice(0, 10).map((txn, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-dark-bg-light rounded-lg p-3 border border-gray-200 dark:border-dark-border"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              txn.transaction_type === 'stock_in' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              txn.transaction_type === 'stock_out' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              txn.transaction_type === 'transfer_in' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }`}>
                              {txn.transaction_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {txn.created_at ? new Date(txn.created_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            <p>Quantity: <span className="font-semibold">{txn.quantity || 0}</span></p>
                            {txn.from_store_name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                From: {txn.from_store_name}
                              </p>
                            )}
                            {txn.to_store_name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                To: {txn.to_store_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {transactions.length > 10 && (
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
                          Showing 10 of {transactions.length} transactions
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-dark-bg-lighter text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

