'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, QrCodeIcon, ArrowDownTrayIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Item, ItemVariant, itemService } from '@/lib/items';
import { itemTypeService, ItemType } from '@/lib/categories';
import toast from 'react-hot-toast';

interface VariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
}

export default function VariantsModal({ isOpen, onClose, item }: VariantsModalProps) {
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [showCreateVariantModal, setShowCreateVariantModal] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      fetchVariants();
      fetchItemType();
    }
  }, [isOpen, item]);

  const fetchItemType = async () => {
    if (!item) return;
    
    try {
      // Get item details to get type_id, then fetch item type
      const itemDetails = await itemService.getById(item.item_id);
      // We need to get item type from category service
      // For now, we'll skip this and show create variant button anyway
    } catch (error) {
      console.error('Failed to load item type:', error);
    }
  };

  const fetchVariants = async () => {
    if (!item) return;
    
    setLoading(true);
    try {
      const data = await itemService.getVariants(item.item_id);
      setVariants(data);
    } catch (error: any) {
      console.error('Failed to load variants:', error);
      toast.error('Failed to load variants');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = (variant: ItemVariant) => {
    // Create QR code image URL (using a QR code API or generate client-side)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(variant.qr_code)}`;
    
    // Create temporary link and download
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR-${variant.qr_code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`QR Code downloaded: ${variant.qr_code}`);
  };

  const downloadAllQRCodes = () => {
    variants.forEach((variant, index) => {
      setTimeout(() => {
        downloadQRCode(variant);
      }, index * 200); // Stagger downloads
    });
    toast.success(`Downloading ${variants.length} QR codes...`);
  };

  const getVariantLabel = (variant: ItemVariant) => {
    const parts: string[] = [];
    if (variant.size) parts.push(`Size: ${variant.size}`);
    if (variant.color) parts.push(`Color: ${variant.color}`);
    return parts.length > 0 ? parts.join(', ') : `Variant #${variant.variant_id}`;
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Variants & QR Codes
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.item_code || `Item #${item.item_id}`}
                    {item.brand && ` • ${item.brand}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Navigate to item edit page or show variant creation
                      toast.success('Please edit the item to create variants. Variants can be created after selecting an Item Type with size/color support.');
                      // Alternative: could open a variant creation modal here
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Variants</span>
                  </button>
                  {variants.length > 0 && (
                    <button
                      onClick={downloadAllQRCodes}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Download All</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : variants.length === 0 ? (
                  <div className="text-center py-12">
                    <QrCodeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No variants found</p>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                      Item ini belum ada variants. Untuk generate QR codes, anda perlu create variants dulu.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                      <p className="text-sm font-medium text-blue-900 mb-2">Cara Create Variants:</p>
                      <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Klik button "Edit" pada item card</li>
                        <li>Pastikan Item Type yang dipilih ada size/color support</li>
                        <li>Setelah item dibuat/edit, create variants untuk setiap kombinasi size+color</li>
                        <li>Setiap variant akan dapat QR code sendiri</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {variants.map((variant, index) => (
                      <motion.div
                        key={variant.variant_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                      >
                        {/* QR Code */}
                        <div className="flex justify-center mb-3">
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(variant.qr_code)}`}
                              alt={`QR Code ${variant.qr_code}`}
                              className="w-32 h-32"
                            />
                          </div>
                        </div>

                        {/* Variant Info */}
                        <div className="text-center mb-3">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {getVariantLabel(variant)}
                          </p>
                          <p className="text-xs text-gray-600 font-mono">
                            {variant.qr_code}
                          </p>
                          {variant.sku && (
                            <p className="text-xs text-gray-500 mt-1">
                              SKU: {variant.sku}
                            </p>
                          )}
                        </div>

                        {/* Download Button */}
                        <button
                          onClick={() => downloadQRCode(variant)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          <span>Download QR</span>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

