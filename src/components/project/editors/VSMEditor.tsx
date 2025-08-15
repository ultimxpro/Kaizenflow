import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { A3Module, VSMElement, VSMElementType } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { 
  HelpCircle, Square, Triangle, User, Truck, ArrowRight, Type, Save, Trash2, GitMerge, 
  MousePointer, X, Settings, Clock, Users, Percent, Boxes, HardDrive, Edit2, MessageSquare, 
  Plus, Workflow
} from 'lucide-react';

// --- INTERFACES LOCALES ---
interface VSMConnection {
  id: string;
  from: string;
  to: string;
}

// --- CONFIGURATION DES ÉLÉMENTS VSM ---
const elementConfig: Record<VSMElementType, { name: string; icon: React.ReactNode; color: string; flow: 'material' | 'information' }> = {
  // Flux de matière
  Processus: { name: 'Processus', icon: <Square />, color: 'bg-blue-500', flow: 'material' },
  Stock: { name: 'Stock', icon: <Triangle />, color: 'bg-orange-500', flow: 'material' },
  Client: { name: 'Client', icon: <User />, color: 'bg-green-500', flow: 'material' },
  Fournisseur: { name: 'Fournisseur', icon: <Truck />, color: 'bg-purple-500', flow: 'material' },
  Livraison: { name: 'Livraison', icon: <ArrowRight />, color: 'bg-red-500', flow: 'material' },
  // Flux d'information
  ControleProduction: { name: 'Contrôle Prod.', icon: <Workflow />, color: 'bg-slate-500', flow: 'information' },
  MRP: { name: 'MRP/ERP', icon: <HardDrive />, color: 'bg-slate-500', flow: 'information' },
  InfoManuelle: { name: 'Info Manuelle', icon: <Edit2 />, color: 'bg-slate-500', flow: 'information' },
  InfoElectronique: { name: 'Info Électronique', icon: <GitMerge />, color: 'bg-slate-500', flow: 'information' },
  Kanban: { name: 'Kanban', icon: <MessageSquare />, color: 'bg-slate-500', flow: 'information' },
};


interface VSMEditorProps {
  module: A3Module;
  onClose: () => void;
}

