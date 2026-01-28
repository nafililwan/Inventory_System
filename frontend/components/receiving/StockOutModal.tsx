'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { boxesService, BoxWithContents } from '@/lib/api/boxes';
import { inventoryService, Inventory } from '@/lib/api/items';
import { stockTransactionsService } from '@/lib/api/items';

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxId: number | null;
  onSuccess?: () => void;
  storeId?: number; // Pre-select store from scan page
}

interface SelectedItem {
  content_id: number;
  item_id: number;
  item_name: string;
  item_code: string;
  size?: string;
  available_quantity: number;
  selected: boolean;
  quantity: number;
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

export default function StockOutModal({ isOpen, onClose, boxId, onSuccess, storeId }: StockOutModalProps) {
  const [box, setBox] = useState<BoxWithContents | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_id: '',
    department: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && boxId) {
      loadData();
      setFormData({ employee_name: '', employee_id: '', department: '', reason: '' });
    }
  }, [isOpen, boxId]);

  const loadData = async () => {
    if (!boxId) return;

    try {
      setLoading(true);
      const boxResponse = await boxesService.get(boxId);
      const boxData = boxResponse.data;
      setBox(boxData);

      if (boxData && boxData.store_id) {
        // Load inventory for all items in this box
        const inventoryPromises = boxData.contents?.map((content) =>
          inventoryService.list({ item_id: content.item_id, store_id: boxData.store_id })
        ) || [];
        const inventoryResults = await Promise.all(inventoryPromises);
        const allInventory = inventoryResults.flat();
        setInventory(allInventory);

        // Initialize selected items
        const items: SelectedItem[] =
          boxData.contents?.map((content) => {
            const inv = allInventory.find((i) => i.item_id === content.item_id);
            return {
              content_id: content.content_id || 0,
              item_id: content.item_id,
              item_name: content.item_name || 'Unknown',
              item_code: content.item_code || 'N/A',
              size: content.size,
              available_quantity: inv?.available_quantity || inv?.quantity || 0,
              selected: false,
              quantity: 0,
            };
          }) || [];
        setSelectedItems(items);
      }
    } catch (error: any) {
      console.error('Error loading box data:', error);
      toast.error(error?.response?.data?.detail || 'Failed to load box details');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId
          ? { ...item, selected: !item.selected, quantity: !item.selected ? 1 : 0 }
          : item
      )
    );
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId
          ? {
              ...item,
              quantity: Math.max(0, Math.min(quantity, item.available_quantity)),
            }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    // Validation
    const selected = selectedItems.filter((item) => item.selected && item.quantity > 0);
    if (selected.length === 0) {
      toast.error('Please select at least one item with quantity');
      return;
    }

    if (!formData.employee_name.trim()) {
      toast.error('Please enter employee name');
      return;
    }

    if (!formData.employee_id.trim()) {
      toast.error('Please enter employee ID');
      return;
    }

    if (!formData.department.trim()) {
      toast.error('Please enter department');
      return;
    }

    // Validate quantities
    for (const item of selected) {
      if (item.quantity > item.available_quantity) {
        toast.error(`${item.item_name}: Quantity cannot exceed available stock (${item.available_quantity})`);
        return;
      }
    }

    try {
      setSubmitting(true);

      // Create stock out transactions for each selected item
      const transactionPromises = selected.map((item) =>
        stockTransactionsService.create({
          transaction_type: 'stock_out',
          item_id: item.item_id,
          from_store_id: box?.store_id || 0,
          quantity: item.quantity,
          employee_name: formData.employee_name,
          employee_id: formData.employee_id,
          department: formData.department,
          reason: formData.reason || undefined,
          reference_number: box?.box_code,
          reference_type: 'BOX',
        })
      );

      await Promise.all(transactionPromises);

      toast.success('Stock out completed successfully!');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Error processing stock out:', error);
      toast.error(error?.response?.data?.detail || 'Failed to process stock out');
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
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Stock Out from Box</h2>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                    {box?.box_code || 'Loading...'}
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
                    <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : box ? (
                  <div className="space-y-6">
                    {/* Box Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <BuildingStorefrontIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Store</p>
                          <p className="font-semibold text-gray-900 dark:text-dark-text">{box.store_name || 'N/A'}</p>
                        </div>
                        {box.location_in_store && (
                          <>
                            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
                            <div>
                              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Location</p>
                              <p className="font-semibold text-gray-900 dark:text-dark-text">
                                {box.location_in_store}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Items Selection */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">
                        Select Items to Issue
                      </h3>
                      <div className="space-y-3">
                        {selectedItems.map((item) => {
                          const inv = inventory.find((i) => i.item_id === item.item_id);
                          return (
                            <div
                              key={item.item_id}
                              className={`border-2 rounded-xl p-4 transition-all ${
                                item.selected
                                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleItemSelection(item.item_id)}
                                  className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <h4 className="font-semibold text-gray-900 dark:text-dark-text">
                                        {item.item_name}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary font-mono">
                                        {item.item_code}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Available</p>
                                      <p
                                        className={`font-bold ${
                                          item.available_quantity > 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                        }`}
                                      >
                                        {item.available_quantity} pcs
                                      </p>
                                    </div>
                                  </div>
                                  {item.size && (
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                                      Size: {item.size}
                                    </p>
                                  )}
                                  {item.selected && (
                                    <div className="mt-3 flex items-center gap-3">
                                      <label className="text-sm font-medium text-gray-700 dark:text-dark-text">
                                        Quantity:
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max={item.available_quantity}
                                        value={item.quantity || ''}
                                        onChange={(e) =>
                                          updateQuantity(item.item_id, parseInt(e.target.value) || 0)
                                        }
                                        className="w-24 px-3 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                      />
                                      <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                        / {item.available_quantity} pcs
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Employee Info */}
                    <div className="border-t border-gray-200 dark:border-dark-border pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">
                        Employee Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Employee Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.employee_name}
                            onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            placeholder="Enter employee name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Employee ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            placeholder="Enter employee ID"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Department <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            placeholder="Enter department"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Reason (Optional)
                          </label>
                          <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            placeholder="Enter reason for stock out"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Box not found or not checked in</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-dark-text bg-gray-100 dark:bg-dark-bg-lighter rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || loading}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Stock Out
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

