import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { A3Module, VSMElement, VSMConnection, VSMContent, VSMElementType } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { 
  HelpCircle, Square, Triangle, User, Truck, ArrowRight, Type, Save, Trash2, GitMerge, 
  MousePointer, X, Settings, Clock, Users, Percent, Boxes, HardDrive, Edit2, MessageSquare, 
  Plus, Workflow, Zap, Eye, Minus, ZoomIn, ZoomOut, Move
} from 'lucide-react';

// --- INITIAL STATE & EXAMPLE DATA ---
const getInitialContent = (content: any): VSMContent => {
  if (content && content.elements && content.elements.length > 0) {
    return content;
  }
  // --- EXEMPLE CONCRET : USINE DE FABRICATION DE PIÈCES MÉTALLIQUES ---
  return {
    global: { demandeClient: 18400, tempsOuverture: 28800 },
    elements: [
      { id: 'el-fournisseur', type: 'Fournisseur', x: 50, y: 300, width: 150, height: 100, data: { nom: 'Aciérie XYZ', frequence: '2 / semaine' } },
      { id: 'el-stock1', type: 'Stock', x: 250, y: 350, width: 80, height: 70, data: { quantite: 5, tempsAttente: 432000 } },
      { id: 'el-decoupe', type: 'Processus', x: 400, y: 300, width: 180, height: 120, data: { nom: 'Découpe Laser', tempsCycle: 39, tempsChangt: 600, tauxDispo: 100, nbOperateurs: 1, rebut: 1 } },
      { id: 'el-stock2', type: 'Stock', x: 650, y: 350, width: 80, height: 70, data: { quantite: 2, tempsAttente: 172800 } },
      { id: 'el-pliage', type: 'Processus', x: 800, y: 300, width: 180, height: 120, data: { nom: 'Pliage', tempsCycle: 46, tempsChangt: 900, tauxDispo: 80, nbOperateurs: 1, rebut: 4 } },
      { id: 'el-stock3', type: 'Stock', x: 1050, y: 350, width: 80, height: 70, data: { quantite: 1.5, tempsAttente: 129600 } },
      { id: 'el-soudure', type: 'Processus', x: 1200, y: 300, width: 180, height: 120, data: { nom: 'Soudure', tempsCycle: 62, tempsChangt: 0, tauxDispo: 90, nbOperateurs: 1, rebut: 1 } },
      { id: 'el-stock4', type: 'Stock', x: 1450, y: 350, width: 80, height: 70, data: { quantite: 2.7, tempsAttente: 233280 } },
      { id: 'el-assemblage', type: 'Processus', x: 1600, y: 300, width: 180, height: 120, data: { nom: 'Assemblage', tempsCycle: 40, tempsChangt: 0, tauxDispo: 100, nbOperateurs: 1, rebut: 0.5 } },
      { id: 'el-stock5', type: 'Stock', x: 1850, y: 350, width: 80, height: 70, data: { quantite: 1.2, tempsAttente: 103680 } },
      { id: 'el-livraison', type: 'Livraison', x: 2000, y: 300, width: 150, height: 100, data: { nom: 'Expédition', frequence: 'Quotidienne' } },
      { id: 'el-client', type: 'Client', x: 2200, y: 300, width: 150, height: 100, data: { nom: 'Client Final', frequence: '18400 p / mois' } },
      { id: 'el-controleprod', type: 'ControleProduction', x: 1050, y: 80, width: 180, height: 100, data: { nom: 'Contrôle Production' } },
      { id: 'el-texte1', type: 'Texte', x: 1050, y: 550, width: 200, height: 50, data: { contenu: 'Exemple de VSM Industrielle' } }
    ],
    connections: [
      { id: 'c1', from: 'el-fournisseur', to: 'el-decoupe', type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c2', from: 'el-decoupe', to: 'el-pliage', type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c3', from: 'el-pliage', to: 'el-soudure', type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c4', from: 'el-soudure', to: 'el-assemblage', type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c5', from: 'el-assemblage', to: 'el-livraison', type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c6', from: 'el-livraison', to: 'el-client', type: 'matiere' },
      { id: 'c7', from: 'el-client', to: 'el-controleprod', type: 'information', data: { infoType: 'electronique', details: 'Prévisions 90/60/30 jours' } },
      { id: 'c8', from: 'el-controleprod', to: 'el-fournisseur', type: 'information', data: { infoType: 'electronique', details: 'Commande hebdo.' } },
      { id: 'c9', from: 'el-controleprod', to: 'el-assemblage', type: 'information', data: { infoType: 'manuel', details: 'Planning quotidien' } },
    ]
  };
};

// ... Le reste du fichier VSMEditor.tsx ...
// (Le code complet est fourni ci-dessous)
// ...
// --- PROPS ---
interface VSMEditorProps {
  module: A3Module;
  onClose: () => void;
}

// --- MAIN COMPONENT ---
export const VSMEditor: React.FC<VSMEditorProps> = ({ module, onClose }) => {
  const { updateA3Module } = useDatabase();

  const [content, setContent] = useState<VSMContent>(() => getInitialContent(module.content));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewState, setViewState] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // --- Auto-save logic ---
  useEffect(() => {
    const handler = setTimeout(() => {
      updateA3Module(module.id, { content });
    }, 1500);
    return () => clearTimeout(handler);
  }, [content, module.id, updateA3Module]);
  
  // --- Handlers for CRUD ---
  const addElement = (type: VSMElementType) => {
    const newElement: VSMElement = {
      id: `el-${Date.now()}`,
      type,
      x: 200 - viewState.pan.x / viewState.zoom,
      y: 200 - viewState.pan.y / viewState.zoom,
      width: 180, height: 120,
      data: { nom: `Nouveau ${type}` }
    };
    setContent(c => ({ ...c, elements: [...c.elements, newElement] }));
  };
  
  const updateElement = (id: string, newElement: VSMElement) => {
    setContent(c => ({ ...c, elements: c.elements.map(el => el.id === id ? newElement : el) }));
  };
  
  const deleteElement = (id: string) => {
    setContent(c => ({
      ...c,
      elements: c.elements.filter(el => el.id !== id),
      connections: c.connections.filter(conn => conn.from !== id && conn.to !== id)
    }));
    setSelectedItemId(null);
  };
  
  // --- Canvas Interaction Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? viewState.zoom * zoomFactor : viewState.zoom / zoomFactor;
    setViewState(vs => ({ ...vs, zoom: Math.max(0.1, Math.min(3, newZoom)) }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
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
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      isPanning.current = false;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    }
  };

  const selectedElement = useMemo(() => content.elements.find(el => el.id === selectedItemId), [content.elements, selectedItemId]);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <header className="flex items-center justify-between p-3 border-b bg-white flex-shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Éditeur VSM Complet</h1>
        </div>
        <div className="flex items-center space-x-2">
            <Toolbar onAddElement={addElement} />
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
            </button>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        <div 
            className="flex-1 overflow-hidden relative" 
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
          <div 
            className="absolute top-0 left-0"
            style={{ transform: `translate(${viewState.pan.x}px, ${viewState.pan.y}px) scale(${viewState.zoom})`, transformOrigin: '0 0' }}
          >
            {content.elements.map(el => 
              <VSMNode 
                key={el.id} 
                element={el} 
                isSelected={selectedItemId === el.id} 
                onSelect={setSelectedItemId}
                onUpdate={updateElement}
                zoom={viewState.zoom}
              />
            )}
            <svg className="absolute top-0 left-0 w-[5000px] h-[3000px] pointer-events-none" style={{transform: 'translate(-50%, -50%)', top: '50%', left: '50%'}}>
              {content.connections.map(conn => 
                  <VSMLine key={conn.id} connection={conn} elements={content.elements} />
              )}
            </svg>
          </div>
        </div>

        <aside className="w-80 bg-white border-l p-4 flex flex-col z-10">
          <DetailsPanel 
            element={selectedElement} 
            onUpdate={updateElement}
            onDelete={deleteElement}
          />
        </aside>
      </main>

      <footer className="bg-white border-t p-3 flex-shrink-0 z-20">
        <Timeline content={content} />
      </footer>
    </div>
  );
};


