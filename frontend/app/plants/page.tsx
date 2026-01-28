'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, BuildingOfficeIcon, FunnelIcon, Squares2X2Icon, ListBulletIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { plantService, Plant } from '@/lib/plants';
import PlantCard from '@/components/plants/PlantCard';
import PlantModal from '@/components/plants/PlantModal';
import DeleteConfirmModal from '@/components/plants/DeleteConfirmModal';
import toast from 'react-hot-toast';

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlants, setSelectedPlants] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'created'>('name');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [storesCount, setStoresCount] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await plantService.getAll(params);
      setPlants(data);
      
      // Fetch stores count for each plant
      const counts: Record<number, number> = {};
      for (const plant of data) {
        try {
          const stores = await plantService.getStores(plant.plant_id);
          counts[plant.plant_id] = stores.length;
        } catch (error) {
          counts[plant.plant_id] = 0;
        }
      }
      setStoresCount(counts);
    } catch (error: any) {
      toast.error('Failed to load plants');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedPlant(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEdit = (plant: Plant) => {
    setSelectedPlant(plant);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDelete = (plant: Plant) => {
    setSelectedPlant(plant);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (force = false) => {
    if (!selectedPlant) return;

    try {
      await plantService.delete(selectedPlant.plant_id, force);
      toast.success('Plant deleted successfully');
      fetchPlants();
      setShowDeleteModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete plant');
    }
  };

  const handleSave = async (plantData: any) => {
    try {
      if (modalMode === 'create') {
        await plantService.create(plantData);
        toast.success('Plant created successfully');
      } else if (selectedPlant) {
        await plantService.update(selectedPlant.plant_id, plantData);
        toast.success('Plant updated successfully');
      }
      fetchPlants();
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save plant');
    }
  };

  const handleViewStores = (plant: Plant) => {
    // Navigate to stores page filtered by plant
    window.location.href = `/stores?plant_id=${plant.plant_id}`;
  };

  const filteredPlants = plants.filter(
    (plant) =>
      (plant.plant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.location?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || plant.status === statusFilter)
  );

  const sortedPlants = [...filteredPlants].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.plant_name.localeCompare(b.plant_name);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const handleBulkDelete = async () => {
    if (selectedPlants.length === 0) return;
    
    try {
      for (const plantId of selectedPlants) {
        await plantService.delete(plantId, true);
      }
      toast.success(`${selectedPlants.length} plants deleted successfully`);
      setSelectedPlants([]);
      fetchPlants();
    } catch (error: any) {
      toast.error('Failed to delete some plants');
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Plants</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Manage plant locations</p>
            </div>
            <button
              onClick={handleCreate}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Plant</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm dark:shadow-xl dark:shadow-black/20">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search plants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                />
                <FunnelIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Status Filter */}
              <div className="flex-1 sm:flex-initial">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full sm:w-auto px-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex-1 sm:flex-initial">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'created')}
                  className="w-full sm:w-auto px-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                >
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                  <option value="created">Sort by Created</option>
                </select>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1 self-start bg-white dark:bg-gray-900">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  aria-label="Grid view"
                >
                  <Squares2X2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  aria-label="List view"
                >
                  <ListBulletIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

            </div>
          </div>

          {/* Bulk Actions */}
          {selectedPlants.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedPlants.length} plant(s) selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>

        {/* Mobile Add Button */}
        <button
          onClick={handleCreate}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center z-40 touch-manipulation"
          aria-label="Add Plant"
        >
          <PlusIcon className="w-6 h-6" />
        </button>

        {/* Plants Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedPlants.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
            <BuildingOfficeIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No plants found</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first plant'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Add Plant
              </button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'
                : 'space-y-3 sm:space-y-4'
            }
          >
            {sortedPlants.map((plant, index) => (
              <motion.div
                key={plant.plant_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <PlantCard
                  plant={plant}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewStores={handleViewStores}
                  storesCount={storesCount[plant.plant_id]}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <PlantModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        plant={selectedPlant}
        mode={modalMode}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        plant={selectedPlant}
      />
    </div>
  );
}

