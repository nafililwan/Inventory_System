'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PlusIcon,
  MinusIcon,
  AdjustmentsHorizontalIcon,
  QrCodeIcon,
  TrashIcon,
  CheckIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  TagIcon,
  ArchiveBoxIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { inventoryService, Inventory, stockTransactionsService, StockTransaction } from '@/lib/api/items';
import { storesService, Store } from '@/lib/api/stores';
import { categoryService, Category, itemTypeService, ItemType } from '@/lib/categories';
import { boxesService, Box } from '@/lib/api/boxes';
import StockTransactionModal from '@/components/items/StockTransactionModal';
import StockInModal from '@/components/items/StockInModal';
import StockOutModal from '@/components/items/StockOutModal';
import BulkTransferModal from '@/components/items/BulkTransferModal';
import BulkStockOutModal from '@/components/items/BulkStockOutModal';
import StockOutDetailsModal from '@/components/items/StockOutDetailsModal';
import InventoryDetailsModal from '@/components/items/InventoryDetailsModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import { safeToast } from '@/lib/utils/safeToast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'stock_out';
type InventoryViewMode = 'stock_in' | 'all' | 'stock_out'; // Stock In (default), All, atau Stock Out
type SortBy = 'name' | 'quantity' | 'store' | 'code' | 'box' | 'created_at';

interface AdvancedFilters {
  search: string;
  storeIds: number[];
  categoryIds: number[];
  boxIds: number[];
  status: StatusFilter[];
  minQuantity: number | null;
  maxQuantity: number | null;
  dateFrom: string;
  dateTo: string;
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  groupByBox: boolean;
}

