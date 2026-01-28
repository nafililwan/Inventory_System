'use client';

import { CubeIcon, CheckCircleIcon, XCircleIcon, PencilIcon, TrashIcon, TagIcon, BuildingStorefrontIcon, QrCodeIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { Item } from '@/lib/items';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onViewQRCode?: (item: Item) => void;
  itemTypeName?: string;
  variantsCount?: number;
}

const unitTypeLabels: Record<string, string> = {
  pcs: 'pcs',
  box: 'Box',
  pack: 'Pack',
  piece: 'Piece', // Legacy support
  set: 'Set',
  pair: 'Pair',
  dozen: 'Dozen',
  carton: 'Carton',
};

export default function ItemCard({ item, onEdit, onDelete, onViewQRCode, itemTypeName, variantsCount }: ItemCardProps) {
  const isActive = item.status === 'active';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-300 ease-out hover:-translate-y-1 active:scale-[0.98] touch-manipulation">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 sm:gap-3 mb-2">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isActive ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <CubeIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {item.item_name || `Item #${item.item_id}`}
              </h3>
              {item.qr_code && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate font-mono">
                  QR: {item.qr_code}
                </p>
              )}
              {item.category && (
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                  {item.category} {item.type && `• ${item.type}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
            {/* Status */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isActive ? (
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
              )}
              <span className={`text-xs sm:text-sm font-medium ${
                isActive ? 'text-green-600' : 'text-gray-500'
              }`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Unit Type */}
            {item.unit_type && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                <TagIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{unitTypeLabels[item.unit_type] || item.unit_type}</span>
              </div>
            )}

            {/* Total Quantity */}
            {item.total_quantity !== undefined && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                <Squares2X2Icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{item.total_quantity} {item.unit_type || 'pcs'}</span>
              </div>
            )}
          </div>

          {/* Sizes Info */}
          {item.sizes && item.sizes.length > 0 && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {item.sizes.map((size, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs sm:text-sm text-gray-700">
                    {size.size}: {size.quantity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {onViewQRCode && (
            <button
              onClick={() => onViewQRCode(item)}
              className="p-2 sm:p-2.5 text-gray-600 hover:text-green-600 hover:bg-green-50 active:bg-green-100 rounded-lg transition-colors touch-manipulation"
              title="Generate QR Code"
              aria-label="Generate QR Code"
            >
              <QrCodeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <button
            onClick={() => onEdit(item)}
            className="p-2 sm:p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-manipulation"
            title="Edit"
            aria-label="Edit Item"
          >
            <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2 sm:p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
            title="Delete"
            aria-label="Delete Item"
          >
            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

