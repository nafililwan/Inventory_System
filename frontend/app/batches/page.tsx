"use client";

import { useState, useEffect } from 'react';
import { PlusIcon, CubeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { itemBatchesService, ItemBatch } from '@/lib/api/item-batches';
import { itemTypesService, ItemType } from '@/lib/api/item-types';
import CreateBatchModal from '@/components/batches/CreateBatchModal';

export default function BatchesPage() {
  const [batches, setBatches] = useState<ItemBatch[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, typesData] = await Promise.all([
        itemBatchesService.list(),
        itemTypesService.list({ status: 'active' })
      ]);
      setBatches(batchesData);
      setItemTypes(typesData.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (data: {
    type_id: number;
    year_code: string;
    batch_name?: string;
    specifications?: string;
  }) => {
    try {
      await itemBatchesService.create(data);
      toast.success('Year batch created successfully!');
      setShowCreateModal(false);
      await loadData();
    } catch (error: any) {
      console.error('Error creating batch:', error);
      toast.error(error.response?.data?.detail || 'Failed to create batch');
      throw error;
    }
  };

  // Group batches by year
  const batchesByYear = batches.reduce((acc: Record<string, ItemBatch[]>, batch) => {
    const year = `20${batch.year_code}`;
    if (!acc[year]) acc[year] = [];
    acc[year].push(batch);
    return acc;
  }, {});

  const sortedYears = Object.keys(batchesByYear).sort().reverse();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading batches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Year Batch Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage item batches by production year</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Year Batch</span>
        </button>
      </div>

      {/* Batches by Year */}
      {sortedYears.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-xl dark:shadow-black/20">
          <CubeIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">No batches found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Create your first year batch to get started
          </p>
        </div>
      ) : (
        sortedYears.map((year) => (
          <div key={year} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Year {year}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchesByYear[year].map((batch) => (
                <div
                  key={batch.batch_id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md dark:hover:shadow-2xl dark:hover:shadow-black/30 transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <CubeIcon className="w-8 h-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{batch.type_name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Year {year}</p>
                        {batch.batch_name && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{batch.batch_name}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {batch.item_count || 0} items
                    </span>
                  </div>
                  {batch.specifications && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {batch.specifications}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className={`text-xs px-2 py-1 rounded ${
                      batch.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                        : batch.status === 'discontinued'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                    }`}>
                      {batch.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateBatchModal
          itemTypes={itemTypes}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateBatch}
        />
      )}
    </div>
  );
}

