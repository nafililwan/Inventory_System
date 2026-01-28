'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CalendarIcon, UserIcon, BuildingStorefrontIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Inventory, StockTransaction, stockTransactionsService } from '@/lib/api/items';
import { storesService, Store } from '@/lib/api/stores';
import { boxesService } from '@/lib/api/boxes';
import { safeToast } from '@/lib/utils/safeToast';
import ConfirmModal from '@/components/common/ConfirmModal';

interface StockOutDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Inventory | null;
  onDelete?: (inventoryId: number, force?: boolean) => Promise<void>;
  onRevive?: () => void;
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

export default function StockOutDetailsModal({ isOpen, onClose, inventory, onDelete, onRevive }: StockOutDetailsModalProps) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviving, setReviving] = useState(false);
  const [showReviveConfirm, setShowReviveConfirm] = useState(false);
  const [pendingReviveData, setPendingReviveData] = useState<{ latestStockOut: StockTransaction } | null>(null);

  useEffect(() => {
    if (isOpen && inventory) {
      loadData();
    } else {
      setTransactions([]);
      setStores([]);
    }
  }, [isOpen, inventory]);

  const loadData = async () => {
    if (!inventory) return;

    setLoading(true);
    try {
      // Load all stores for reference
      const allStores = await storesService.list({ status: 'active' });
      setStores(allStores);

      // Load ALL transactions for this item (not just stock_out) to show full history
      // This includes transfers, stock_in, stock_out, etc. to show "dari mana ke mana"
      const allTransactions = await stockTransactionsService.list({
        item_id: inventory.item_id,
        limit: 100,
      });

      // Filter to show stock_out and transfer_out transactions (items leaving stores)
      const relevantTransactions = allTransactions.filter(t => 
        t.transaction_type === 'stock_out' || 
        (t.transaction_type === 'transfer_out' && t.from_store_id === inventory.store_id)
      );

      // Sort by created_at desc (newest first)
      relevantTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(relevantTransactions);
    } catch (error: unknown) {
      console.error('Error loading stock out details:', error);
      let errorMsg = 'Failed to load stock out details';
      try {
        if (error instanceof Error) {
          errorMsg = error.message || errorMsg;
        }
      } catch {
        // Use default message
      }
      safeToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleReviveClick = () => {
    if (!inventory) return;

    // Find latest stock_out transaction
    const stockOutTransactions = transactions.filter(t => t.transaction_type === 'stock_out');
    
    if (stockOutTransactions.length === 0) {
      safeToast.error('No stock out transaction found to revive');
      return;
    }

    const latestStockOut = stockOutTransactions[0]; // Already sorted by date desc

    if (!latestStockOut.box_id) {
      safeToast.error('Cannot revive: No box associated with this stock out');
      return;
    }

    // Store data and show confirmation modal
    setPendingReviveData({ latestStockOut });
    setShowReviveConfirm(true);
  };

  const handleReviveConfirm = async () => {
    if (!inventory || !pendingReviveData) return;

    setReviving(true);
    setShowReviveConfirm(false);

    try {
      const { latestStockOut } = pendingReviveData;

      // Create stock_in transaction to restore quantity
      // Note: We don't check box status - stock_in transaction will restore quantity regardless
      // Box status update can be handled separately if needed
      await stockTransactionsService.create({
        transaction_type: 'stock_in',
        item_id: inventory.item_id,
        to_store_id: inventory.store_id,
        quantity: latestStockOut.quantity,
        box_id: latestStockOut.box_id,
        reference_number: inventory.box_reference || `BOX-${latestStockOut.box_id}`,
        reference_type: 'REVIVE',
        notes: `Revived from stock out transaction ${latestStockOut.transaction_id}`,
      });

      safeToast.success('Stock out revived successfully!');
      
      // Call onRevive callback to refresh parent component
      if (onRevive) {
        onRevive();
      }
      
      // Reload transactions
      await loadData();
      
      // Reset state
      setPendingReviveData(null);
    } catch (error: any) {
      console.error('Error reviving stock out:', error);
      safeToast.error(error?.message || 'Failed to revive stock out');
    } finally {
      setReviving(false);
    }
  };

  if (!isOpen || !inventory) return null;

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
              className="bg-white dark:bg-dark-bg-light rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Stock Out Details</h2>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                    {inventory.item_name || 'Unknown Item'} ({inventory.item_code || 'N/A'})
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
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No stock out transactions found for this item.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Item Summary */}
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Store</p>
                          <p className="font-semibold text-gray-900 dark:text-dark-text">
                            {stores.find(s => s.store_id === inventory.store_id)?.store_name || 'Unknown Store'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Quantity</p>
                          <p className="font-semibold text-red-600 dark:text-red-400">0 (Stock Out)</p>
                        </div>
                      </div>
                    </div>

                    {/* Transactions List */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">
                        Transaction History ({transactions.length})
                      </h3>
                      <div className="space-y-3">
                        {transactions.map((transaction) => {
                          const isTransfer = transaction.transaction_type === 'transfer_out';
                          const fromStoreName = transaction.from_store_name || 
                            stores.find(s => s.store_id === transaction.from_store_id)?.store_name || 
                            'Unknown Store';
                          const toStoreName = transaction.to_store_name || 
                            stores.find(s => s.store_id === transaction.to_store_id)?.store_name || 
                            'Unknown Store';
                          
                          return (
                          <div
                            key={transaction.transaction_id}
                            className="bg-white dark:bg-dark-bg-light border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    isTransfer 
                                      ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                  }`}>
                                    {isTransfer ? 'Transfer Out' : 'Stock Out'}
                                  </span>
                                  <span className="text-sm font-bold text-gray-900 dark:text-dark-text">
                                    Quantity: {transaction.quantity}
                                  </span>
                                </div>
                                
                                {/* From/To Store Info */}
                                <div className="space-y-1 mb-2">
                                  {isTransfer ? (
                                    <>
                                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <BuildingStorefrontIcon className="w-4 h-4" />
                                        <span><strong>From:</strong> {fromStoreName}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <BuildingStorefrontIcon className="w-4 h-4" />
                                        <span><strong>To:</strong> {toStoreName}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                      <BuildingStorefrontIcon className="w-4 h-4" />
                                      <span><strong>From Store:</strong> {fromStoreName}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {transaction.reference_number && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    <DocumentTextIcon className="w-4 h-4" />
                                    <span>Reference: {transaction.reference_number}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>{formatDate(transaction.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Employee Details */}
                            {(transaction.employee_name || transaction.employee_id || transaction.department) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                                {transaction.employee_name && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Employee Name</p>
                                    <div className="flex items-center gap-1">
                                      <UserIcon className="w-4 h-4 text-gray-400" />
                                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                        {transaction.employee_name}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {transaction.employee_id && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Employee ID</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                      {transaction.employee_id}
                                    </p>
                                  </div>
                                )}
                                {transaction.department && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Department</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                      {transaction.department}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Reason */}
                            {transaction.reason && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                                <p className="text-sm text-gray-900 dark:text-dark-text">{transaction.reason}</p>
                              </div>
                            )}

                            {/* Notes */}
                            {transaction.notes && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{transaction.notes}</p>
                              </div>
                            )}

                            {/* Created By */}
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Created by: <span className="font-medium">{transaction.created_by}</span>
                              </p>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0 flex gap-3">
                {/* Revive Button - Show for stock out items */}
                {inventory && (inventory.quantity || 0) === 0 && transactions.some(t => t.transaction_type === 'stock_out' && t.box_id) && (
                  <button
                    onClick={handleReviveClick}
                    disabled={reviving}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {reviving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Reviving...</span>
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4" />
                        <span>Revive</span>
                      </>
                    )}
                  </button>
                )}
                {onDelete && inventory && (
                  <button
                    onClick={async () => {
                      if (!inventory || !onDelete) return;
                      if (window.confirm(`Are you sure you want to delete this inventory record?\n\nItem: ${inventory.item_name || inventory.item_code}\nStore: ${stores.find(s => s.store_id === inventory.store_id)?.store_name || 'Unknown'}\n\nThis action cannot be undone.`)) {
                        setDeleting(true);
                        try {
                          await onDelete(inventory.inventory_id);
                          safeToast.success('Inventory record deleted successfully');
                          onClose();
                        } catch (error: unknown) {
                          const errorMsg = error instanceof Error ? error.message : 'Failed to delete inventory record';
                          safeToast.error(errorMsg);
                        } finally {
                          setDeleting(false);
                        }
                      }
                    }}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`px-4 py-2 bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-dark-bg-lighter text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors ${(onDelete || (inventory && (inventory.quantity || 0) === 0)) ? 'flex-1' : 'w-full'}`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Revive Confirmation Modal */}
      <ConfirmModal
        isOpen={showReviveConfirm}
        onClose={() => {
          setShowReviveConfirm(false);
          setPendingReviveData(null);
        }}
        onConfirm={handleReviveConfirm}
        title="Revive Stock Out"
        message={
          pendingReviveData && inventory
            ? `Are you sure you want to revive stock out for ${inventory.item_name}?\n\n` +
              `Quantity: ${pendingReviveData.latestStockOut.quantity}\n` +
              `Box: ${inventory.box_reference || `BOX-${pendingReviveData.latestStockOut.box_id}`}\n\n` +
              `This will restore the item back to inventory.`
            : ''
        }
        confirmText="Revive"
        cancelText="Cancel"
        type="info"
        isLoading={reviving}
      />
    </AnimatePresence>
  );
}

