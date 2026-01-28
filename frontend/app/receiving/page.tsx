'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PlusIcon,
  InboxIcon,
  CheckCircleIcon,
  TruckIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

import { boxesService, Box, BoxWithContents } from '@/lib/api/boxes';
import ReceiveBoxModal from '@/components/receiving/ReceiveBoxModal';
import CheckInModal from '@/components/receiving/CheckInModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const cardHoverVariants = {
  rest: { scale: 1, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  hover: {
    scale: 1.02,
    boxShadow:
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: { duration: 0.2 },
  },
};

export default function ReceivingPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'pending_checkin';
  
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [allBoxes, setAllBoxes] = useState<Box[]>([]); // Store all boxes for tab counts
  const [loading, setLoading] = useState(true);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadBoxes();
  }, [statusFilter]);

  // Normalize URL if status has spaces (fix for malformed URLs)
  useEffect(() => {
    const currentStatus = searchParams.get('status');
    // Only normalize if status contains spaces (should be underscores)
    if (currentStatus && currentStatus.includes(' ')) {
      const normalizedStatus = currentStatus.replace(/\s+/g, '_');
      // Only update if normalization actually changed something
      if (normalizedStatus !== currentStatus) {
        const newUrl = `/receiving?status=${encodeURIComponent(normalizedStatus)}`;
        router.replace(newUrl, { scroll: false });
      }
    }
    // Also validate status values - only allow valid statuses
    if (currentStatus && !['pending_checkin', 'checked_in'].includes(currentStatus)) {
      // If invalid status, redirect to default
      router.replace('/receiving?status=pending_checkin', { scroll: false });
    }
  }, [searchParams, router]);

  const loadBoxes = async () => {
    try {
      setLoading(true);
      // Load all boxes first to get accurate counts for tabs
      const allBoxesResponse = await boxesService.list({ limit: 1000 });
      const allBoxesData = allBoxesResponse.data || [];
      setAllBoxes(allBoxesData);
      
      // Then filter based on statusFilter
      if (statusFilter === 'pending_checkin') {
        setBoxes(allBoxesData.filter(box => box.status === 'pending_checkin'));
      } else {
        setBoxes(allBoxesData.filter(box => box.status === statusFilter));
      }
    } catch (error) {
      toast.error('Failed to load boxes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Stock Receiving</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Receive and check-in inventory boxes</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/scan?context=check_in')}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 shadow-lg font-medium transition-colors"
              >
                <QrCodeIcon className="w-5 h-5" />
                <span>Scan to Check-In</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowReceiveModal(true)}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Receive New Stock</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Filter Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              const url = '/receiving?status=pending_checkin';
              router.replace(url, { scroll: false });
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              statusFilter === 'pending_checkin'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Pending Check-In ({allBoxes.filter(b => b.status === 'pending_checkin').length})
          </button>
          <button
            onClick={() => {
              const url = '/receiving?status=checked_in';
              router.replace(url, { scroll: false });
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              statusFilter === 'checked_in'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Checked In ({allBoxes.filter(b => b.status === 'checked_in').length})
          </button>
        </div>

        {/* Status Alert */}
        <AnimatePresence>
          {boxes.length > 0 && statusFilter === 'pending_checkin' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 rounded-lg p-5 shadow-sm dark:shadow-xl dark:shadow-black/20">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <TruckIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-base font-semibold text-yellow-900 dark:text-yellow-300">Pending Check-In</h3>
                    <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-400">
                      <span className="font-bold">{boxes.length}</span> box
                      {boxes.length > 1 ? 'es' : ''} waiting to be checked into stores
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-400 dark:bg-yellow-500 text-yellow-900 dark:text-yellow-900">
                      {boxes.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {boxes.length > 0 && statusFilter === 'checked_in' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-400 dark:border-green-500 rounded-lg p-5 shadow-sm dark:shadow-xl dark:shadow-black/20">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-base font-semibold text-green-900 dark:text-green-300">Checked In Boxes</h3>
                    <p className="mt-1 text-sm text-green-800 dark:text-green-400">
                      <span className="font-bold">{boxes.length}</span> box
                      {boxes.length > 1 ? 'es' : ''} already checked into stores
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-400 dark:bg-green-500 text-green-900 dark:text-green-900">
                      {boxes.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && boxes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <InboxIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium text-lg mb-2">
              {statusFilter === 'pending_checkin' ? 'No pending boxes' : 'No checked-in boxes'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {statusFilter === 'pending_checkin' 
                ? 'All boxes have been checked in' 
                : 'No boxes have been checked in yet'}
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400"></div>
              <TruckIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading boxes...</p>
          </div>
        )}

        {/* Boxes Grid */}
        {!loading && boxes.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {boxes.map((box) => (
              <motion.div
                key={box.box_id}
                variants={cardHoverVariants}
                initial="rest"
                animate="rest"
                whileHover="hover"
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-xl dark:shadow-black/20"
              >
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <InboxIcon className="h-5 w-5 text-white/90" />
                        <h3 className="text-lg font-bold text-white">{box.box_code}</h3>
                      </div>
                      <p className="mt-1 text-sm text-blue-100 font-medium">
                        {box.supplier || 'No Supplier'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end space-y-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                        box.status === 'checked_in' 
                          ? 'bg-green-400 dark:bg-green-500 text-green-900' 
                          : 'bg-yellow-400 dark:bg-yellow-500 text-yellow-900'
                      }`}>
                        {box.status === 'checked_in' ? 'CHECKED IN' : 'PENDING'}
                      </span>
                      {/* Small QR Code Preview */}
                      <div className="bg-white p-1.5 rounded">
                        <QRCodeSVG
                          value={box.qr_code || box.box_code}
                          size={48}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                    <BuildingStorefrontIcon className="h-4 w-4 text-white" />
                    <span className="text-sm font-semibold text-white">{box.total_items} pieces</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-3">
                    {box.po_number && (
                      <div className="flex items-start space-x-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            PO Number
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {box.po_number}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Received Date
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatDate(box.received_date)}
                        </p>
                      </div>
                    </div>

                    {box.do_number && (
                      <div className="flex items-start space-x-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            DO Number
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {box.do_number}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700"></div>

                  <div className="space-y-2">
                    <button
                      onClick={() => router.push(`/receiving/details?id=${box.box_id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center space-x-2">
                        <QrCodeIcon className="h-4 w-4" />
                        <span>View Details & QR Code</span>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Only show Check-In button for pending_checkin boxes */}
                    {box.status === 'pending_checkin' && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedBoxId(box.box_id);
                          setShowCheckInModal(true);
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-semibold shadow-md transition-colors"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Check-In to Store</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Receive Box Modal */}
      <ReceiveBoxModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        onSuccess={() => {
          loadBoxes();
        }}
      />

      {/* Check-In Modal */}
      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => {
          setShowCheckInModal(false);
          setSelectedBoxId(null);
        }}
        boxId={selectedBoxId}
        onSuccess={() => {
          loadBoxes();
        }}
      />
    </div>
  );
}

