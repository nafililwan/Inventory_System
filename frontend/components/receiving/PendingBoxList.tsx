'use client';

import { useState } from 'react';
import { BoxWithContents } from '@/lib/api/boxes';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface PendingBoxListProps {
  boxes: BoxWithContents[];
  onCheckIn: (boxId: number) => void;
}

export default function PendingBoxList({ boxes, onCheckIn }: PendingBoxListProps) {
  if (boxes.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No pending boxes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {boxes.map((box) => (
        <div
          key={box.box_id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{box.box_code}</h3>
              <p className="text-sm text-gray-500">
                Received: {new Date(box.received_date).toLocaleDateString()} by {box.received_by}
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              Pending Check-In
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {box.supplier && (
              <div>
                <span className="text-xs text-gray-500">Supplier:</span>
                <p className="text-sm font-medium">{box.supplier}</p>
              </div>
            )}
            {box.po_number && (
              <div>
                <span className="text-xs text-gray-500">PO Number:</span>
                <p className="text-sm font-medium">{box.po_number}</p>
              </div>
            )}
            {box.do_number && (
              <div>
                <span className="text-xs text-gray-500">DO Number:</span>
                <p className="text-sm font-medium">{box.do_number}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500">Total Items:</span>
              <p className="text-sm font-medium">{box.total_items || 0} pcs</p>
            </div>
          </div>

          {/* Contents */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Contents:</h4>
            <div className="space-y-2">
              {box.contents.map((content) => (
                <div
                  key={content.content_id}
                  className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {content.item_code} - {content.item_name}
                    </p>
                    {content.size && (
                      <p className="text-xs text-gray-500">Size: {content.size}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{content.quantity} pcs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={() => onCheckIn(box.box_id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Check-In to Store
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

