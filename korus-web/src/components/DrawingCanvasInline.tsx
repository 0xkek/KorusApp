'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/Button';

interface DrawingCanvasInlineProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export default function DrawingCanvasInline({ onSave, onClose }: DrawingCanvasInlineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#00F0FF'); // korus-primary
  const [brushSize, setBrushSize] = useState(3);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size - smaller for inline
        canvas.width = 550;
        canvas.height = 300;

        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Save initial state
        saveToHistory();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    const newHistory = canvasHistory.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setCanvasHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0 && canvasRef.current) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < canvasHistory.length - 1 && canvasRef.current) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  const loadFromHistory = (index: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = canvasHistory[index];
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (e.type === 'mousedown') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  const colors = [
    '#00F0FF', // korus-primary
    '#9D4EDD', // korus-secondary
    '#000000', // black
    '#FFFFFF', // white
    '#FF0000', // red
    '#00FF00', // green
    '#0000FF', // blue
    '#FFFF00', // yellow
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white text-sm font-bold">Draw Something</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[#a1a1a1] hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tools - Above canvas */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Color Palette */}
        <div className="flex items-center gap-1">
          <span className="text-[#a1a1a1] text-xs">Colors:</span>
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={`w-6 h-6 rounded border-2 transition-all ${
                currentColor === color
                  ? 'border-korus-primary scale-110 shadow-lg'
                  : 'border-white/5 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[#a1a1a1] text-xs">Size:</span>
          <input
            type="range"
            min="1"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-white text-xs font-medium w-8">{brushSize}px</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="px-2 py-1 bg-white/[0.06] border border-white/15 rounded text-white text-xs hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Undo"
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= canvasHistory.length - 1}
            className="px-2 py-1 bg-white/[0.06] border border-white/15 rounded text-white text-xs hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Redo"
          >
            ↷
          </button>
          <button
            onClick={clearCanvas}
            className="px-2 py-1 bg-white/[0.06] border border-white/15 rounded text-white text-xs hover:bg-white/[0.12] transition-all"
            title="Clear"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas - Centered */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="border-2 border-white/10 rounded-xl cursor-crosshair bg-white shadow-lg"
          style={{ width: '550px', height: '300px' }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          onClick={onClose}
          variant="secondary"
          size="sm"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="primary"
          size="sm"
        >
          Add Drawing
        </Button>
      </div>
    </div>
  );
}
