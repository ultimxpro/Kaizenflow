import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import {
  HelpCircle, X, Workflow
} from 'lucide-react';
import { VSMToolbar } from './vsm/VSMToolbar';
import { VSMCanvas } from './vsm/VSMCanvas';
import { VSMDetailsPanel } from './vsm/VSMDetailsPanel';
import { VSMHelp } from './vsm/VSMHelp';
import { getInitialContent, calculateMetrics } from './vsm/VSMUtils';
import { VSMContent, VSMElement, VSMConnection, VSMElementType } from './vsm/VSMTypes';

export const VSMEditor: React.FC<{ module: A3Module; onClose: () => void; }> = ({ module, onClose }) => {
  const { updateA3Module } = useDatabase();
  const [content, setContent] = useState<VSMContent>(() => getInitialContent(module.content));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewState, setViewState] = useState({ zoom: 0.8, pan: { x: 0, y: 0 } });
  const [mode, setMode] = useState<'select' | 'connect' | 'pan'>('select');
  const [connectingFrom, setConnectingFrom] = useState<{elementId: string, anchor: 'top' | 'bottom' | 'left' | 'right'} | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedElement, setCopiedElement] = useState<VSMElement | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Sauvegarde automatique
  useEffect(() => {
    const handler = setTimeout(() => updateA3Module(module.id, { content }), 1000);
    return () => clearTimeout(handler);
  }, [content, module.id, updateA3Module]);

  // Calcul des métriques
  const metrics = useMemo(() => calculateMetrics(content), [content]);

  // Fonctions de manipulation des éléments
  const addElement = (type: VSMElementType) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const centerX = ((canvasRect?.width || window.innerWidth) / 2 - viewState.pan.x) / viewState.zoom;
    const centerY = ((canvasRect?.height || window.innerHeight) / 2 - viewState.pan.y) / viewState.zoom;
    
    const newElement: VSMElement = {
      id: `el-${Date.now()}`,
      type,
      x: centerX - 90,
      y: centerY - 60,
      width: type === 'Kaizen' || type === 'Stock' ? 100 : 180,
      height: type === 'Stock' ? 80 : type === 'Kaizen' ? 80 : 120,
      data: { nom: `Nouveau ${type}` }
    };
    
    setContent(c => ({ ...c, elements: [...c.elements, newElement] }));
    setSelectedItemId(newElement.id);
  };

  const duplicateElement = () => {
    if (!selectedItemId) return;
    const element = content.elements.find(el => el.id === selectedItemId);
    if (!element) return;
    
    const newElement: VSMElement = {
      ...element,
      id: `el-${Date.now()}`,
      x: element.x + 20,
      y: element.y + 20,
      data: { ...element.data, nom: `${element.data.nom} (copie)` }
    };
    
    setContent(c => ({ ...c, elements: [...c.elements, newElement] }));
    setSelectedItemId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<VSMElement>) => {
    setContent(c => ({ 
      ...c, 
      elements: c.elements.map(el => el.id === id ? { ...el, ...updates } : el) 
    }));
  };

  const deleteElement = (id: string) => {
    setContent(c => ({
      ...c,
      elements: c.elements.filter(el => el.id !== id),
      connections: c.connections.filter(conn => conn.from.elementId !== id && conn.to.elementId !== id)
    }));
    setSelectedItemId(null);
  };

  const updateConnection = (id: string, updates: Partial<VSMConnection>) => {
    setContent(c => ({
      ...c,
      connections: c.connections.map(conn => conn.id === id ? { ...conn, ...updates } : conn)
    }));
  };

  const deleteConnection = (id: string) => {
    setContent(c => ({
      ...c,
      connections: c.connections.filter(conn => conn.id !== id)
    }));
    setSelectedItemId(null);
  };

  // Gestion du zoom
  const resetView = () => {
    setViewState({ zoom: 1, pan: { x: 0, y: 0 } });
  };

  const zoomToFit = () => {
    if (content.elements.length === 0) return;
    
    const bounds = content.elements.reduce((acc, el) => ({
      minX: Math.min(acc.minX, el.x),
      maxX: Math.max(acc.maxX, el.x + el.width),
      minY: Math.min(acc.minY, el.y),
      maxY: Math.max(acc.maxY, el.y + el.height)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    
    if (canvasRect) {
      const scaleX = (canvasRect.width - 100) / width;
      const scaleY = (canvasRect.height - 100) / height;
      const newZoom = Math.min(scaleX, scaleY, 1.5);
      
      setViewState({
        zoom: newZoom,
        pan: {
          x: (canvasRect.width - width * newZoom) / 2 - bounds.minX * newZoom,
          y: (canvasRect.height - height * newZoom) / 2 - bounds.minY * newZoom
        }
      });
    }
  };

  // Gestion des connexions
  const handleAnchorClick = (elementId: string, anchor: 'top' | 'bottom' | 'left' | 'right') => {
    if (mode !== 'connect') return;
    
    if (!connectingFrom) {
      setConnectingFrom({ elementId, anchor });
    } else {
      if (connectingFrom.elementId === elementId) {
        setConnectingFrom(null);
        return;
      }
      
      const newConnection: VSMConnection = {
        id: `conn-${Date.now()}`,
        from: connectingFrom,
        to: { elementId, anchor },
        type: 'information',
        data: {}
      };
      
      setContent(c => ({ ...c, connections: [...c.connections, newConnection] }));
      setConnectingFrom(null);
      setMode('select');
    }
  };

  // Export/Import
  const exportVSM = () => {
    const dataStr = JSON.stringify(content, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportName = `VSM_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  };

  const importVSM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setContent(imported);
          zoomToFit();
        } catch (error) {
          alert('Erreur lors de l\'import du fichier');
        }
      };
      reader.readAsText(file);
    }
  };

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault();
        const element = content.elements.find(el => el.id === selectedItemId);
        const connection = content.connections.find(c => c.id === selectedItemId);
        if (element) deleteElement(selectedItemId);
        if (connection) deleteConnection(selectedItemId);
      }
      
      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedItemId) {
        e.preventDefault();
        duplicateElement();
      }
      
      // Copy/Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedItemId) {
        e.preventDefault();
        const element = content.elements.find(el => el.id === selectedItemId);
        if (element) setCopiedElement(element);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedElement) {
        e.preventDefault();
        const newElement: VSMElement = {
          ...copiedElement,
          id: `el-${Date.now()}`,
          x: copiedElement.x + 20,
          y: copiedElement.y + 20
        };
        setContent(c => ({ ...c, elements: [...c.elements, newElement] }));
        setSelectedItemId(newElement.id);
      }
      
      // Modes
      if (e.key === 'v') setMode('select');
      if (e.key === 'c') setMode('connect');
      if (e.key === 'h') setMode('pan');
      
      // Zoom
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetView();
      }
      if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setViewState(vs => ({ ...vs, zoom: Math.min(3, vs.zoom * 1.1) }));
      }
      if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setViewState(vs => ({ ...vs, zoom: Math.max(0.2, vs.zoom / 1.1) }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, copiedElement, content]);

  const selectedElement = useMemo(() => content.elements.find(el => el.id === selectedItemId), [content.elements, selectedItemId]);
  const selectedConnection = useMemo(() => content.connections.find(c => c.id === selectedItemId), [content.connections, selectedItemId]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b bg-white flex-shrink-0 z-20 shadow-sm rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Éditeur VSM</h1>
            <p className="text-xs text-gray-500">{content.global?.title || 'Value Stream Mapping'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowHelp(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Aide">
                <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
        </div>
      </header>

      <div className="flex items-center justify-center p-2 border-b bg-gray-50">
        <VSMToolbar 
            onAddElement={addElement} 
            mode={mode} 
            setMode={setMode}
            onExport={exportVSM}
            onImport={importVSM}
            onResetView={resetView}
            onZoomToFit={zoomToFit}
            zoom={viewState.zoom}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            showMetrics={showMetrics}
            setShowMetrics={setShowMetrics}
        />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden bg-gray-50 rounded-b-lg">
        <VSMCanvas
          ref={canvasRef}
          content={content}
          viewState={viewState}
          setViewState={setViewState}
          mode={mode}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          connectingFrom={connectingFrom}
          setConnectingFrom={setConnectingFrom}
          showGrid={showGrid}
          onUpdateElement={updateElement}
          onDeleteConnection={deleteConnection}
          onAnchorClick={handleAnchorClick}
        />

        {/* Right Panel */}
        <aside className="w-80 bg-white border-l flex flex-col z-10">
          <VSMDetailsPanel 
            element={selectedElement}
            connection={selectedConnection}
            onUpdateElement={updateElement}
            onUpdateConnection={updateConnection}
            onDelete={(id) => {
              if (selectedElement) deleteElement(id);
              if (selectedConnection) deleteConnection(id);
            }}
            globalData={content.global}
            onUpdateGlobal={(updates) => {
              setContent(c => ({ ...c, global: { ...c.global, ...updates } }));
            }}
            metrics={metrics}
            showMetrics={showMetrics}
          />
        </aside>
      </main>

      {/* Help Modal */}
      {showHelp && <VSMHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
};