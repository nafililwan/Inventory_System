'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PrinterIcon,
  QrCodeIcon,
  InboxIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import { boxesService, BoxWithContents, BoxInventory } from '@/lib/api/boxes';
import BoxQRPrintLabel from '@/components/receiving/BoxQRPrintLabel';
import BoxPrintModal from '@/components/receiving/BoxPrintModal';
import { ArrowRightIcon, CubeIcon } from '@heroicons/react/24/outline';

export default function BoxDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get('id') ? parseInt(searchParams.get('id')!) : null;
  const [box, setBox] = useState<BoxWithContents | null>(null);
  const [inventoryItems, setInventoryItems] = useState<BoxInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printLabelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boxId) {
      loadBoxDetails();
    } else {
      setLoading(false);
      toast.error('Invalid box ID');
      router.push('/receiving');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxId]);

  const loadBoxDetails = async () => {
    if (!boxId) return;
    
    try {
      const [boxResponse, inventoryResponse] = await Promise.all([
        boxesService.get(boxId),
        boxesService.getInventory(boxId).catch(() => ({ data: [] })), // Don't fail if no inventory
      ]);
      setBox(boxResponse.data);
      setInventoryItems(inventoryResponse.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load box details');
      router.push('/receiving');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading box details...</p>
        </div>
      </div>
    );
  }

  if (!box) {
    return null;
  }

  return (
    <>
      {/* Screen View - Hide on Print */}
      <div className="print:hidden min-h-screen bg-gray-50 pb-safe-bottom lg:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{box.box_code}</h1>
                  <p className="mt-1 text-sm text-gray-600">Box Details & QR Code</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {box.status === 'pending_checkin' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push(`/receiving/checkin?id=${box.box_id}`)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Check-In</span>
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePrint}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PrinterIcon className="w-5 h-5" />
                  <span>Print QR Label</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Print Preview Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Print Preview</h2>
            <p className="text-sm text-gray-600 mb-6">
              Click &quot;Print QR Label&quot; to print this label. Make sure to use A4 or A5 paper.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              <div ref={printLabelRef}>
                <BoxQRPrintLabel box={box} />
              </div>
            </div>
          </div>

          {/* Box Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Box Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Box Details Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Box Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Status
                      </p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          box.status === 'pending_checkin'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {box.status === 'pending_checkin' ? 'PENDING' : 'CHECKED IN'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Total Items
                      </p>
                      <p className="text-sm font-semibold text-gray-900">{box.total_items} pieces</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    {box.supplier && (
                      <div className="flex items-start space-x-3">
                        <BuildingStorefrontIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Supplier
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">{box.supplier}</p>
                        </div>
                      </div>
                    )}

                    {box.po_number && (
                      <div className="flex items-start space-x-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            PO Number
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">{box.po_number}</p>
                        </div>
                      </div>
                    )}

                    {box.do_number && (
                      <div className="flex items-start space-x-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            DO Number
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">{box.do_number}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Received Date
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-900">
                          {formatDate(box.received_date)}
                        </p>
                      </div>
                    </div>

                    {box.received_by && (
                      <div className="flex items-start space-x-3">
                        <InboxIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Received By
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">{box.received_by}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {box.notes && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700">{box.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Box Contents Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Box Contents</h2>
                {box.contents && box.contents.length > 0 ? (
                  <div className="space-y-3">
                    {box.contents.map((content, index) => (
                      <div
                        key={content.content_id || index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{content.item_name}</p>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                            <span>Code: {content.item_code}</span>
                            {content.size && <span>Size: {content.size}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{content.quantity} pcs</p>
                          {content.remaining !== content.quantity && (
                            <p className="text-xs text-gray-500">
                              Remaining: {content.remaining} pcs
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No contents found</p>
                )}
              </motion.div>

              {/* Inventory Items Card - Show if box is checked in */}
              {box.status === 'checked_in' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Inventory Items</h2>
                    <button
                      onClick={() => router.push('/inventory')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                  {inventoryItems.length > 0 ? (
                    <div className="space-y-3">
                      {inventoryItems.map((inv) => (
                        <div
                          key={inv.inventory_id}
                          className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          onClick={() => router.push('/inventory')}
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{inv.item_name}</p>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                              <span>Code: {inv.item_code}</span>
                              {inv.size && <span>Size: {inv.size}</span>}
                              <span className="flex items-center gap-1">
                                <BuildingStorefrontIcon className="w-4 h-4" />
                                {inv.store_name}
                              </span>
                            </div>
                            {inv.location_in_store && (
                              <p className="text-xs text-gray-500 mt-1">📍 {inv.location_in_store}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">{inv.available_quantity} / {inv.quantity}</p>
                            <p className="text-xs text-gray-500">
                              Available / Total
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No inventory records found</p>
                      <p className="text-xs text-gray-400 mt-1">Items may not be checked in yet</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Right Column - QR Code Preview */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                    <QrCodeIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Box QR Code</h2>
                  <p className="text-sm text-gray-600 mb-6">Scan to view box details</p>

                  {/* Screen Display - Small QR Preview */}
                  <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-200">
                    <p className="text-xs text-gray-600 text-center">
                      Full label preview available above. Click &quot;Print QR Label&quot; to print.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      <BoxPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        box={box}
      />
    </>
  );
}

