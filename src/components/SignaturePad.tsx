import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw, PenLine } from 'lucide-react';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  getDataUrl: () => string;
}

interface SignaturePadProps {
  onSignatureChange?: (hasSignature: boolean) => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(({ onSignatureChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // Initialize and resize canvas
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set display size (css pixels)
    canvas.style.width = '100%';
    canvas.style.height = '150px';

    // Set actual size in memory (scaled for retina/crispness)
    const displayWidth = rect.width || 600;
    const displayHeight = 150;

    // Only resize if different to avoid wiping ongoing strokes unintentionally on minor re-renders
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      // Save current content if any
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;

        // Restore if had previous strokes
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
          ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
        }
      }
    }
  };

  useEffect(() => {
    setupCanvas();
    const handleResize = () => {
      setupCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.5, y + 0.5); // Ensure a dot if just tapped
    ctx.stroke();

    if (!hasContent) {
      setHasContent(true);
      onSignatureChange?.(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling on touch screens
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hasContent) {
      setHasContent(true);
      onSignatureChange?.(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.closePath();
      }
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onSignatureChange?.(false);
  };

  const isEmpty = () => {
    return !hasContent;
  };

  const getDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return '';
    return canvas.toDataURL('image/png');
  };

  useImperativeHandle(ref, () => ({
    clear,
    isEmpty,
    getDataUrl,
  }));

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full border border-gray-300 rounded-md bg-white overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#8B9A6E]"
      >
        <div className="absolute top-2 left-3 flex items-center gap-1.5 text-xs text-gray-400 select-none pointer-events-none">
          <PenLine className="w-3.5 h-3.5" />
          <span>Sign above the line</span>
        </div>

        {/* Subtle signature guideline */}
        <div className="absolute bottom-10 left-6 right-6 border-b border-dashed border-gray-200 pointer-events-none" />
        <span className="absolute bottom-3 left-6 text-[11px] text-gray-400 font-mono pointer-events-none select-none">
          X _________________________________________________
        </span>

        <canvas
          id="signatureCanvas"
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="block w-full h-[150px] cursor-crosshair touch-none"
        />

        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            Sign inside the box using your mouse, trackpad, or finger
          </span>
          <button
            type="button"
            id="clearSignatureBtn"
            onClick={clear}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-black bg-white hover:bg-gray-100 border border-gray-300 rounded shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Signature
          </button>
        </div>
      </div>
      {!hasContent && (
        <p className="text-xs text-amber-700 mt-1">
          * A valid handwritten digital signature is required before submitting.
        </p>
      )}
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';
