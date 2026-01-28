'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  TagIcon,
  HashtagIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon as MoreFiltersIcon,
} from '@heroicons/react/24/outline';
import { Store } from '@/lib/api/stores';
import { Category } from '@/lib/categories';

interface FilterState {
  search: string;
  storeId: number | null;
  categoryId: number | null;
  status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  size: string;
  yearCode: string;
  quantityMin: string;
  quantityMax: string;
  sortBy: 'name' | 'quantity' | 'store' | 'code';
  sortOrder: 'asc' | 'desc';
}

interface AdvancedFilterPanelProps {
  stores: Store[];
  categories: Category[];
  onFilterChange: (filters: FilterState) => void;
  availableSizes: string[];
  availableYearCodes: string[];
}

export default function AdvancedFilterPanel({
  stores,
  categories,
  onFilterChange,
  availableSizes,
  availableYearCodes,
}: AdvancedFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    storeId: null,
    categoryId: null,
    status: 'all',
    size: '',
    yearCode: '',
    quantityMin: '',
    quantityMax: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.storeId) count++;
    if (filters.categoryId) count++;
    if (filters.status !== 'all') count++;
    if (filters.size) count++;
    if (filters.yearCode) count++;
    if (filters.quantityMin || filters.quantityMax) count++;
    return count;
  }, [filters]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilter = (key: keyof FilterState) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (key === 'status') {
        newFilters.status = 'all';
      } else if (key === 'sortBy') {
        newFilters.sortBy = 'name';
      } else if (key === 'sortOrder') {
        newFilters.sortOrder = 'asc';
      } else if (key === 'storeId' || key === 'categoryId') {
        (newFilters as any)[key] = null;
      } else {
        (newFilters as any)[key] = '';
      }
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      storeId: null,
      categoryId: null,
      status: 'all',
      size: '',
      yearCode: '',
      quantityMin: '',
      quantityMax: '',
      sortBy: 'name',
      sortOrder: 'asc',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock':
        return CheckCircleIcon;
      case 'low_stock':
        return ExclamationTriangleIcon;
      case 'out_of_stock':
        return XCircleIcon;
      default:
        return FunnelIcon;
    }
  };

  return (
    <div className="mb-6">
      {/* Main Filter Bar */}
      <div className="bg-white dark:bg-dark-bg-light rounded-2xl shadow-lg dark:shadow-xl dark:shadow-black/30 border border-gray-200 dark:border-dark-border overflow-hidden">
        {/* Search & Quick Actions Row */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-dark-border">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search items, codes, sizes, stores..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="block w-full pl-12 pr-4 py-3 text-sm bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Store Filter */}
              <div className="relative">
                <select
                  value={filters.storeId || 'all'}
                  onChange={(e) => updateFilter('storeId', e.target.value === 'all' ? null : parseInt(e.target.value))}
                  className="appearance-none pl-10 pr-8 py-2.5 text-sm font-medium bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg-lighter focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-700 dark:text-dark-text transition-all cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.store_id} value={store.store_id}>
                      {store.store_code} - {store.store_name}
                    </option>
                  ))}
                </select>
                <BuildingStorefrontIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className={`appearance-none pl-10 pr-8 py-2.5 text-sm font-medium border rounded-xl hover:opacity-90 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-700 dark:text-dark-text transition-all cursor-pointer min-w-[130px] ${
                    filters.status === 'all'
                      ? 'bg-gray-50 dark:bg-dark-bg border-gray-300 dark:border-dark-border'
                      : filters.status === 'in_stock'
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400'
                      : filters.status === 'low_stock'
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400'
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
                {filters.status !== 'all' ? (
                  (() => {
                    const StatusIcon = getStatusIcon(filters.status);
                    return <StatusIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />;
                  })()
                ) : (
                  <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                )}
              </div>

              {/* Sort Filter */}
              <div className="relative">
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    updateFilter('sortBy', by);
                    updateFilter('sortOrder', order);
                  }}
                  className="appearance-none pl-10 pr-8 py-2.5 text-sm font-medium bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg-lighter focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-700 dark:text-dark-text transition-all cursor-pointer min-w-[150px]"
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="quantity-desc">Quantity (High-Low)</option>
                  <option value="quantity-asc">Quantity (Low-High)</option>
                  <option value="store-asc">Store (A-Z)</option>
                  <option value="code-asc">Code (A-Z)</option>
                </select>
                <AdjustmentsHorizontalIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
              </div>

              {/* Advanced Filters Toggle */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative px-4 py-2.5 text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 ${
                  isOpen || activeFiltersCount > 0
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-dark-bg-lighter text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-bg border border-gray-300 dark:border-dark-border'
                }`}
              >
                <MoreFiltersIcon className="w-4 h-4" />
                <span className="hidden sm:inline">More Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 bg-white/30 dark:bg-white/20 rounded-full text-xs font-bold min-w-[20px] text-center">
                    {activeFiltersCount}
                  </span>
                )}
              </motion.button>

              {/* Clear All Button */}
              {activeFiltersCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={clearAllFilters}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg-lighter rounded-xl transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <XMarkIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 sm:p-5 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/50"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Active Filters:
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({activeFiltersCount} {activeFiltersCount === 1 ? 'filter' : 'filters'})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800"
                >
                  <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                  <span>{filters.search}</span>
                  <button
                    onClick={() => clearFilter('search')}
                    className="hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.span>
              )}
              {filters.storeId && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-800"
                >
                  <BuildingStorefrontIcon className="w-3.5 h-3.5" />
                  <span>{stores.find((s) => s.store_id === filters.storeId)?.store_name}</span>
                  <button
                    onClick={() => clearFilter('storeId')}
                    className="hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.span>
              )}
              {filters.categoryId && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium border border-green-200 dark:border-green-800"
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  <span>{categories.find((c) => c.category_id === filters.categoryId)?.category_name}</span>
                  <button
                    onClick={() => clearFilter('categoryId')}
                    className="hover:bg-green-100 dark:hover:bg-green-900/50 rounded p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.span>
              )}
              {filters.status !== 'all' && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    filters.status === 'in_stock'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                      : filters.status === 'low_stock'
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  }`}
                >
                  {(() => {
                    const StatusIcon = getStatusIcon(filters.status);
                    return <StatusIcon className="w-3.5 h-3.5" />;
                  })()}
                  <span className="capitalize">{filters.status.replace('_', ' ')}</span>
                  <button
                    onClick={() => clearFilter('status')}
                    className="hover:opacity-70 rounded p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.span>
              )}
              {filters.size && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                >
                  <HashtagIcon className="w-3.5 h-3.5" />
                  <span>Size: {filters.size}</span>
                  <button
                    onClick={() => clearFilter('size')}
                    className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.span>
              )}
              {filters.yearCode && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-xs font-medium border border-pink-200 dark:border-pink-800"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Year: {filters.yearCode}</span>
                  <button
                    onClick={() => clearFilter('yearCode')}
                    className="hover:bg-pink-100 dark:hover:bg-pink-900/50 rounded p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.span>
              )}
              {(filters.quantityMin || filters.quantityMax) && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-medium border border-teal-200 dark:border-teal-800"
                >
                  <ChartBarIcon className="w-3.5 h-3.5" />
                  <span>
                    Qty: {filters.quantityMin || '0'} - {filters.quantityMax || '∞'}
                  </span>
                  <button
                    onClick={() => {
                      clearFilter('quantityMin');
                      clearFilter('quantityMax');
                    }}
                    className="hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.span>
              )}
            </div>
          </motion.div>
        )}

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 dark:bg-dark-bg/30">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Category
                  </label>
                  <select
                    value={filters.categoryId || 'all'}
                    onChange={(e) => updateFilter('categoryId', e.target.value === 'all' ? null : parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-dark-text transition-all"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Size
                  </label>
                  <select
                    value={filters.size}
                    onChange={(e) => updateFilter('size', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-dark-text transition-all"
                  >
                    <option value="">All Sizes</option>
                    {availableSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Code Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Year Code
                  </label>
                  <select
                    value={filters.yearCode}
                    onChange={(e) => updateFilter('yearCode', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-dark-text transition-all"
                  >
                    <option value="">All Years</option>
                    {availableYearCodes.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Min */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.quantityMin}
                    onChange={(e) => updateFilter('quantityMin', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  />
                </div>

                {/* Quantity Max */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Max Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.quantityMax}
                    onChange={(e) => updateFilter('quantityMax', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export type { FilterState };