// --- SUB-COMPONENTS ---

const Toolbar: React.FC<{ onAddElement: (type: VSMElementType) => void }> = ({ onAddElement }) => {
  const elementTypes: VSMElementType[] = ['Fournisseur', 'Client', 'Processus', 'Stock', 'ControleProduction', 'Livraison', 'Texte'];
  return (
    <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
      {elementTypes.map(type => (
        <button key={type} onClick={() => onAddElement(type)} className="p-2 hover:bg-gray-200 rounded" title={`Ajouter ${type}`}>
          {/* Simple icons for toolbar */}
          {type === 'Fournisseur' && <Truck size={18} />}
          {type === 'Client' && <User size={18} />}
          {type === 'Processus' && <Square size={18} />}
          {type === 'Stock' && <Triangle size={18} />}
          {type === 'ControleProduction' && <Workflow size={18} />}
          {type === 'Livraison' && <ArrowRight size={18} />}
          {type === 'Texte' && <Type size={18} />}
        </button>
      ))}
    </div>
  );
};

const VSMNode: React.FC<{
  element: VSMElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, newEl: VSMElement) => void;
  zoom: number;
}> = ({ element, isSelected, onSelect, onUpdate, zoom }) => {
  
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(element.id);
    setIsDragging(true);

    const startX = e.clientX / zoom;
    const startY = e.clientY / zoom;
    const startElX = element.x;
    const startElY = element.y;

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX / zoom - startX;
      const dy = me.clientY / zoom - startY;
      onUpdate(element.id, { ...element, x: startElX + dx, y: startElY + dy });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const baseClasses = "absolute p-2 shadow-md cursor-move transition-all duration-100";
  const selectedClasses = isSelected ? 'ring-2 ring-yellow-400 ring-offset-2' : 'hover:shadow-lg';

  const renderContent = () => {
    switch (element.type) {
      case 'Processus': return <ProcessNode data={element.data} />;
      case 'Stock': return <StockNode data={element.data} />;
      case 'Fournisseur':
      case 'Client': return <ActorNode data={element.data} type={element.type} />;
      case 'Livraison': return <TruckNode data={element.data} />;
      case 'ControleProduction': return <ControlNode data={element.data} />;
      case 'Texte': return <TextNode data={element.data} onUpdate={data => onUpdate(element.id, {...element, data})} />;
      default: return <div>{element.data.nom || element.type}</div>;
    }
  };

  return (
    <div 
      className={`${baseClasses} ${selectedClasses}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height }}
      onMouseDown={handleMouseDown}
    >
      {renderContent()}
    </div>
  );
};

// ... More specific Node components
const ProcessNode: React.FC<{data: VSMElement['data']}> = ({data}) => (
    <div className="w-full h-full bg-blue-100 border-2 border-blue-500 flex flex-col items-center justify-center p-1">
        <h4 className="font-bold text-sm text-blue-800 mb-1">{data.nom}</h4>
        <div className="grid grid-cols-2 gap-x-2 text-xs text-blue-700 w-full text-left px-2">
            <span>TC: <strong>{data.tempsCycle || 0}s</strong></span>
            <span>TCH: <strong>{data.tempsChangt || 0}s</strong></span>
            <span>Disp: <strong>{data.tauxDispo || 100}%</strong></span>
            <span>Rebut: <strong>{data.rebut || 0}%</strong></span>
        </div>
        <div className="absolute -bottom-4 bg-white border border-gray-400 rounded-full w-6 h-6 flex items-center justify-center">
            <User size={14} />
            <span className="absolute -right-3 font-bold text-xs">{data.nbOperateurs || 1}</span>
        </div>
    </div>
);

const StockNode: React.FC<{data: VSMElement['data']}> = ({data}) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-orange-100 border-2 border-orange-500">
        <Triangle className="text-orange-500" size={24} />
        <span className="text-xs mt-1 font-semibold">{data.quantite} jours</span>
    </div>
);
const ActorNode: React.FC<{data: VSMElement['data'], type: 'Client' | 'Fournisseur'}> = ({data, type}) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-green-100 border-2 border-green-600 p-2">
        {type === 'Client' ? <User size={32} className="text-green-700"/> : <Truck size={32} className="text-purple-700"/>}
        <h4 className="font-bold text-sm mt-2">{data.nom}</h4>
        <p className="text-xs">{data.frequence}</p>
    </div>
);

const TruckNode: React.FC<{data: VSMElement['data']}> = ({data}) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 border-2 border-gray-400 p-2">
        <Truck size={32} className="text-gray-700"/>
        <h4 className="font-bold text-sm mt-2">{data.nom}</h4>
        <p className="text-xs">{data.frequence}</p>
    </div>
);
const ControlNode: React.FC<{data: VSMElement['data']}> = ({data}) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 border-2 border-slate-500 p-2">
        <Workflow size={32} className="text-slate-700"/>
        <h4 className="font-bold text-sm mt-2">{data.nom}</h4>
    </div>
);

const TextNode: React.FC<{data: VSMElement['data'], onUpdate: (data: VSMElement['data']) => void}> = ({data, onUpdate}) => (
    <textarea 
        className="w-full h-full bg-transparent border-none outline-none resize-none text-sm p-1"
        value={data.contenu || ''}
        onChange={(e) => onUpdate({ ...data, contenu: e.target.value })}
    />
);


const DetailsPanel: React.FC<{
  element?: VSMElement;
  onUpdate: (id: string, newEl: VSMElement) => void;
  onDelete: (id: string) => void;
}> = ({ element, onUpdate, onDelete }) => {
  if (!element) {
    return (
      <div className="text-center text-sm text-gray-500 py-10">
        <MousePointer className="mx-auto mb-2" />
        Sélectionnez un élément pour voir et modifier ses propriétés.
      </div>
    );
  }
  
  const handleDataChange = (field: keyof VSMElement['data'], value: any) => {
    const newData = { ...element.data, [field]: value };
    onUpdate(element.id, { ...element, data: newData });
  };
  
  return (
    <div className="flex-1 overflow-y-auto pr-2">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-800">{element.data.nom || element.type}</h3>
            <button onClick={() => onDelete(element.id)} className="p-1 hover:bg-red-100 rounded">
                <Trash2 size={16} className="text-red-500" />
            </button>
        </div>
        <div className="space-y-3">
          <Input label="Nom" value={element.data.nom || ''} onChange={v => handleDataChange('nom', v)} />
          
          {element.type === 'Processus' && <>
            <Input label="Temps de Cycle (s)" type="number" value={element.data.tempsCycle || 0} onChange={v => handleDataChange('tempsCycle', +v)} />
            <Input label="Temps de Changement (s)" type="number" value={element.data.tempsChangt || 0} onChange={v => handleDataChange('tempsChangt', +v)} />
            <Input label="Disponibilité (%)" type="number" value={element.data.tauxDispo || 100} onChange={v => handleDataChange('tauxDispo', +v)} />
            <Input label="Rebut (%)" type="number" value={element.data.rebut || 0} onChange={v => handleDataChange('rebut', +v)} />
            <Input label="Opérateurs" type="number" value={element.data.nbOperateurs || 1} onChange={v => handleDataChange('nbOperateurs', +v)} />
          </>}
          
          {element.type === 'Stock' && <>
            <Input label="Quantité (jours)" type="number" value={element.data.quantite || 0} onChange={v => handleDataChange('quantite', +v)} />
          </>}
          
          {(element.type === 'Client' || element.type === 'Fournisseur' || element.type === 'Livraison') && <>
            <Input label="Fréquence" value={element.data.frequence || ''} onChange={v => handleDataChange('frequence', v)} />
          </>}
        </div>
    </div>
  );
};
const Input: React.FC<{label: string, value: string | number, onChange: (val: string | number) => void, type?: string}> = ({label, value, onChange, type="text"}) => (
    <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
        />
    </div>
);


const VSMLine: React.FC<{connection: VSMConnection, elements: VSMElement[]}> = ({connection, elements}) => {
    const fromEl = elements.find(el => el.id === connection.from);
    const toEl = elements.find(el => el.id === connection.to);

    if (!fromEl || !toEl) return null;
    
    // Simple line for now
    const x1 = fromEl.x + fromEl.width / 2;
    const y1 = fromEl.y + fromEl.height / 2;
    const x2 = toEl.x + toEl.width / 2;
    const y2 = toEl.y + toEl.height / 2;
    
    const isInfo = connection.type === 'information';

    return (
        <g>
            <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={isInfo ? "#475569" : "#4b5563"} strokeWidth="2" strokeDasharray={isInfo ? "5,5" : "none"} markerEnd="url(#arrow)" />
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={isInfo ? "#475569" : "#4b5563"} />
                </marker>
            </defs>
        </g>
    )
}

const Timeline: React.FC<{content: VSMContent}> = ({content}) => {
    const data = useMemo(() => {
        const processElements = content.elements.filter(el => el.type === 'Processus');
        const stockElements = content.elements.filter(el => el.type === 'Stock');
        
        const totalVA = processElements.reduce((sum, el) => sum + (el.data.tempsCycle || 0), 0);
        const totalNVA = stockElements.reduce((sum, el) => sum + ((el.data.quantite || 0) * 24 * 3600), 0); // Convert days to seconds
        const totalLeadTime = totalVA + totalNVA;
        
        return { totalVA, totalNVA, totalLeadTime,
                 vaPercent: totalLeadTime > 0 ? (totalVA / totalLeadTime) * 100 : 0,
                 nvaPercent: totalLeadTime > 0 ? (totalNVA / totalLeadTime) * 100 : 0
        };
    }, [content]);

    return (
        <div>
            <div className="w-full bg-gray-200 h-12 flex rounded overflow-hidden">
                <div className="bg-blue-500 h-full" style={{width: `${data.vaPercent}%`}}></div>
                <div className="bg-red-300 h-6 self-end" style={{width: `${data.nvaPercent}%`, borderTop: '2px dashed #ef4444'}}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium">
                <div className="text-blue-600">Temps à Valeur Ajoutée: {data.totalVA.toFixed(0)}s</div>
                <div className="text-gray-700 font-bold">Temps de Défilement Total: {(data.totalLeadTime / 3600 / 24).toFixed(2)} jours</div>
                <div className="text-red-600">Temps sans Valeur Ajoutée: {(data.totalNVA / 3600 / 24).toFixed(2)} jours</div>
            </div>
        </div>
    )
};