'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, FolderIcon, FunnelIcon, Squares2X2Icon, ListBulletIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { categoryService, Category, itemTypeService, ItemType } from '@/lib/categories';
import CategoryCard from '@/components/categories/CategoryCard';
import CategoryModal from '@/components/categories/CategoryModal';
import DeleteConfirmModal from '@/components/categories/DeleteConfirmModal';
import ItemTypeModal from '@/components/categories/ItemTypeModal';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'created'>('name');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [itemTypeModalMode, setItemTypeModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategoryForItemType, setSelectedCategoryForItemType] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error: any) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (force = false) => {
    if (!selectedCategory) return;

    try {
      const result = await categoryService.delete(selectedCategory.category_id, force);
      if (result.success) {
        toast.success(result.message);
        fetchCategories();
        setShowDeleteModal(false);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const handleSave = async (categoryData: any) => {
    try {
      if (modalMode === 'create') {
        await categoryService.create(categoryData);
        toast.success('Category created successfully');
      } else if (selectedCategory) {
        await categoryService.update(selectedCategory.category_id, categoryData);
        toast.success('Category updated successfully');
      }
      fetchCategories();
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const filteredCategories = categories.filter(
    (cat) =>
      (cat.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || cat.status === statusFilter)
  );

  const handleSelectCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(catId => catId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === filteredCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map(cat => cat.category_id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return;
    
    try {
      for (const id of selectedCategories) {
        await categoryService.delete(id, true);
      }
      toast.success(`${selectedCategories.length} categories deleted`);
      setSelectedCategories([]);
      fetchCategories();
    } catch (error: any) {
      toast.error('Failed to delete categories');
    }
  };

  const handleExport = () => {
    const data = filteredCategories.map(cat => ({
      name: cat.category_name,
      description: cat.description || '',
      status: cat.status,
      color: cat.color,
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Categories exported successfully');
  };

  const sortedCategories = filteredCategories.sort((a, b) => {
    if (sortBy === 'name') {
      return a.category_name.localeCompare(b.category_name);
    } else if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    } else {
      return 0; // created date sorting can be added later
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center transition-colors">
        <div className="w-8 h-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-3 sm:p-4 md:p-6 lg:p-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="mb-3 sm:mb-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Category Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage inventory categories and item types
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Advanced Filters & Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm dark:shadow-xl dark:shadow-black/20">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <FunnelIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="flex-1 sm:w-auto px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <ArrowsUpDownIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'created')}
                className="flex-1 sm:w-auto px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
              >
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
                <option value="created">Sort by Created</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white dark:bg-gray-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCategories.length} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              Delete Selected
            </button>
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              {selectedCategories.length === filteredCategories.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}

      </div>

      {/* Categories Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sortedCategories.map((category) => (
              <div key={category.category_id} className="relative">
                {selectedCategories.includes(category.category_id) && (
                  <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-blue-600 rounded border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div
                  onClick={() => handleSelectCategory(category.category_id)}
                  className={`cursor-pointer ${selectedCategories.includes(category.category_id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <CategoryCard
                    category={category}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleExpand={(id) =>
                      setExpandedCategory(expandedCategory === id ? null : id)
                    }
                    isExpanded={expandedCategory === category.category_id}
                    index={0}
                    onAddItemType={handleAddItemType}
                    onEditItemType={handleEditItemType}
                    onDeleteItemType={handleDeleteItemType}
                  />
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 shadow-sm dark:shadow-xl dark:shadow-black/20">
          {sortedCategories.map((category) => (
              <div
                key={category.category_id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedCategories.includes(category.category_id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.category_id)}
                    onChange={() => handleSelectCategory(category.category_id)}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center dark:bg-opacity-20"
                        style={{ backgroundColor: `${category.color || '#3b82f6'}15` }}
                      >
                        <FolderIcon
                          className="w-5 h-5"
                          style={{ color: category.color || '#3b82f6' }}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.category_name}</h3>
                        {category.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{category.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      category.status === 'active'
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                    }`}>
                      {category.status}
                    </span>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Empty State */}
      {sortedCategories.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-xl dark:shadow-black/20">
          <FolderIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">No categories found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first category to get started'}
          </p>
        </div>
      )}

      {/* Modals */}
      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        mode={modalMode}
        category={selectedCategory}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        category={selectedCategory}
      />

      {/* Item Type Modal */}
      <ItemTypeModal
        isOpen={showItemTypeModal}
        onClose={() => {
          setShowItemTypeModal(false);
          setSelectedItemType(null);
          setSelectedCategoryForItemType(null);
        }}
        onSave={handleSaveItemType}
        mode={itemTypeModalMode}
        categoryId={selectedCategoryForItemType || 0}
        itemType={selectedItemType}
      />
    </div>
  );

  function handleAddItemType(categoryId: number) {
    setSelectedCategoryForItemType(categoryId);
    setSelectedItemType(null);
    setItemTypeModalMode('create');
    setShowItemTypeModal(true);
  }

  function handleEditItemType(categoryId: number, itemType: ItemType) {
    setSelectedCategoryForItemType(categoryId);
    setSelectedItemType(itemType);
    setItemTypeModalMode('edit');
    setShowItemTypeModal(true);
  }

  async function handleDeleteItemType(categoryId: number, typeId: number) {
    try {
      await itemTypeService.delete(typeId);
      toast.success('Item type deleted successfully');
      // Refresh categories to update counts
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete item type');
    }
  }

  async function handleSaveItemType(data: any) {
    if (!selectedCategoryForItemType) return;

    try {
      if (itemTypeModalMode === 'create') {
        // Ensure category_id is included in the data
        const createData = { ...data, category_id: selectedCategoryForItemType };
        await itemTypeService.create(selectedCategoryForItemType, createData);
        toast.success('Item type created successfully');
      } else if (selectedItemType) {
        // For update, remove category_id as it shouldn't change
        const { category_id, ...updateData } = data;
        await itemTypeService.update(selectedItemType.type_id, updateData);
        toast.success('Item type updated successfully');
      }
      setShowItemTypeModal(false);
      setSelectedItemType(null);
      setSelectedCategoryForItemType(null);
      // Refresh categories to update counts
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save item type');
      throw error;
    }
  }

}

