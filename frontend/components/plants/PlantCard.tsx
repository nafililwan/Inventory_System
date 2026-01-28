'use client';

import { BuildingOfficeIcon, MapPinIcon, CheckCircleIcon, XCircleIcon, PencilIcon, TrashIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { Plant } from '@/lib/plants';

interface PlantCardProps {
  plant: Plant;
  onEdit: (plant: Plant) => void;
  onDelete: (plant: Plant) => void;
  onViewStores?: (plant: Plant) => void;
  storesCount?: number;
}

export default function PlantCard({ plant, onEdit, onDelete, onViewStores, storesCount }: PlantCardProps) {
  const isActive = plant.status === 'active';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6 hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-black/30 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-[0.98] touch-manipulation">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isActive ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <BuildingOfficeIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {plant.plant_name}
              </h3>
              {plant.location && (
                <div className="flex items-center gap-1 mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <MapPinIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{plant.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isActive ? (
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              )}
              <span className={`text-xs sm:text-sm font-medium ${
                isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {storesCount !== undefined && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <ShoppingBagIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{storesCount} {storesCount === 1 ? 'Store' : 'Stores'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {onViewStores && (
            <button
              onClick={() => onViewStores(plant)}
              className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 rounded-lg transition-colors touch-manipulation"
              title="View Stores"
              aria-label="View Stores"
            >
              <ShoppingBagIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <button
            onClick={() => onEdit(plant)}
            className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 rounded-lg transition-colors touch-manipulation"
            title="Edit"
            aria-label="Edit Plant"
          >
            <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => onDelete(plant)}
            className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 rounded-lg transition-colors touch-manipulation"
            title="Delete"
            aria-label="Delete Plant"
          >
            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

