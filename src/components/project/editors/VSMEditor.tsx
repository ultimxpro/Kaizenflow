import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { A3Module, VSMElement, VSMConnection, VSMContent, VSMElementType } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { 
  HelpCircle, Square, Triangle, User, Truck, ArrowRight, Type, Save, Trash2, GitMerge, 
  MousePointer, X, Settings, Clock, Users, Percent, Boxes, HardDrive, Edit2, MessageSquare, 
  Plus, Workflow, Zap, Eye, Minus, ZoomIn, ZoomOut, Move, Link2, Unlink2, Download, Upload,
  Factory, Package, Timer, Activity, AlertTriangle, TrendingUp, FileText, Copy, Layers
} from 'lucide-react';

// --- CONFIGURATION & TYPES ---
interface VSMMetrics {
  leadTime: number;
  valueAddedTime: number;
  processEfficiency: number;
  taktTime: number;
  uptime: number;
  firstPassYield: number;
}

interface VSMSnapshot {
  id: string;
  name: string;
  date: Date;
  content: VSMContent;
  metrics: VSMMetrics;
}

// --- INITIAL STATE & EXAMPLE DATA ---
const getInitialContent = (content: any): VSMContent => {
  if (content && content.elements && content.elements.length > 0) {
    return content;
  }
  
  // Exemple professionnel complet
  return {
    global: { 
      demandeClient: 18400, 
      tempsOuverture: 28800, 
      uniteTemps: 'secondes',
      title: 'VSM - Ligne de Production',
      company: 'Manufacturing Corp',
      product: 'Pièce métallique ref. XYZ-123',
      author: 'Équipe Kaizen',
      version: '1.0',
      date: new Date().toISOString()
    },
    elements: [
      { id: 'el-fournisseur', type: 'Fournisseur', x: 50, y: 300, width: 150, height: 100, data: { nom: 'Aciérie XYZ', frequence: '2 / semaine', details: 'Livraison par camion\nMOQ: 1000 pièces' } },
      { id: 'el-stock1', type: 'Stock', x: 250, y: 350, width: 80, height: 70, data: { quantite: 5, details: '~2500 pièces' } },
      { id: 'el-decoupe', type: 'Processus', x: 400, y: 300, width: 180, height: 120, data: { nom: 'Découpe Laser', tempsCycle: 39, tempsChangt: 600, tauxDispo: 100, nbOperateurs: 1, rebut: 1, lotSize: 50 } },
      { id: 'el-stock2', type: 'Stock', x: 650, y: 350, width: 80, height: 70, data: { quantite: 2, details: '~1000 pièces' } },
      { id: 'el-pliage', type: 'Processus', x: 800, y: 300, width: 180, height: 120, data: { nom: 'Pliage', tempsCycle: 46, tempsChangt: 900, tauxDispo: 80, nbOperateurs: 1, rebut: 4, lotSize: 25 } },
      { id: 'el-stock3', type: 'Stock', x: 1050, y: 350, width: 80, height: 70, data: { quantite: 1.5, details: '~750 pièces' } },
      { id: 'el-soudure', type: 'Processus', x: 1200, y: 300, width: 180, height: 120, data: { nom: 'Soudure', tempsCycle: 62, tempsChangt: 0, tauxDispo: 90, nbOperateurs: 1, rebut: 1, lotSize: 10 } },
      { id: 'el-stock4', type: 'Stock', x: 1450, y: 350, width: 80, height: 70, data: { quantite: 2.7, details: '~1350 pièces' } },
      { id: 'el-assemblage', type: 'Processus', x: 1600, y: 300, width: 180, height: 120, data: { nom: 'Assemblage', tempsCycle: 40, tempsChangt: 0, tauxDispo: 100, nbOperateurs: 1, rebut: 0.5, lotSize: 20 } },
      { id: 'el-stock5', type: 'Stock', x: 1850, y: 350, width: 80, height: 70, data: { quantite: 1.2, details: '~600 pièces' } },
      { id: 'el-livraison', type: 'Livraison', x: 2000, y: 300, width: 150, height: 100, data: { nom: 'Expédition', frequence: 'Quotidienne', details: 'Transporteur: DHL\nDélai: J+1' } },
      { id: 'el-client', type: 'Client', x: 2200, y: 300, width: 150, height: 100, data: { nom: 'Client Final', frequence: '920 p/jour', details: 'Automobile OEM' } },
      { id: 'el-controleprod', type: 'ControleProduction', x: 1050, y: 80, width: 180, height: 100, data: { nom: 'Planification', details: 'ERP: SAP\nMRP hebdomadaire' } },
      { id: 'el-kaizen1', type: 'Kaizen', x: 850, y: 450, width: 100, height: 80, data: { details: 'Réduire TCH\nde 900s à 300s' } },
      { id: 'el-kaizen2', type: 'Kaizen', x: 1250, y: 450, width: 100, height: 80, data: { details: 'SMED\nChangement < 10min' } },
    ],
    connections: [
      { id: 'c1', from: { elementId: 'el-fournisseur', anchor: 'right' }, to: { elementId: 'el-decoupe', anchor: 'left' }, type: 'matiere', data: { arrowType: 'pousse', label: 'Tôles brutes' } },
      { id: 'c2', from: { elementId: 'el-decoupe', anchor: 'right' }, to: { elementId: 'el-pliage', anchor: 'left' }, type: 'matiere', data: { arrowType: 'pousse', label: 'Pièces découpées' } },
      { id: 'c3', from: { elementId: 'el-pliage', anchor: 'right' }, to: { elementId: 'el-soudure', anchor: 'left' }, type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c4', from: { elementId: 'el-soudure', anchor: 'right' }, to: { elementId: 'el-assemblage', anchor: 'left' }, type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c5', from: { elementId: 'el-assemblage', anchor: 'right' }, to: { elementId: 'el-livraison', anchor: 'left' }, type: 'matiere', data: { arrowType: 'retrait' } },
      { id: 'c6', from: { elementId: 'el-livraison', anchor: 'right' }, to: { elementId: 'el-client', anchor: 'left' }, type: 'matiere' },
      { id: 'c7', from: { elementId: 'el-client', anchor: 'top' }, to: { elementId: 'el-controleprod', anchor: 'right' }, type: 'information', data: { infoType: 'electronique', details: 'Prévisions 6 mois' } },
      { id: 'c8', from: { elementId: 'el-controleprod', anchor: 'left' }, to: { elementId: 'el-fournisseur', anchor: 'top' }, type: 'information', data: { infoType: 'electronique', details: 'Commandes hebdo' } },
      { id: 'c9', from: { elementId: 'el-controleprod', anchor: 'bottom' }, to: { elementId: 'el-assemblage', anchor: 'top' }, type: 'information', data: { infoType: 'manuel', details: 'Planning quotidien' } },
    ],
    snapshots: [],
    comments: []
  };
};

