// src/components/project/editors/vsm/VSMToolbar.tsx

import React, { useRef } from 'react';
import { 
  Square, Triangle, User, Truck, ArrowRight, Type, Workflow, Zap,
  MousePointer, Link2, Move, Download, Upload, ZoomIn, ZoomOut,
  Maximize2, Grid, Eye, EyeOff, Factory, Package
} from 'lucide-react';
import { VSMElementType } from './VSMTypes';

interface VSMToolbarProps {
  onAddElement: (type: VSMElementType) => void;
  mode: 'select' | 'connect' | 'pan';
  setMode: (mode: 'select' | 'connect' | 'pan') => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetView: () => void;
  onZoomToFit: () => void;
  zoom: number;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showMetrics: boolean;
  setShowMetrics: (show: boolean) => void;
}

export const VSMToolbar: React.FC<VSMToolbarProps> = ({
  onAddElement,
  mode,
  setMode,
  onExport,
  onImport,
  onResetView,
  onZoomToFit,
  zoom,
  showGrid,
  setShowGrid,
  showMetrics,
  setShowMetrics
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const elementButtons = [
    { type: 'Fournisseur' as VSMElementType, icon: <Truck size={18} />, tooltip: 'Fournisseur' },
    { type: 'Client' as VSMElementType, icon: <User size={18} />, tooltip: 'Client' },
    { type: 'Processus' as VSMElementType, icon: <Square size={18} />, tooltip: 'Processus' },
    { type: 'Stock' as VSMElementType, icon: <Triangle size={18} />, tooltip: 'Stock' },
    { type: 'ControleProduction' as VSMElementType, icon: <Factory size={18} />, tooltip: 'Contrôle Production' },
    { type: 'Livraison' as VSMElementType, icon: <Package size={18} />, tooltip: 'Livraison' },
    { type: 'Kaizen' as VSMElementType, icon: <Zap size={18} />, tooltip: 'Kaizen' },
    { type: 'Texte' as VSMElementType, icon: <Type size={18} />, tooltip: 'Texte' },
  ];

  return (
    <div className="flex items-center space-x-2">
      {/* Mode buttons */}
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setMode('select')}
          className={`p-2 rounded transition-colors ${
            mode === 'select' ? 'bg-emerald-500 text-white' : 'hover:bg-gray-200'
          }`}
          title="Sélectionner (V)"
        >
          <MousePointer size={18} />
        </button>
        <button
          onClick={() => setMode('connect')}
          className={`p-2 rounded transition-colors ${
            mode === 'connect' ? 'bg-emerald-500 text-white' : 'hover:bg-gray-200'
          }`}
          title="Connecter (C)"
        >
          <Link2 size={18} />
        </button>
        <button
          onClick={() => setMode('pan')}
          className={`p-2 rounded transition-colors ${
            mode === 'pan' ? 'bg-emerald-500 text-white' : 'hover:bg-gray-200'
          }`}
          title="Déplacer la vue (H)"
        >
          <Move size={18} />
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-gray-300" />

      {/* Element buttons */}
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
        {elementButtons.map(({ type, icon, tooltip }) => (
          <button
            key={type}
            onClick={() => onAddElement(type)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title={`Ajouter ${tooltip}`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-gray-300" />

      {/* View controls */}
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={onZoomToFit}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Ajuster à l'écran"
        >
          <Maximize2 size={18} />
        </button>
        <button
          onClick={onResetView}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Réinitialiser la vue (Ctrl+0)"
        >
          <span className="text-xs font-bold">100%</span>
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded transition-colors ${
            showGrid ? 'bg-gray-300' : 'hover:bg-gray-200'
          }`}
          title="Afficher/Masquer la grille"
        >
          <Grid size={18} />
        </button>
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className={`p-2 rounded transition-colors ${
            showMetrics ? 'bg-gray-300' : 'hover:bg-gray-200'
          }`}
          title="Afficher/Masquer les métriques"
        >
          {showMetrics ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-gray-300" />

      {/* Export/Import */}
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={onExport}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Exporter"
        >
          <Download size={18} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Importer"
        >
          <Upload size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImport}
          className="hidden"
        />
      </div>
    </div>
  );
};