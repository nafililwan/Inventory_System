'use client';

import { ShoppingBagIcon, MapPinIcon, CheckCircleIcon, XCircleIcon, PencilIcon, TrashIcon, BuildingOfficeIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { Store } from '@/lib/stores';

interface StoreCardProps {
  store: Store;
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
  plantName?: string;
}

const storeTypeColors: Record<string, { bg: string; text: string }> = {
  uniform: { bg: 'bg-purple-100', text: 'text-purple-700' },
  safety: { bg: 'bg-red-100', text: 'text-red-700' },
  office: { bg: 'bg-blue-100', text: 'text-blue-700' },
  tools: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const stockOutModeLabels: Record<string, string> = {
  trust: 'Trust',
  casual: 'Casual',
  strict: 'Strict',
};

export default function StoreCard({ store, onEdit, onDelete, plantName }: StoreCardProps) {
  const isActive = store.status === 'active';
  const storeTypeColor = storeTypeColors[store.store_type || 'other'] || storeTypeColors.other;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-300 ease-out hover:-translate-y-1 active:scale-[0.98] touch-manipulation">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 sm:gap-3 mb-2">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isActive ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <ShoppingBagIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {store.store_name}
              </h3>
              {plantName && (
                <div className="flex items-center gap-1 mt-1 text-xs sm:text-sm text-gray-600">
                  <BuildingOfficeIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{plantName}</span>
                </div>
              )}
              {store.location && (
                <div className="flex items-center gap-1 mt-1 text-xs sm:text-sm text-gray-600">
                  <MapPinIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{store.location}</span>
                </div>
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

            {/* Store Type */}
            {store.store_type && (
              <div className={`px-2 sm:px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium ${storeTypeColor.bg} ${storeTypeColor.text}`}>
                {store.store_type.charAt(0).toUpperCase() + store.store_type.slice(1)}
              </div>
            )}

            {/* Stock Out Mode */}
            {store.stock_out_mode && (
              <div className="text-xs sm:text-sm text-gray-600">
                Mode: <span className="font-medium">{stockOutModeLabels[store.stock_out_mode] || store.stock_out_mode}</span>
              </div>
            )}
          </div>

          {/* Person in Charge & Contact */}
          {(store.person_in_charge || store.contact_number) && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 space-y-1.5 sm:space-y-2">
              {store.person_in_charge && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                  <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{store.person_in_charge}</span>
                </div>
              )}
              {store.contact_number && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                  <PhoneIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{store.contact_number}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(store)}
            className="p-2 sm:p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-manipulation"
            title="Edit"
            aria-label="Edit Store"
          >
            <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => onDelete(store)}
            className="p-2 sm:p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
            title="Delete"
            aria-label="Delete Store"
          >
            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

