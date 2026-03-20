import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CameraOff, CheckCircle2, XCircle, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  expectedValue: string;
  onScanResult: (result: { scannedValue: string; isMatch: boolean }) => void;
  continuousMode?: boolean;
}

// Singleton AudioContext to avoid browser limit (~6 concurrent contexts)
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContext();
    }
    // Resume if suspended (browsers suspend until user gesture)
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playTone(frequency: number, duration: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Audio playback failed
  }
}

const BarcodeScanner = ({ open, onClose, expectedValue, onScanResult, continuousMode = false }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const isProcessingRef = useRef(false);

  // Refs to hold latest props — prevents useEffect from re-running when
  // callbacks/expectedValue change (which would tear down & restart the camera)
  const expectedValueRef = useRef(expectedValue);
  const onScanResultRef = useRef(onScanResult);
  const onCloseRef = useRef(onClose);
  const continuousModeRef = useRef(continuousMode);

  expectedValueRef.current = expectedValue;
  onScanResultRef.current = onScanResult;
  onCloseRef.current = onClose;
  continuousModeRef.current = continuousMode;

  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'match' | 'mismatch'>('scanning');
  const [lastScanned, setLastScanned] = useState('');
  const [manualInput, setManualInput] = useState('');

  const handleDecode = useCallback((scannedValue: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const trimmed = scannedValue.trim().slice(0, 200);
    const isMatch = trimmed.toLowerCase() === expectedValueRef.current.toLowerCase();

    setLastScanned(trimmed);

    if (isMatch) {
      setScanStatus('match');
      playTone(880, 150);
      try { navigator.vibrate(100); } catch { /* not supported */ }
    } else {
      setScanStatus('mismatch');
      playTone(440, 300);
      try { navigator.vibrate([50, 50, 50]); } catch { /* not supported */ }
    }

    onScanResultRef.current({ scannedValue: trimmed, isMatch });

    if (isMatch && !continuousModeRef.current) {
      setTimeout(() => {
        onCloseRef.current();
      }, 1200);
    }

    setTimeout(() => {
      isProcessingRef.current = false;
      if (continuousModeRef.current || !isMatch) {
        setScanStatus('scanning');
      }
    }, 2000);
  }, []); // stable — reads everything from refs

  // Camera lifecycle: only depends on `open`, not on callbacks/expectedValue
  useEffect(() => {
    if (!open) {
      // Reset UI state when closing
      setScanStatus('scanning');
      setLastScanned('');
      setManualInput('');
      setCameraAvailable(true); // reset so next open retries camera
      return;
    }

    // Small delay to ensure the Sheet portal has painted the <video> element
    const startTimeout = setTimeout(() => {
      const videoEl = videoRef.current;
      if (!videoEl) {
        setCameraAvailable(false);
        return;
      }

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      reader.decodeFromVideoDevice(undefined, videoEl, (result, error) => {
        if (result) {
          handleDecode(result.getText());
        }
        if (error && !(error instanceof NotFoundException)) {
          console.warn('Barcode scan error:', error);
        }
      }).catch(() => {
        setCameraAvailable(false);
      });
    }, 100);

    return () => {
      clearTimeout(startTimeout);
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, [open, handleDecode]);

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    handleDecode(manualInput.trim());
    setManualInput('');
  };

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onCloseRef.current(); }}>
      <SheetContent side="bottom" className="h-[90svh] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 shrink-0">
          <SheetTitle className="text-sm">
            Scan Barcode — expecting <span className="font-mono text-accent">{expectedValue}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="relative flex-1 bg-black overflow-hidden">
          {cameraAvailable ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Scan reticle overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-white/50 rounded-lg"
                  style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
              <CameraOff className="h-12 w-12" />
              <p className="text-sm">Camera not available</p>
              <p className="text-xs text-white/40">Use manual entry below</p>
            </div>
          )}

          {/* Result banner */}
          {scanStatus === 'match' && (
            <div className="absolute inset-x-0 top-0 bg-green-600/90 text-white px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div className="text-sm font-medium">Match! {lastScanned}</div>
            </div>
          )}
          {scanStatus === 'mismatch' && (
            <div className="absolute inset-x-0 top-0 bg-red-600/90 text-white px-4 py-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div className="text-sm font-medium">Mismatch</div>
              </div>
              <div className="text-xs mt-1 opacity-90">
                Expected: <span className="font-mono">{expectedValue}</span> — Scanned: <span className="font-mono">{lastScanned}</span>
              </div>
            </div>
          )}
        </div>

        {/* Manual entry fallback */}
        <div className="p-4 pt-3 border-t border-border bg-background shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSubmit(); }}
                placeholder="Type part number manually..."
                className="pl-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={handleManualSubmit} disabled={!manualInput.trim()}>
              Verify
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BarcodeScanner;
