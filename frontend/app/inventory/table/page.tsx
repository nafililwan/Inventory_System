'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  BuildingStorefrontIcon,
  TagIcon,
  ArchiveBoxIcon,
  ArrowsUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { inventoryService, Inventory, itemsService } from '@/lib/api/items';
import { storesService, Store } from '@/lib/api/stores';
import { categoryService, Category } from '@/lib/categories';
import { itemTypeService, ItemType } from '@/lib/categories';
import toast from 'react-hot-toast';

interface FilterState {
  search: string;
  categoryId: number | null;
  itemTypeId: number | null;
  storeId: number | null;
  sortBy: 'item_name' | 'category' | 'quantity' | 'store' | 'box';
  sortOrder: 'asc' | 'desc';
}

interface AggregatedItem {
  item_id: number;
  item_name: string;
  item_code: string;
  category_name: string;
  item_type_name: string;
  store_name: string;
  total_quantity: number;
  box_count: number;
  boxes: string[];
  min_level: number;
  max_level: number;
  status: 'in_stock' | 'low_stock' | 'stock_out';
}

export default function InventoryTablePage() {
  const router = useRouter();

  // Data State
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categoryId: null,
    itemTypeId: null,
    storeId: null,
    sortBy: 'item_name',
    sortOrder: 'asc',
  });

  // UI State
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showItemTypeFilter, setShowItemTypeFilter] = useState(false);
  const [showStoreFilter, setShowStoreFilter] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  // Close mobile menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-mobile-menu]')) {
        setShowMobileFilters(false);
        setShowSortMenu(false);
        setShowCategoryFilter(false);
        setShowItemTypeFilter(false);
        setShowStoreFilter(false);
      }
    };

    if (showMobileFilters || showSortMenu || showCategoryFilter || showItemTypeFilter || showStoreFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMobileFilters, showSortMenu, showCategoryFilter, showItemTypeFilter, showStoreFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all data with pagination (backend max limit is 1000)
      const [inventoryData, storesData, categoriesData, allTypesData] = await Promise.all([
        inventoryService.list({ limit: 1000 }),
        storesService.list({ status: 'active' }),
        categoryService.getAll(),
        itemTypeService.getAll(),
      ]);

      const inventoryList = Array.isArray(inventoryData) ? inventoryData : [];
      setStores(storesData || []);
      setCategories(categoriesData || []);
      setItemTypes(allTypesData || []);

      // Enrich inventory with category and item type info
      const allItems = await itemsService.list({ limit: 1000, include_stock: false });
      
      // Create mapping: item_id -> { category_id, category_name, item_type_id, item_type_name }
      const itemInfoMap = new Map<number, { category_id?: number; category_name?: string; item_type_id?: number; item_type_name?: string }>();
      
      for (const item of allItems) {
        if (item.item_id && item.type_name) {
          // Find category and type from item type name
          const itemType = allTypesData.find(t => t.type_name === item.type_name);
          if (itemType) {
            const category = categoriesData.find(c => c.category_id === itemType.category_id);
            itemInfoMap.set(item.item_id, {
              category_id: itemType.category_id,
              category_name: category?.category_name,
              item_type_id: itemType.type_id,
              item_type_name: itemType.type_name,
            });
          }
        }
      }

      // Enrich inventory data
      const enrichedInventory = inventoryList.map(inv => ({
        ...inv,
        category_id: itemInfoMap.get(inv.item_id)?.category_id,
        category_name: itemInfoMap.get(inv.item_id)?.category_name,
        item_type_id: itemInfoMap.get(inv.item_id)?.item_type_id,
        item_type_name: itemInfoMap.get(inv.item_id)?.item_type_name,
      }));

      setInventory(enrichedInventory);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Load item types when category changes
  useEffect(() => {
    const loadItemTypes = async () => {
      if (filters.categoryId) {
        try {
          const types = await itemTypeService.getAll(filters.categoryId);
          setItemTypes(types || []);
        } catch (error) {
          console.error('Error loading item types:', error);
        }
      } else {
        try {
          const allTypes = await itemTypeService.getAll();
          setItemTypes(allTypes || []);
        } catch (error) {
          console.error('Error loading item types:', error);
        }
      }
    };
    loadItemTypes();
  }, [filters.categoryId]);

  // Aggregate and Filter Data
  const aggregatedData = useMemo(() => {
    // Filter inventory based on filters
    let filtered = inventory;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.item_name?.toLowerCase().includes(searchLower) ||
          inv.item_code?.toLowerCase().includes(searchLower) ||
          inv.category_name?.toLowerCase().includes(searchLower) ||
          inv.item_type_name?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.categoryId) {
      filtered = filtered.filter((inv) => inv.category_id === filters.categoryId);
    }

    // Item Type filter
    if (filters.itemTypeId) {
      filtered = filtered.filter((inv) => inv.item_type_id === filters.itemTypeId);
    }

    // Store filter
    if (filters.storeId) {
      filtered = filtered.filter((inv) => inv.store_id === filters.storeId);
    }

    // Aggregate by item_id, store_id, and category
    const aggregatedMap = new Map<string, AggregatedItem>();

    filtered.forEach((inv) => {
      const key = `${inv.item_id}_${inv.store_id || 0}_${inv.category_id || 0}`;
      
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          item_id: inv.item_id || 0,
          item_name: inv.item_name || 'Unknown',
          item_code: inv.item_code || 'N/A',
          category_name: inv.category_name || 'Uncategorized',
          item_type_name: inv.item_type_name || 'Unknown Type',
          store_name: inv.store_name || 'Unknown Store',
          total_quantity: 0,
          box_count: 0,
          boxes: [],
          min_level: inv.min_level || 0,
          max_level: inv.max_level || 0,
          status: 'stock_out',
        });
      }

      const aggregated = aggregatedMap.get(key)!;
      aggregated.total_quantity += inv.quantity || 0;
      
      if (inv.box_reference || inv.box_id) {
        const boxRef = inv.box_reference || `BOX-${inv.box_id}`;
        if (!aggregated.boxes.includes(boxRef)) {
          aggregated.boxes.push(boxRef);
          aggregated.box_count++;
        }
      }

      // Determine status
      if (aggregated.total_quantity === 0) {
        aggregated.status = 'stock_out';
      } else if (aggregated.total_quantity < aggregated.min_level) {
        aggregated.status = 'low_stock';
      } else {
        aggregated.status = 'in_stock';
      }
    });

    let result = Array.from(aggregatedMap.values());

    // Filter out stock_out items (quantity = 0)
    result = result.filter((item) => item.total_quantity > 0);

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'item_name':
          comparison = a.item_name.localeCompare(b.item_name);
          break;
        case 'category':
          comparison = a.category_name.localeCompare(b.category_name);
          break;
        case 'quantity':
          comparison = a.total_quantity - b.total_quantity;
          break;
        case 'store':
          comparison = a.store_name.localeCompare(b.store_name);
          break;
        case 'box':
          comparison = a.box_count - b.box_count;
          break;
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [inventory, filters]);

  // Calculate Total
  const totalQuantity = useMemo(() => {
    return aggregatedData.reduce((sum, item) => sum + item.total_quantity, 0);
  }, [aggregatedData]);

  const handleSort = (field: FilterState['sortBy']) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoryId: null,
      itemTypeId: null,
      storeId: null,
      sortBy: 'item_name',
      sortOrder: 'asc',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      in_stock: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      low_stock: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      stock_out: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return styles[status as keyof typeof styles] || styles.stock_out;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 lg:p-6 pb-28 lg:pb-6" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Inventory Table
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                Advanced filtering and aggregated view
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="ml-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              Back
            </button>
          </div>

          {/* Summary Card - Mobile Optimized */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-3 sm:p-4 lg:p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
              <div className="flex-1 min-w-[100px]">
                <p className="text-xs sm:text-sm opacity-90">Total Items</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{aggregatedData.length}</p>
              </div>
              <div className="border-l border-white/30 pl-3 sm:pl-4 lg:pl-6 flex-1 min-w-[100px]">
                <p className="text-xs sm:text-sm opacity-90">Total Quantity</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{totalQuantity.toLocaleString()}</p>
              </div>
              {filters.storeId && (
                <div className="border-l border-white/30 pl-3 sm:pl-4 lg:pl-6 flex-1 min-w-[100px]">
                  <p className="text-xs sm:text-sm opacity-90">Store</p>
                  <p className="text-sm sm:text-base lg:text-lg font-semibold truncate">
                    {stores.find((s) => s.store_id === filters.storeId)?.store_name || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters - Desktop View */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items, codes, categories..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowCategoryFilter(!showCategoryFilter);
                  setShowItemTypeFilter(false);
                  setShowStoreFilter(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  filters.categoryId
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <TagIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {filters.categoryId
                    ? categories.find((c) => c.category_id === filters.categoryId)?.category_name || 'Category'
                    : 'Category'}
                </span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showCategoryFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[10001] max-h-64 overflow-y-auto"
                  >
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setFilters({ ...filters, categoryId: null, itemTypeId: null });
                          setShowCategoryFilter(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        All Categories
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.category_id}
                          onClick={() => {
                            setFilters({ ...filters, categoryId: cat.category_id || null, itemTypeId: null });
                            setShowCategoryFilter(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {cat.category_name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Item Type Filter */}
            {filters.categoryId && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowItemTypeFilter(!showItemTypeFilter);
                    setShowCategoryFilter(false);
                    setShowStoreFilter(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                    filters.itemTypeId
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <TagIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {filters.itemTypeId
                      ? itemTypes.find((t) => t.type_id === filters.itemTypeId)?.type_name || 'Type'
                      : 'Item Type'}
                  </span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {showItemTypeFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[10001] max-h-64 overflow-y-auto"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setFilters({ ...filters, itemTypeId: null });
                            setShowItemTypeFilter(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          All Types
                        </button>
                        {itemTypes
                          .filter((t) => t.category_id === filters.categoryId)
                          .map((type) => (
                            <button
                              key={type.type_id}
                              onClick={() => {
                                setFilters({ ...filters, itemTypeId: type.type_id || null });
                                setShowItemTypeFilter(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              {type.type_name}
                            </button>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Store Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowStoreFilter(!showStoreFilter);
                  setShowCategoryFilter(false);
                  setShowItemTypeFilter(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  filters.storeId
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <BuildingStorefrontIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {filters.storeId ? stores.find((s) => s.store_id === filters.storeId)?.store_name || 'Store' : 'Store'}
                </span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showStoreFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[10001] max-h-64 overflow-y-auto"
                  >
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setFilters({ ...filters, storeId: null });
                          setShowStoreFilter(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        All Stores
                      </button>
                      {stores.map((store) => (
                        <button
                          key={store.store_id}
                          onClick={() => {
                            setFilters({ ...filters, storeId: store.store_id || null });
                            setShowStoreFilter(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {store.store_name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Clear Filters */}
            {(filters.search || filters.categoryId || filters.itemTypeId || filters.storeId) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filters - Collapsible */}
        <div className="lg:hidden mb-4">
          {/* Mobile Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="flex items-center gap-2 mb-3" data-mobile-menu>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
                (filters.categoryId || filters.itemTypeId || filters.storeId)
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              <span>Filters</span>
              {(filters.categoryId || filters.itemTypeId || filters.storeId) && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {[filters.categoryId, filters.itemTypeId, filters.storeId].filter(Boolean).length}
                </span>
              )}
            </button>
            <div className="relative" data-mobile-menu>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <ArrowsUpDownIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Sort</span>
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[10001]"
                  >
                    <div className="p-2">
                      {(['item_name', 'category', 'quantity', 'store', 'box'] as const).map((field) => (
                        <button
                          key={field}
                          onClick={() => {
                            handleSort(field);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                            filters.sortBy === field
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="capitalize">{field.replace('_', ' ')}</span>
                            {filters.sortBy === field && (
                              filters.sortOrder === 'asc' ? (
                                <ArrowUpIcon className="w-4 h-4" />
                              ) : (
                                <ArrowDownIcon className="w-4 h-4" />
                              )
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Filter Panel */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3"
                data-mobile-menu
              >
                <div className="p-4 space-y-3">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                    <select
                      value={filters.categoryId || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setFilters({ ...filters, categoryId: value, itemTypeId: null });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Item Type Filter */}
                  {filters.categoryId && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Item Type</label>
                      <select
                        value={filters.itemTypeId || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : null;
                          setFilters({ ...filters, itemTypeId: value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">All Types</option>
                        {itemTypes
                          .filter((t) => t.category_id === filters.categoryId)
                          .map((type) => (
                            <option key={type.type_id} value={type.type_id}>
                              {type.type_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Store Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Store</label>
                    <select
                      value={filters.storeId || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setFilters({ ...filters, storeId: value });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      <option value="">All Stores</option>
                      {stores.map((store) => (
                        <option key={store.store_id} value={store.store_id}>
                          {store.store_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  {(filters.categoryId || filters.itemTypeId || filters.storeId) && (
                    <button
                      onClick={() => {
                        clearFilters();
                        setShowMobileFilters(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('item_name')}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Item Name
                      {filters.sortBy === 'item_name' && (
                        filters.sortOrder === 'asc' ? (
                          <ArrowUpIcon className="w-4 h-4" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4" />
                        )
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Category
                      {filters.sortBy === 'category' && (
                        filters.sortOrder === 'asc' ? (
                          <ArrowUpIcon className="w-4 h-4" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4" />
                        )
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Item Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('store')}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Store
                      {filters.sortBy === 'store' && (
                        filters.sortOrder === 'asc' ? (
                          <ArrowUpIcon className="w-4 h-4" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4" />
                        )
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('quantity')}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Total Quantity
                      {filters.sortBy === 'quantity' && (
                        filters.sortOrder === 'asc' ? (
                          <ArrowUpIcon className="w-4 h-4" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4" />
                        )
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('box')}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Boxes
                      {filters.sortBy === 'box' && (
                        filters.sortOrder === 'asc' ? (
                          <ArrowUpIcon className="w-4 h-4" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4" />
                        )
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {aggregatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      No items found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  aggregatedData.map((item, index) => (
                    <motion.tr
                      key={`${item.item_id}_${item.store_name}_${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.item_code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {item.category_name}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.item_type_name}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <BuildingStorefrontIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{item.store_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {item.total_quantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.box_count} ({item.boxes.slice(0, 2).join(', ')}
                            {item.boxes.length > 2 && '...'})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3 pb-4">
          {aggregatedData.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No items found. Try adjusting your filters.</p>
            </div>
          ) : (
            aggregatedData.map((item, index) => (
              <motion.div
                key={`${item.item_id}_${item.store_name}_${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.item_name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{item.item_code}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${getStatusBadge(item.status)}`}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Category & Type */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {item.category_name}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">•</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{item.item_type_name}</span>
                  </div>

                  {/* Store */}
                  <div className="flex items-center gap-2">
                    <BuildingStorefrontIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.store_name}</span>
                  </div>

                  {/* Quantity & Boxes */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Quantity</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {item.total_quantity.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Boxes</p>
                      <div className="flex items-center gap-1.5">
                        <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.box_count}</p>
                        {item.boxes.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            ({item.boxes.slice(0, 2).join(', ')}
                            {item.boxes.length > 2 && '...'})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