export const VSMEditor: React.FC<VSMEditorProps> = ({ module, onClose }) => {
  const { updateA3Module } = useDatabase();

  const [elements, setElements] = useState<VSMElement[]>(module.content?.elements || []);
  const [connections, setConnections] = useState<VSMConnection[]>(module.content?.connections || []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sauvegarde automatique
  useEffect(() => {
    const handler = setTimeout(() => {
      updateA3Module(module.id, { content: { elements, connections } });
    }, 1000);
    return () => clearTimeout(handler);
  }, [elements, connections, module.id, updateA3Module]);

  const { materialFlowElements, informationFlowElements } = useMemo(() => {
    const material = elements
      .filter(el => elementConfig[el.elementType]?.flow === 'material')
      .sort((a, b) => a.positionX - b.positionX);
    const information = elements
      .filter(el => elementConfig[el.elementType]?.flow === 'information')
      .sort((a, b) => a.positionX - b.positionX);
    return { materialFlowElements: material, informationFlowElements: information };
  }, [elements]);

  const timelineData = useMemo(() => {
    const processElements = materialFlowElements.filter(el => el.elementType === 'Processus');
    const stockElements = materialFlowElements.filter(el => el.elementType === 'Stock');
    
    const totalCycleTime = processElements.reduce((sum, el) => sum + (el.tempsCycle || 0), 0);
    const totalStockTime = stockElements.reduce((sum, el) => sum + (el.tempsAttente || 0), 0);
    const totalLeadTime = totalCycleTime + totalStockTime;
    const ratio = totalLeadTime > 0 ? (totalCycleTime / totalLeadTime) * 100 : 0;

    return { totalCycleTime, totalLeadTime, ratio, totalStockTime };
  }, [materialFlowElements]);

  const addElement = (type: VSMElementType) => {
    const flowType = elementConfig[type].flow;
    const existingElements = flowType === 'material' ? materialFlowElements : informationFlowElements;
    const lastElement = existingElements[existingElements.length - 1];
    
    const newElement: VSMElement = {
      id: Date.now().toString(),
      project: module.project,
      elementType: type,
      positionX: lastElement ? lastElement.positionX + 220 : 100,
      positionY: 100, // Position Y fixe dans le couloir
      nom: elementConfig[type].name,
      tempsCycle: 0,
      tempsChangt: 0,
      tauxDispo: 100,
      nbOperateurs: 1,
      tempsAttente: 0,
    };
    setElements([...elements, newElement]);
  };
  
  const updateElementData = (id: string, updates: Partial<VSMElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };
  
  const deleteSelectedItem = () => {
    if (!selectedItemId) return;
    setElements(elements.filter(el => el.id !== selectedItemId));
    setConnections(connections.filter(c => c.from !== selectedItemId && c.to !== selectedItemId));
    setSelectedItemId(null);
  };
  
  const selectedItem = useMemo(() => elements.find(e => e.id === selectedItemId), [selectedItemId, elements]);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Value Stream Mapping</h1>
        </div>
        <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          <div ref={scrollContainerRef} className="flex-1 overflow-auto p-8">
            <div className="relative" style={{ width: Math.max(1800, (elements.reduce((max, el) => Math.max(max, el.positionX), 0) + 300)) }}>
              {/* Couloir Flux d'Information */}
              <div className="h-48 border-b-2 border-dashed border-gray-300 mb-8">
                <h3 className="sticky left-4 font-bold text-slate-500">FLUX D'INFORMATION</h3>
                <div className="relative h-full">
                  {informationFlowElements.map(el => (
                    <ElementNode key={el.id} element={el} onSelect={setSelectedItemId} isSelected={selectedItemId === el.id} />
                  ))}
                </div>
              </div>
              
              {/* Couloir Flux de Matière */}
              <div className="h-48">
                <h3 className="sticky left-4 font-bold text-emerald-600">FLUX DE MATIÈRE</h3>
                <div className="relative h-full">
                    {materialFlowElements.map(el => (
                      <ElementNode key={el.id} element={el} onSelect={setSelectedItemId} isSelected={selectedItemId === el.id} />
                    ))}
                </div>
              </div>

              {/* SVG pour les connexions */}
               <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{zIndex: 0}}>
                {/* Implémentation des connexions à venir */}
              </svg>
            </div>
          </div>
          
          {/* Timeline */}
          <div className="flex-shrink-0 bg-white border-t p-4">
             <h4 className="font-semibold text-gray-900 mb-2">Ligne de Temps (Flux Matière)</h4>
              <div className="flex-1 flex items-end border-l-2 border-b-2 border-gray-300 p-2 h-24">
                  <div className="h-full flex items-end w-full">
                      <div className="h-1/2 bg-blue-500 rounded-t-sm tooltip" data-tip={`Temps VA: ${timelineData.totalCycleTime}s`}>
                        <div className="w-full h-full" style={{width: `${timelineData.ratio}%`}}></div>
                      </div>
                      <div className="h-full border-t-2 border-red-500 border-dashed relative tooltip" data-tip={`Temps NVA: ${timelineData.totalStockTime}s`}>
                         <div className="w-full h-full" style={{width: `${100 - timelineData.ratio}%`}}></div>
                      </div>
                  </div>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                  <div><span className="font-semibold text-blue-600">Temps VA (Cycle):</span> {timelineData.totalCycleTime}s</div>
                  <div><span className="font-semibold text-red-600">Lead Time Total:</span> {timelineData.totalLeadTime}s</div>
                  <div><span className="font-semibold">Ratio VA/LT:</span> {timelineData.ratio.toFixed(1)}%</div>
              </div>
          </div>
        </div>
        
        {/* Panneau latéral */}
        <div className="w-80 bg-white border-l p-4 flex flex-col">
          {!selectedItem ? (
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-4">Outils VSM</h3>
              <h4 className="font-semibold text-sm text-slate-600 mb-2">Flux d'Information</h4>
              <div className="grid grid-cols-2 gap-2 mb-4">
                  {(Object.keys(elementConfig) as VSMElementType[]).filter(t => elementConfig[t].flow === 'information').map(type => (
                      <button key={type} onClick={() => addElement(type)} className="p-2 bg-slate-100 rounded hover:bg-slate-200 text-slate-700 text-xs text-center">
                          {elementConfig[type].icon} <span className="block mt-1">{elementConfig[type].name}</span>
                      </button>
                  ))}
              </div>
              <h4 className="font-semibold text-sm text-emerald-700 mb-2">Flux de Matière</h4>
              <div className="grid grid-cols-2 gap-2">
                 {(Object.keys(elementConfig) as VSMElementType[]).filter(t => elementConfig[t].flow === 'material').map(type => (
                      <button key={type} onClick={() => addElement(type)} className="p-2 bg-emerald-50 rounded hover:bg-emerald-100 text-emerald-800 text-xs text-center">
                          {elementConfig[type].icon} <span className="block mt-1">{elementConfig[type].name}</span>
                      </button>
                  ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-gray-600"/>
                <h3 className="font-bold text-lg">Édition</h3>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-medium text-gray-500">Nom</label>
                    <input type="text" value={selectedItem.nom} onChange={e => updateElementData(selectedItem.id, { nom: e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1"/>
                  </div>
                {selectedItem.elementType === 'Processus' && (
                  <>
                    <InputGroup label="T. Cycle (s)" icon={<Clock size={12}/>} value={selectedItem.tempsCycle || 0} onChange={v => updateElementData(selectedItem.id, { tempsCycle: v })} />
                    <InputGroup label="T. Chgt (s)" icon={<Clock size={12}/>} value={selectedItem.tempsChangt || 0} onChange={v => updateElementData(selectedItem.id, { tempsChangt: v })} />
                    <InputGroup label="Disponibilité (%)" icon={<Percent size={12}/>} value={selectedItem.tauxDispo || 100} onChange={v => updateElementData(selectedItem.id, { tauxDispo: v })} />
                    <InputGroup label="Opérateurs" icon={<Users size={12}/>} value={selectedItem.nbOperateurs || 1} onChange={v => updateElementData(selectedItem.id, { nbOperateurs: v })} />
                  </>
                )}
                {selectedItem.elementType === 'Stock' && (
                  <InputGroup label="Temps d'attente (s)" icon={<Boxes size={12}/>} value={selectedItem.tempsAttente || 0} onChange={v => updateElementData(selectedItem.id, { tempsAttente: v })} />
                )}
                <button onClick={deleteSelectedItem} className="w-full mt-auto flex items-center justify-center gap-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <Trash2 className="w-4 h-4"/> Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// --- SOUS-COMPOSANTS ---

const ElementNode: React.FC<{element: VSMElement, onSelect: (id: string) => void, isSelected: boolean}> = ({element, onSelect, isSelected}) => {
    const config = elementConfig[element.elementType];
    return (
        <div
            onClick={() => onSelect(element.id)}
            className={`absolute top-1/2 -translate-y-1/2 p-3 rounded-lg shadow-lg text-white cursor-pointer min-w-[180px] border-2 transition-all ${config.color} ${isSelected ? 'border-yellow-400 scale-105' : 'border-transparent'}`}
            style={{ left: element.positionX }}
        >
            <div className="flex items-center justify-center gap-2 mb-1.5">
                {config.icon}
                <div className="font-bold text-sm">{element.nom}</div>
            </div>
            {element.elementType === 'Processus' && (
              <div className="text-xs space-y-0.5 bg-black bg-opacity-20 p-1.5 rounded-md text-left">
                <div>TC: {element.tempsCycle || 0}s</div>
                <div>TCH: {element.tempsChangt || 0}s</div>
                <div>Dispo: {element.tauxDispo || 100}%</div>
                <div>Op: {element.nbOperateurs || 1}</div>
              </div>
            )}
            {element.elementType === 'Stock' && (
              <div className="text-xs text-center p-1.5">
                <div>Attente: {element.tempsAttente || 0}s</div>
              </div>
            )}
        </div>
    );
};

const InputGroup: React.FC<{label: string, icon: React.ReactNode, value: number, onChange: (value: number) => void}> = ({ label, icon, value, onChange }) => (
    <div>
        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">{icon} {label}</label>
        <input 
            type="number" 
            value={value} 
            onChange={e => onChange(parseFloat(e.target.value) || 0)} 
            className="w-full p-1.5 border rounded-md text-sm mt-1"
        />
    </div>
);