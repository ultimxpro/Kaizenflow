import React, { useState, useRef, useEffect } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { Pen, Square, Circle, Minus, Eraser, Undo, Redo, Save, Trash2, Plus, HelpCircle } from 'lucide-react';

interface CroquisEditorProps {
  module: A3Module;
}

interface Sketch {
  id: string;
  name: string;
  imageData: string;
  createdAt: Date;
}

export const CroquisEditor: React.FC<CroquisEditorProps> = ({ module }) => {
  const { updateA3Module } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'rectangle' | 'circle' | 'line' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const data = module.content || { sketches: [], activeSketchId: null };
  const sketches: Sketch[] = data.sketches || [];
  const activeSketch = sketches.find(s => s.id === data.activeSketchId);

  useEffect(() => {
    if (canvasRef.current && activeSketch) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = activeSketch.imageData;
      }
    }
  }, [activeSketch]);

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const imageData = canvasRef.current.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex - 1];
        setHistoryIndex(historyIndex - 1);
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex + 1];
        setHistoryIndex(historyIndex + 1);
      }
    }
  };

  const createNewSketch = () => {
    const newSketch: Sketch = {
      id: Date.now().toString(),
      name: `Croquis ${sketches.length + 1}`,
      imageData: '',
      createdAt: new Date()
    };

    const updatedSketches = [...sketches, newSketch];
    updateA3Module(module.id, {
      content: {
        ...data,
        sketches: updatedSketches,
        activeSketchId: newSketch.id
      }
    });

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const saveCurrentSketch = () => {
    if (!canvasRef.current || !activeSketch) return;

    const imageData = canvasRef.current.toDataURL();
    const updatedSketches = sketches.map(s =>
      s.id === activeSketch.id ? { ...s, imageData } : s
    );

    updateA3Module(module.id, {
      content: {
        ...data,
        sketches: updatedSketches
      }
    });
  };

  const selectSketch = (sketchId: string) => {
    saveCurrentSketch(); // Save current before switching
    updateA3Module(module.id, {
      content: {
        ...data,
        activeSketchId: sketchId
      }
    });
  };

  const deleteSketch = (sketchId: string) => {
    const updatedSketches = sketches.filter(s => s.id !== sketchId);
    const newActiveId = updatedSketches.length > 0 ? updatedSketches[0].id : null;

    updateA3Module(module.id, {
      content: {
        ...data,
        sketches: updatedSketches,
        activeSketchId: newActiveId
      }
    });
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';

    if (tool === 'rectangle') {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    setIsDrawing(false);
    setStartPos(null);
    saveToHistory();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const tools = [
    { id: 'pen', name: 'Crayon', icon: <Pen className="w-4 h-4" /> },
    { id: 'rectangle', name: 'Rectangle', icon: <Square className="w-4 h-4" /> },
    { id: 'circle', name: 'Cercle', icon: <Circle className="w-4 h-4" /> },
    { id: 'line', name: 'Ligne', icon: <Minus className="w-4 h-4" /> },
    { id: 'eraser', name: 'Gomme', icon: <Eraser className="w-4 h-4" /> }
  ];

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <Pen className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Croquis</h2>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 flex space-x-4">
        {/* Barre d'outils */}
        <div className="w-64 bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Gestion des croquis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Croquis</h3>
              <button
                onClick={createNewSketch}
                className="p-1 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sketches.map((sketch) => (
                <div
                  key={sketch.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    sketch.id === data.activeSketchId ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => selectSketch(sketch.id)}
                >
                  <span className="text-sm truncate">{sketch.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSketch(sketch.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Outils */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Outils</h3>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id as any)}
                  className={`p-2 rounded-lg flex items-center justify-center ${
                    tool === t.id ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'
                  }`}
                  title={t.name}
                >
                  {t.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Couleurs */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Couleurs</h3>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded border-2 ${
                    color === c ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Taille du trait */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Taille</h3>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-600">{lineWidth}px</div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="flex-1 p-2 bg-white rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <Undo className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="flex-1 p-2 bg-white rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <Redo className="w-4 h-4 mx-auto" />
              </button>
            </div>
            <button
              onClick={saveCurrentSketch}
              className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder</span>
            </button>
            <button
              onClick={clearCanvas}
              className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Effacer tout
            </button>
          </div>
        </div>

        {/* Zone de dessin */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="bg-white border border-gray-300 rounded shadow-lg cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>

      {/* Modal d'aide */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comment utiliser l'outil Croquis ?
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>L'outil Croquis permet de créer des dessins et schémas libres.</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-800 mb-2">Fonctionnalités :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Dessiner à main levée avec le crayon</li>
                    <li>Tracer des formes géométriques</li>
                    <li>Choisir couleurs et épaisseurs</li>
                    <li>Gérer plusieurs croquis</li>
                    <li>Annuler/Refaire les actions</li>
                  </ul>
                </div>
                <p>Utilisez cet outil pour illustrer vos idées et concepts visuellement.</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};