const unitMultipliers = { secondes: 1, minutes: 60, heures: 3600, jours: 86400 };

const elementColors = {
  Fournisseur: { bg: 'bg-purple-100', border: 'border-purple-500', icon: 'text-purple-700' },
  Client: { bg: 'bg-green-100', border: 'border-green-600', icon: 'text-green-700' },
  Processus: { bg: 'bg-blue-100', border: 'border-blue-500', icon: 'text-blue-700' },
  Stock: { bg: 'bg-orange-100', border: 'border-orange-500', icon: 'text-orange-700' },
  ControleProduction: { bg: 'bg-slate-100', border: 'border-slate-500', icon: 'text-slate-700' },
  Livraison: { bg: 'bg-gray-100', border: 'border-gray-500', icon: 'text-gray-700' },
  Kaizen: { bg: 'bg-yellow-100', border: 'border-yellow-500', icon: 'text-yellow-700' },
  Texte: { bg: 'bg-white', border: 'border-gray-300', icon: 'text-gray-600' }
};

// --- COMPOSANT PRINCIPAL ---
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
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Sauvegarde automatique
  useEffect(() => {
    const handler = setTimeout(() => updateA3Module(module.id, { content }), 1000);
    return () => clearTimeout(handler);
  }, [content, module.id, updateA3Module]);

  // Calcul des métriques
  const metrics = useMemo((): VSMMetrics => {
    const processes = content.elements.filter(el => el.type === 'Processus');
    const stocks = content.elements.filter(el => el.type === 'Stock');
    
    const valueAddedTime = processes.reduce((sum, p) => sum + (p.data.tempsCycle || 0), 0);
    const leadTime = valueAddedTime + stocks.reduce((sum, s) => sum + ((s.data.quantite || 0) * 86400), 0);
    const processEfficiency = leadTime > 0 ? (valueAddedTime / leadTime) * 100 : 0;
    
    const taktTime = content.global.tempsOuverture / (content.global.demandeClient / 30);
    
    const avgUptime = processes.length > 0 
      ? processes.reduce((sum, p) => sum + (p.data.tauxDispo || 100), 0) / processes.length 
      : 100;
    
    const avgYield = processes.length > 0 
      ? processes.reduce((sum, p) => sum + (100 - (p.data.rebut || 0)), 0) / processes.length 
      : 100;

    return {
      leadTime: leadTime / 86400,
      valueAddedTime,
      processEfficiency,
      taktTime,
      uptime: avgUptime,
      firstPassYield: avgYield
    };
  }, [content]);

  // Fonctions de manipulation des éléments
  const addElement = (type: VSMElementType) => {
    const centerX = (window.innerWidth / 2 - viewState.pan.x) / viewState.zoom;
    const centerY = (window.innerHeight / 2 - viewState.pan.y) / viewState.zoom;
    
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

  const updateElement = (id: string, newElement: VSMElement) => {
    setContent(c => ({ ...c, elements: c.elements.map(el => el.id === id ? newElement : el) }));
  };

  const deleteElement = (id: string) => {
    setContent(c => ({
      ...c,
      elements: c.elements.filter(el => el.id !== id),
      connections: c.connections.filter(conn => conn.from.elementId !== id && conn.to.elementId !== id)
    }));
    setSelectedItemId(null);
  };

  const deleteConnection = (id: string) => {
    setContent(c => ({
      ...c,
      connections: c.connections.filter(conn => conn.id !== id)
    }));
  };

  // Gestion du zoom et pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = 1.1;
      const newZoom = e.deltaY < 0 ? viewState.zoom * zoomFactor : viewState.zoom / zoomFactor;
      setViewState(vs => ({ ...vs, zoom: Math.max(0.2, Math.min(3, newZoom)) }));
    }
  };

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.style.cursor = 'grabbing';
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewState(vs => ({ ...vs, pan: { x: vs.pan.x + dx, y: vs.pan.y + dy } }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };
  
  const handleMouseUp = () => {
    isPanning.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = mode === 'pan' ? 'grab' : 'default';
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
        deleteElement(selectedItemId);
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
  }, [selectedItemId, copiedElement, content.elements]);

  const selectedElement = useMemo(() => content.elements.find(el => el.id === selectedItemId), [content.elements, selectedItemId]);
  const selectedConnection = useMemo(() => content.connections.find(c => c.id === selectedItemId), [content.connections, selectedItemId]);

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b bg-white flex-shrink-0 z-20 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Éditeur VSM Professionnel</h1>
            <p className="text-xs text-gray-500">Value Stream Mapping - {content.global.title || 'Sans titre'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Toolbar 
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
          <button onClick={() => setShowHelp(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Aide">
            <HelpCircle className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Fermer">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>
      
      {/* Main Canvas */}
      <main className="flex-1 flex overflow-hidden">
        <div 
          className="flex-1 overflow-hidden relative bg-gray-100" 
          ref={canvasRef} 
          onWheel={handleWheel} 
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: mode === 'pan' ? 'grab' : mode === 'connect' ? 'crosshair' : 'default' }}
        >
          {/* Grid Background */}
          {showGrid && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
                backgroundSize: `${50 * viewState.zoom}px ${50 * viewState.zoom}px`,
                backgroundPosition: `${viewState.pan.x}px ${viewState.pan.y}px`
              }}
            />
          )}
          
          {/* Canvas Content */}
          <div 
            className="absolute top-0 left-0" 
            style={{ 
              transform: `translate(${viewState.pan.x}px, ${viewState.pan.y}px) scale(${viewState.zoom})`, 
              transformOrigin: '0 0' 
            }}
          >
            {/* Connections */}
            <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none" style={{ overflow: 'visible' }}>
              {connectingFrom && (
                <TempConnectionLine 
                  from={connectingFrom} 
                  elements={content.elements} 
                  mousePos={lastMousePos.current}
                  zoom={viewState.zoom}
                  pan={viewState.pan}
                />
              )}
              {content.connections.map(conn => (
                <VSMConnectionLine 
                  key={conn.id} 
                  connection={conn} 
                  elements={content.elements}
                  isSelected={selectedItemId === conn.id}
                  onSelect={() => setSelectedItemId(conn.id)}
                  onDelete={() => deleteConnection(conn.id)}
                />
              ))}
            </svg>
            
            {/* Elements */}
            {content.elements.map(el => (
              <VSMNode 
                key={el.id} 
                element={el} 
                isSelected={selectedItemId === el.id} 
                onSelect={setSelectedItemId} 
                onUpdate={updateElement} 
                zoom={viewState.zoom} 
                onAnchorClick={handleAnchorClick} 
                isConnecting={mode === 'connect'}
                connectingFrom={connectingFrom}
              />
            ))}
          </div>
          
          {/* Zoom indicator */}
          <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-lg shadow-md text-sm font-medium">
            Zoom: {Math.round(viewState.zoom * 100)}%
          </div>
          
          {/* Mode indicator */}
          <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-lg shadow-md text-sm">
            Mode: <span className="font-medium">
              {mode === 'select' && 'Sélection'}
              {mode === 'connect' && 'Connexion'}
              {mode === 'pan' && 'Déplacement'}
            </span>
          </div>
        </div>

        {/* Right Panel */}
        <aside className="w-96 bg-white border-l flex flex-col z-10">
          <DetailsPanel 
            element={selectedElement}
            connection={selectedConnection}
            onUpdateElement={updateElement}
            onUpdateConnection={(id, updates) => {
              setContent(c => ({
                ...c,
                connections: c.connections.map(conn => 
                  conn.id === id ? { ...conn, ...updates } : conn
                )
              }));
            }}
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