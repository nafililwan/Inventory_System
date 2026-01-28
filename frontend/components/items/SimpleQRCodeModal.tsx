'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { Item } from '@/lib/items';

interface SimpleQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  itemTypeName?: string;
  initialSize?: string;
  initialQuantity?: string;
  autoGenerate?: boolean;
}

export default function SimpleQRCodeModal({ 
  isOpen, 
  onClose, 
  item, 
  itemTypeName,
  initialSize = '',
  initialQuantity = '',
  autoGenerate = false
}: SimpleQRCodeModalProps) {
  const [size, setSize] = useState(initialSize);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Auto-generate QR when modal opens with initial values
  useEffect(() => {
    if (isOpen && item && itemTypeName) {
      if (autoGenerate && initialQuantity) {
        // Use provided initial values (from AllInOneForm)
        setSize(initialSize || '');
        setQuantity(initialQuantity);
        const qrText = generateQRText(initialSize || '', initialQuantity);
        if (qrText) {
          setGeneratedQR(qrText);
        }
      } else if (!autoGenerate) {
        // When opened from card - generate with default (user can edit)
        setSize('');
        setQuantity('0');
        const qrText = generateQRText('', '0');
        if (qrText) {
          setGeneratedQR(qrText);
        }
      }
    } else {
      // Reset when modal closes
      setGeneratedQR(null);
      setSize('');
      setQuantity('');
    }
  }, [isOpen, item, autoGenerate, initialSize, initialQuantity, itemTypeName]);

  // Generate QR code text in format: "item_type size-quantity pcs" or "item_type-quantity pcs" (if no size)
  // Example: "smok XL-20 pcs" or "smok-20 pcs"
  const generateQRText = (sizeValue?: string, quantityValue?: string) => {
    const sizeToUse = sizeValue || size;
    const quantityToUse = quantityValue || quantity;
    if (!itemTypeName || !quantityToUse) return null;
    
    const typeName = itemTypeName.toLowerCase().replace(/\s+/g, '');
    if (sizeToUse && sizeToUse.trim()) {
      return `${typeName} ${sizeToUse}-${quantityToUse} pcs`;
    } else {
      return `${typeName}-${quantityToUse} pcs`;
    }
  };

  const handleGenerate = () => {
    const qrText = generateQRText();
    if (qrText) {
      setGeneratedQR(qrText);
    }
  };

  const handlePrint = () => {
    if (!printRef.current || !generatedQR) return;

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
          <title>QR Code - ${generatedQR}</title>
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

  const handleReset = () => {
    setSize('');
    setQuantity('');
    setGeneratedQR(null);
  };

  if (!item) return null;

  const qrText = generatedQR || generateQRText();

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
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Generate QR Code</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {item.item_code || `Item #${item.item_id}`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                {generatedQR ? (
                  // QR Code Display
                  <div className="space-y-6">

                    {/* Print-ready QR Code */}
                    <div ref={printRef} className="hidden print:block">
                      <div className="qr-container">
                        <QRCodeSVG
                          value={generatedQR}
                          size={250}
                          level="H"
                          includeMargin={true}
                          className="qr-code"
                        />
                        <div className="qr-details">
                          <div className="qr-title">{generatedQR}</div>
                          {item.item_code && (
                            <div className="qr-info">Item Code: {item.item_code}</div>
                          )}
                          {item.brand && (
                            <div className="qr-info">Brand: {item.brand}</div>
                          )}
                          <div className="qr-code-value">{generatedQR}</div>
                        </div>
                      </div>
                    </div>

                    {/* Screen Display */}
                    <div className="flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl border-2 border-green-200 shadow-lg">
                      {/* QR Code */}
                      <div className="bg-white p-6 rounded-xl shadow-xl border-4 border-gray-900">
                        <QRCodeSVG
                          value={generatedQR}
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
                            {generatedQR}
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
                          {itemTypeName && (
                            <div className="flex items-center justify-between py-1 border-b border-gray-100">
                              <span className="font-semibold text-gray-700">Type:</span>
                              <span className="text-gray-900">{itemTypeName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between py-1 border-b border-gray-100">
                            <span className="font-semibold text-gray-700">Size:</span>
                            <span className="text-gray-900 font-semibold">{size}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="font-semibold text-green-600">Quantity:</span>
                            <span className="text-green-900 font-bold text-lg">{quantity} pcs</span>
                          </div>
                        </div>

                        {/* QR Code Value */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-300">
                          <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">QR Code</div>
                          <div className="text-sm text-gray-800 font-mono break-all font-semibold">
                            {generatedQR}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                      >
                        <PrinterIcon className="w-5 h-5" />
                        Print QR Code
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors touch-manipulation"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  // Manual Input Form
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Enter details to generate QR code with format: <span className="font-mono font-semibold text-blue-600">[item_type] [size]-[quantity] pcs</span> or <span className="font-mono font-semibold text-blue-600">[item_type]-[quantity] pcs</span> (if no size)
                      </p>
                      <p className="text-xs text-gray-500 mb-6">
                        Examples: <span className="font-mono">smok XL-20 pcs</span> or <span className="font-mono">smok-20 pcs</span>
                      </p>
                    </div>

                    {/* Item Type Display */}
                    {itemTypeName && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <label className="block text-xs font-medium text-blue-900 mb-1">
                          Item Type
                        </label>
                        <p className="text-base font-semibold text-blue-700">{itemTypeName}</p>
                      </div>
                    )}

                    {/* Size Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={size}
                        onChange={(e) => setSize(e.target.value.toUpperCase())}
                        placeholder="e.g., XL, L, M, S (leave empty if no size)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      />
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g., 20"
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      />
                    </div>

                    {/* Preview */}
                    {quantity && itemTypeName && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Preview QR Code Text:
                        </label>
                        <p className="text-base font-mono font-semibold text-gray-900">
                          {generateQRText()}
                        </p>
                      </div>
                    )}

                    {/* Generate Button */}
                    <button
                      onClick={handleGenerate}
                      disabled={!quantity || !itemTypeName}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors touch-manipulation"
                    >
                      Generate QR Code
                    </button>
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

