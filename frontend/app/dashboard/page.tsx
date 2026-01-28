'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CubeIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  ArchiveBoxIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { inventoryService, stockTransactionsService, itemsService } from '@/lib/api/items';
import { storesService } from '@/lib/api/stores';
import { boxesService } from '@/lib/api/boxes';
import { categoryService, itemTypeService } from '@/lib/categories';
import { safeToast } from '@/lib/utils/safeToast';

interface DashboardStats {
  totalItems: number;
  totalQuantity: number;
  totalStores: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalBoxes: number;
  pendingCheckInBoxes: number;
  checkedInBoxes: number;
  totalTransactions: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalQuantity: 0,
    totalStores: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalBoxes: 0,
    pendingCheckInBoxes: 0,
    checkedInBoxes: 0,
    totalTransactions: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [storeData, setStoreData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [inventoryData, storesData, boxesResponse, transactionsData, categoriesData, itemsData, itemTypesData] = await Promise.all([
        inventoryService.list({ limit: 1000 }),
        storesService.list({ status: 'active' }),
        boxesService.list({ limit: 1000 }), // Load all boxes without status filter
        stockTransactionsService.list({ limit: 100 }),
        categoryService.getAll({ status: 'active' }),
        itemsService.list({ limit: 1000, status: 'active' }),
        itemTypeService.getAll({ limit: 1000, status: 'active' }),
      ]);

      // Calculate stats
      const inventory = Array.isArray(inventoryData) ? inventoryData : [];
      const stores = Array.isArray(storesData) ? storesData : [];
      // boxesService.list() returns axios response object, need to extract .data property
      // Same pattern as receiving page: allBoxesResponse.data || []
      const boxes = Array.isArray(boxesResponse?.data) 
        ? boxesResponse.data 
        : (Array.isArray(boxesResponse) ? boxesResponse : []);
      const transactions = Array.isArray(transactionsData) ? transactionsData : [];
      const categories = Array.isArray(categoriesData) ? categoriesData : [];
      const items = Array.isArray(itemsData) ? itemsData : [];
      const itemTypes = Array.isArray(itemTypesData) ? itemTypesData : [];
      
      // Debug: Log boxes data structure
      console.log('Dashboard Data Extraction:', {
        boxesResponseType: typeof boxesResponse,
        boxesResponseIsArray: Array.isArray(boxesResponse),
        boxesResponseHasData: !!boxesResponse?.data,
        boxesResponseDataIsArray: Array.isArray(boxesResponse?.data),
        boxesLength: boxes.length,
        sampleBox: boxes[0],
      });

      // Debug logging (commented out to reduce console noise)
      // console.log('Dashboard Data Loaded:', {
      //   inventory: inventory.length,
      //   stores: stores.length,
      //   boxes: boxes.length,
      //   transactions: transactions.length,
      //   categories: categories.length,
      //   items: items.length,
      //   itemTypes: itemTypes.length,
      //   sampleItem: items[0],
      //   sampleItemType: itemTypes[0],
      // });

      // Calculate unique items (by item_id)
      const uniqueItemIds = new Set(inventory.map(inv => inv.item_id));
      const totalQuantity = inventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
      
      // Count low stock items
      const lowStockItemIds = new Set(
        inventory
          .filter(inv => {
            const qty = inv.quantity || 0;
            const minLevel = inv.min_level || 10;
            return qty > 0 && qty < minLevel;
          })
          .map(inv => inv.item_id)
      );

      // Count out of stock items
      const outOfStockItemIds = new Set(
        inventory
          .filter(inv => (inv.quantity || 0) === 0)
          .map(inv => inv.item_id)
      );

      // Box stats from inventory (unique box references)
      const uniqueBoxReferences = new Set(
        inventory
          .filter(inv => inv.box_reference || inv.box_id)
          .map(inv => inv.box_reference || `BOX-${inv.box_id}`)
      );
      const totalBoxesFromInventory = uniqueBoxReferences.size;

      // Box stats from boxes table (for pending/checked in)
      // Filter boxes by status - ensure we're checking the correct property
      const pendingCheckInBoxes = boxes.filter(box => {
        const status = box?.status || box?.box_status;
        return status === 'pending_checkin';
      }).length;
      
      const checkedInBoxes = boxes.filter(box => {
        const status = box?.status || box?.box_status;
        return status === 'checked_in';
      }).length;
      
      // Debug logging for boxes
      console.log('Dashboard Box Stats Debug:', {
        boxesResponseType: typeof boxesResponse,
        boxesResponseIsArray: Array.isArray(boxesResponse),
        boxesResponseHasData: !!boxesResponse?.data,
        boxesArrayLength: boxes.length,
        boxesArray: boxes.slice(0, 3),
        pendingCheckIn: pendingCheckInBoxes,
        checkedIn: checkedInBoxes,
        allBoxStatuses: boxes.map(b => ({ 
          id: b?.box_id, 
          code: b?.box_code, 
          status: b?.status,
          hasStatus: 'status' in (b || {})
        }))
      });

      setStats({
        totalItems: uniqueItemIds.size,
        totalQuantity,
        totalStores: stores.length,
        lowStockItems: lowStockItemIds.size,
        outOfStockItems: outOfStockItemIds.size,
        totalBoxes: totalBoxesFromInventory, // Count from inventory
        pendingCheckInBoxes,
        checkedInBoxes,
        totalTransactions: transactions.length,
      });

      // Process monthly data (last 6 months)
      const monthlyStats = processMonthlyData(transactions);
      setMonthlyData(monthlyStats);

      // Process category data
      const categoryStats = processCategoryData(inventory, categories, items, itemTypes);
      setCategoryData(categoryStats);

      // Process store data
      const storeStats = processStoreData(inventory, stores);
      setStoreData(storeStats);

      // Recent transactions (last 10)
      const recent = transactions
        .slice(0, 10)
        .map(txn => ({
          ...txn,
          created_at: txn.created_at,
        }))
        .sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
      setRecentTransactions(recent);

      // Top items by quantity - aggregate by item_name and item_code to combine same items
      // Use combination of item_name and item_code as key to aggregate same items from different boxes
      const itemQuantities = new Map<string, { item_id: number; item_name: string; item_code: string; totalQty: number }>();
      inventory.forEach(inv => {
        // Create key from item_name and item_code to aggregate same items
        const key = `${inv.item_name || 'Unknown'}_${inv.item_code || 'N/A'}`;
        const current = itemQuantities.get(key) || {
          item_id: inv.item_id,
          item_name: inv.item_name || 'Unknown',
          item_code: inv.item_code || 'N/A',
          totalQty: 0,
        };
        current.totalQty += (inv.quantity || 0);
        // Keep the first item_id encountered for this item
        itemQuantities.set(key, current);
      });
      
      const topItemsList = Array.from(itemQuantities.values())
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 5);
      setTopItems(topItemsList);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to load dashboard data';
      safeToast.error(errorMessage);
      
