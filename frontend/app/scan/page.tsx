'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCodeIcon,
  CameraIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { boxesService } from '@/lib/api/boxes';
import { storesService, Store } from '@/lib/api/stores';
import CheckInModal from '@/components/receiving/CheckInModal';
import StockOutModal from '@/components/receiving/StockOutModal';
import BulkTransferModal from '@/components/items/BulkTransferModal';
import StockOutConfirmationDialog from '@/components/scan/StockOutConfirmationDialog';
import { inventoryService, Inventory } from '@/lib/api/items';
import toast from 'react-hot-toast';

type ScanContext = 'check_in' | 'stock_out' | 'transfer' | 'general';

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = (searchParams.get('context') as ScanContext) || 'general';

  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedBox, setScannedBox] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStockOutConfirmation, setShowStockOutConfirmation] = useState(false);
  const [pendingStockOutBox, setPendingStockOutBox] = useState<any>(null);
  const [processingStockOut, setProcessingStockOut] = useState(false);
  
  // Store selection for auto check-in/stock-out/transfer
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [boxInventories, setBoxInventories] = useState<Inventory[]>([]); // For transfer feature
  const [transferMode, setTransferMode] = useState(false); // Checkbox for transfer mode

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
  const scannerId = 'qr-reader';

  // Function to play scan success sound
  const playScanSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set sound properties (beep tone)
      oscillator.frequency.value = 800; // Frequency in Hz (higher = higher pitch)
      oscillator.type = 'sine'; // Sine wave for smooth beep

      // Set volume (gain)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume (0.0 to 1.0)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2); // Fade out

      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2); // Duration: 200ms
    } catch (error) {
      // Silently fail if audio context is not available
      console.warn('Could not play scan sound:', error);
    }
  };

  useEffect(() => {
    loadStores();
    return () => {
      stopScanning();
    };
  }, []);

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const data = await storesService.list({ status: 'active' });
      setStores(data);
      // Auto-select first store if available
      if (data.length > 0 && !selectedStoreId) {
        setSelectedStoreId(data[0].store_id);
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
      toast.error('Failed to load stores');
    } finally {
      setLoadingStores(false);
    }
  };

  const loadBoxInventories = async (boxId: number, storeId: number) => {
    try {
      const boxDetails = await boxesService.get(boxId);
      const contents = boxDetails.data?.contents || [];
      
      // Get inventory for all items in the box from the store
      const inventories: Inventory[] = [];
      for (const content of contents) {
        try {
          const invList = await inventoryService.list({
            item_id: content.item_id,
            store_id: storeId,
            limit: 100,
          });
          // Find inventory with quantity > 0
          const inv = Array.isArray(invList) 
            ? invList.find((i: Inventory) => i.item_id === content.item_id && i.store_id === storeId && (i.quantity || 0) > 0)
            : null;
          if (inv) {
            inventories.push(inv);
          }
        } catch (err) {
          console.error(`Failed to load inventory for item ${content.item_id}:`, err);
        }
      }
      
      setBoxInventories(inventories);
      if (inventories.length === 0) {
        toast.error('No inventory found for items in this box');
      }
    } catch (err) {
      console.error('Failed to load box inventories:', err);
      toast.error('Failed to load box inventories');
      setBoxInventories([]);
    }
  };

  // Initialize scanner after DOM element is rendered
  useEffect(() => {
    if (scanning && scannerContainerRef.current) {
      initializeScanner();
    }
  }, [scanning]);

  const initializeScanner = async () => {
    try {
      // Wait a bit for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if element exists
      const element = document.getElementById(scannerId);
      if (!element) {
        throw new Error(`Element with id "${scannerId}" not found`);
      }

      setError(null);

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
        },
        (decodedText) => {
          // Play scan success sound
          playScanSound();
          handleScannedCode(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError('Cannot access camera. Please allow camera permissions.');
      setScanning(false);
      toast.error('Camera access denied. Please enable camera permissions.');
    }
  };

  const startScanning = async () => {
    setError(null);
    setScanning(true);
    // Scanner will be initialized in useEffect when scanning becomes true
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
    setScannedCode(null);
  };

  const handleManualInput = (code: string) => {
    if (code.trim()) {
      // Play scan success sound for manual input too
      playScanSound();
      handleScannedCode(code.trim());
    }
  };

  const handleScannedCode = async (code: string) => {
    setScannedCode(code);
    stopScanning();

    try {
      // Validate QR code format
      if (!code.startsWith('BOX-')) {
        toast.error('Invalid QR code format');
        setError('Invalid QR code format. Expected box code (BOX-YYYY-NNNN).');
        return;
      }

      // Find box by code
      const response = await boxesService.list({ search: code, limit: 100 });
      const boxes = response.data || [];
      const box = boxes.find((b: any) => b.box_code === code);

      if (!box) {
        toast.error('Box not found');
        setError('Box not found. Please check the QR code.');
        return;
      }

      setScannedBox(box);
      toast.success('Box found!');

      // Auto-detect status and process accordingly
      // If box status is pending_checkin → auto check-in to selected store
      if (box.status === 'pending_checkin') {
        if (!selectedStoreId) {
          toast.error('Please select a store first');
          setError('Please select a store before checking in.');
          return;
        }

        try {
          // Auto check-in to selected store
          await boxesService.checkIn(box.box_id, {
            store_id: selectedStoreId,
            location_in_store: '', // Optional, can be empty
          });
          toast.success(`Box ${box.box_code} checked in to ${stores.find(s => s.store_id === selectedStoreId)?.store_name || 'store'} successfully!`);
          setScannedBox(null);
          setScannedCode(null);
          setError(null);
          return;
        } catch (err: any) {
          console.error('Error auto check-in:', err);
          toast.error(err?.response?.data?.detail || 'Failed to auto check-in. Opening manual check-in modal.');
          // Fall through to manual check-in modal
          setShowCheckInModal(true);
        }
      }
      // If box status is checked_in → check transfer mode checkbox
      else if (box.status === 'checked_in') {
        if (!selectedStoreId) {
          toast.error('Please select a store first');
          setError('Please select a store before processing.');
          return;
        }

        // If transfer mode is enabled → open transfer modal
        if (transferMode) {
          // Load inventories for transfer
          await loadBoxInventories(box.box_id, box.store_id || selectedStoreId);
          setShowTransferModal(true);
          return;
        }

        // If box is checked in to a different store → show transfer option
        if (box.store_id && box.store_id !== selectedStoreId) {
          toast.error('Box is checked in to a different store');
          setError(`This box is checked in to ${stores.find(s => s.store_id === box.store_id)?.store_name || 'another store'}. Enable transfer mode to transfer this box.`);
          // Load inventories for transfer option
          await loadBoxInventories(box.box_id, box.store_id);
          setShowTransferModal(true);
          return;
        }

        // If transfer mode is disabled and box is in same store → show confirmation dialog first
        // Load box details to get item count
        try {
          const boxDetails = await boxesService.get(box.box_id);
          const contents = boxDetails.data.contents || [];
          
          if (contents.length === 0) {
            toast.error('Box has no contents');
            setError('This box has no items to stock out.');
            return;
          }

          // Store box info with contents for confirmation dialog
          setPendingStockOutBox({
            ...box,
            contents: contents,
          });
          setShowStockOutConfirmation(true);
        } catch (err: any) {
          console.error('Error loading box details:', err);
          toast.error('Failed to load box details');
          setError('Failed to load box details. Please try again.');
        }
        return;
      }
      // Other statuses - show error
      else {
        toast.error(`Box status: ${box.status}`);
        setError(`This box has status "${box.status}". Only pending_checkin and checked_in boxes can be processed.`);
      }
    } catch (err: any) {
      console.error('Error processing scanned code:', err);
      toast.error('Error processing QR code');
      setError('Error processing QR code. Please try again.');
    }
  };

  const handleCheckInSuccess = () => {
    setShowCheckInModal(false);
    setScannedBox(null);
    setScannedCode(null);
    toast.success('Box checked in successfully!');
  };

  const handleStockOutSuccess = () => {
    setShowStockOutModal(false);
    setScannedBox(null);
    setScannedCode(null);
    toast.success('Stock out completed successfully!');
  };

  const handleConfirmStockOut = async () => {
    if (!pendingStockOutBox || !selectedStoreId) {
      setShowStockOutConfirmation(false);
      setPendingStockOutBox(null);
      return;
    }

    setProcessingStockOut(true);

    try {
      // Get box contents
      const boxDetails = await boxesService.get(pendingStockOutBox.box_id);
      const contents = boxDetails.data.contents || [];

      if (contents.length === 0) {
        toast.error('Box has no contents');
        setError('This box has no items to stock out.');
        setShowStockOutConfirmation(false);
        setPendingStockOutBox(null);
        setProcessingStockOut(false);
        return;
      }

      const { stockTransactionsService } = await import('@/lib/api/items');
      
      let successCount = 0;
      let errorCount = 0;

      for (const content of contents) {
        try {
          // Check available inventory
          const inventory = await inventoryService.list({
            item_id: content.item_id,
            store_id: selectedStoreId,
            limit: 1,
          });

          const availableQty = inventory[0]?.quantity || 0;
          const quantityToOut = Math.min(content.remaining || content.quantity, availableQty);

          if (quantityToOut > 0) {
            await stockTransactionsService.create({
              transaction_type: 'stock_out',
              item_id: content.item_id,
              from_store_id: selectedStoreId,
              quantity: quantityToOut,
              box_id: pendingStockOutBox.box_id,
              reference_number: pendingStockOutBox.box_code,
              reference_type: 'BOX',
              employee_name: 'Quick Stock Out',
              employee_id: 'QUICK',
              department: 'Warehouse',
              notes: `Auto stock out from scanned box ${pendingStockOutBox.box_code}`,
            });
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err: any) {
          console.error(`Error stock out item ${content.item_id}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Stock out completed! ${successCount} item(s) processed.${errorCount > 0 ? ` ${errorCount} item(s) failed.` : ''}`);
        setScannedBox(null);
        setScannedCode(null);
        setError(null);
      } else {
        toast.error('Failed to stock out any items');
        setError('No items could be stocked out. Opening manual stock out modal.');
        setShowStockOutModal(true);
      }

      // Close confirmation dialog
      setShowStockOutConfirmation(false);
      setPendingStockOutBox(null);
    } catch (err: any) {
      console.error('Error auto stock-out:', err);
      toast.error(err?.response?.data?.detail || 'Failed to auto stock-out. Opening manual stock out modal.');
      setShowStockOutConfirmation(false);
      setPendingStockOutBox(null);
      setShowStockOutModal(true);
    } finally {
      setProcessingStockOut(false);
    }
  };

  const handleCancelStockOut = () => {
    setShowStockOutConfirmation(false);
    setPendingStockOutBox(null);
    setScannedBox(null);
    setScannedCode(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-safe-bottom transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 px-2"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <QrCodeIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                QR Scanner
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-detect & process
              </p>
            </div>
          </div>
        </motion.div>

        {/* Compact Store Selection - Always show for auto-detect */}
        {!scanning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-4 border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                Select Store
              </h3>
            </div>
            
            {loadingStores ? (
              <div className="flex items-center justify-center py-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <select
                    value={selectedStoreId || ''}
                    onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-sm text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select store...</option>
                    {stores.map((store) => (
                      <option key={store.store_id} value={store.store_id}>
                        {store.store_name} {store.plant_name && `(${store.plant_name})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transfer Mode Checkbox */}
                <div className="flex items-center gap-2 p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <input
                    type="checkbox"
                    id="transferMode"
                    checked={transferMode}
                    onChange={(e) => setTransferMode(e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-400 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="transferMode" className="text-xs font-medium text-orange-800 dark:text-orange-300 cursor-pointer flex-1">
                    Transfer Mode: Scan checked_in boxes will open transfer modal (instead of stock out)
                  </label>
                </div>

                {/* Compact Info about auto-detect */}
                {selectedStoreId && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1.5">
                        Auto-Detect:
                      </p>
                      <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5 ml-3 list-disc">
                        <li>pending_checkin → Auto check-in</li>
                        <li>checked_in → {transferMode ? 'Transfer modal' : 'Auto stock-out'}</li>
                        <li>Different store → Transfer</li>
                      </ul>
                    </div>
                    
                    {/* Transfer Mode Toggle */}
                    {scannedBox && scannedBox.status === 'checked_in' && scannedBox.store_id && scannedBox.store_id !== selectedStoreId && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          await loadBoxInventories(scannedBox.box_id, scannedBox.store_id);
                          setShowTransferModal(true);
                        }}
                        className="w-full p-3 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 border-2 border-orange-400/50"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                        <span className="font-semibold text-sm">Transfer Box</span>
                      </motion.button>
                    )}
                  </div>
                )}

                {!selectedStoreId && (
                  <div className="p-2 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      ⚠️ Select store before scanning
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Scanner Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden mb-6 border border-white/50 dark:border-gray-700/50"
        >
          {!scanning ? (
            <div className="p-8 sm:p-10 text-center">
              <motion.div
                className="w-40 h-40 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center border-4 border-dashed border-blue-300/50 dark:border-blue-500/30 relative overflow-hidden"
                animate={{
                  borderColor: ['rgba(59, 130, 246, 0.3)', 'rgba(147, 51, 234, 0.5)', 'rgba(59, 130, 246, 0.3)'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <CameraIcon className="w-20 h-20 text-blue-500 dark:text-blue-400 relative z-10" />
              </motion.div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Ready to Scan</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                Tap to activate camera
              </p>

              <motion.button
                whileHover={selectedStoreId ? { scale: 1.02, y: -2 } : {}}
                whileTap={selectedStoreId ? { scale: 0.98 } : {}}
                onClick={startScanning}
                disabled={!selectedStoreId}
                className={`w-full py-4 rounded-xl font-semibold text-base shadow-lg transition-all relative overflow-hidden group ${
                  selectedStoreId
                    ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white hover:shadow-xl cursor-pointer'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <CameraIcon className="w-5 h-5 inline-block mr-2 relative z-10" />
                <span className="relative z-10">
                  {!selectedStoreId
                    ? 'Select Store First'
                    : 'Start Scanning'}
                </span>
              </motion.button>

              {/* Manual Input */}
              <motion.div
                className="mt-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-center gap-2">
                  <span className="w-8 h-px bg-gray-300 dark:bg-gray-600"></span>
                  <span>Or enter code manually</span>
                  <span className="w-8 h-px bg-gray-300 dark:bg-gray-600"></span>
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter box code (e.g., BOX-2024-0001)"
                    className="flex-1 px-5 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm font-mono text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualInput(e.currentTarget.value);
                      }
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input) handleManualInput(input.value);
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    Go
                  </motion.button>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="relative bg-black">
              <div 
                id={scannerId} 
                ref={scannerContainerRef}
                className="w-full" 
                style={{ minHeight: '400px' }}
              ></div>

              {/* Instructions */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-md text-white p-6 text-center">
                <motion.p
                  className="text-base font-medium mb-1"
                  animate={{
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  Position QR code within the frame
                </motion.p>
                <p className="text-xs text-white/70">Keep the code steady for best results</p>
              </div>

              {/* Stop button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={stopScanning}
                className="absolute top-6 right-6 w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-red-200/50"
              >
                <XMarkIcon className="w-7 h-7 text-white" />
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-5 mb-6 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XMarkIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-400 font-semibold mb-1">Error</p>
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scanned Code Display */}
        {scannedCode && !error && scannedBox && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 rounded-2xl p-6 shadow-xl mb-6"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
              <div>
                      <p className="text-green-800 dark:text-green-400 font-bold text-lg">Box Found!</p>
                <p className="text-green-700 dark:text-green-300 font-mono text-lg">{scannedCode}</p>
                    </div>
                  </div>
                {scannedBox.store_name && (
                  <div className="flex items-center gap-2 mt-2">
                    <BuildingStorefrontIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Current Store: {scannedBox.store_name}</span>
                    </div>
                  )}
                  {scannedBox.status && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        scannedBox.status === 'pending_checkin' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : scannedBox.status === 'checked_in'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        Status: {scannedBox.status.replace('_', ' ').toUpperCase()}
                      </span>
                  </div>
                )}
                </div>
              </div>
              
              {/* Transfer Button - Prominent */}
              {scannedBox.status === 'checked_in' && scannedBox.store_id && scannedBox.store_id !== selectedStoreId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4 border-t border-green-200 dark:border-green-800"
                >
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 mb-3">
                    <p className="text-sm text-orange-800 dark:text-orange-300 text-center mb-1">
                      <strong>⚠️ Box is in a different store!</strong>
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-400 text-center">
                      Transfer from <strong>{scannedBox.store_name}</strong> to <strong>{stores.find(s => s.store_id === selectedStoreId)?.store_name || 'selected store'}</strong>?
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      await loadBoxInventories(scannedBox.box_id, scannedBox.store_id);
                      setShowTransferModal(true);
                    }}
                    className="w-full p-4 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 font-bold text-lg"
                  >
                    <ArrowPathIcon className="w-6 h-6" />
                    <span>Transfer Box to Selected Store</span>
                </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 dark:border-gray-700/50 p-6 sm:p-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <QrCodeIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">How to Use</h3>
          </div>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {[
              'Tap "Start Scanning" to activate your camera',
              'Position the QR code within the scanning frame',
              'Or manually enter the box code in the input field',
              'System auto-detects box status:',
              '  • pending_checkin → Auto check-in to selected store',
              '  • checked_in → Auto stock-out from selected store',
              '  • Different store? → Transfer option available',
            ]
              .map((text, index) => (
                <motion.li
                  key={index}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mt-0.5">
                    <span className="text-blue-600 font-bold text-xs">{index + 1}</span>
                  </div>
                  <span className="pt-0.5">{text}</span>
                </motion.li>
              ))}
          </ul>
        </motion.div>
      </div>

      {/* Modals */}
      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => {
          setShowCheckInModal(false);
          setScannedBox(null);
          setScannedCode(null);
        }}
        boxId={scannedBox?.box_id || null}
        onSuccess={handleCheckInSuccess}
        initialStoreId={selectedStoreId || undefined}
      />

      <StockOutModal
        isOpen={showStockOutModal}
        onClose={() => {
          setShowStockOutModal(false);
          setScannedBox(null);
          setScannedCode(null);
        }}
        boxId={scannedBox?.box_id || null}
        onSuccess={handleStockOutSuccess}
        storeId={selectedStoreId || undefined}
      />

      {/* Transfer Modal */}
      <BulkTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setBoxInventories([]);
          setScannedBox(null);
          setScannedCode(null);
        }}
        onSuccess={() => {
          setShowTransferModal(false);
          setBoxInventories([]);
          setScannedBox(null);
          setScannedCode(null);
          toast.success('Transfer completed successfully!');
        }}
        selectedInventories={boxInventories}
      />

      {/* Stock Out Confirmation Dialog */}
      {pendingStockOutBox && (
        <StockOutConfirmationDialog
          isOpen={showStockOutConfirmation}
          onClose={handleCancelStockOut}
          onConfirm={handleConfirmStockOut}
          boxCode={pendingStockOutBox.box_code}
          boxStatus={pendingStockOutBox.status}
          storeName={stores.find(s => s.store_id === selectedStoreId)?.store_name}
          itemCount={pendingStockOutBox.contents?.length || 0}
          loading={processingStockOut}
        />
      )}
    </div>
  );
}
