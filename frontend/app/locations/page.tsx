'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, BuildingOfficeIcon, MapPinIcon, ChevronDownIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { plantsService, Plant, Store, PlantCreate } from '@/lib/api/plants';
import { storesService, StoreCreate } from '@/lib/api/stores';
import toast from 'react-hot-toast';
import PlantModal from '@/components/locations/PlantModal';
import StoreModal from '@/components/locations/StoreModal';
import DeleteConfirmModal from '@/components/locations/DeleteConfirmModal';

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2 }
  }
} as const;

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export default function LocationsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlants, setExpandedPlants] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal states
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'plant' | 'store', id: number, name: string, hasChildren?: boolean } | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchPlants();
  }, [statusFilter, searchQuery]);

  const fetchPlants = async () => {
    setLoading(true);
    try {
      const params: any = {
        include_counts: true
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await plantsService.list(params);
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', data);
        toast.error('Invalid data format received');
        setPlants([]);
        return;
      }
      
      // Fetch stores for each plant
      const plantsWithStores = await Promise.all(
        data.map(async (plant) => {
          try {
            const plantDetail = await plantsService.get(plant.plant_id, true);
            return plantDetail;
          } catch (error) {
            console.error(`Failed to fetch stores for plant ${plant.plant_id}:`, error);
            return { ...plant, stores: [] };
          }
        })
      );
      
      setPlants(plantsWithStores);
    } catch (error: any) {
      console.error('Error fetching plants:', error);
      toast.error(error.response?.data?.detail || 'Failed to load plants');
      setPlants([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePlant = (plantId: number) => {
    setExpandedPlants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(plantId)) {
        newSet.delete(plantId);
      } else {
        newSet.add(plantId);
      }
      return newSet;
    });
  };

  // Plant handlers
  const handleCreatePlant = () => {
    setSelectedPlant(null);
    setModalMode('create');
    setShowPlantModal(true);
  };

  const handleEditPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    setModalMode('edit');
    setShowPlantModal(true);
  };

  const handleSavePlant = async (data: PlantCreate) => {
    try {
      if (modalMode === 'create') {
        await plantsService.create(data);
        toast.success('Plant created successfully');
      } else if (selectedPlant) {
        await plantsService.update(selectedPlant.plant_id, data);
        toast.success('Plant updated successfully');
      }
      fetchPlants();
      setShowPlantModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save plant');
      throw error;
    }
  };

  const handleDeletePlant = (plant: Plant) => {
    setDeleteTarget({
      type: 'plant',
      id: plant.plant_id,
      name: plant.plant_name,
      hasChildren: (plant.store_count || 0) > 0
    });
    setShowDeleteModal(true);
  };

  // Store handlers
  const handleCreateStore = (plantId: number) => {
    setSelectedPlant(plants.find(p => p.plant_id === plantId) || null);
    setSelectedStore(null);
    setModalMode('create');
    setShowStoreModal(true);
  };

  const handleEditStore = (store: Store) => {
    setSelectedPlant(plants.find(p => p.plant_id === store.plant_id) || null);
    setSelectedStore(store);
    setModalMode('edit');
    setShowStoreModal(true);
  };

  const handleSaveStore = async (data: StoreCreate) => {
    if (!selectedPlant && !data.plant_id) {
      toast.error('Plant is required');
      return;
    }

    try {
      if (modalMode === 'create') {
        await storesService.create({ ...data, plant_id: data.plant_id || selectedPlant!.plant_id });
        toast.success('Store created successfully');
      } else if (selectedStore) {
        await storesService.update(selectedStore.store_id, data);
        toast.success('Store updated successfully');
      }
      fetchPlants();
      setShowStoreModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save store');
      throw error;
    }
  };

  const handleDeleteStore = (store: Store) => {
    setDeleteTarget({
      type: 'store',
      id: store.store_id,
      name: store.store_name,
      hasChildren: (store.current_items || 0) > 0
    });
    setShowDeleteModal(true);
  };

  // Delete confirmation handler
  const confirmDelete = async (force: boolean = false) => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'plant') {
        await plantsService.delete(deleteTarget.id, force);
        toast.success(`Plant '${deleteTarget.name}' deleted successfully`);
      } else {
        await storesService.delete(deleteTarget.id, force);
        toast.success(`Store '${deleteTarget.name}' deleted successfully`);
      }
      fetchPlants();
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to delete ${deleteTarget.type}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className="p-3 sm:p-4 md:p-6 lg:p-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="mb-3 sm:mb-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Locations Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage plants and stores hierarchy
          </p>
        </div>

        <button
          onClick={handleCreatePlant}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Plant</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm dark:shadow-xl dark:shadow-black/20">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search plants or stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plants List */}
      <motion.div
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {plants.map((plant) => (
          <motion.div
            key={plant.plant_id}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-xl dark:shadow-black/30 overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Plant Header */}
            <div
              onClick={() => togglePlant(plant.plant_id)}
              className="p-4 sm:p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <motion.div
                  animate={{ rotate: expandedPlants.has(plant.plant_id) ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDownIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                </motion.div>
                
                <BuildingOfficeIcon className="w-10 h-10 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {plant.plant_name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-mono">{plant.plant_code}</span>
                    <span>•</span>
                    <MapPinIcon className="w-4 h-4" />
                    <span className="truncate">{plant.location || plant.city || 'No location'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 ml-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {plant.store_count || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Stores</div>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  plant.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                }`}>
                  {plant.status}
                </span>

                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEditPlant(plant)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeletePlant(plant)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Expanded Stores */}
            <AnimatePresence>
              {expandedPlants.has(plant.plant_id) && plant.stores && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Stores ({plant.stores.length})
                      </h4>
                      <button
                        onClick={() => handleCreateStore(plant.plant_id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Add Store
                      </button>
                    </div>
                    
                    {plant.stores.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p>No stores in this plant</p>
                        <button
                          onClick={() => handleCreateStore(plant.plant_id)}
                          className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          + Add First Store
                        </button>
                      </div>
                    ) : (
                      <motion.div
                        variants={listContainerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        {plant.stores.map((store) => (
                          <motion.div
                            key={store.store_id}
                            variants={listItemVariants}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{store.store_name}</h5>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-mono">{store.store_code}</span>
                                  <span>•</span>
                                  <span className="capitalize">{store.store_type}</span>
                                  {store.location_details && (
                                    <>
                                      <span>•</span>
                                      <span>{store.location_details}</span>
                                    </>
                                  )}
                                </div>
                                {store.capacity && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                      <span>Capacity: {store.current_items} / {store.capacity}</span>
                                      <span>{store.utilization_percentage?.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${
                                          (store.utilization_percentage || 0) > 80
                                            ? 'bg-red-500 dark:bg-red-600'
                                            : (store.utilization_percentage || 0) > 60
                                            ? 'bg-yellow-500 dark:bg-yellow-600'
                                            : 'bg-green-500 dark:bg-green-600'
                                        }`}
                                        style={{ width: `${Math.min(store.utilization_percentage || 0, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  store.status === 'active'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : store.status === 'maintenance'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                                }`}>
                                  {store.status}
                                </span>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleEditStore(store)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleDeleteStore(store)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {plants.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-xl dark:shadow-black/20">
          <BuildingOfficeIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">No plants found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first plant to get started'}
          </p>
        </div>
      )}

      {/* Modals */}
      <PlantModal
        isOpen={showPlantModal}
        onClose={() => setShowPlantModal(false)}
        onSave={handleSavePlant}
        mode={modalMode}
        plant={selectedPlant}
      />

      <StoreModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        onSave={handleSaveStore}
        mode={modalMode}
        store={selectedStore}
        plantId={selectedPlant?.plant_id}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type === 'plant' ? 'Plant' : 'Store'}`}
        message={`Are you sure you want to delete`}
        itemName={deleteTarget?.name || ''}
        warningMessage={
          deleteTarget?.type === 'plant'
            ? deleteTarget.hasChildren
              ? `This plant has stores. Deleting it will also delete all associated stores.`
              : undefined
            : deleteTarget?.hasChildren
              ? `This store has items in inventory. Deleting it may affect inventory records.`
              : undefined
        }
        showForceOption={deleteTarget?.hasChildren}
      />
    </motion.div>
  );
}