      // Set default values to prevent UI errors
      setStats({
        totalItems: 0,
        totalQuantity: 0,
        totalStores: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalBoxes: 0,
        pendingCheckInBoxes: 0,
        checkedInBoxes: 0,
        totalTransactions: 0,
      });
      setCategoryData([]);
      setStoreData([]);
      setMonthlyData([]);
      setRecentTransactions([]);
      setTopItems([]);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (transactions: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyStats: { [key: string]: { stockIn: number; stockOut: number; transfer: number } } = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = months[date.getMonth()];
      monthlyStats[monthKey] = { stockIn: 0, stockOut: 0, transfer: 0 };
    }

    // Process transactions
    transactions.forEach(txn => {
      const txnDate = new Date(txn.created_at || txn.transaction_date || Date.now());
      const monthKey = months[txnDate.getMonth()];
      
      if (monthlyStats[monthKey]) {
        if (txn.transaction_type === 'stock_in') {
          monthlyStats[monthKey].stockIn += (txn.quantity || 0);
        } else if (txn.transaction_type === 'stock_out') {
          monthlyStats[monthKey].stockOut += (txn.quantity || 0);
        } else if (txn.transaction_type === 'transfer_in' || txn.transaction_type === 'transfer_out') {
          monthlyStats[monthKey].transfer += (txn.quantity || 0);
        }
      }
    });

