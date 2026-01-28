'use client';

import { useState, useEffect } from 'react';
import { FolderIcon, PencilIcon, TrashIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Category, ItemType } from '@/lib/categories';
import { itemTypeService } from '@/lib/categories';
import ConfirmModal from '@/components/common/ConfirmModal';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleExpand: (categoryId: number) => void;
  isExpanded: boolean;
  index: number;
  onAddItemType?: (categoryId: number) => void;
  onEditItemType?: (categoryId: number, itemType: ItemType) => void;
  onDeleteItemType?: (categoryId: number, typeId: number) => void;
}

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleExpand,
  isExpanded,
  index,
  onAddItemType,
  onEditItemType,
  onDeleteItemType,
}: CategoryCardProps) {
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemTypesCount, setItemTypesCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    typeId: number | null;
  }>({
    isOpen: false,
    typeId: null,
  });

  // Fetch count on mount
  useEffect(() => {
    fetchItemTypesCount();
  }, [category.category_id]);

  // Fetch full list when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchItemTypes();
    }
  }, [isExpanded, category.category_id]);

  const fetchItemTypesCount = async () => {
    try {
      const types = await itemTypeService.getByCategory(category.category_id);
      setItemTypesCount(types.length);
    } catch (error) {
      console.error('Failed to fetch item types count:', error);
    }
  };

  const fetchItemTypes = async () => {
    setLoading(true);
    try {
      const types = await itemTypeService.getByCategory(category.category_id);
      setItemTypes(types);
      setItemTypesCount(types.length); // Update count
    } catch (error) {
      console.error('Failed to fetch item types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItemType = (typeId: number) => {
    setConfirmModal({ isOpen: true, typeId });
  };

  const confirmDeleteItemType = async () => {
    if (!confirmModal.typeId) return;
    
    try {
      if (onDeleteItemType) {
        await onDeleteItemType(category.category_id, confirmModal.typeId);
      } else {
        await itemTypeService.delete(confirmModal.typeId);
      }
      fetchItemTypes();
      fetchItemTypesCount(); // Update count
      setConfirmModal({ isOpen: false, typeId: null });
    } catch (error) {
      console.error('Failed to delete item type:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors overflow-hidden shadow-md dark:shadow-xl dark:shadow-black/20">
      {/* Category Card */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 dark:bg-opacity-20"
              style={{ backgroundColor: `${category.color || '#3b82f6'}15` }}
            >
              <FolderIcon
                className="w-5 h-5"
                style={{ color: category.color || '#3b82f6' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base text-gray-900 dark:text-gray-100 truncate">
                {category.category_name}
              </h3>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${
                  category.status === 'active'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {category.status}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => onEdit(category)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              aria-label="Edit category"
            >
              <PencilIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              aria-label="Delete category"
            >
              <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>

        {category.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {category.description}
          </p>
        )}

        {/* View Types Button */}
        <button
          onClick={() => onToggleExpand(category.category_id)}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm w-full transition-colors mb-2"
        >
          <span>View Item Types ({itemTypesCount})</span>
          <ChevronRightIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>

        {/* Item Types List */}
        {isExpanded && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Types</h4>
              {onAddItemType && (
                <button
                  onClick={() => onAddItemType(category.category_id)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <PlusIcon className="w-3 h-3" />
                  Add Type
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : itemTypes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No item types yet</p>
            ) : (
              <div className="space-y-2">
                {itemTypes.map((type) => (
                  <div
                    key={type.type_id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{type.type_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {type.has_size && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Sizes: {type.available_sizes?.join(', ') || 'Any'}
                          </span>
                        )}
                        {type.has_color && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Colors: {type.available_colors?.join(', ') || 'Any'}
                          </span>
                        )}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            type.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {type.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {onEditItemType && (
                        <button
                          onClick={() => onEditItemType(category.category_id, type)}
                          className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          <PencilIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </button>
                      )}
                      {onDeleteItemType && (
                        <button
                          onClick={() => handleDeleteItemType(type.type_id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <TrashIcon className="w-3 h-3 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, typeId: null })}
        onConfirm={confirmDeleteItemType}
        title="Delete Item Type"
        message="Are you sure you want to delete this item type? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

