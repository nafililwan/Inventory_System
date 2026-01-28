'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { ItemVariant, ItemVariantCreate, itemService } from '@/lib/items';
import { ItemType } from '@/lib/categories';
import ConfirmModal from '@/components/common/ConfirmModal';
import toast from 'react-hot-toast';

interface VariantManagerProps {
  itemId: number;
  itemType: ItemType | null;
  onVariantsChange?: () => void;
}

export default function VariantManager({ itemId, itemType, onVariantsChange }: VariantManagerProps) {
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVariant, setNewVariant] = useState<ItemVariantCreate>({
    size: '',
    color: '',
    status: 'active',
  });
  const [creating, setCreating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    variantId: number | null;
  }>({
    isOpen: false,
    variantId: null,
  });

  useEffect(() => {
    if (itemId) {
      fetchVariants();
    }
  }, [itemId]);

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const data = await itemService.getVariants(itemId);
      setVariants(data);
    } catch (error) {
      console.error('Failed to load variants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVariant = async () => {
    if (!itemType) {
      toast.error('Item Type not found');
      return;
    }

    // Validate
    if (itemType.has_size && !newVariant.size) {
      toast.error('Size is required');
      return;
    }
    if (itemType.has_color && !newVariant.color) {
      toast.error('Color is required');
      return;
    }

    setCreating(true);
    try {
      await itemService.createVariant(itemId, newVariant);
      toast.success('Variant created successfully');
      setNewVariant({ size: '', color: '', status: 'active' });
      setShowCreateForm(false);
      fetchVariants();
      if (onVariantsChange) {
        onVariantsChange();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create variant');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteVariant = (variantId: number) => {
    setConfirmModal({ isOpen: true, variantId });
  };

  const confirmDeleteVariant = async () => {
    if (!confirmModal.variantId) return;

    try {
      await itemService.deleteVariant(itemId, confirmModal.variantId);
      toast.success('Variant deleted successfully');
      fetchVariants();
      if (onVariantsChange) {
        onVariantsChange();
      }
      setConfirmModal({ isOpen: false, variantId: null });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete variant');
    }
  };

  const getVariantLabel = (variant: ItemVariant) => {
    const parts: string[] = [];
    if (variant.size) parts.push(`Size: ${variant.size}`);
    if (variant.color) parts.push(`Color: ${variant.color}`);
    return parts.length > 0 ? parts.join(', ') : 'Default Variant';
  };

  if (!itemType) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Please select an Item Type first to manage variants
        </p>
      </div>
    );
  }

  const needsVariants = itemType.has_size || itemType.has_color;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Variants & QR Codes</h3>
          <p className="text-xs text-gray-500 mt-1">
            {variants.length} {variants.length === 1 ? 'variant' : 'variants'} created
          </p>
        </div>
        {needsVariants && (
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Variant</span>
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && needsVariants && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {itemType.has_size && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Size <span className="text-red-500">*</span>
                </label>
                <select
                  value={newVariant.size || ''}
                  onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Size</option>
                  {itemType.available_sizes?.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {itemType.has_color && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Color <span className="text-red-500">*</span>
                </label>
                <select
                  value={newVariant.color || ''}
                  onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Color</option>
                  {itemType.available_colors?.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateVariant}
              disabled={creating}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors touch-manipulation"
            >
              {creating ? 'Creating...' : 'Create Variant'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewVariant({ size: '', color: '', status: 'active' });
              }}
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Variants List */}
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : variants.length === 0 ? (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <QrCodeIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No variants created yet</p>
          {needsVariants && (
            <p className="text-xs text-gray-500 mt-1">
              Click "Add Variant" to create variants with QR codes
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => (
            <div
              key={variant.variant_id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {getVariantLabel(variant)}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  QR: {variant.qr_code}
                </p>
                {variant.sku && (
                  <p className="text-xs text-gray-500 mt-1">SKU: {variant.sku}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDeleteVariant(variant.variant_id)}
                className="p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                title="Delete Variant"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info for items without size/color */}
      {!needsVariants && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            This Item Type doesn't require variants. You can use this item directly without creating variants.
          </p>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, variantId: null })}
        onConfirm={confirmDeleteVariant}
        title="Delete Variant"
        message="Are you sure you want to delete this variant? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

