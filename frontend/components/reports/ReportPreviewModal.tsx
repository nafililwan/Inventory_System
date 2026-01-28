'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon, DocumentIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import html2pdf from 'html2pdf.js';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  HeadingLevel,
  BorderStyle,
  ShadingType,
  PageBreak,
  Footer,
  Header,
  SectionType,
  PageNumber,
} from 'docx';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import BaseModal from '@/components/common/BaseModal';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: any;
  reportType: string;
  reportTitle: string;
  onExportPDF?: () => void;
  onExportWord?: () => void;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 },
  },
};

export default function ReportPreviewModal({
  isOpen,
  onClose,
  reportData,
  reportType,
  reportTitle,
}: ReportPreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);

  const handleExportPDF = async () => {
    if (!printRef.current) {
      toast.error('Report content not ready');
      return;
    }

    setExportingPDF(true);
    try {
      const element = printRef.current;
      const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportWord = async () => {
    if (!printRef.current) {
      toast.error('Report content not ready');
      return;
    }

    setExportingWord(true);
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Company Information
      const companyName = 'Jabil Malaysia';
      const companyAddress = 'HR Inventory Management System';
      
      // Create professional header
      const header = new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: companyName,
                bold: true,
                size: 24,
                color: '1F4788', // Professional blue
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: companyAddress,
                size: 20,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.LEFT,
          }),
        ],
      });

      // Create professional footer with page numbers
      const footer = new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on ${formattedDate} | `,
                size: 18,
                color: '666666',
              }),
              new TextRun({
                children: [PageNumber.CURRENT],
                size: 18,
                color: '666666',
              }),
              new TextRun({
                text: ' / ',
                size: 18,
                color: '666666',
              }),
              new TextRun({
                children: [PageNumber.TOTAL_PAGES],
                size: 18,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      });

      // Create Word document with professional styling
      const doc = new Document({
        creator: companyName,
        title: reportTitle,
        description: `Professional ${reportTitle} generated from HR Inventory Management System`,
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                right: 1440,  // 1 inch
                bottom: 1440, // 1 inch
                left: 1440,   // 1 inch
              },
            },
          },
          headers: {
            default: header,
          },
          footers: {
            default: footer,
          },
          children: [
            // Company Header Section
            new Paragraph({
              children: [
                new TextRun({
                  text: companyName,
                  bold: true,
                  size: 32,
                  color: '1F4788', // Professional blue
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: companyAddress,
                  size: 24,
                  color: '666666',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            // Report Title
            new Paragraph({
              children: [
                new TextRun({
                  text: reportTitle,
                  bold: true,
                  size: 36,
                  color: '000000',
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 300 },
              border: {
                bottom: {
                  color: '1F4788',
                  size: 6,
                  style: BorderStyle.SINGLE,
                },
              },
            }),
            
            // Generation Date
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${formattedDate}`,
                  size: 22,
                  color: '666666',
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
            }),
            
            // Content based on report type
            ...generateWordContent(reportData, reportType),
          ],
        }],
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, filename);
      toast.success('Professional Word document downloaded successfully!');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to download Word document. Please try again.');
    } finally {
      setExportingWord(false);
    }
  };

  const generateWordContent = (data: any, type: string): (Paragraph | Table)[] => {
    const content: (Paragraph | Table)[] = [];

    if (type === 'inventory') {
      // Inventory report content
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Inventory Summary',
              bold: true,
              size: 28,
              color: '1F4788',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 300 },
          border: {
            bottom: {
              color: '1F4788',
              size: 4,
              style: BorderStyle.SINGLE,
            },
          },
        })
      );

      if (data.summary) {
        // Create summary table with professional styling
        const summaryTableRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Metric', bold: true, size: 24, color: 'FFFFFF' })],
                  alignment: AlignmentType.CENTER,
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Value', bold: true, size: 24, color: 'FFFFFF' })],
                  alignment: AlignmentType.CENTER,
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Items', bold: true, size: 22 }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'E3F2FD', // Light blue background
                },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Quantity', bold: true, size: 22 }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'E8F5E9', // Light green background
                },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Low Stock Items', bold: true, size: 22 }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'FFF3E0', // Light orange background
                },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Boxes', bold: true, size: 22 }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'F3E5F5', // Light purple background
                },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Boxes', bold: true, size: 22 }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'F3E5F5', // Light purple background
                },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(data.summary.totalItems || 0), 
                      bold: true,
                      size: 28,
                      color: '1976D2',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'E3F2FD',
                },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(data.summary.totalQuantity || 0), 
                      bold: true,
                      size: 28,
                      color: '388E3C',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'E8F5E9',
                },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(data.summary.lowStockItems || 0), 
                      bold: true,
                      size: 28,
                      color: 'F57C00',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'FFF3E0',
                },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(data.summary.totalBoxes || 0), 
                      bold: true,
                      size: 28,
                      color: '7B1FA2',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'F3E5F5',
                },
              }),
            ],
          }),
        ];

        content.push(
          new Table({
            rows: summaryTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }

      // Add table if items exist
      if (data.items && data.items.length > 0) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Inventory Items',
                bold: true,
                size: 28,
                color: '1F4788',
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
            border: {
              bottom: {
                color: '1F4788',
                size: 4,
                style: BorderStyle.SINGLE,
              },
            },
          })
        );

        // Create professional table with header styling
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Item Code', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: '1F4788', // Professional blue header
                },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Item Name', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: '1F4788',
                },
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Store', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: '1F4788',
                },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Quantity', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: '1F4788',
                },
                width: { size: 12, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Box References', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: '1F4788',
                },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Status', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: '1F4788',
                },
                width: { size: 13, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          ...data.items.slice(0, 50).map((item: any, index: number) => {
            const status = item.totalQuantity === 0 
              ? 'Out of Stock' 
              : item.totalQuantity < (item.min_level || 10) 
              ? 'Low Stock' 
              : 'In Stock';
            
            const statusColor = item.totalQuantity === 0 
              ? 'D32F2F' // Red
              : item.totalQuantity < (item.min_level || 10)
              ? 'F57C00' // Orange
              : '388E3C'; // Green

            const itemName = item.item_name || 'N/A';
            const itemNameWithDetails = item.size 
              ? `${itemName}${item.year_code ? ` (${item.size} - ${item.year_code})` : ` (${item.size})`}`
              : itemName;

            const quantityText = item.totalQuantity || 0;
            const quantityWithBoxes = item.boxCount > 1 
              ? `${quantityText} (${item.boxCount} boxes)`
              : String(quantityText);

            const boxRefsText = item.boxReferences && item.boxReferences.length > 0
              ? item.boxReferences.slice(0, 5).join(', ') + (item.boxReferences.length > 5 ? ` (+${item.boxReferences.length - 5} more)` : '')
              : 'N/A';

            return new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: item.item_code || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 
                    ? { type: ShadingType.SOLID, color: 'F5F5F5' }
                    : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: itemNameWithDetails, size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 
                    ? { type: ShadingType.SOLID, color: 'F5F5F5' }
                    : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: item.store_name || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 
                    ? { type: ShadingType.SOLID, color: 'F5F5F5' }
                    : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ 
                        text: quantityWithBoxes, 
                        size: 20,
                        bold: true,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: index % 2 === 0 
                    ? { type: ShadingType.SOLID, color: 'F5F5F5' }
                    : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ 
                        text: boxRefsText, 
                        size: 18,
                      }),
                    ],
                  })],
                  shading: index % 2 === 0 
                    ? { type: ShadingType.SOLID, color: 'F5F5F5' }
                    : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ 
                        text: status, 
                        size: 20,
                        color: statusColor,
                        bold: true,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: index % 2 === 0 
                    ? { type: ShadingType.SOLID, color: 'F5F5F5' }
                    : undefined,
                }),
              ],
            });
          }),
        ];

        content.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }
    } else if (type === 'transactions') {
      // Transaction report content
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Transaction Summary',
              bold: true,
              size: 28,
              color: '1F4788',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 300 },
          border: {
            bottom: {
              color: '1F4788',
              size: 4,
              style: BorderStyle.SINGLE,
            },
          },
        })
      );

      if (data.summary) {
        const summaryTableRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Transactions', bold: true, size: 22 }),
                  ],
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'E3F2FD',
                },
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(data.summary.totalTransactions || 0), 
                      bold: true,
                      size: 28,
                      color: '1976D2',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'E3F2FD',
                },
              }),
            ],
          }),
        ];

        content.push(
          new Table({
            rows: summaryTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }

      // Add transactions table
      if (data.transactions && data.transactions.length > 0) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Transaction Details',
                bold: true,
                size: 28,
                color: '1F4788',
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
            border: {
              bottom: {
                color: '1F4788',
                size: 4,
                style: BorderStyle.SINGLE,
              },
            },
          })
        );

        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Date', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 15, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Type', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 15, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Item', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'From Store', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'To Store', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 15, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Quantity', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 10, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          ...data.transactions.slice(0, 50).map((trans: any, index: number) => 
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: new Date(trans.transaction_date).toLocaleDateString(), size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: trans.transaction_type || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: trans.item_name || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: trans.from_store_name || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: trans.to_store_name || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: String(trans.quantity || 0), size: 20, bold: true }),
                    ],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
              ],
            })
          ),
        ];

        content.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }
    } else if (type === 'stores') {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Store Summary',
              bold: true,
              size: 28,
              color: '1F4788',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 300 },
          border: {
            bottom: {
              color: '1F4788',
              size: 4,
              style: BorderStyle.SINGLE,
            },
          },
        })
      );

      if (data.summary) {
        const summaryTableRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Stores', bold: true, size: 22 }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: 'E3F2FD' },
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(data.summary.totalStores || 0), 
                      bold: true,
                      size: 28,
                      color: '1976D2',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
                shading: { type: ShadingType.SOLID, color: 'E3F2FD' },
              }),
            ],
          }),
        ];

        content.push(
          new Table({
            rows: summaryTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }

      if (data.stores && data.stores.length > 0) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Store Details',
                bold: true,
                size: 28,
                color: '1F4788',
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
            border: {
              bottom: {
                color: '1F4788',
                size: 4,
                style: BorderStyle.SINGLE,
              },
            },
          })
        );

        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Store Name', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 40, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Plant', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Status', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          ...data.stores.map((store: any, index: number) => 
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: store.store_name || 'N/A', bold: true, size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: store.plant_name || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ 
                        text: store.status || 'N/A', 
                        size: 20,
                        color: store.status === 'active' ? '388E3C' : '666666',
                        bold: true,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
              ],
            })
          ),
        ];

        content.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }
    } else if (type === 'boxes') {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Box Summary',
              bold: true,
              size: 28,
              color: '1F4788',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 300 },
          border: {
            bottom: {
              color: '1F4788',
              size: 4,
              style: BorderStyle.SINGLE,
            },
          },
        })
      );

      if (data.summary) {
        const summaryTableRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Total Boxes', bold: true, size: 22 }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: 'E3F2FD' },
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(data.summary.totalBoxes || 0), 
                      bold: true,
                      size: 28,
                      color: '1976D2',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
                shading: { type: ShadingType.SOLID, color: 'E3F2FD' },
              }),
            ],
          }),
        ];

        content.push(
          new Table({
            rows: summaryTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }

      if (data.boxes && data.boxes.length > 0) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Box Details',
                bold: true,
                size: 28,
                color: '1F4788',
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
            border: {
              bottom: {
                color: '1F4788',
                size: 4,
                style: BorderStyle.SINGLE,
              },
            },
          })
        );

        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Box Code', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Status', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Store', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({ 
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Received Date', bold: true, size: 22, color: 'FFFFFF' }),
                  ],
                })],
                shading: { type: ShadingType.SOLID, color: '1F4788' },
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          ...data.boxes.slice(0, 50).map((box: any, index: number) => {
            const statusColor = box.status === 'checked_in' 
              ? '388E3C' // Green
              : box.status === 'pending_checkin'
              ? 'F57C00' // Orange
              : '666666'; // Gray

            return new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: box.box_code || 'N/A', size: 20, bold: true }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ 
                        text: box.status || 'N/A', 
                        size: 20,
                        color: statusColor,
                        bold: true,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: box.store_name || 'N/A', size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
                new TableCell({ 
                  children: [new Paragraph({
                    children: [
                      new TextRun({ text: new Date(box.received_date).toLocaleDateString(), size: 20 }),
                    ],
                  })],
                  shading: index % 2 === 0 ? { type: ShadingType.SOLID, color: 'F5F5F5' } : undefined,
                }),
              ],
            });
          }),
        ];

        content.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '1F4788' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
        );
      }
    }

    return content;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="max-w-6xl"
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Report Preview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {reportTitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentIcon className="w-5 h-5" />
              {exportingPDF ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={handleExportWord}
              disabled={exportingWord}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentTextIcon className="w-5 h-5" />
              {exportingWord ? 'Exporting...' : 'Export Word'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
          <div
            ref={printRef}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-4xl mx-auto"
            style={{ minHeight: '297mm' }}
          >
            {/* Report Header */}
            <div className="text-center mb-8 border-b-2 border-gray-300 dark:border-gray-700 pb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {reportTitle}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Generated on {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Report Content */}
            <div className="space-y-6">
              {reportData ? (
                <>
                  {reportType === 'inventory' && renderInventoryReport(reportData)}
                  {reportType === 'transactions' && renderTransactionReport(reportData)}
                  {reportType === 'stores' && renderStoreReport(reportData)}
                  {reportType === 'boxes' && renderBoxReport(reportData)}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No report data available. Please generate a report first.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </BaseModal>
  );
}

function renderInventoryReport(data: any) {
  if (!data) return null;
  
  return (
    <>
      {/* Summary Cards */}
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Items</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.summary.totalItems || 0}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Quantity</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{data.summary.totalQuantity || 0}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Low Stock Items</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{data.summary.lowStockItems || 0}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Boxes</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{data.summary.totalBoxes || 0}</p>
          </div>
        </div>
      )}

      {/* Items Table */}
      {data.items && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Item Code</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Item Name</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Store</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Total Quantity</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Box References</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: any, index: number) => {
                const status = item.totalQuantity === 0 
                  ? 'Out of Stock'
                  : item.totalQuantity < (item.min_level || 10)
                  ? 'Low Stock'
                  : 'In Stock';
                
                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100 font-mono">{item.item_code || 'N/A'}</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                      {item.item_name || 'N/A'}
                      {item.size && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({item.size})</span>}
                      {item.year_code && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">- {item.year_code}</span>}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{item.store_name || 'N/A'}</td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                      <span className="font-semibold">{item.totalQuantity || 0}</span>
                      {item.boxCount > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ({item.boxCount} boxes)
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                      {item.boxReferences && item.boxReferences.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.boxReferences.slice(0, 3).map((boxRef: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs font-mono"
                            >
                              {boxRef}
                            </span>
                          ))}
                          {item.boxReferences.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{item.boxReferences.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.totalQuantity === 0 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : item.totalQuantity < (item.min_level || 10)
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function renderTransactionReport(data: any) {
  if (!data) return null;
  
  return (
    <>
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Transactions</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.summary.totalTransactions || 0}</p>
          </div>
        </div>
      )}
      {data.transactions && data.transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Date</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Type</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Item</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">From Store</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">To Store</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((trans: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                    {new Date(trans.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{trans.transaction_type || 'N/A'}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{trans.item_name || 'N/A'}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{trans.from_store_name || 'N/A'}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{trans.to_store_name || 'N/A'}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{trans.quantity || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function renderStoreReport(data: any) {
  if (!data) return null;
  
  return (
    <>
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Stores</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.summary.totalStores || 0}</p>
          </div>
        </div>
      )}
      {data.stores && data.stores.length > 0 && (
        <div className="space-y-4">
          {data.stores.map((store: any, index: number) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{store.store_name || 'N/A'}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Plant: </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{store.plant_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status: </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    store.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {store.status || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function renderBoxReport(data: any) {
  if (!data) return null;
  
  return (
    <>
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Boxes</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.summary.totalBoxes || 0}</p>
          </div>
        </div>
      )}
      {data.boxes && data.boxes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Box Code</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Store</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Received Date</th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {data.boxes.map((box: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100 font-mono">{box.box_code || 'N/A'}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      box.status === 'checked_in'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : box.status === 'pending_checkin'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {box.status || 'N/A'}
                    </span>
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{box.store_name || 'N/A'}</td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                    {new Date(box.received_date).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">{box.supplier || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

