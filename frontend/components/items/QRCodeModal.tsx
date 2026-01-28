'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { Item, itemService } from '@/lib/items';
// Note: ItemVariant removed - new structure uses sizes directly in Item
// import { inventoryService } from '@/lib/inventory'; // Removed - module deleted

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  itemTypeName?: string;
}

export default function QRCodeModal({ isOpen, onClose, item, itemTypeName }: QRCodeModalProps) {
  // Updated for new simplified structure - items have sizes directly, no variants
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // No need to fetch variants - item.sizes contains all size information

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printRef.current.innerHTML;
    const printStyles = `
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
        }
        .qr-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 30px;
          border: 3px solid #000;
          border-radius: 12px;
          background: white;
          page-break-inside: avoid;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          margin: 0 auto;
        }
        .qr-code {
          width: 250px !important;
          height: 250px !important;
        }
        .qr-details {
          text-align: center;
          font-size: 15px;
          line-height: 1.8;
          color: #1f2937;
          max-width: 300px;
          margin: 0 auto;
        }
        .qr-title {
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 8px;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .qr-info {
          font-size: 14px;
          color: #4b5563;
          margin: 4px 0;
        }
        .qr-code-value {
          font-size: 12px;
          color: #6b7280;
          margin-top: 12px;
          font-family: 'Courier New', monospace;
          word-break: break-all;
          padding: 8px;
          background: #f9fafb;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
        @media print {
          body {
            padding: 0;
          }
          .qr-container {
            margin-bottom: 20px;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${item?.item_code || 'Item'}</title>
          ${printStyles}
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const getVariantLabel = (variant: ItemVariant): string => {
    const parts: string[] = [];
    if (itemTypeName) parts.push(itemTypeName);
    if (variant.size) parts.push(variant.size);
    if (variant.color) parts.push(variant.color);
    const qty = variantQuantities[variant.variant_id] || 0;
    if (qty > 0) parts.push(`${qty} pcs`);
    return parts.join(' - ');
  };

  const getVariantLabelForPrint = (variant: ItemVariant): string => {
    const parts: string[] = [];
    if (itemTypeName) parts.push(itemTypeName);
    if (variant.size) parts.push(variant.size);
    if (variant.color) parts.push(variant.color);
    const qty = variantQuantities[variant.variant_id] || 0;
    if (qty > 0) parts.push(`${qty} pcs`);
    return parts.length > 0 ? parts.join(' - ') : 'Item Variant';
  };

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">QR Codes</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {item.item_code || `Item #${item.item_id}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedVariant && (
                    <button
                      onClick={handlePrint}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                      title="Print QR Code"
                    >
                      <PrinterIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : variants.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No variants found for this item.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Create variants in the Edit Item modal first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Variant Selector */}
                    {variants.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Variant
                        </label>
                        <select
                          value={selectedVariant?.variant_id || ''}
                          onChange={(e) => {
                            const variant = variants.find(v => v.variant_id === parseInt(e.target.value));
                            setSelectedVariant(variant || null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {variants.map((variant) => (
                            <option key={variant.variant_id} value={variant.variant_id}>
                              {getVariantLabel(variant)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* QR Code Display */}
                    {selectedVariant && (
                      <div className="flex flex-col items-center">
                        {/* Print-ready QR Code */}
                        <div ref={printRef} className="hidden print:block">
                          <div className="qr-container">
                            <QRCodeSVG
                              value={selectedVariant.qr_code}
                              size={250}
                              level="H"
                              includeMargin={true}
                              className="qr-code"
                            />
                            <div className="qr-details">
                              <div className="qr-title">{getVariantLabelForPrint(selectedVariant)}</div>
                              {item.item_code && (
                                <div className="qr-info">Item Code: {item.item_code}</div>
                              )}
                              {item.brand && (
                                <div className="qr-info">Brand: {item.brand}</div>
                              )}
                              {selectedVariant.sku && (
                                <div className="qr-info">SKU: {selectedVariant.sku}</div>
                              )}
                              <div className="qr-code-value">{selectedVariant.qr_code}</div>
                            </div>
                          </div>
                        </div>

                        {/* Screen Display */}
                        <div className="flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-lg">
                          {/* QR Code with Professional Border */}
                          <div className="bg-white p-6 rounded-xl shadow-xl border-4 border-gray-900">
                            <QRCodeSVG
                              value={selectedVariant.qr_code}
                              size={280}
                              level="H"
                              includeMargin={true}
                              fgColor="#000000"
                              bgColor="#FFFFFF"
                            />
                          </div>
                          
                          {/* Details Section */}
                          <div className="text-center space-y-3 w-full max-w-md">
                            {/* Main Title */}
                            <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                                {getVariantLabel(selectedVariant)}
                              </h3>
                            </div>
                            
                            {/* Item Information */}
                            <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200 space-y-2 text-sm">
                              {item.item_code && (
                                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                  <span className="font-semibold text-gray-700">Item Code:</span>
                                  <span className="text-gray-900 font-mono">{item.item_code}</span>
                                </div>
                              )}
                              {item.brand && (
                                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                  <span className="font-semibold text-gray-700">Brand:</span>
                                  <span className="text-gray-900">{item.brand}</span>
                                </div>
                              )}
                              {selectedVariant.sku && (
                                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                  <span className="font-semibold text-gray-700">SKU:</span>
                                  <span className="text-gray-900 font-mono">{selectedVariant.sku}</span>
                                </div>
                              )}
                              {selectedVariant.size && (
                                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                  <span className="font-semibold text-gray-700">Size:</span>
                                  <span className="text-gray-900 font-semibold">{selectedVariant.size}</span>
                                </div>
                              )}
                              {selectedVariant.color && (
                                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                  <span className="font-semibold text-gray-700">Color:</span>
                                  <span className="text-gray-900 font-semibold">{selectedVariant.color}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between py-1">
                                <span className="font-semibold text-blue-600">Quantity:</span>
                                <span className="text-blue-900 font-bold text-lg">
                                  {variantQuantities[selectedVariant.variant_id] || 0} pcs
                                </span>
                              </div>
                            </div>

                            {/* QR Code Value */}
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-300">
                              <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">QR Code</div>
                              <div className="text-sm text-gray-800 font-mono break-all font-semibold">
                                {selectedVariant.qr_code}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Variant Info */}
                        <div className="w-full grid grid-cols-2 gap-4 mt-4">
                          {selectedVariant.size && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="text-xs text-gray-500 mb-1">Size</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {selectedVariant.size}
                              </div>
                            </div>
                          )}
                          {selectedVariant.color && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="text-xs text-gray-500 mb-1">Color</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {selectedVariant.color}
                              </div>
                            </div>
                          )}
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-xs text-blue-600 mb-1">Total Quantity</div>
                            <div className="text-sm font-semibold text-blue-900">
                              {variantQuantities[selectedVariant.variant_id] || 0} pcs
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Status</div>
                            <div className={`text-sm font-semibold ${
                              selectedVariant.status === 'active' ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {selectedVariant.status === 'active' ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* All Variants List */}
                    {variants.length > 1 && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                          All Variants ({variants.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {variants.map((variant) => (
                            <button
                              key={variant.variant_id}
                              onClick={() => setSelectedVariant(variant)}
                              className={`p-3 text-left rounded-lg border-2 transition-all ${
                                selectedVariant?.variant_id === variant.variant_id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-gray-700">
                                  {variant.size && `Size: ${variant.size}`}
                                  {variant.size && variant.color && ' • '}
                                  {variant.color && `Color: ${variant.color}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Qty: {variantQuantities[variant.variant_id] || 0}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 font-mono truncate">
                                {variant.qr_code}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

