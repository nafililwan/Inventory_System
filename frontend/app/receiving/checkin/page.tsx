'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

import { boxesService, BoxWithContents, BoxCheckIn } from '@/lib/api/boxes';
import { storesService, Store } from '@/lib/api/stores';

export default function CheckInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get('id') ? parseInt(searchParams.get('id')!) : null;
  
  const [box, setBox] = useState<BoxWithContents | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeSearch, setStoreSearch] = useState('');
  const [formData, setFormData] = useState<BoxCheckIn>({ store_id: 0, location_in_store: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (boxId) {
      loadData();
    } else {
      setLoading(false);
      toast.error('Invalid box ID');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxId]);

  const loadData = async () => {
    if (!boxId) return;
    
    try {
      setLoading(true);
      const [boxResponse, storesResponse] = await Promise.all([
        boxesService.get(boxId),
        storesService.getAll(),
      ]);
      
      setBox(boxResponse.data);
      setStores(storesResponse.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load data');
      router.push('/receiving');
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store =>
    store.store_name.toLowerCase().includes(storeSearch.toLowerCase()) ||
    store.store_code.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!boxId || !formData.store_id) {
      toast.error('Please select a store');
      return;
    }

    setSubmitting(true);
    try {
      await boxesService.checkIn(boxId, formData);
      toast.success('Box checked in successfully!');
      router.push(`/receiving/details?id=${boxId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to check in box');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!box) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-bottom lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Check-In Box</h1>
                <p className="mt-1 text-sm text-gray-600">Box: {box.box_code}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Box Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Box Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Box Code
              </p>
              <p className="text-sm font-semibold text-gray-900">{box.box_code}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Total Items
              </p>
              <p className="text-sm font-semibold text-gray-900">{box.total_items} pieces</p>
            </div>
          </div>
        </div>

        {/* Check-In Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Select Store & Location</h2>
          
          {/* Store Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredStores.length > 0 ? (
                filteredStores.map((store) => (
                  <button
                    key={store.store_id}
                    type="button"
                    onClick={() => setFormData({ ...formData, store_id: store.store_id })}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      formData.store_id === store.store_id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{store.store_name}</p>
                        <p className="text-sm text-gray-500">{store.store_code}</p>
                      </div>
                      {formData.store_id === store.store_id && (
                        <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  No stores found
                </div>
              )}
            </div>
          </div>

          {/* Location Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location in Store (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Aisle 1, Shelf B"
              value={formData.location_in_store}
              onChange={(e) => setFormData({ ...formData, location_in_store: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.store_id || submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Checking In...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Check-In Box</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

