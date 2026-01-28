'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-hot-toast';
import BaseModal from '@/components/common/BaseModal';
import BoxQRPrintLabel from './BoxQRPrintLabel';
import { BoxWithContents } from '@/lib/api/boxes';

interface BoxPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: BoxWithContents | null;
}

export default function BoxPrintModal({ isOpen, onClose, box }: BoxPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    if (!box || !printRef.current) {
      toast.error('Print content not ready');
      return;
    }

    // Close modal first
    onClose();

    // Wait a bit for modal to close, then trigger print
    setTimeout(() => {
      // Add print styles to current page
      const style = document.createElement('style');
      style.id = 'print-styles-box-label';
      style.textContent = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          /* Hide everything except print content */
          body > *:not(.print-content-box-label) {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Hide navigation and layout */
          nav, aside, header, footer,
          [class*="sidebar"], [class*="header"], [class*="footer"],
          [class*="nav"], [role="navigation"] {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Show only print content */
          .print-content-box-label {
            display: block !important;
            visibility: visible !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            z-index: 9999 !important;
            overflow: visible !important;
          }
          
          .print-content-box-label * {
            visibility: visible !important;
          }
          
          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Hide browser default headers/footers */
          @page {
            margin: 0;
            size: A4 portrait;
          }
        }
      `;
      document.head.appendChild(style);

      // Clone print content and add to body
      const printContent = printRef.current.cloneNode(true) as HTMLElement;
      printContent.classList.add('print-content-box-label');
      printContent.style.position = 'absolute';
      printContent.style.left = '-9999px';
      document.body.appendChild(printContent);

      // Trigger print
      window.print();

      // Clean up after print
      const cleanup = () => {
        document.body.removeChild(printContent);
        const printStyles = document.getElementById('print-styles-box-label');
        if (printStyles) {
          document.head.removeChild(printStyles);
        }
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);
    }, 300);
  };

  const handleDownloadPDF = async () => {
    if (!box || !printRef.current) return;

    setDownloading(true);
    
    try {
      const element = printRef.current;
      const filename = `Box_QR_Label_${box.box_code}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Wait a bit to ensure all content is rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get actual element dimensions
      const rect = element.getBoundingClientRect();
      const scrollHeight = element.scrollHeight;
      const scrollWidth = element.scrollWidth;

      const opt = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 3,
          useCORS: true,
          letterRendering: true,
          logging: false,
          windowWidth: Math.max(scrollWidth, rect.width),
          windowHeight: Math.max(scrollHeight, rect.height),
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: scrollWidth,
          height: scrollHeight,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['.no-break', 'table', 'tr', 'td', '.bg-blue-50']
        }
      };

      await html2pdf().set(opt).from(element).save();
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!box) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Print QR Label - ${box.box_code}`}
      size="xl"
      maxHeight="max-h-[95vh]"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className={`w-5 h-5 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrint}
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <PrinterIcon className="w-5 h-5" />
            <span>Print</span>
          </motion.button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">Print Instructions:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-4">
              <li><strong>Print:</strong> Opens print dialog - choose your printer or &quot;Save as PDF&quot;</li>
              <li><strong>Download PDF:</strong> Automatically downloads PDF file to your computer</li>
            </ul>
            <p className="mt-2">Make sure to use A4 or A5 paper.</p>
          </div>
        </div>

        {/* Print Preview */}
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">Print Preview</p>
          </div>
          <div className="p-4 bg-gray-50 overflow-y-auto overflow-x-auto max-h-[75vh]">
            <div ref={printRef} className="bg-white shadow-lg rounded-lg overflow-visible" style={{ minWidth: 'fit-content' }}>
              <BoxQRPrintLabel box={box} />
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