    return Object.entries(monthlyStats).map(([month, data]) => ({
      month,
      ...data,
    }));
  };

  const processCategoryData = (inventory: any[], categories: any[], items: any[], itemTypes: any[]) => {
    try {
      const categoryMap = new Map<number, { name: string; quantity: number; color: string; gradient: { from: string; to: string } }>();
      // Modern professional color palette with gradients
      const colorPalette = [
        { color: '#6366f1', gradient: { from: '#6366f1', to: '#8b5cf6' } }, // Indigo to Purple
        { color: '#10b981', gradient: { from: '#10b981', to: '#059669' } }, // Emerald
        { color: '#f59e0b', gradient: { from: '#f59e0b', to: '#d97706' } }, // Amber
        { color: '#ef4444', gradient: { from: '#ef4444', to: '#dc2626' } }, // Red
        { color: '#8b5cf6', gradient: { from: '#8b5cf6', to: '#7c3aed' } }, // Purple
        { color: '#ec4899', gradient: { from: '#ec4899', to: '#db2777' } }, // Pink
        { color: '#06b6d4', gradient: { from: '#06b6d4', to: '#0891b2' } }, // Cyan
        { color: '#14b8a6', gradient: { from: '#14b8a6', to: '#0d9488' } }, // Teal
        { color: '#f97316', gradient: { from: '#f97316', to: '#ea580c' } }, // Orange
        { color: '#3b82f6', gradient: { from: '#3b82f6', to: '#2563eb' } }, // Blue
      ];

      // Initialize category map
      if (Array.isArray(categories)) {
        categories.forEach((cat, idx) => {
          if (cat?.category_id && cat?.category_name) {
            const palette = colorPalette[idx % colorPalette.length];
            categoryMap.set(cat.category_id, {
              name: cat.category_name,
              quantity: 0,
              color: palette.color,
              gradient: palette.gradient,
            });
          }
        });
      }

      // Create type_name -> category_id mapping from itemTypes
      const typeNameToCategoryMap = new Map<string, number>();
      if (Array.isArray(itemTypes)) {
        itemTypes.forEach(type => {
          if (type?.category_id && type?.type_name) {
            typeNameToCategoryMap.set(type.type_name, type.category_id);
          }
        });
      }

      // Create item_id -> category_id mapping using items' type_name
      const itemToCategoryMap = new Map<number, number>();
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item?.type_name && item?.item_id) {
            const categoryId = typeNameToCategoryMap.get(item.type_name);
            if (categoryId) {
              itemToCategoryMap.set(item.item_id, categoryId);
            }
          }
        });
      }

      // Process inventory and aggregate by category
      if (Array.isArray(inventory)) {
        inventory.forEach(inv => {
          if (inv?.item_id && inv?.quantity !== undefined) {
            const categoryId = itemToCategoryMap.get(inv.item_id);
            if (categoryId && categoryMap.has(categoryId)) {
              const cat = categoryMap.get(categoryId)!;
              cat.quantity += (inv.quantity || 0);
            }
          }
        });
      }

      const result = Array.from(categoryMap.values())
        .filter(cat => cat.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity);
      
      return result;
    } catch (error) {
      console.error('Error processing category data:', error);
      return [];
    }
  };

  const processStoreData = (inventory: any[], stores: any[]) => {
    const storeMap = new Map<number, { name: string; quantity: number; items: number }>();

    stores.forEach(store => {
      storeMap.set(store.store_id, {
        name: store.store_name,
        quantity: 0,
        items: 0,
      });
    });

    const uniqueItemsPerStore = new Map<number, Set<number>>();

    inventory.forEach(inv => {
      if (inv.store_id && storeMap.has(inv.store_id)) {
        const store = storeMap.get(inv.store_id)!;
        store.quantity += (inv.quantity || 0);
        
        if (!uniqueItemsPerStore.has(inv.store_id)) {
          uniqueItemsPerStore.set(inv.store_id, new Set());
        }
        uniqueItemsPerStore.get(inv.store_id)!.add(inv.item_id);
      }
    });

    // Update item counts
    uniqueItemsPerStore.forEach((itemIds, storeId) => {
      if (storeMap.has(storeId)) {
        storeMap.get(storeId)!.items = itemIds.size;
      }
    });

    return Array.from(storeMap.values())
      .filter(store => store.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
        return ArrowDownTrayIcon;
      case 'stock_out':
        return ArrowUpTrayIcon;
      case 'transfer_in':
      case 'transfer_out':
        return ArrowsRightLeftIcon;
      default:
        return ChartBarIcon;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'stock_in':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'stock_out':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      case 'transfer_in':
      case 'transfer_out':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  };

  const abbreviateItemName = (name: string): string => {
    if (!name) return '';
    const words = name.trim().split(/\s+/);
    if (words.length <= 2) return name.toUpperCase();
    return words.map(word => word.charAt(0).toUpperCase()).join('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
  {
    name: 'Total Items',
      value: stats.totalItems.toLocaleString(),
      change: `${stats.totalStores} stores`,
      changeType: 'positive' as const,
    icon: CubeIcon,
    gradient: 'from-blue-500 to-blue-600',
      link: '/inventory',
    },
    {
      name: 'Total Quantity',
      value: stats.totalQuantity.toLocaleString(),
      change: `${stats.totalStores} stores`,
      changeType: 'positive' as const,
      icon: ChartBarIcon,
      gradient: 'from-green-500 to-green-600',
      link: '/inventory',
  },
  {
    name: 'Total Stores',
      value: stats.totalStores.toString(),
      change: `${stats.checkedInBoxes} boxes checked in`,
      changeType: 'positive' as const,
    icon: ShoppingBagIcon,
    gradient: 'from-purple-500 to-purple-600',
      link: '/locations',
  },
  {
    name: 'Low Stock',
      value: stats.lowStockItems.toString(),
      change: `${stats.outOfStockItems} out of stock`,
      changeType: stats.lowStockItems > 0 ? 'negative' as const : 'positive' as const,
    icon: ExclamationTriangleIcon,
      gradient: 'from-orange-500 to-orange-600',
      link: '/inventory',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 pb-20 lg:pb-6 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Overview of your inventory system
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {statsCards.map((stat, index) => (
            <Link key={stat.name} href={stat.link || '#'}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all p-3 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{stat.name}</p>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {stat.value}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stat.change}
              </p>
            </motion.div>
            </Link>
          ))}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Boxes</p>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                <ArchiveBoxIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalBoxes}</p>
          </motion.div>

          <Link href="/receiving?status=pending_checkin" prefetch={false}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all p-3 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Pending Check-In</p>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pendingCheckInBoxes}</p>
            </motion.div>
          </Link>

          <Link href="/receiving?status=checked_in" prefetch={false}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all p-3 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Checked In</p>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.checkedInBoxes}</p>
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Transactions</p>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <ChartBarIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTransactions}</p>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <Link href="/inventory">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg hover:shadow-md transition-all cursor-pointer border border-blue-200 dark:border-blue-800"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <ArrowDownTrayIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Stock In</span>
              </motion.div>
            </Link>

            <Link href="/inventory">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg hover:shadow-md transition-all cursor-pointer border border-purple-200 dark:border-purple-800"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <ArrowUpTrayIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Stock Out</span>
              </motion.div>
            </Link>

            <Link href="/inventory">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg hover:shadow-md transition-all cursor-pointer border border-green-200 dark:border-green-800"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                  <ArrowsRightLeftIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Transfer</span>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Monthly Trend</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Stock movements over time</p>
              </div>
            </div>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:stroke-gray-700" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                    className="dark:fill-gray-400" 
                    stroke="#d1d5db"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                    className="dark:fill-gray-400" 
                    stroke="#d1d5db"
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload) {
                        return (
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                            <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 mb-1">
                              {payload[0]?.payload.month}
                            </p>
                            <div className="space-y-1">
                              {payload.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.value || 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="stockIn"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 4 }}
                    name="Stock In"
                  />
                  <Line
                    type="monotone"
                    dataKey="stockOut"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 3 }}
                    activeDot={{ r: 4 }}
                    name="Stock Out"
                  />
                  <Line
                    type="monotone"
                    dataKey="transfer"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 4 }}
                    name="Transfer"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                <p className="text-xs">No transaction data</p>
              </div>
            )}
          </motion.div>

          {/* Category Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Category Distribution</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Inventory by category</p>
              </div>
            </div>
            {categoryData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="quantity"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload;
                          const total = categoryData.reduce((sum, cat) => sum + cat.quantity, 0);
                          const percentage = ((data.quantity / total) * 100).toFixed(1);
                          return (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                              <p className="font-semibold text-xs text-gray-900 dark:text-gray-100">{data.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {data.quantity.toLocaleString()} ({percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {categoryData.slice(0, 4).map((entry, index) => {
                    const total = categoryData.reduce((sum, cat) => sum + cat.quantity, 0);
                    const percentage = ((entry.quantity / total) * 100).toFixed(0);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{entry.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                <p className="text-xs">No category data</p>
              </div>
            )}
          </motion.div>

          {/* Store Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 rounded-lg border border-gray-200 dark:border-gray-700 p-4 relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 dark:bg-blue-800/10 rounded-full blur-2xl -z-0" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Store Performance</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Inventory distribution across stores</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  <BuildingStorefrontIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {storeData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart 
                      data={storeData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 45 }}
                    >
                      <defs>
                        <linearGradient id="quantityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="itemsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e5e7eb" 
                        className="dark:stroke-gray-700" 
                        opacity={0.2}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} 
                        className="dark:fill-gray-400" 
                        stroke="#d1d5db"
                        angle={-25}
                        textAnchor="end"
                        height={55}
                        interval={0}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} 
                        className="dark:fill-gray-400" 
                        stroke="#d1d5db"
                        width={45}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-3 min-w-[180px]">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <p className="font-bold text-xs text-gray-900 dark:text-gray-100">{data.name}</p>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded bg-gradient-to-br from-blue-500 to-blue-600"></div>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Quantity:</span>
                                    </div>
                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">{data.quantity.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded bg-gradient-to-br from-emerald-500 to-emerald-600"></div>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Items:</span>
                                    </div>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{data.items}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                        iconType="square"
                        formatter={(value) => (
                          <span className="text-xs text-gray-700 dark:text-gray-300">{value}</span>
                        )}
                      />
                      <Bar 
                        dataKey="quantity" 
                        fill="url(#quantityGradient)" 
                        name="Total Quantity"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                      />
                      <Bar 
                        dataKey="items" 
                        fill="url(#itemsGradient)" 
                        name="Unique Items"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Summary stats */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Stores</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{storeData.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Quantity</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {storeData.reduce((sum, store) => sum + store.quantity, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <BuildingStorefrontIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">No store data</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Top Items Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/10 rounded-lg border border-gray-200 dark:border-gray-700 p-4 relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 dark:bg-purple-800/10 rounded-full blur-2xl -z-0" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top Items</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Highest quantity items</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                  <CubeIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {topItems.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart 
                      data={topItems.slice(0, 5).map(item => ({
                        ...item,
                        abbreviatedName: abbreviateItemName(item.item_name || '')
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 5, left: 50, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="topItemsGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#ec4899" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e5e7eb" 
                        className="dark:stroke-gray-700" 
                        opacity={0.2}
                        horizontal={false}
                      />
                      <XAxis 
                        type="number"
                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} 
                        className="dark:fill-gray-400" 
                        stroke="#d1d5db"
                        width={50}
                      />
                      <YAxis 
                        type="category"
                        dataKey="abbreviatedName"
                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} 
                        className="dark:fill-gray-400" 
                        stroke="#d1d5db"
                        width={50}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-2 min-w-[150px]">
                                <p className="font-bold text-xs text-gray-900 dark:text-gray-100 mb-1">
                                  {data.item_name}
                                </p>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Quantity:</span>
                                    <span className="font-bold text-purple-600 dark:text-purple-400 text-xs">
                                      {data.totalQty.toLocaleString()}
                                    </span>
                                  </div>
                                  {data.item_code && (
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Code:</span>
                                      <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
                                        {data.item_code}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="totalQty" 
                        fill="url(#topItemsGradient)" 
                        name="Quantity"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Summary */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Top {topItems.length} items</p>
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {topItems.reduce((sum, item) => sum + item.totalQty, 0).toLocaleString()} total
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <CubeIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">No items data</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

          {/* Top Items List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-xl dark:shadow-black/20 p-4 md:p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Top Items by Quantity</h3>
            {topItems.length > 0 ? (
              <div className="space-y-3">
                {topItems.map((item, index) => (
                  <div key={item.item_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                          {item.item_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.item_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.totalQty.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">qty</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                <p>No data available</p>
              </div>
            )}
          </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-xl dark:shadow-black/20 p-4 md:p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">Recent Activity</h3>
            <Link href="/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              View All
            </Link>
          </div>

          {recentTransactions.length > 0 ? (
          <div className="space-y-3">
              {recentTransactions.map((txn, index) => {
                const Icon = getTransactionIcon(txn.transaction_type || '');
                const colorClass = getTransactionColor(txn.transaction_type || '');
                return (
              <motion.div
                    key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + index * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                    <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {txn.transaction_type?.replace('_', ' ').toUpperCase() || 'Transaction'}: {txn.item_name || 'Unknown Item'} x {txn.quantity || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {txn.from_store_name && `From: ${txn.from_store_name}`}
                        {txn.to_store_name && ` → To: ${txn.to_store_name}`}
                        {!txn.from_store_name && !txn.to_store_name && txn.store_name && `Store: ${txn.store_name}`}
                        {' • '}
                        {formatTimeAgo(txn.created_at || txn.transaction_date || Date.now())}
                      </p>
                </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      txn.transaction_type === 'stock_in' 
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                        : txn.transaction_type === 'stock_out'
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      {txn.transaction_type === 'stock_in' ? '+' : txn.transaction_type === 'stock_out' ? '-' : '↔'}
                      {txn.quantity || 0}
                </span>
              </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p>No recent transactions</p>
          </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