interface BulkOperation {
  type: 'delete' | 'stock_in' | 'stock_out' | 'transfer' | 'status_change';
  isActive: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStockStatus(quantity: number, minLevel: number) {
  // Check if item is stock out (quantity = 0)
  if (quantity === 0) {
    return {
      label: 'Stock Out',
      color: 'red',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircleIcon,
    };
  }
  
  // Items with quantity > 0 but below min level
  if (quantity < minLevel) {
    return {
      label: 'Low Stock',
      color: 'yellow',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: ExclamationTriangleIcon,
    };
  }
  
  // Items with quantity >= min level
  return {
    label: 'In Stock',
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: CheckCircleIcon,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InventoryPage() {
  const router = useRouter();
  
  // State Management
  const [allInventory, setAllInventory] = useState<Inventory[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<Inventory[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showStoresDropdown, setShowStoresDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showBoxesDropdown, setShowBoxesDropdown] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
  const [showBulkStockOutModal, setShowBulkStockOutModal] = useState(false);
  const [showStockOutDetailsModal, setShowStockOutDetailsModal] = useState(false);
  const [selectedStockOutItem, setSelectedStockOutItem] = useState<Inventory | null>(null);
  const [showInventoryDetailsModal, setShowInventoryDetailsModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<Inventory | null>(null);
  const [showReviveConfirm, setShowReviveConfirm] = useState(false);
  const [pendingReviveInventory, setPendingReviveInventory] = useState<Inventory | null>(null);
  const [pendingReviveQuantity, setPendingReviveQuantity] = useState<number>(0);
  const [pendingReviveBoxRef, setPendingReviveBoxRef] = useState<string>('');
  const [reviving, setReviving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [transactionType, setTransactionType] = useState<'stock_in' | 'stock_out' | 'adjustment' | 'transfer_out'>('stock_in');
  
  // Multi-select state
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>({ type: 'delete', isActive: false });
  const [groupByBoxMode, setGroupByBoxMode] = useState(true); // Default: operasi berdasarkan box
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    forceDelete?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    forceDelete: false,
  });

  // Advanced Filter State
  const [filters, setFilters] = useState<AdvancedFilters>({
    search: '',
    storeIds: [],
    categoryIds: [],
    boxIds: [],
    status: ['all'],
    minQuantity: null,
    maxQuantity: null,
    dateFrom: '',
    dateTo: '',
    sortBy: 'name',
    sortOrder: 'asc',
    groupByBox: false,
  });
  
  // UI State
  const [hideOutOfStock, setHideOutOfStock] = useState(false); // Hide items with quantity = 0
  const [inventoryViewMode, setInventoryViewMode] = useState<InventoryViewMode>('stock_in'); // Default: hanya tunjukkan stock in (quantity > 0)

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStoresDropdown(false);
        setShowCategoriesDropdown(false);
        setShowBoxesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inventoryData, storesData, categoriesData, itemTypesData, boxesResponse] = await Promise.all([
        inventoryService.list({ limit: 1000 }),
        storesService.list({ status: 'active' }),
        categoryService.getAll(),
        itemTypeService.getAll({ status: 'active' }),
        boxesService.list({ limit: 1000 }),
      ]);

      setAllInventory(inventoryData || []);
      setStores(storesData || []);
      setCategories(categoriesData || []);
      setItemTypes(itemTypesData || []);
      // Handle boxes response - axios returns { data: array }
      const boxesData = boxesResponse?.data || boxesResponse || [];
      setBoxes(Array.isArray(boxesData) ? boxesData : []);
    } catch (error: unknown) {
      let errorMsg = 'Failed to load inventory';
      try {
        if (error instanceof Error) {
          errorMsg = error.message || errorMsg;
        }
      } catch {
        // Use default message
      }
      safeToast.error(errorMsg);
      setAllInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ADVANCED FILTERING & SORTING
  // ============================================================================

  useEffect(() => {
    applyAdvancedFilters();
  }, [filters, allInventory]);

  // Clear selection when switching to Stock Out view to prevent auto-select
  useEffect(() => {
    if (inventoryViewMode === 'stock_out') {
      setSelectedInventoryIds(new Set());
    }
  }, [inventoryViewMode]);

  const applyAdvancedFilters = useCallback(() => {
    let filtered = [...allInventory];

    // View Mode Filter: Stock In vs All vs Stock Out
    // Default: only show items with quantity > 0 (stock in items)
    // Note: Don't filter by quantity here if status filter includes 'stock_out'
    // Let the status filter handle it
    const hasStockOutFilter = filters.status.includes('stock_out') && !filters.status.includes('all');
    
    if (inventoryViewMode === 'stock_in' && !hasStockOutFilter) {
      filtered = filtered.filter((inv) => (inv.quantity || 0) > 0);
    } else if (inventoryViewMode === 'stock_out') {
      // Stock Out view: only show items with quantity = 0 (stocked out)
      filtered = filtered.filter((inv) => (inv.quantity || 0) === 0);
    }
    // If 'all', show all items with quantity > 0 (default behavior)
    // Items with quantity = 0 only appear if view mode = 'stock_out' or status filter = 'stock_out'
    if (inventoryViewMode === 'all' && !hasStockOutFilter) {
      filtered = filtered.filter((inv) => (inv.quantity || 0) > 0);
    }

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.item_name?.toLowerCase().includes(query) ||
          inv.item_code?.toLowerCase().includes(query) ||
          inv.size?.toLowerCase().includes(query) ||
          inv.year_code?.toLowerCase().includes(query) ||
          inv.store_name?.toLowerCase().includes(query) ||
          inv.box_reference?.toLowerCase().includes(query)
      );
    }

    // Multi-store filter
    if (filters.storeIds.length > 0) {
      filtered = filtered.filter((inv) => filters.storeIds.includes(inv.store_id));
    }

    // Multi-category filter
    if (filters.categoryIds.length > 0) {
      const typesInCategories = itemTypes.filter((type) => 
        filters.categoryIds.includes(type.category_id)
      );
      const typeNames = new Set(typesInCategories.map((type) => type.type_name.toLowerCase()));
      filtered = filtered.filter((inv) => {
        if (!inv.item_name) return false;
        const itemNameLower = inv.item_name.toLowerCase();
        return Array.from(typeNames).some((typeName) => itemNameLower.startsWith(typeName));
      });
    }

    // Multi-box filter
    if (filters.boxIds.length > 0) {
      filtered = filtered.filter((inv) => 
        inv.box_id && filters.boxIds.includes(inv.box_id)
      );
    }

    // Items with quantity = 0 are always excluded (already filtered above)

    // Multi-status filter
    if (!filters.status.includes('all')) {
      filtered = filtered.filter((inv) => {
        const qty = inv.quantity || 0;
        const minLevel = inv.min_level || 10;
        const statuses = filters.status;
        
        // Filter by stock_out (quantity = 0)
        if (statuses.includes('stock_out') && qty === 0) return true;
        // Filter by low_stock and in_stock (quantity > 0)
        if (statuses.includes('low_stock') && qty > 0 && qty < minLevel) return true;
        if (statuses.includes('in_stock') && qty > 0 && qty >= minLevel) return true;
        return false;
      });
    }

    // Quantity range filter
    if (filters.minQuantity !== null) {
      filtered = filtered.filter((inv) => (inv.quantity || 0) >= filters.minQuantity!);
    }
    if (filters.maxQuantity !== null) {
      filtered = filtered.filter((inv) => (inv.quantity || 0) <= filters.maxQuantity!);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return invDate >= fromDate;
      });
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return invDate <= toDate;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (filters.sortBy) {
        case 'name':
          aVal = a.item_name || '';
          bVal = b.item_name || '';
          break;
        case 'quantity':
          aVal = a.quantity || 0;
          bVal = b.quantity || 0;
          break;
        case 'store':
          aVal = a.store_name || '';
          bVal = b.store_name || '';
          break;
        case 'code':
          aVal = a.item_code || '';
          bVal = b.item_code || '';
          break;
        case 'box':
          aVal = a.box_reference || '';
          bVal = b.box_reference || '';
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return filters.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // IMPORTANT: Do NOT deduplicate items from different boxes
    // Each box should have its own inventory record, even if item_id is the same
    // Backend now creates separate inventory records for each box checkin
    // Frontend should preserve all records - use inventory_id as unique identifier
    
    // Only filter out items with quantity=0 from source store after transfer (if not in stock_out view)
    if (inventoryViewMode === 'stock_out') {
      // For Stock Out view: deduplicate by item_id (show only one record per item with qty=0)
      const deduplicated = filtered.reduce((acc, inv) => {
        const key = inv.item_id;
        const existing = acc.get(key);
        
        if (!existing) {
          acc.set(key, inv);
        } else {
          // Prefer the most recent one
          const existingDate = new Date(existing.updated_at || existing.created_at).getTime();
          const currentDate = new Date(inv.updated_at || inv.created_at).getTime();
          if (currentDate > existingDate) {
            acc.set(key, inv);
          }
        }
        return acc;
      }, new Map<number, Inventory>());
      
      filtered = Array.from(deduplicated.values());
    } else {
      // For Stock In/All view: Keep ALL inventory records from different boxes
      // Only remove items with quantity=0 from source store after transfer
      filtered = filtered.filter(inv => {
        const qty = inv.quantity || 0;
        
        // Keep all items with quantity > 0
        if (qty > 0) {
          return true;
        }
        
        // For items with quantity=0, check if there's another record for same item_id+store_id with quantity > 0
        // If yes, this is likely from source store after transfer - remove it
        // If no, keep it (might be the only record)
        const hasOtherRecord = filtered.some(other => 
          other.inventory_id !== inv.inventory_id &&
          other.item_id === inv.item_id &&
          other.store_id === inv.store_id &&
          (other.quantity || 0) > 0
        );
        
        // Keep if no other record exists, remove if other record exists
        return !hasOtherRecord;
      });
    }

    // Note: Items remain separate per box - we don't aggregate them
    // Total quantity is calculated in stats, but items are displayed separately

    // Group by box if enabled (after aggregation)
    if (filters.groupByBox) {
      const grouped = new Map<string | number, Inventory[]>();
      filtered.forEach((inv) => {
        const key = inv.box_id || inv.box_reference || 'no-box';
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(inv);
      });
      // Flatten grouped items (box items first, then others)
      const groupedArray: Inventory[] = [];
      grouped.forEach((items) => {
        groupedArray.push(...items);
      });
      filtered = groupedArray;
    }

    setFilteredInventory(filtered);
  }, [filters, allInventory, itemTypes, hideOutOfStock, inventoryViewMode]);

  // ============================================================================
  // STATISTICS & COMPUTED VALUES
  // ============================================================================

  // Calculate total quantity per item (for items that appear in multiple boxes)
  const itemTotals = useMemo(() => {
    const totals = new Map<number, number>();
    const inventory = Array.isArray(filteredInventory) ? filteredInventory : [];
    inventory.forEach(inv => {
      if (!inv || inv.item_id == null) return;
      const currentTotal = totals.get(inv.item_id) || 0;
      totals.set(inv.item_id, currentTotal + (inv.quantity || 0));
    });
    return totals;
  }, [filteredInventory]);

  const stats = useMemo(() => {
    // Safety check: ensure filteredInventory is an array
    const inventory = Array.isArray(filteredInventory) ? filteredInventory : [];
    
    // Count unique items (by item_id) - same item from different boxes counts as 1 item
    const uniqueItemIds = new Set(inventory.map(inv => inv?.item_id).filter(id => id != null));
    const totalItems = uniqueItemIds.size;
    
    // Total quantity: sum ALL quantities including same items from different boxes
    // Example: BOX-2025-0001 Size S (50) + BOX-2025-0002 Size S (30) = 80 total quantity
    const totalQuantity = inventory.reduce((sum, inv) => sum + (inv?.quantity || 0), 0);
    
    // Count unique items that are in stock
    const inStockItemIds = new Set(
      inventory
        .filter((inv) => {
          if (!inv) return false;
          const qty = inv.quantity || 0;
          const minLevel = inv.min_level || 10;
          return qty > 0 && qty >= minLevel;
        })
        .map(inv => inv?.item_id)
        .filter(id => id != null)
    );
    const inStock = inStockItemIds.size;
    
    // Count unique items that are low stock
    const lowStockItemIds = new Set(
      inventory
        .filter((inv) => {
          if (!inv) return false;
          const qty = inv.quantity || 0;
          const minLevel = inv.min_level || 10;
          return qty > 0 && qty < minLevel;
        })
        .map(inv => inv?.item_id)
        .filter(id => id != null)
    );
    const lowStock = lowStockItemIds.size;
    
    const uniqueBoxes = new Set(inventory.filter(inv => inv?.box_id).map(inv => inv?.box_id).filter(id => id != null)).size;

    return { totalItems, totalQuantity, inStock, lowStock, uniqueBoxes };
  }, [filteredInventory, allInventory]);

  // Group inventory by box for display - always compute, return empty map if not grouping
  const groupedByBox = useMemo(() => {
    if (!filters.groupByBox) {
      return new Map<string | number, Inventory[]>();
    }
    
    const groups = new Map<string | number, Inventory[]>();
    const inventory = Array.isArray(filteredInventory) ? filteredInventory : [];
    inventory.forEach((inv) => {
      if (!inv) return;
      const key = inv.box_id || inv.box_reference || 'no-box';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(inv);
    });
    return groups;
  }, [filteredInventory, filters.groupByBox]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.storeIds.length > 0) count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.boxIds.length > 0) count++;
    if (!filters.status.includes('all')) count++;
    if (filters.minQuantity !== null) count++;
    if (filters.maxQuantity !== null) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.groupByBox) count++;
    return count;
  }, [filters]);

  // ============================================================================
  // BULK SELECTION OPERATIONS
  // ============================================================================

  // Helper: Get all inventory IDs with same box
  const getInventoryIdsByBox = (inventoryId: number): number[] => {
    const selectedInv = allInventory.find(inv => inv.inventory_id === inventoryId);
    if (!selectedInv || (!selectedInv.box_id && !selectedInv.box_reference)) {
      return [inventoryId]; // Return only this item if no box
    }
    
    // In Stock Out view, allow expansion for items with quantity = 0
    // In other views, only expand for items with quantity > 0
    if (inventoryViewMode !== 'stock_out' && (selectedInv.quantity || 0) <= 0) {
      return []; // Don't expand selection for items with no stock (except in Stock Out view)
    }
    
    // Find all items with same box_id or box_reference
    // In Stock Out view, include items with quantity = 0
    // In other views, only include items with quantity > 0 (available stock)
    // AND only from the same store as the selected item (to avoid duplicates after transfer)
    const boxId = selectedInv.box_id;
    const boxRef = selectedInv.box_reference;
    const selectedStoreId = selectedInv.store_id;
    
    return allInventory
      .filter(inv => {
        const sameBox = (boxId && inv.box_id === boxId) || (boxRef && inv.box_reference === boxRef);
        const sameStore = inv.store_id === selectedStoreId;
        // In Stock Out view, include items with quantity = 0
        // In other views, only include items with quantity > 0
        const hasStock = inventoryViewMode === 'stock_out' ? true : (inv.quantity || 0) > 0;
        return sameBox && sameStore && hasStock;
      })
      .map(inv => inv.inventory_id);
  };

  const handleSelectInventory = (inventoryId: number) => {
    const inv = allInventory.find(inv => inv.inventory_id === inventoryId);
    if (!inv) {
      return;
        }

    // In Stock Out view, allow selection of items with quantity = 0
    // In other views, only allow selection of items with quantity > 0
    if (inventoryViewMode !== 'stock_out' && (inv.quantity || 0) <= 0) {
      // Don't allow selection of items with no stock (except in Stock Out view)
      return;
    }
    
    setSelectedInventoryIds((prev) => {
      const newSet = new Set(prev);
      
      if (groupByBoxMode) {
        // Get all items with same box (only items with quantity > 0)
        const boxItemIds = getInventoryIdsByBox(inventoryId);
        const allSelected = boxItemIds.every(id => newSet.has(id));
        
        if (allSelected) {
          // Deselect all items in the box
          boxItemIds.forEach(id => newSet.delete(id));
        } else {
          // Select all items in the box
          boxItemIds.forEach(id => newSet.add(id));
          }
        } else {
        // Normal selection (single item)
        if (newSet.has(inventoryId)) {
          newSet.delete(inventoryId);
          } else {
          newSet.add(inventoryId);
        }
      }
      
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // In Stock Out view, allow selection of all items (including quantity = 0)
    // In other views, only select items with quantity > 0
    const inventory = Array.isArray(filteredInventory) ? filteredInventory : [];
    const availableItems = inventoryViewMode === 'stock_out' 
      ? inventory 
      : inventory.filter(inv => inv && (inv.quantity || 0) > 0);
    const availableIds = new Set(availableItems.map((inv) => inv?.inventory_id).filter(id => id != null));
    
    // Check if all available items are selected
    const allSelected = availableIds.size > 0 && Array.from(availableIds).every(id => selectedInventoryIds.has(id));
    
    if (allSelected) {
      setSelectedInventoryIds(new Set());
    } else {
      setSelectedInventoryIds(availableIds);
    }
  };

  const handleSelectByBox = (boxId: number | string) => {
    const inventory = Array.isArray(filteredInventory) ? filteredInventory : [];
    const boxItems = inventory.filter((inv) => 
      inv && (inv.box_id === boxId || inv.box_reference === boxId) &&
      (inv.quantity || 0) > 0 // Only include items with available stock
    );
    const boxItemIds = new Set(boxItems.map((inv) => inv?.inventory_id).filter(id => id != null));
    
    setSelectedInventoryIds((prev) => {
      const newSet = new Set(prev);
      boxItemIds.forEach((id) => {
        if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      });
      return newSet;
    });
  };

  const handleSelectByStatus = (status: StatusFilter) => {
    // Just toggle the filter, don't auto-select items
    toggleStatusFilter(status);
  };

  const handleSelectByStore = (storeId: number) => {
    const inventory = Array.isArray(filteredInventory) ? filteredInventory : [];
    const storeItems = inventory.filter((inv) => inv && inv.store_id === storeId);
    const storeItemIds = new Set(storeItems.map((inv) => inv?.inventory_id).filter(id => id != null));
    
    setSelectedInventoryIds((prev) => {
      const newSet = new Set(prev);
      storeItemIds.forEach((id) => {
        if (newSet.has(id)) {
          newSet.delete(id);
    } else {
          newSet.add(id);
    }
      });
      return newSet;
    });
  };

  // ============================================================================
  // BULK DELETE OPERATIONS
  // ============================================================================

  const performBulkDelete = async (force: boolean): Promise<{ success: boolean; needsForce: boolean }> => {
    if (selectedInventoryIds.size === 0) {
      return { success: false, needsForce: false };
    }

    const idsArray = Array.from(selectedInventoryIds);
    const count = idsArray.length;

    setIsDeleting(true);
    
    try {
      await inventoryService.bulkDelete(idsArray, force);
      safeToast.success(`Successfully deleted ${count} inventory record(s)`);
      setSelectedInventoryIds(new Set());
      await fetchData();
      return { success: true, needsForce: false };
      
    } catch (err: unknown) {
      let errorMsg = 'Failed to delete inventory records';
      try {
        if (err instanceof Error) {
          errorMsg = err.message || errorMsg;
      }
      } catch {
        // Use default message
      }
      
      const needsForce = errorMsg.toLowerCase().includes('transaction') && !force;

      // Only show error toast if it's not a force delete case
      // If needsForce is true, we'll show the force delete modal instead
      if (!needsForce) {
      safeToast.error(errorMsg);
      }

      return { success: false, needsForce };
      
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = (force = false) => {
    if (selectedInventoryIds.size === 0) {
      safeToast.error('No items selected');
      return;
    }

    // Get box information for selected items
    const selectedItems = allInventory.filter(inv => selectedInventoryIds.has(inv.inventory_id));
    const boxGroups = new Map<string | number, number>();
    selectedItems.forEach(inv => {
      const boxKey = inv.box_id || inv.box_reference || 'no-box';
      boxGroups.set(boxKey, (boxGroups.get(boxKey) || 0) + 1);
    });
    const boxCount = boxGroups.size;
    const totalBoxItems = Array.from(boxGroups.values()).reduce((sum, count) => sum + count, 0);

    const count = selectedInventoryIds.size;
    const title = force ? 'Force Delete Inventory Records' : 'Delete Inventory Records';
    let message = force
      ? `Are you sure you want to force delete ${count} inventory record(s)?`
      : `Are you sure you want to delete ${count} inventory record(s)?`;
    
    if (boxCount > 0 && boxCount < selectedItems.length) {
      message += `\n\nThis will affect ${boxCount} box(es) with ${totalBoxItems} item(s).`;
    }
    
    message += '\n\nThis action cannot be undone.';

    setConfirmModal({
      isOpen: true,
      title,
      message,
      forceDelete: force,
      onConfirm: async () => {
        try {
          const result = await performBulkDelete(force);
          
          if (result.success) {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          } else if (result.needsForce && !force) {
            // Instead of closing and reopening modal, update the existing modal to force delete
            const selectedItems = allInventory.filter(inv => selectedInventoryIds.has(inv.inventory_id));
            const boxGroups = new Map<string | number, number>();
            selectedItems.forEach(inv => {
              const boxKey = inv.box_id || inv.box_reference || 'no-box';
              boxGroups.set(boxKey, (boxGroups.get(boxKey) || 0) + 1);
            });
            const boxCount = boxGroups.size;
            const totalBoxItems = Array.from(boxGroups.values()).reduce((sum, count) => sum + count, 0);
            const count = selectedInventoryIds.size;
            
            setConfirmModal(prev => ({
              ...prev,
              title: 'Force Delete Inventory Records',
              message: `Are you sure you want to force delete ${count} inventory record(s)?\n\n⚠️ Warning: These records have existing transactions. Force delete will permanently remove all associated data.${boxCount > 0 && boxCount < selectedItems.length ? `\n\nThis will affect ${boxCount} box(es) with ${totalBoxItems} item(s).` : ''}\n\nThis action cannot be undone.`,
              forceDelete: true,
              onConfirm: async () => {
                try {
                  const forceResult = await performBulkDelete(true);
                  if (forceResult.success) {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }
                } catch (err: unknown) {
                  console.error('Force delete error:', err instanceof Error ? err.message : 'Unknown error');
                }
              },
            }));
          }
        } catch (err: unknown) {
          console.error('Bulk delete error:', err instanceof Error ? err.message : 'Unknown error');
        }
      },
    });
  };

  // Handle single inventory delete (for Stock Out Details Modal)
  const handleDeleteSingleInventory = async (inventoryId: number, force = false): Promise<void> => {
    try {
      await inventoryService.delete(inventoryId, force);
      safeToast.success('Inventory record deleted successfully');
      setSelectedInventoryIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(inventoryId);
        return newSet;
      });
      await fetchData();
    } catch (err: unknown) {
      let errorMsg = 'Failed to delete inventory record';
      try {
        if (err instanceof Error) {
          errorMsg = err.message || errorMsg;
        }
      } catch {
        // Use default message
      }
      
      const needsForce = errorMsg.toLowerCase().includes('transaction') && !force;
      if (needsForce) {
        // Try force delete
        if (window.confirm('This inventory record has transactions. Do you want to force delete it?')) {
          await handleDeleteSingleInventory(inventoryId, true);
          return;
        }
      }
      throw new Error(errorMsg);
    }
  };

  // ============================================================================
  // TRANSACTION HANDLERS
  // ============================================================================

  const handleStockIn = (itemId: number, storeId: number) => {
    setSelectedItem(itemId);
    setSelectedStore(storeId);
    setTransactionType('stock_in');
    setShowTransactionModal(true);
  };

  const handleStockOut = (itemId: number, storeId: number) => {
    const invItem = allInventory.find(
      (inv) => inv.item_id === itemId && inv.store_id === storeId
    );
    
    const availableQty = invItem?.available_quantity ?? invItem?.quantity ?? 0;
    
    setSelectedItem(itemId);
    setSelectedStore(storeId);
    setTransactionType('stock_out');
    setShowTransactionModal(true);
  };

  const handleReviveStockOut = async (inv: Inventory) => {
    try {
      // Find latest stock_out transaction to get details for confirmation
      const transactions = await stockTransactionsService.list({
        item_id: inv.item_id,
        store_id: inv.store_id,
        transaction_type: 'stock_out',
        limit: 1,
      });

      if (!transactions || transactions.length === 0) {
        safeToast.error('No stock out transaction found to revive');
        return;
      }

      const latestStockOut = transactions[0];

      if (!latestStockOut.box_id) {
        safeToast.error('Cannot revive: No box associated with this stock out');
        return;
      }

      // Store data and show confirmation modal
      setPendingReviveInventory(inv);
      setPendingReviveQuantity(latestStockOut.quantity);
      setPendingReviveBoxRef(inv.box_reference || `BOX-${latestStockOut.box_id}`);
      setShowReviveConfirm(true);
    } catch (error: any) {
      console.error('Error loading revive data:', error);
      safeToast.error('Failed to load stock out details');
    }
  };

  const handleReviveConfirm = async () => {
    if (!pendingReviveInventory) return;

    setReviving(true);
    setShowReviveConfirm(false);

    try {
      const inv = pendingReviveInventory;

      // Find latest stock_out transaction for this item and store
      const transactions = await stockTransactionsService.list({
        item_id: inv.item_id,
        store_id: inv.store_id,
        transaction_type: 'stock_out',
        limit: 10,
      });

      if (!transactions || transactions.length === 0) {
        safeToast.error('No stock out transaction found to revive');
        setReviving(false);
        setPendingReviveInventory(null);
        return;
      }

      // Get the most recent stock_out transaction
      const latestStockOut = transactions[0]; // Already sorted by created_at desc

      if (!latestStockOut.box_id) {
        safeToast.error('Cannot revive: No box associated with this stock out');
        setReviving(false);
        setPendingReviveInventory(null);
        return;
      }

      // Create stock_in transaction to restore quantity
      // Note: We don't check box status - stock_in transaction will restore quantity regardless
      // Box status update can be handled separately if needed
      await stockTransactionsService.create({
        transaction_type: 'stock_in',
        item_id: inv.item_id,
        to_store_id: inv.store_id,
        quantity: latestStockOut.quantity, // Positive quantity to add back
        box_id: latestStockOut.box_id,
        reference_number: inv.box_reference || `BOX-${latestStockOut.box_id}`,
        reference_type: 'REVIVE',
        notes: `Revived from stock out transaction ${latestStockOut.transaction_id}`,
      });

      safeToast.success('Stock out revived successfully!');
      
      // Refresh data
      await fetchData();
      
      // Reset state
      setPendingReviveInventory(null);
      setPendingReviveQuantity(0);
      setPendingReviveBoxRef('');
    } catch (error: any) {
      console.error('Error reviving stock out:', error);
      safeToast.error(error?.message || 'Failed to revive stock out');
    } finally {
      setReviving(false);
    }
  };

  const handleAdjustment = (itemId: number, storeId: number) => {
    setSelectedItem(itemId);
    setSelectedStore(storeId);
    setTransactionType('adjustment');
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async (transactionData?: any) => {
    try {
      if (transactionData) {
        if (!transactionData.item_id || transactionData.item_id === 0) {
          throw new Error('Item ID is required');
        }
        if (!transactionData.quantity || transactionData.quantity === 0) {
          throw new Error('Quantity must be greater than 0');
        }
        if (!transactionData.store_id && !transactionData.from_store_id && !transactionData.to_store_id) {
          throw new Error('Store ID is required');
        }

        const payload: any = {
          transaction_type: transactionData.transaction_type || 'stock_out',
          item_id: transactionData.item_id,
          quantity: Math.abs(transactionData.quantity),
        };

        if (transactionData.transaction_type === 'transfer_out') {
          payload.from_store_id = transactionData.from_store_id || transactionData.store_id;
          payload.to_store_id = transactionData.to_store_id;
          if (!payload.from_store_id || !payload.to_store_id) {
            throw new Error('Both From Store and To Store are required for Transfer');
          }
        } else {
          const storeId = transactionData.store_id || transactionData.from_store_id || transactionData.to_store_id;
          if (transactionData.transaction_type === 'stock_out') {
            payload.from_store_id = storeId;
          } else if (transactionData.transaction_type === 'stock_in') {
            payload.to_store_id = storeId;
          } else {
            payload.from_store_id = storeId;
          }
        }

        if (transactionData.reference_number) payload.reference_number = transactionData.reference_number;
        if (transactionData.reference_type) payload.reference_type = transactionData.reference_type;
        if (transactionData.notes) payload.notes = transactionData.notes;

        await stockTransactionsService.create(payload);
        
        // Clear selection after successful transaction
        setSelectedInventoryIds(new Set());
        
        // Handle different transaction types
        if (transactionData.transaction_type === 'transfer_out') {
          // Transfer: Item pindah ke store lain, tetap ada stock, tidak jadi stock out
          const fromStore = stores.find(s => s.store_id === (transactionData.from_store_id || transactionData.store_id));
          const toStore = stores.find(s => s.store_id === transactionData.to_store_id);
          safeToast.success(
            `Successfully transferred ${transactionData.quantity} item(s) from ${fromStore?.store_name || 'store'} to ${toStore?.store_name || 'store'}`
          );
          // Tetap di Stock In view - item masih ada stock di store baru
          setInventoryViewMode('stock_in');
          safeToast.info('Items have been transferred to the new store. Cards will appear in the destination store.');
        } else if (transactionData.transaction_type === 'stock_out') {
          // Stock Out: Item quantity jadi 0, akan hilang dari Stock In view
          const fromStore = stores.find(s => s.store_id === (transactionData.from_store_id || transactionData.store_id));
          safeToast.success(`Successfully stock out ${transactionData.quantity} item(s) from ${fromStore?.store_name || 'store'}`);
          // Switch ke Stock In view - card yang sudah di-stock out akan hilang (quantity = 0)
          setInventoryViewMode('stock_in');
          safeToast.info('Items have been stocked out. Cards removed from Stock In view. Use "Stock Out" filter to view them.');
        } else {
          safeToast.success('Stock transaction completed successfully!');
        }
      }
      await fetchData();
    } catch (error: unknown) {
      let errorMsg = 'Failed to save transaction';
      try {
        if (error instanceof Error) {
          errorMsg = error.message || errorMsg;
          }
        } catch {
        // Use default message
      }
      safeToast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setShowTransactionModal(false);
      setSelectedItem(null);
      setSelectedStore(null);
    }
  };

  // Helper: Expand selection to include all items with same box
  const expandSelectionByBox = () => {
    if (!groupByBoxMode) return;
    
    const currentSelected = Array.from(selectedInventoryIds);
    const expandedIds = new Set<number>();
    
    // Only expand for items with quantity > 0
    currentSelected.forEach(invId => {
      const inv = allInventory.find(inv => inv.inventory_id === invId);
      if (inv && (inv.quantity || 0) > 0) {
        const boxItemIds = getInventoryIdsByBox(invId);
        boxItemIds.forEach(id => expandedIds.add(id));
      }
    });
    
    // Remove any items with quantity = 0 from expanded selection
    const finalExpandedIds = Array.from(expandedIds).filter(id => {
      const inv = allInventory.find(inv => inv.inventory_id === id);
      return inv && (inv.quantity || 0) > 0;
    });
    
    if (finalExpandedIds.length > currentSelected.length) {
      setSelectedInventoryIds(new Set(finalExpandedIds));
      safeToast.success(`Expanded selection to ${finalExpandedIds.length} items (same box)`);
    } else {
      // If no expansion happened, ensure we only have items with quantity > 0
      const validSelected = currentSelected.filter(id => {
        const inv = allInventory.find(inv => inv.inventory_id === id);
        return inv && (inv.quantity || 0) > 0;
      });
      if (validSelected.length !== currentSelected.length) {
        setSelectedInventoryIds(new Set(validSelected));
      }
    }
  };

  const handleBulkStockIn = () => {
    if (selectedInventoryIds.size === 0) return;
    
    // Auto-expand selection by box if enabled
    if (groupByBoxMode) {
      expandSelectionByBox();
      // Wait a bit for state update, then proceed
      setTimeout(() => {
    setTransactionType('stock_in');
    setSelectedItem(null);
    setSelectedStore(null);
    setShowTransactionModal(true);
      }, 200);
      return;
    }

    setTransactionType('stock_in');
    setSelectedItem(null);
    setSelectedStore(null);
    setShowTransactionModal(true);
  };

  const handleBulkStockOut = () => {
    if (selectedInventoryIds.size === 0) {
      safeToast.error('No items selected');
      return;
    }

    // Auto-expand selection by box if enabled
    if (groupByBoxMode) {
      expandSelectionByBox();
      setTimeout(() => {
        // Filter, deduplicate, and ensure only items with quantity > 0
        const filtered = allInventory.filter(inv => 
          selectedInventoryIds.has(inv.inventory_id) && (inv.quantity || 0) > 0
        );
        
        // Deduplicate by item_id + store_id to avoid duplicates after transfer
        const deduplicated = filtered.reduce((acc, inv) => {
          const key = `${inv.item_id}_${inv.store_id}`;
          const existing = acc.get(key);
          if (!existing || (inv.quantity || 0) > (existing.quantity || 0)) {
            acc.set(key, inv);
          }
          return acc;
        }, new Map<string, Inventory>());
        
        const selectedInventories = Array.from(deduplicated.values());
        
        if (selectedInventories.length === 0) {
          safeToast.error('No valid items with stock selected');
          return;
        }
        setShowBulkStockOutModal(true);
      }, 200);
      return;
    }

    // Filter, deduplicate, and ensure only items with quantity > 0
    const filtered = allInventory.filter(inv => 
      selectedInventoryIds.has(inv.inventory_id) && (inv.quantity || 0) > 0
    );
    
    // Deduplicate by item_id + store_id to avoid duplicates after transfer
    const deduplicated = filtered.reduce((acc, inv) => {
      const key = `${inv.item_id}_${inv.store_id}`;
      const existing = acc.get(key);
      if (!existing || (inv.quantity || 0) > (existing.quantity || 0)) {
        acc.set(key, inv);
      }
      return acc;
    }, new Map<string, Inventory>());
    
    const selectedInventories = Array.from(deduplicated.values());

    if (selectedInventories.length === 0) {
      safeToast.error('No valid items with stock selected');
      return;
    }

    setShowBulkStockOutModal(true);
  };

  const handleBulkTransfer = () => {
    if (selectedInventoryIds.size === 0) {
      safeToast.error('No items selected');
      return;
    }

    // Auto-expand selection by box if enabled
    if (groupByBoxMode) {
      expandSelectionByBox();
      setTimeout(() => {
    const selectedInventories = allInventory.filter(inv => 
          selectedInventoryIds.has(inv.inventory_id) && (inv.quantity || 0) > 0 // Only include items with available stock
        );
        if (selectedInventories.length === 0) {
          safeToast.error('No valid items with stock selected');
          return;
        }
        setShowBulkTransferModal(true);
      }, 200);
      return;
    }

    const selectedInventories = allInventory.filter(inv => 
      selectedInventoryIds.has(inv.inventory_id) && (inv.quantity || 0) > 0 // Only include items with available stock
    );

    if (selectedInventories.length === 0) {
      safeToast.error('No valid items with stock selected');
      return;
    }

    setShowBulkTransferModal(true);
  };

  // ============================================================================
  // FILTER HELPERS
  // ============================================================================

  const toggleStoreFilter = (storeId: number) => {
    setFilters(prev => ({
      ...prev,
      storeIds: prev.storeIds.includes(storeId)
        ? prev.storeIds.filter(id => id !== storeId)
        : [...prev.storeIds, storeId]
    }));
  };

  const toggleCategoryFilter = (categoryId: number) => {
    setFilters(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  const toggleBoxFilter = (boxId: number) => {
    setFilters(prev => ({
      ...prev,
      boxIds: prev.boxIds.includes(boxId)
        ? prev.boxIds.filter(id => id !== boxId)
        : [...prev.boxIds, boxId]
    }));
  };

  const toggleStatusFilter = (status: StatusFilter) => {
    setFilters(prev => {
      if (status === 'all') {
        setInventoryViewMode('stock_in');
        setHideOutOfStock(true);
        return { ...prev, status: ['all' as StatusFilter] };
      }
      
      const newStatus: StatusFilter[] = prev.status.includes('all') 
        ? [status]
        : prev.status.includes(status)
        ? prev.status.filter(s => s !== status) as StatusFilter[]
        : [...prev.status, status];
      
      const finalStatus: StatusFilter[] = newStatus.length === 0 ? ['all' as StatusFilter] : newStatus;
      
      // Update view mode based on status filter
      if (finalStatus.includes('stock_out') && !finalStatus.includes('all')) {
        setInventoryViewMode('stock_out');
        setHideOutOfStock(false);
      } else if (finalStatus.includes('low_stock')) {
        setInventoryViewMode('all');
        setHideOutOfStock(false);
      } else if (finalStatus.includes('in_stock')) {
        setInventoryViewMode('stock_in');
        setHideOutOfStock(false);
      } else {
        setInventoryViewMode('stock_in');
        setHideOutOfStock(true);
      }
      
      return { ...prev, status: finalStatus };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      storeIds: [],
      categoryIds: [],
      boxIds: [],
      status: ['all'],
      minQuantity: null,
      maxQuantity: null,
      dateFrom: '',
      dateTo: '',
      sortBy: 'name',
      sortOrder: 'asc',
      groupByBox: false,
    });
    setSelectedInventoryIds(new Set());
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors pb-safe-bottom lg:pb-0">
      {/* Header */}
      <div className="bg-white dark:bg-dark-bg-light border-b border-gray-200 dark:border-dark-border px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text">
              Advanced Inventory Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary mt-1">
              Professional inventory control with advanced filtering and bulk operations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push('/scan?context=stock_out')}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm touch-manipulation"
            >
              <QrCodeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Scan QR</span>
              <span className="sm:hidden">Scan</span>
            </button>
            <button
              onClick={() => {
                setShowStockInModal(true);
              }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm touch-manipulation"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Stock In</span>
              <span className="sm:hidden">In</span>
            </button>
            <button
              onClick={() => {
                setShowStockOutModal(true);
              }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm touch-manipulation"
            >
              <MinusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Stock Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-bg-light rounded-xl shadow-sm dark:shadow-xl dark:shadow-black/20 border border-gray-200 dark:border-dark-border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text mt-1">{stats.totalItems}</p>
              </div>
              <CubeIcon className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-dark-bg-light rounded-xl shadow-sm dark:shadow-xl dark:shadow-black/20 border border-gray-200 dark:border-dark-border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text mt-1">{stats.totalQuantity}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-dark-bg-light rounded-xl shadow-sm dark:shadow-xl dark:shadow-black/20 border border-green-200 dark:border-green-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">In Stock</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{stats.inStock}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-500 dark:text-green-400 opacity-30" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-dark-bg-light rounded-xl shadow-sm dark:shadow-xl dark:shadow-black/20 border border-yellow-200 dark:border-yellow-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">{stats.lowStock}</p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500 dark:text-yellow-400 opacity-30" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-dark-bg-light rounded-xl shadow-sm dark:shadow-xl dark:shadow-black/20 border border-purple-200 dark:border-purple-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Boxes</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">{stats.uniqueBoxes}</p>
              </div>
              <ArchiveBoxIcon className="w-8 h-8 text-purple-500 dark:text-purple-400 opacity-30" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Compact Filters Panel */}
      <div className="bg-white dark:bg-dark-bg-light border-b border-gray-200 dark:border-dark-border px-4 sm:px-6 py-3">
        {/* Search Bar & Quick Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
          <div className="flex-1 relative min-w-0">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
              placeholder="Search items, codes, stores..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 transition-all"
              />
            </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stores Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => {
                  setShowStoresDropdown(!showStoresDropdown);
                  setShowCategoriesDropdown(false);
                  setShowBoxesDropdown(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  filters.storeIds.length > 0
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <BuildingStorefrontIcon className="w-4 h-4" />
                Stores
                {filters.storeIds.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-600 dark:bg-blue-500 text-white rounded text-[10px] font-bold">
                    {filters.storeIds.length}
                  </span>
                )}
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${showStoresDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showStoresDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {stores.map((store) => (
                      <label key={store.store_id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                        <input
                          type="checkbox"
                          checked={filters.storeIds.includes(store.store_id)}
                          onChange={() => toggleStoreFilter(store.store_id)}
                          className="w-3 h-3 text-blue-600 rounded"
                        />
                        <span className="flex-1">{store.store_name}</span>
                      </label>
                  ))}
                  </div>
                </div>
              )}
            </div>

            {/* Categories Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => {
                  setShowCategoriesDropdown(!showCategoriesDropdown);
                  setShowStoresDropdown(false);
                  setShowBoxesDropdown(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  filters.categoryIds.length > 0
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <TagIcon className="w-4 h-4" />
                Categories
                {filters.categoryIds.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-purple-600 dark:bg-purple-500 text-white rounded text-[10px] font-bold">
                    {filters.categoryIds.length}
                  </span>
                )}
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${showCategoriesDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showCategoriesDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {categories.filter(cat => cat.status === 'active').map((category) => (
                      <label key={category.category_id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                        <input
                          type="checkbox"
                          checked={filters.categoryIds.includes(category.category_id)}
                          onChange={() => toggleCategoryFilter(category.category_id)}
                          className="w-3 h-3 text-purple-600 rounded"
                        />
                        <span className="flex-1">{category.category_name}</span>
                      </label>
                ))}
                  </div>
                </div>
              )}
            </div>

            {/* Boxes Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => {
                  setShowBoxesDropdown(!showBoxesDropdown);
                  setShowStoresDropdown(false);
                  setShowCategoriesDropdown(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  filters.boxIds.length > 0
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <ArchiveBoxIcon className="w-4 h-4" />
                Boxes
                {filters.boxIds.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-600 dark:bg-orange-500 text-white rounded text-[10px] font-bold">
                    {filters.boxIds.length}
                  </span>
                )}
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${showBoxesDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showBoxesDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {boxes.slice(0, 50).map((box) => (
                      <label key={box.box_id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                        <input
                          type="checkbox"
                          checked={filters.boxIds.includes(box.box_id)}
                          onChange={() => toggleBoxFilter(box.box_id)}
                          className="w-3 h-3 text-orange-600 rounded"
                        />
                        <span className="flex-1 font-mono text-[10px]">{box.box_code}</span>
                      </label>
                    ))}
            </div>
                </div>
              )}
          </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 bg-white dark:bg-gray-800">
              {(['all', 'in_stock', 'low_stock', 'stock_out'] as StatusFilter[]).map((status) => {
                const isSelected = filters.status.includes(status);
                const labels = { all: 'All', in_stock: 'In', low_stock: 'Low', stock_out: 'Out' };
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                      isSelected
                        ? status === 'in_stock'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : status === 'low_stock'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : status === 'stock_out'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>

            {/* More Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                activeFiltersCount > 0 || showAdvancedFilters
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              More
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-600 dark:bg-blue-500 text-white rounded text-[10px] font-bold">
                  {activeFiltersCount}
                    </span>
              )}
              {showAdvancedFilters ? (
                <ChevronUpIcon className="w-3 h-3" />
              ) : (
                <ChevronDownIcon className="w-3 h-3" />
              )}
            </button>

            {/* Clear All */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-2 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Clear all filters"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips - Compact */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
                {filters.search}
                <button onClick={() => setFilters({ ...filters, search: '' })}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.storeIds.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px] font-medium">
                {filters.storeIds.length}S
                <button onClick={() => setFilters({ ...filters, storeIds: [] })}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.categoryIds.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">
                {filters.categoryIds.length}C
                <button onClick={() => setFilters({ ...filters, categoryIds: [] })}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.boxIds.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-[10px] font-medium">
                {filters.boxIds.length}B
                <button onClick={() => setFilters({ ...filters, boxIds: [] })}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {!filters.status.includes('all') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-[10px] font-medium">
                {filters.status.length}St
                <button onClick={() => setFilters({ ...filters, status: ['all'] })}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.minQuantity !== null || filters.maxQuantity !== null) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-medium">
                Qty
                <button onClick={() => setFilters({ ...filters, minQuantity: null, maxQuantity: null })}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded text-[10px] font-medium">
                Date
                <button onClick={() => setFilters({ ...filters, dateFrom: '', dateTo: '' })}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
                  )}
                </div>
              )}
              
        {/* Advanced Filters Content - Compact */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100 dark:border-gray-700 mt-3 pt-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Stores Filter - Professional Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        <BuildingStorefrontIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Stores
                      </label>
                      {filters.storeIds.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">
                          {filters.storeIds.length}
                        </span>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                      {stores.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No stores available</p>
                      ) : (
                        stores.map((store) => (
                          <label key={store.store_id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                            <input
                              type="checkbox"
                              checked={filters.storeIds.includes(store.store_id)}
                              onChange={() => toggleStoreFilter(store.store_id)}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                              {store.store_name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                </div>

                {/* Categories Filter - Professional Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        <TagIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Categories
                      </label>
                      {filters.categoryIds.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-bold">
                          {filters.categoryIds.length}
                        </span>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                      {categories.filter(cat => cat.status === 'active').length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No categories available</p>
                      ) : (
                        categories.filter(cat => cat.status === 'active').map((category) => (
                          <label key={category.category_id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                            <input
                              type="checkbox"
                              checked={filters.categoryIds.includes(category.category_id)}
                              onChange={() => toggleCategoryFilter(category.category_id)}
                              className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                              {category.category_name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                </div>

                {/* Boxes Filter - Professional Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        <ArchiveBoxIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        Boxes
                      </label>
                      {filters.boxIds.length > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-[10px] font-bold">
                          {filters.boxIds.length}
                        </span>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                      {boxes.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No boxes available</p>
                      ) : (
                        boxes.map((box) => (
                          <label key={box.box_id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                            <input
                              type="checkbox"
                              checked={filters.boxIds.includes(box.box_id)}
                              onChange={() => toggleBoxFilter(box.box_id)}
                              className="w-3.5 h-3.5 text-orange-600 rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-500"
                            />
                            <span className="flex-1 truncate font-mono text-[11px] text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                              {box.box_code}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                </div>

                {/* Quantity, Date & Sort - Professional Cards */}
                <div className="space-y-3">
                    {/* Quantity Range */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-3">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        <ChartBarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Quantity
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filters.minQuantity || ''}
                            onChange={(e) => setFilters({ ...filters, minQuantity: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="Max"
                            value={filters.maxQuantity || ''}
                            onChange={(e) => setFilters({ ...filters, maxQuantity: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-3">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        <CalendarIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        Date Range
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-3">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        Sort
                      </label>
                      <div className="flex gap-2">
              <select
                          value={filters.sortBy}
                          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as SortBy })}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all"
              >
                          <option value="name">Name</option>
                          <option value="quantity">Quantity</option>
                          <option value="store">Store</option>
                          <option value="code">Code</option>
                          <option value="box">Box</option>
                          <option value="created_at">Date</option>
              </select>
                        <button
                          onClick={() => setFilters({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            filters.sortOrder === 'asc'
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                          {filters.sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
              </div>
            </div>

                    {/* Group by Box */}
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
                      <input
                        type="checkbox"
                        checked={filters.groupByBox}
                        onChange={(e) => setFilters({ ...filters, groupByBox: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <ArchiveBoxIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        Group by Box
                      </span>
                    </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-2">
            {/* View Mode Toggle - Stock In / All */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setInventoryViewMode('stock_in')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  inventoryViewMode === 'stock_in'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Show only items with stock (quantity > 0)"
              >
                Stock In
              </button>
              <button
                onClick={() => {
                  setInventoryViewMode('stock_out');
                  setHideOutOfStock(false);
                  // Clear selection when switching to Stock Out view
                  setSelectedInventoryIds(new Set());
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  inventoryViewMode === 'stock_out'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Show only items that have been stock out (quantity = 0)"
              >
                Stock Out
              </button>
              <button
                onClick={() => setInventoryViewMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  inventoryViewMode === 'all'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Show all items with stock (quantity > 0)"
              >
                All
              </button>
          </div>

                  <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
              {selectedInventoryIds.size === filteredInventory.length && filteredInventory.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
            {(() => {
              // Deduplicate selection count by item_id to avoid counting duplicates
              const uniqueSelectedItems = new Set(
                Array.from(selectedInventoryIds)
                  .map(id => {
                    const inv = allInventory.find(inv => inv.inventory_id === id);
                    return inv ? inv.item_id : null;
                  })
                  .filter(id => id !== null)
              );
              const count = uniqueSelectedItems.size;
              return count > 0 ? (
                <span className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary font-medium">
                  {count} selected
                </span>
              ) : null;
            })()}
            
            {/* Group by Box Mode Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <input
                type="checkbox"
                checked={groupByBoxMode}
                onChange={(e) => setGroupByBoxMode(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
              />
              <ArchiveBoxIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Box Mode</span>
            </label>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 dark:text-gray-400">Quick Filter:</span>
                  <button
              onClick={() => handleSelectByStatus('in_stock')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.status.includes('in_stock') && !filters.status.includes('all')
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
              }`}
              title="Filter and select In Stock items"
                  >
              In Stock
                  </button>
                  <button
              onClick={() => handleSelectByStatus('low_stock')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.status.includes('low_stock') && !filters.status.includes('all')
                  ? 'bg-yellow-500 text-white shadow-sm'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
              }`}
              title="Filter and select Low Stock items"
                  >
              Low Stock
                  </button>
                  <button
              onClick={() => handleSelectByStatus('stock_out')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.status.includes('stock_out') && !filters.status.includes('all')
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
              }`}
              title="Filter and select Stock Out items"
                  >
              Stock Out
                  </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">View:</span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-bg rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-dark-bg-light text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-dark-bg-light text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedInventoryIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-10 bg-blue-600 dark:bg-blue-700 text-white px-4 sm:px-6 py-3 sm:py-4 shadow-lg"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedInventoryIds(new Set())}
                className="p-2 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors"
                title="Clear Selection"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
              <span className="font-semibold">
                {(() => {
                  // Deduplicate selection count by item_id to avoid counting duplicates
                  const uniqueSelectedItems = new Set(
                    Array.from(selectedInventoryIds)
                      .map(id => {
                        const inv = allInventory.find(inv => inv.inventory_id === id);
                        return inv ? inv.item_id : null;
                      })
                      .filter(id => id !== null)
                  );
                  const count = uniqueSelectedItems.size;
                  return `${count} item${count !== 1 ? 's' : ''} selected`;
                })()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleBulkStockIn}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Stock In</span>
                <span className="sm:hidden">In</span>
              </button>
              <button
                onClick={handleBulkStockOut}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <MinusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Stock Out</span>
                <span className="sm:hidden">Out</span>
              </button>
              <button
                onClick={handleBulkTransfer}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Transfer</span>
                <span className="sm:hidden">Move</span>
              </button>
              <button
                onClick={() => handleBulkDelete(false)}
                disabled={isDeleting}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Deleting...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden">Del</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Inventory List */}
      <div className="px-4 sm:px-6 py-6">
        {filteredInventory.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-dark-bg-light rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
          >
            <BuildingStorefrontIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium text-lg mb-2">No inventory found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {activeFiltersCount > 0
                ? 'Try adjusting your filters'
                : 'Start by receiving boxes or adding stock to stores'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
                : 'space-y-3 sm:space-y-4'
            }
          >
            <AnimatePresence>
              {(Array.isArray(filteredInventory) ? filteredInventory : []).map((inv) => {
                if (!inv) return null;
                const minLevel = inv.min_level || 10;
                const stockStatus = getStockStatus(inv.quantity || 0, minLevel);
                const StatusIcon = stockStatus.icon;
                const isSelected = selectedInventoryIds.has(inv.inventory_id);

                return (
                  <motion.div
                    key={inv.inventory_id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white dark:bg-dark-bg-light rounded-xl shadow-sm dark:shadow-xl dark:shadow-black/20 border-2 ${
                      isSelected ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : stockStatus.borderColor
                    } overflow-hidden hover:shadow-md dark:hover:shadow-2xl dark:hover:shadow-black/30 transition-all h-full flex flex-col relative group cursor-pointer`}
                    onClick={(e) => {
                      // Single click: Open details modal (not select)
                      // To select, use checkbox or double-click
                      if (inventoryViewMode === 'stock_out') {
                        // In Stock Out view, open stock out details modal
                        setSelectedStockOutItem(inv);
                        setShowStockOutDetailsModal(true);
                      } else {
                        // In normal view, open inventory details modal
                        setSelectedInventoryItem(inv);
                        setShowInventoryDetailsModal(true);
                      }
                    }}
                    onDoubleClick={(e) => {
                      // Double-click: Toggle selection (for bulk operations)
                      e.stopPropagation();
                      handleSelectInventory(inv.inventory_id);
                    }}
                    title="Click to view details | Double-click to select"
                  >
                    {/* Checkbox for Selection */}
                    <div 
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectInventory(inv.inventory_id);
                      }}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shadow-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' 
                          : 'bg-white dark:bg-dark-bg-light border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}>
                        {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    {/* Status Header */}
                    <div className={`${stockStatus.bgColor} px-4 py-3 border-b ${stockStatus.borderColor} pl-10 relative`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-5 h-5 ${stockStatus.textColor}`} />
                          <span className={`text-sm font-semibold ${stockStatus.textColor}`}>
                            {stockStatus.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end">
                            <span className={`text-xl font-bold ${stockStatus.textColor}`}>
                              {inv.quantity || 0}
                            </span>
                            {/* Show total quantity if item appears in multiple boxes */}
                            {(() => {
                              const totalQty = itemTotals.get(inv.item_id) || 0;
                              const inventory = Array.isArray(filteredInventory) ? filteredInventory : [];
                              const hasMultipleBoxes = inventory.filter(
                                i => i && i.item_id === inv.item_id && i.inventory_id !== inv.inventory_id
                              ).length > 0;
                              
                              if (hasMultipleBoxes && totalQty > (inv.quantity || 0)) {
                                return (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Total: {totalQty}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {/* Delete Button - Mobile: Inline with quantity, Desktop: Absolute */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (groupByBoxMode) {
                                // Select all items with same box, then delete
                                const boxItemIds = getInventoryIdsByBox(inv.inventory_id);
                                setSelectedInventoryIds(new Set(boxItemIds));
                                // Small delay to ensure state is updated
                                setTimeout(() => {
                                  handleBulkDelete(false);
                                }, 100);
                              } else {
                                // Single item delete
                                setSelectedInventoryIds(new Set([inv.inventory_id]));
                                handleBulkDelete(false);
                              }
                            }}
                            className="sm:absolute sm:top-2 sm:right-2 p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg z-10"
                            title={groupByBoxMode ? `Delete all items in box ${inv.box_reference || inv.box_id || 'N/A'}` : "Delete inventory record"}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Item Info */}
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-dark-text mb-1 line-clamp-2">
                          {inv.item_name || 'Unknown Item'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary font-mono mb-2">
                          {inv.item_code || 'N/A'}
                        </p>
                        {(inv.size || inv.year_code || inv.box_reference) && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-dark-text-secondary flex-wrap">
                            {inv.size && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg rounded">Size: {inv.size}</span>
                            )}
                            {inv.year_code && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg rounded">
                                Year: {inv.year_code}
                              </span>
                            )}
                            {inv.box_reference && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (inv.box_id) {
                                  router.push(`/receiving/details?id=${inv.box_id}`);
                                  }
                                }}
                                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-medium"
                                title={`View box ${inv.box_reference} details`}
                              >
                                📦 {inv.box_reference}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Store Info */}
                      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <BuildingStorefrontIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-dark-text-secondary font-medium truncate">
                            {inv.store_name || 'Unknown Store'}
                          </span>
                        </div>
                        {inv.location_in_store && (
                          <div className="text-xs text-gray-500 dark:text-dark-text-secondary pl-5 sm:pl-6 truncate">
                            📍 {inv.location_in_store}
                          </div>
                        )}
                        {inv.reserved_quantity > 0 && (
                          <div className="flex items-center justify-between text-xs pl-5 sm:pl-6">
                            <span className="text-gray-500 dark:text-dark-text-secondary">Reserved:</span>
                            <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                              {inv.reserved_quantity}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs pl-5 sm:pl-6">
                          <span className="text-gray-500 dark:text-dark-text-secondary">Min Level:</span>
                          <span className="text-gray-700 dark:text-dark-text font-semibold">{minLevel}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Revive Button - Only show for stock out items */}
                        {inventoryViewMode === 'stock_out' && (inv.quantity || 0) === 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviveStockOut(inv);
                            }}
                            className="flex-1 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors inline-flex items-center justify-center gap-1"
                            title="Revive stock out - Restore item back to inventory"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Revive</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (groupByBoxMode) {
                                // Select all items with same box, then stock out
                                const boxItemIds = getInventoryIdsByBox(inv.inventory_id);
                                setSelectedInventoryIds(new Set(boxItemIds));
                                setTimeout(() => {
                                  handleBulkStockOut();
                                }, 100);
                              } else {
                                handleStockOut(inv.item_id, inv.store_id);
                              }
                            }}
                            className="flex-1 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors inline-flex items-center justify-center gap-1"
                            title={groupByBoxMode ? `Stock Out all items in box ${inv.box_reference || inv.box_id || 'N/A'}` : "Stock Out"}
                          >
                            <ArrowTrendingDownIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Out</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (groupByBoxMode) {
                              // Select all items with same box, then transfer
                              const boxItemIds = getInventoryIdsByBox(inv.inventory_id);
                              setSelectedInventoryIds(new Set(boxItemIds));
                              setTimeout(() => {
                                handleBulkTransfer();
                              }, 100);
                            } else {
                            setTransactionType('transfer_out');
                            setSelectedItem(inv.item_id);
                            setSelectedStore(inv.store_id);
                            setShowTransactionModal(true);
                            }
                          }}
                          className="flex-1 px-3 py-2 text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors inline-flex items-center justify-center gap-1"
                          title={groupByBoxMode ? `Transfer all items in box ${inv.box_reference || inv.box_id || 'N/A'}` : "Transfer"}
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">Transfer</span>
                        </button>
                        <button
                          onClick={() => handleAdjustment(inv.item_id, inv.store_id)}
                          className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Adjustment"
                        >
                          <span className="text-base font-semibold">±</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Stock Transaction Modal */}
      <StockTransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setSelectedItem(null);
          setSelectedStore(null);
        }}
        onSave={handleSaveTransaction}
        itemId={selectedItem ?? undefined}
        storeId={selectedStore ?? undefined}
        transactionType={transactionType}
        initialQuantity={
          transactionType === 'stock_out' && selectedItem && selectedStore
            ? (() => {
                const invItem = allInventory.find(
                  (inv) => inv.item_id === selectedItem && inv.store_id === selectedStore
                );
                const availableQty = invItem?.available_quantity ?? invItem?.quantity ?? 0;
                return availableQty > 0 ? 1 : 0;
              })()
            : undefined
        }
      />

      {/* Bulk Transfer Modal */}
      <BulkTransferModal
        isOpen={showBulkTransferModal}
        onClose={() => {
          setShowBulkTransferModal(false);
        }}
        onSuccess={async (toStoreId?: number) => {
          // Clear selection after successful transfer
          setSelectedInventoryIds(new Set());
          
          // Refresh data first
          await fetchData();
          
          // Transfer: Item pindah ke store lain, tetap ada stock, tidak jadi stock out
          // Tetap di Stock In view - item masih ada stock di store baru
          setInventoryViewMode('stock_in');
          safeToast.info('Transfer successful! Items have been transferred to the new store. Cards will appear in the destination store.');
        }}
        selectedInventories={(() => {
          // Filter and deduplicate: keep only one record per (item_id, store_id) combination
          // Prefer the one with highest quantity (to avoid duplicates after transfer)
          const filtered = allInventory.filter(inv => 
            selectedInventoryIds.has(inv.inventory_id) && (inv.quantity || 0) > 0
          );
          
          // Deduplicate by item_id + store_id - keep the one with highest quantity
          const deduplicated = filtered.reduce((acc, inv) => {
            const key = `${inv.item_id}_${inv.store_id}`;
            const existing = acc.get(key);
            if (!existing || (inv.quantity || 0) > (existing.quantity || 0)) {
              acc.set(key, inv);
            }
            return acc;
          }, new Map<string, Inventory>());
          
          return Array.from(deduplicated.values());
        })()}
      />

      {/* Bulk Stock Out Modal */}
      <BulkStockOutModal
        isOpen={showBulkStockOutModal}
        onClose={() => {
          setShowBulkStockOutModal(false);
        }}
        onSuccess={async () => {
          // Clear selection after successful stock out
          setSelectedInventoryIds(new Set());
          
          // Refresh data first
          await fetchData();
          
          // Stock Out: Item quantity jadi 0, akan hilang dari Stock In view
          setInventoryViewMode('stock_in');
          safeToast.info('Items have been stocked out. Cards removed from Stock In view. Use "Stock Out" filter to view them.');
        }}
        selectedInventories={(() => {
          // Filter and deduplicate: keep only one record per (item_id, store_id) combination
          // Prefer the one with highest quantity (to avoid duplicates after transfer)
          const filtered = allInventory.filter(inv => 
            selectedInventoryIds.has(inv.inventory_id) && (inv.quantity || 0) > 0
          );
          
          // Deduplicate by item_id + store_id - keep the one with highest quantity
          const deduplicated = filtered.reduce((acc, inv) => {
            const key = `${inv.item_id}_${inv.store_id}`;
            const existing = acc.get(key);
            if (!existing || (inv.quantity || 0) > (existing.quantity || 0)) {
              acc.set(key, inv);
            }
            return acc;
          }, new Map<string, Inventory>());
          
          return Array.from(deduplicated.values());
        })()}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.forceDelete ? "Force Delete" : "Delete"}
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Stock In Modal */}
      <StockInModal
        isOpen={showStockInModal}
        onClose={() => setShowStockInModal(false)}
        onSuccess={() => {
          fetchData();
          setShowStockInModal(false);
        }}
      />

      {/* Stock Out Modal */}
      <StockOutModal
        isOpen={showStockOutModal}
        onClose={() => setShowStockOutModal(false)}
        onSuccess={() => {
          fetchData();
          setShowStockOutModal(false);
        }}
      />

      {/* Stock Out Details Modal */}
      <StockOutDetailsModal
        isOpen={showStockOutDetailsModal}
        onClose={() => {
          setShowStockOutDetailsModal(false);
          setSelectedStockOutItem(null);
        }}
        inventory={selectedStockOutItem}
        onDelete={handleDeleteSingleInventory}
        onRevive={async () => {
          // Refresh data after revive
          await fetchData();
        }}
      />

      {/* Inventory Details Modal */}
      <InventoryDetailsModal
        isOpen={showInventoryDetailsModal}
        onClose={() => {
          setShowInventoryDetailsModal(false);
          setSelectedInventoryItem(null);
        }}
        inventory={selectedInventoryItem}
        allInventory={allInventory}
      />

      {/* Revive Confirmation Modal */}
      <ConfirmModal
        isOpen={showReviveConfirm}
        onClose={() => {
          setShowReviveConfirm(false);
          setPendingReviveInventory(null);
          setPendingReviveQuantity(0);
          setPendingReviveBoxRef('');
        }}
        onConfirm={handleReviveConfirm}
        title="Revive Stock Out"
        message={
          pendingReviveInventory
            ? `Are you sure you want to revive stock out for ${pendingReviveInventory.item_name}?\n\n` +
              `Quantity: ${pendingReviveQuantity}\n` +
              `Box: ${pendingReviveBoxRef}\n\n` +
              `This will restore the item back to inventory.`
            : ''
        }
        confirmText="Revive"
        cancelText="Cancel"
        type="info"
        isLoading={reviving}
      />
    </div>
  );
}
