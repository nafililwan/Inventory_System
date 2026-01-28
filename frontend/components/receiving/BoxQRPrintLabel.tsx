'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface BoxQRPrintLabelProps {
  box: {
    box_code: string;
    qr_code?: string;
    supplier?: string;
    po_number?: string;
    do_number?: string;
    invoice_number?: string;
    received_date: string;
    status: string;
    total_items?: number;
    contents?: Array<{
      item_name?: string;
      item_code?: string;
      size?: string;
      color?: string;
      quantity: number;
    }>;
    store_name?: string;
    location_in_store?: string;
  };
}

export default function BoxQRPrintLabel({ box }: BoxQRPrintLabelProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      id="qr-print-label"
      className="bg-white p-8 max-w-3xl mx-auto"
      style={{
        fontFamily: 'Arial, sans-serif',
        width: '210mm', // A4 width
        minHeight: 'auto', // Auto height to fit content
        pageBreakInside: 'avoid',
      }}
    >
      {/* Header with Logo/Company Name */}
      <div className="border-b-4 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
              HR Store Inventory
            </h1>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">{box.box_code}</h2>
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              box.status === 'pending_checkin'
                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                : 'bg-green-100 text-green-800 border-2 border-green-400'
            }`}
          >
            {box.status === 'pending_checkin' ? 'PENDING' : 'CHECKED IN'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 no-break">
        {/* Left Column: QR Code */}
        <div className="flex flex-col items-center justify-start">
          <div className="bg-white p-4 border-4 border-gray-800 rounded-lg">
            <QRCodeSVG
              value={box.qr_code || box.box_code}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-center mt-3 text-sm font-semibold text-gray-700">
            Scan with QR scanner
          </p>
          <p className="text-center text-xs text-gray-500 mt-1 break-words">{box.box_code}</p>
        </div>

        {/* Right Column: Box Details */}
        <div className="space-y-4 min-w-0">
          {/* Supplier Information */}
          <div className="border-b border-gray-300 pb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Supplier Information
            </h3>
            <p className="text-lg font-bold text-gray-900 break-words">{box.supplier || 'N/A'}</p>
          </div>

          {/* Reference Numbers */}
          <div className="grid grid-cols-2 gap-3">
            {box.po_number && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase">PO Number</p>
                <p className="text-sm font-bold text-gray-900 break-words">{box.po_number}</p>
              </div>
            )}
            {box.do_number && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase">DO Number</p>
                <p className="text-sm font-bold text-gray-900 break-words">{box.do_number}</p>
              </div>
            )}
            {box.invoice_number && (
              <div className="col-span-2 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase">Invoice Number</p>
                <p className="text-sm font-bold text-gray-900 break-words">{box.invoice_number}</p>
              </div>
            )}
          </div>

          {/* Total Items */}
          <div className="bg-blue-50 border-l-3 border-blue-600 rounded p-3 no-break">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">Total Items</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-blue-900 leading-none" style={{ whiteSpace: 'nowrap' }}>
                {box.total_items ?? 0}
              </span>
              <span className="text-sm font-medium text-blue-700 leading-none" style={{ whiteSpace: 'nowrap' }}>
                pieces
              </span>
            </div>
          </div>

          {/* Received Date */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Received Date</p>
            <p className="text-sm font-bold text-gray-900">{formatDate(box.received_date)}</p>
          </div>

          {/* Store Location (if checked-in) */}
          {box.store_name && (
            <div className="bg-green-50 border-l-4 border-green-600 p-3 rounded">
              <p className="text-xs font-semibold text-green-600 uppercase">Location</p>
              <p className="text-sm font-bold text-green-900">{box.store_name}</p>
              {box.location_in_store && (
                <p className="text-xs text-green-700 mt-1">{box.location_in_store}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Box Contents Section */}
      {box.contents && box.contents.length > 0 && (
        <div className="mt-8 border-t-2 border-gray-300 pt-6 no-break" style={{ pageBreakInside: 'avoid' }}>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            Box Contents
          </h3>
          <div className="space-y-3">
            {box.contents.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-start bg-gray-50 p-4 rounded border border-gray-200 no-break"
                style={{ pageBreakInside: 'avoid' }}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-bold text-gray-900 break-words leading-tight">{item.item_name || 'Unknown Item'}</p>
                  <p className="text-xs text-gray-600 mt-1 break-words leading-relaxed">
                    Code: {item.item_code || 'N/A'}
                    {item.size && ` • Size: ${item.size}`}
                    {item.color && ` • Color: ${item.color}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0" style={{ minWidth: '60px' }}>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-xl font-bold text-gray-900 leading-none" style={{ whiteSpace: 'nowrap' }}>
                      {item.quantity}
                    </span>
                    <span className="text-xs text-gray-500 leading-none" style={{ whiteSpace: 'nowrap' }}>
                      pieces
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center no-break">
        <p className="text-xs text-gray-500 break-words">
          Generated on {new Date().toLocaleString('en-MY')} • Jabil Malaysia HR Inventory System
        </p>
      </div>
    </div>
  );
}

