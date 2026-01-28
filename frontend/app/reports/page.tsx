'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentChartBarIcon,
  CubeIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { inventoryService, Inventory, itemsService } from '@/lib/api/items';
import { storesService, Store } from '@/lib/api/stores';
import { boxesService } from '@/lib/api/boxes';
import { stockTransactionsService, StockTransaction } from '@/lib/api/items';
import { categoryService, Category, itemTypeService, ItemType } from '@/lib/categories';
import ReportPreviewModal from '@/components/reports/ReportPreviewModal';
import toast from 'react-hot-toast';

type ReportType = 'inventory' | 'transactions' | 'stores' | 'boxes';

interface ReportFilters {
  reportType: ReportType;
  storeIds: number[];
  categoryIds: number[];
  typeIds: number[];
  dateFrom: string;
  dateTo: string;
  includeLowStock: boolean;
  includeOutOfStock: boolean;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportTitle, setReportTitle] = useState('');
  
  const [filters, setFilters] = useState<ReportFilters>({
    reportType: 'inventory',
    storeIds: [],
    categoryIds: [],
    typeIds: [],
    dateFrom: '',
    dateTo: '',
    includeLowStock: true,
    includeOutOfStock: false,
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);

  useEffect(() => {
    loadStores();
    loadCategories();
    // Don't load all types initially - only load when category is selected
  }, []);

  // Load item types when categories change - ONLY show types for selected categories
  useEffect(() => {
    const loadTypes = async () => {
      if (filters.categoryIds.length > 0) {
        const loadedTypes = await loadItemTypesByCategories(filters.categoryIds);
        // Clean up invalid typeIds after types are loaded
        if (filters.typeIds.length > 0) {
          const validTypeIds = loadedTypes.map(t => t.type_id);
          const filteredTypeIds = filters.typeIds.filter(id => validTypeIds.includes(id));
          if (filteredTypeIds.length !== filters.typeIds.length) {
            setFilters(prev => ({ ...prev, typeIds: filteredTypeIds }));
          }
        }
      } else {
        // No categories selected - clear types
        setItemTypes([]);
        setFilters(prev => ({ ...prev, typeIds: [] }));
      }
    };
    loadTypes();
  }, [filters.categoryIds]);

  const loadStores = async () => {
    try {
      const data = await storesService.list({ status: 'active' });
      setStores(data);
    } catch (err) {
      console.error('Failed to load stores:', err);
      toast.error('Failed to load stores');
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll({ status: 'active' });
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast.error('Failed to load categories');
    }
  };

  const loadItemTypes = async () => {
    try {
      const data = await itemTypeService.list({ status: 'active' });
      setItemTypes(data);
    } catch (err) {
      console.error('Failed to load item types:', err);
      toast.error('Failed to load item types');
    }
  };

  const loadItemTypesByCategories = async (categoryIds: number[]): Promise<ItemType[]> => {
    try {
      const allTypes: ItemType[] = [];
      for (const categoryId of categoryIds) {
        const types = await categoryService.getTypes(categoryId, 'active');
        allTypes.push(...types);
      }
      // Remove duplicates
      const uniqueTypes = Array.from(new Map(allTypes.map(type => [type.type_id, type])).values());
      setItemTypes(uniqueTypes);
      return uniqueTypes;
    } catch (err) {
      console.error('Failed to load item types by categories:', err);
      // Fallback to load all types
      const allTypes = await itemTypeService.list({ status: 'active' });
      setItemTypes(allTypes);
      return allTypes;
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let data: any = {};

      switch (filters.reportType) {
        case 'inventory':
          console.log('[Inventory Report] Fetching inventory data...');
          const invData = await inventoryService.list({ limit: 1000 });
          console.log(`[Inventory Report] Loaded ${invData.length} inventory records`);
          let filteredInv = invData;

          // Filter by categories and types - fetch items first
          // If only categories selected (no types), get ALL types from those categories
          // If types selected, use only those types
          if (filters.categoryIds.length > 0 || filters.typeIds.length > 0) {
            let filteredItemIds: number[] = [];
            
            // Determine which types to use
            let typesToUse: number[] = [];
            let selectedCategoryNames: string[] = [];
            
            if (filters.typeIds.length > 0) {
              // User selected specific types - use only those types
              typesToUse = filters.typeIds;
              console.log(`[Inventory Report] Using ${typesToUse.length} selected type(s):`, typesToUse);
            } else if (filters.categoryIds.length > 0) {
              // User selected categories but NO types - get ALL types from selected categories
              console.log(`[Inventory Report] No types selected, getting ALL types from ${filters.categoryIds.length} selected category/categories`);
              
              for (const categoryId of filters.categoryIds) {
                try {
                  // Get category name from already loaded categories (no need to fetch again)
                  const category = categories.find(c => c.category_id === categoryId);
                  const categoryName = category?.category_name || `Category ${categoryId}`;
                  selectedCategoryNames.push(categoryName);
                  
                  // Get types directly without fetching category details
                  const types = await categoryService.getTypes(categoryId, 'active');
                  console.log(`[Inventory Report] Found ${types.length} type(s) for category "${categoryName}"`);
                  typesToUse.push(...types.map(t => t.type_id));
                } catch (err: any) {
                  console.error(`Failed to load types for category ${categoryId}:`, err?.message || err);
                  // Continue with other categories even if one fails
                }
              }
              
              // Remove duplicate type IDs (in case multiple categories share types)
              typesToUse = Array.from(new Set(typesToUse));
              console.log(`[Inventory Report] Total unique types from all selected categories: ${typesToUse.length}`);
              
              // Check if no types found for selected categories
              if (typesToUse.length === 0) {
                const categoryNames = selectedCategoryNames.length > 0 
                  ? selectedCategoryNames.join(', ') 
                  : 'selected categories';
                toast.error(`No item types found for ${categoryNames}. Please select categories that have item types.`, {
                  duration: 5000,
                });
                setLoading(false);
                return;
              }
            }
            
            // Get all items for the selected types
            if (typesToUse.length > 0) {
              const allItems: any[] = [];
              console.log(`[Inventory Report] Filtering by ${typesToUse.length} type(s):`, typesToUse);
              
              for (const typeId of typesToUse) {
                try {
                  const items = await itemsService.list({ type_id: typeId, limit: 1000 });
                  console.log(`[Inventory Report] Found ${items.length} items for type ${typeId}`);
                  if (items.length > 0) {
                    allItems.push(...items);
                  }
                } catch (err: any) {
                  console.error(`[Inventory Report] Failed to load items for type ${typeId}:`, err?.message || err);
                  // Continue with other types even if one fails
                }
              }
              
              // Remove duplicates
              const uniqueItems = Array.from(new Map(allItems.map(item => [item.item_id, item])).values());
              filteredItemIds = uniqueItems.map(item => item.item_id);
              console.log(`[Inventory Report] Total unique items found: ${filteredItemIds.length}`);
              
              // Check if no items found
              if (filteredItemIds.length === 0) {
                const categoryNames = selectedCategoryNames.length > 0 
                  ? selectedCategoryNames.join(', ') 
                  : 'selected filters';
                toast.error(`No items found for ${categoryNames}. Items may not exist in the system yet.`, {
                  duration: 5000,
                });
                setLoading(false);
                return;
              }
            }

            // Filter inventory by item_ids
            if (filteredItemIds.length > 0) {
              const beforeFilter = filteredInv.length;
              filteredInv = filteredInv.filter(inv => filteredItemIds.includes(inv.item_id));
              console.log(`[Inventory Report] Filtered inventory: ${beforeFilter} -> ${filteredInv.length} items`);
              
              // Check if no inventory records found
              if (filteredInv.length === 0) {
                const categoryNames = selectedCategoryNames.length > 0 
                  ? selectedCategoryNames.join(', ') 
                  : 'selected filters';
                toast.error(`No inventory records found for ${categoryNames}. Items exist but have no stock in inventory. Please stock in items first.`, {
                  duration: 6000,
                });
                setLoading(false);
                return;
              }
            } else if (filters.categoryIds.length > 0 || filters.typeIds.length > 0) {
              // No items found for selected filters
              console.warn('[Inventory Report] No items found for selected categories/types');
              const categoryNames = selectedCategoryNames.length > 0 
                ? selectedCategoryNames.join(', ') 
                : 'selected filters';
              toast.error(`No items found for ${categoryNames}. Please check if items exist for these filters.`, {
                duration: 5000,
              });
              setLoading(false);
              return;
            }
          }

          // Filter by stores
          if (filters.storeIds.length > 0) {
            const beforeStoreFilter = filteredInv.length;
            filteredInv = filteredInv.filter(inv => filters.storeIds.includes(inv.store_id));
            console.log(`[Inventory Report] Store filter: ${beforeStoreFilter} -> ${filteredInv.length} items`);
          }

          // Filter by stock status
          if (!filters.includeLowStock) {
            filteredInv = filteredInv.filter(inv => {
              const minLevel = inv.min_level || 10;
              return (inv.quantity || 0) >= minLevel;
            });
          }

          if (!filters.includeOutOfStock) {
            filteredInv = filteredInv.filter(inv => (inv.quantity || 0) > 0);
          }

          // Group items by item_id + store_id to calculate totals and collect box references
          const groupedItems = new Map<string, {
            item_id: number;
            item_code: string;
            item_name: string;
            store_id: number;
            store_name: string;
            size?: string;
            year_code?: string;
            min_level: number;
            totalQuantity: number;
            boxReferences: string[];
            boxCount: number;
            items: any[]; // All inventory records for this item+store combination
          }>();

          filteredInv.forEach(inv => {
            const key = `${inv.item_id}_${inv.store_id}`;
            if (!groupedItems.has(key)) {
              groupedItems.set(key, {
                item_id: inv.item_id,
                item_code: inv.item_code || 'N/A',
                item_name: inv.item_name || 'Unknown',
                store_id: inv.store_id,
                store_name: inv.store_name || 'Unknown Store',
                size: inv.size,
                year_code: inv.year_code,
                min_level: inv.min_level || 10,
                totalQuantity: 0,
                boxReferences: [],
                boxCount: 0,
                items: [],
              });
            }
            
            const group = groupedItems.get(key)!;
            group.totalQuantity += (inv.quantity || 0);
            group.items.push(inv);
            
            // Collect unique box references
            if (inv.box_reference && !group.boxReferences.includes(inv.box_reference)) {
              group.boxReferences.push(inv.box_reference);
            }
          });

          // Convert grouped items to array and set boxCount
          const groupedItemsArray = Array.from(groupedItems.values()).map(group => ({
            ...group,
            boxCount: group.boxReferences.length,
          }));

          // Calculate total quantity (sum all quantities, including same items from different boxes)
          const totalQuantity = groupedItemsArray.reduce((sum, group) => sum + group.totalQuantity, 0);
          
          // Count unique items (by item_id + store_id combination)
          const uniqueItemCount = groupedItemsArray.length;
          
          // Count low stock items (items where total quantity is below min level)
          const lowStockItemIds = new Set(
            groupedItemsArray
              .filter(group => {
                return group.totalQuantity > 0 && group.totalQuantity < group.min_level;
              })
              .map(group => group.item_id)
          );

          // Count total boxes from inventory (unique box references)
          const allBoxReferences = new Set<string>();
          filteredInv.forEach(inv => {
            if (inv.box_reference) {
              allBoxReferences.add(inv.box_reference);
            } else if (inv.box_id) {
              allBoxReferences.add(`BOX-${inv.box_id}`);
            }
          });
          const totalBoxes = allBoxReferences.size;

          data = {
            summary: {
              totalItems: uniqueItemCount, // Unique item+store combinations
              totalQuantity, // Total quantity (sum of all, including same items from different boxes)
              lowStockItems: lowStockItemIds.size, // Unique low stock items count
              totalBoxes, // Total boxes from inventory
            },
            items: groupedItemsArray, // Grouped items with totals and box references
          };
          setReportTitle('Inventory Report');
          break;

        case 'transactions':
          const transData = await stockTransactionsService.list({ limit: 1000 });
          let filteredTrans = transData;

          // Filter by categories and types
          // If only categories selected (no types), get ALL types from those categories
          // If types selected, use only those types
          if (filters.categoryIds.length > 0 || filters.typeIds.length > 0) {
            let filteredItemIds: number[] = [];
            let selectedCategoryNames: string[] = [];
            
            // Determine which types to use
            let typesToUse: number[] = [];
            if (filters.typeIds.length > 0) {
              // User selected specific types - use only those types
              typesToUse = filters.typeIds;
              console.log(`[Transaction Report] Using ${typesToUse.length} selected type(s):`, typesToUse);
            } else if (filters.categoryIds.length > 0) {
              // User selected categories but NO types - get ALL types from selected categories
              console.log(`[Transaction Report] No types selected, getting ALL types from ${filters.categoryIds.length} selected category/categories`);
              
              for (const categoryId of filters.categoryIds) {
                try {
                  // Get category name from already loaded categories (no need to fetch again)
                  const category = categories.find(c => c.category_id === categoryId);
                  const categoryName = category?.category_name || `Category ${categoryId}`;
                  selectedCategoryNames.push(categoryName);
                  
                  // Get types directly without fetching category details
                  const types = await categoryService.getTypes(categoryId, 'active');
                  console.log(`[Transaction Report] Found ${types.length} type(s) for category "${categoryName}"`);
                  typesToUse.push(...types.map(t => t.type_id));
                } catch (err: any) {
                  console.error(`Failed to load types for category ${categoryId}:`, err?.message || err);
                  // Continue with other categories even if one fails
                }
              }
              
              // Remove duplicate type IDs (in case multiple categories share types)
              typesToUse = Array.from(new Set(typesToUse));
              console.log(`[Transaction Report] Total unique types from all selected categories: ${typesToUse.length}`);
              
              // Check if no types found for selected categories
              if (typesToUse.length === 0) {
                const categoryNames = selectedCategoryNames.length > 0 
                  ? selectedCategoryNames.join(', ') 
                  : 'selected categories';
                toast.error(`No item types found for ${categoryNames}. Please select categories that have item types.`, {
                  duration: 5000,
                });
                setLoading(false);
                return;
              }
            }
            
            // Get all items for the selected types
            if (typesToUse.length > 0) {
              const allItems: any[] = [];
              for (const typeId of typesToUse) {
                try {
                  const items = await itemsService.list({ type_id: typeId, limit: 1000 });
                  console.log(`[Transaction Report] Found ${items.length} items for type ${typeId}`);
                  allItems.push(...items);
                } catch (err) {
                  console.error(`Failed to load items for type ${typeId}:`, err);
                }
              }
              const uniqueItems = Array.from(new Map(allItems.map(item => [item.item_id, item])).values());
              filteredItemIds = uniqueItems.map(item => item.item_id);
              console.log(`[Transaction Report] Total unique items: ${filteredItemIds.length}`);
              
              // Check if no items found
              if (filteredItemIds.length === 0) {
                const categoryNames = selectedCategoryNames.length > 0 
                  ? selectedCategoryNames.join(', ') 
                  : 'selected filters';
                toast.error(`No items found for ${categoryNames}. Items may not exist in the system yet.`, {
                  duration: 5000,
                });
                setLoading(false);
                return;
              }
            }

            // Filter transactions by item_ids
            if (filteredItemIds.length > 0) {
              const beforeFilter = filteredTrans.length;
              filteredTrans = filteredTrans.filter(trans => filteredItemIds.includes(trans.item_id));
              console.log(`[Transaction Report] Filtered: ${beforeFilter} -> ${filteredTrans.length} transactions`);
              
              // Check if no transactions found
              if (filteredTrans.length === 0) {
                const categoryNames = selectedCategoryNames.length > 0 
                  ? selectedCategoryNames.join(', ') 
                  : 'selected filters';
                toast.error(`No transactions found for ${categoryNames}. Items exist but have no transaction history.`, {
                  duration: 6000,
                });
                setLoading(false);
                return;
              }
            } else if (filters.categoryIds.length > 0 || filters.typeIds.length > 0) {
              console.warn('[Transaction Report] No items found for selected categories/types');
              const categoryNames = selectedCategoryNames.length > 0 
                ? selectedCategoryNames.join(', ') 
                : 'selected filters';
              toast.error(`No items found for ${categoryNames}. Please check if items exist for these filters.`, {
                duration: 5000,
              });
              setLoading(false);
              return;
            }
          }

          // Filter by stores
          if (filters.storeIds.length > 0) {
            filteredTrans = filteredTrans.filter(trans => 
              filters.storeIds.includes(trans.from_store_id || 0) || 
              filters.storeIds.includes(trans.to_store_id || 0)
            );
          }

          // Filter by date
          if (filters.dateFrom) {
            filteredTrans = filteredTrans.filter(trans => 
              new Date(trans.created_at) >= new Date(filters.dateFrom)
            );
          }

          if (filters.dateTo) {
            filteredTrans = filteredTrans.filter(trans => 
              new Date(trans.created_at) <= new Date(filters.dateTo)
            );
          }

          data = {
            summary: {
              totalTransactions: filteredTrans.length,
            },
            transactions: filteredTrans,
          };
          setReportTitle('Transaction Report');
          break;

        case 'stores':
          const storeData = stores;
          const filteredStores = filters.storeIds.length > 0
            ? storeData.filter(store => filters.storeIds.includes(store.store_id))
            : storeData;

          data = {
            summary: {
              totalStores: filteredStores.length,
            },
            stores: filteredStores,
          };
          setReportTitle('Store Report');
          break;

        case 'boxes':
          const boxData = await boxesService.list({ limit: 1000 });
          let filteredBoxes = boxData.data || [];

          // Filter by stores
          if (filters.storeIds.length > 0) {
            filteredBoxes = filteredBoxes.filter((box: any) => 
              box.store_id && filters.storeIds.includes(box.store_id)
            );
          }

          data = {
            summary: {
              totalBoxes: filteredBoxes.length,
            },
            boxes: filteredBoxes,
          };
          setReportTitle('Box Report');
          break;
      }

      setReportData(data);
      setShowPreview(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      id: 'inventory' as ReportType,
      name: 'Inventory Report',
      description: 'View inventory levels, stock status, and item details',
      icon: CubeIcon,
      color: 'blue',
    },
    {
      id: 'transactions' as ReportType,
      name: 'Transaction Report',
      description: 'View stock transactions, transfers, and movements',
      icon: ArrowPathIcon,
      color: 'green',
    },
    {
      id: 'stores' as ReportType,
      name: 'Store Report',
      description: 'View store information and statistics',
      icon: BuildingStorefrontIcon,
      color: 'purple',
    },
    {
      id: 'boxes' as ReportType,
      name: 'Box Report',
      description: 'View box information and contents',
      icon: ArchiveBoxIcon,
      color: 'orange',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <DocumentChartBarIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Advanced Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Generate and export detailed reports in PDF or Word format
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Type Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <FunnelIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Report Type
                </h2>
              </div>

              <div className="space-y-3">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = filters.reportType === type.id;
                  
                  return (
                    <motion.button
                      key={type.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFilters({ ...filters, reportType: type.id })}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? type.color === 'blue'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                            : type.color === 'green'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg'
                            : type.color === 'purple'
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                            : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected
                            ? type.color === 'blue'
                              ? 'bg-blue-500 text-white'
                              : type.color === 'green'
                              ? 'bg-green-500 text-white'
                              : type.color === 'purple'
                              ? 'bg-purple-500 text-white'
                              : 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold mb-1 ${
                            isSelected
                              ? type.color === 'blue'
                                ? 'text-blue-900 dark:text-blue-100'
                                : type.color === 'green'
                                ? 'text-green-900 dark:text-green-100'
                                : type.color === 'purple'
                                ? 'text-purple-900 dark:text-purple-100'
                                : 'text-orange-900 dark:text-orange-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {type.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Filters and Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">
                Report Filters
              </h2>

              <div className="space-y-6">
                {/* Category Selection */}
                {(filters.reportType === 'inventory' || filters.reportType === 'transactions') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Categories (Optional)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      {categories.map((category) => (
                        <label
                          key={category.category_id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filters.categoryIds.includes(category.category_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newCategoryIds = [...filters.categoryIds, category.category_id];
                                setFilters({
                                  ...filters,
                                  categoryIds: newCategoryIds,
                                  // Don't reset typeIds immediately - let useEffect handle it
                                });
                              } else {
                                const newCategoryIds = filters.categoryIds.filter(id => id !== category.category_id);
                                setFilters({
                                  ...filters,
                                  categoryIds: newCategoryIds,
                                  // Reset typeIds when all categories are unchecked
                                  typeIds: newCategoryIds.length === 0 ? [] : filters.typeIds,
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {category.category_name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Item Type Selection - Only show when categories are selected */}
                {(filters.reportType === 'inventory' || filters.reportType === 'transactions') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Item Types (Optional)
                      {filters.categoryIds.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          - Showing types for selected categories
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      {filters.categoryIds.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full text-center py-4">
                          👆 Please select categories first to see available item types
                        </p>
                      ) : itemTypes.length > 0 ? (
                        itemTypes.map((type) => (
                          <label
                            key={type.type_id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filters.typeIds.includes(type.type_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters({
                                    ...filters,
                                    typeIds: [...filters.typeIds, type.type_id],
                                  });
                                } else {
                                  setFilters({
                                    ...filters,
                                    typeIds: filters.typeIds.filter(id => id !== type.type_id),
                                  });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {type.type_name}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full text-center py-4">
                          No types found for selected categories
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Store Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stores (Optional)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {stores.map((store) => (
                      <label
                        key={store.store_id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.storeIds.includes(store.store_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({
                                ...filters,
                                storeIds: [...filters.storeIds, store.store_id],
                              });
                            } else {
                              setFilters({
                                ...filters,
                                storeIds: filters.storeIds.filter(id => id !== store.store_id),
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {store.store_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                {(filters.reportType === 'transactions' || filters.reportType === 'boxes') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <CalendarIcon className="w-4 h-4 inline mr-1" />
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <CalendarIcon className="w-4 h-4 inline mr-1" />
                        To Date
                      </label>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Inventory-specific filters */}
                {filters.reportType === 'inventory' && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.includeLowStock}
                        onChange={(e) => setFilters({ ...filters, includeLowStock: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Include Low Stock Items
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.includeOutOfStock}
                        onChange={(e) => setFilters({ ...filters, includeOutOfStock: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Include Out of Stock Items
                      </span>
                    </label>
                  </div>
                )}

                {/* Generate Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateReport}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Report...</span>
                    </>
                  ) : (
                    <>
                      <EyeIcon className="w-6 h-6" />
                      <span>Preview Report</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Preview Modal */}
        <ReportPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          reportData={reportData}
          reportType={filters.reportType}
          reportTitle={reportTitle}
        />
      </div>
    </div>
  );
}

