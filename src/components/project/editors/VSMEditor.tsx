import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { A3Module, VSMElement } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { HelpCircle, Square, Triangle, User, Truck, ArrowRight, Type, Save, Trash2, GitMerge, MousePointer, X, Settings, Clock, Users, Percent, Boxes } from 'lucide-react';

// Interfaces étendues pour la gestion interne du composant
interface VSMConnection {
  id: string;
  from: string;
  to: string;
  type: 'physical' | 'information';
}

interface VSMTextBox {
    id: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

type VSMItem = (VSMElement & { itemType: 'element' }) | (VSMTextBox & { itemType: 'textbox' });


interface VSMEditorProps {
  module: A3Module;
}

// Sous-composant pour l'icône d'un élément
const ElementIcon: React.FC<{ type: VSMElement['elementType'] }> = ({ type }) => {
  const icons = {
    Processus: <Square className="w-4 h-4" />,
    Stock: <Triangle className="w-4 h-4" />,
    Client: <User className="w-4 h-4" />,
    Fournisseur: <Truck className="w-4 h-4" />,
    Livraison: <ArrowRight className="w-4 h-4" />,
  };
  return icons[type] || <Square className="w-4 h-4" />;
};


export const VSMEditor: React.FC<VSMEditorProps> = ({ module }) => {
  const { updateA3Module } = useDatabase();
  
  // --- ÉTATS ---
  const [elements, setElements] = useState<VSMElement[]>(module.content?.elements || []);
  const [connections, setConnections] = useState<VSMConnection[]>(module.content?.connections || []);
  const [textBoxes, setTextBoxes] = useState<VSMTextBox[]>(module.content?.textBoxes || []);
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | VSMElement['elementType'] | 'TextBox'>('select');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- SAUVEGARDE ---
  useEffect(() => {
    const handler = setTimeout(() => {
      updateA3Module(module.id, { 
        content: { elements, connections, textBoxes }
      });
    }, 1000); // Sauvegarde automatique après 1s d'inactivité
    return () => clearTimeout(handler);
  }, [elements, connections, textBoxes, module.id, updateA3Module]);


  // --- GESTION DES OUTILS ---
  const tools = [
    { id: 'select', name: 'Sélectionner', icon: <MousePointer /> },
    { id: 'connect', name: 'Connecter', icon: <GitMerge /> },
    { id: 'Processus', name: 'Processus', icon: <Square />, color: 'bg-blue-500' },
    { id: 'Stock', name: 'Stock', icon: <Triangle />, color: 'bg-orange-500' },
    { id: 'Client', name: 'Client', icon: <User />, color: 'bg-green-500' },
    { id: 'Fournisseur', name: 'Fournisseur', icon: <Truck />, color: 'bg-purple-500' },
    { id: 'Livraison', name: 'Livraison', icon: <ArrowRight />, color: 'bg-red-500' },
    { id: 'TextBox', name: 'Zone de texte', icon: <Type />, color: 'bg-gray-500' }
  ];

  // --- CALCULS POUR LA TIMELINE ---
  const timelineData = useMemo(() => {
    const processElements = elements.filter(el => el.elementType === 'Processus');
    const stockElements = elements.filter(el => el.elementType === 'Stock');
    
    const totalCycleTime = processElements.reduce((sum, el) => sum + (el.tempsCycle || 0), 0);
    const totalStockTime = stockElements.reduce((sum, el) => sum + (el.tempsCycle || 0), 0); // Pour le stock, on utilise `tempsCycle` comme temps d'attente
    const totalLeadTime = totalCycleTime + totalStockTime;
    const ratio = totalLeadTime > 0 ? (totalCycleTime / totalLeadTime) * 100 : 0;

    return { totalCycleTime, totalLeadTime, ratio, totalStockTime };
  }, [elements]);


  // --- GESTION DU CANVAS & DES ÉLÉMENTS ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;

    if (activeTool !== 'select' && activeTool !== 'connect') {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now().toString();

      if (activeTool === 'TextBox') {
        setTextBoxes([...textBoxes, { id, content: 'Nouveau texte', x, y, width: 150, height: 50 }]);
      } else {
        setElements([...elements, {
          id,
          project: module.project,
          elementType: activeTool as VSMElement['elementType'],
          positionX: x,
          positionY: y,
          nom: `Nouveau ${activeTool}`,
          tempsCycle: 0,
          tempsChangt: 0,
          tauxDispo: 100,
          nbOperateurs: 1
        }]);
      }
      setActiveTool('select');
    } else {
      setSelectedItemId(null);
      setConnectingFrom(null);
    }
  };

  const handleElementClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedItemId(id);

    if (activeTool === 'connect' && connectingFrom && connectingFrom !== id) {
      setConnections([...connections, { id: Date.now().toString(), from: connectingFrom, to: id, type: 'physical' }]);
      setConnectingFrom(null);
      setActiveTool('select');
    } else if (activeTool === 'connect') {
      setConnectingFrom(id);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    const selectedItem = [...elements, ...textBoxes].find(item => item.id === id);
    if (!selectedItem) return;

    const offsetX = e.clientX - selectedItem.positionX;
    const offsetY = e.clientY - selectedItem.positionY;
    setDragState({ id, offsetX, offsetY });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;
    
    const newX = e.clientX - dragState.offsetX;
    const newY = e.clientY - dragState.offsetY;

    setElements(elements.map(el => el.id === dragState.id ? { ...el, positionX: newX, positionY: newY } : el));
    setTextBoxes(textBoxes.map(tb => tb.id === dragState.id ? { ...tb, x: newX, y: newY } : tb));
  };
  
  const handleMouseUp = () => {
    setDragState(null);
  };
  
  const updateElementData = (id: string, updates: Partial<VSMElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const updateTextBoxData = (id: string, updates: Partial<VSMTextBox>) => {
    setTextBoxes(textBoxes.map(tb => tb.id === id ? { ...tb, ...updates } : tb));
  };

  const deleteSelectedItem = () => {
    if (!selectedItemId) return;
    setElements(elements.filter(el => el.id !== selectedItemId));
    setTextBoxes(textBoxes.filter(tb => tb.id !== selectedItemId));
    setConnections(connections.filter(c => c.from !== selectedItemId && c.to !== selectedItemId));
    setSelectedItemId(null);
  };
  
  // --- AFFICHAGE ---

  const selectedItem = useMemo(() => {
    const el = elements.find(e => e.id === selectedItemId);
    if (el) return { ...el, itemType: 'element' };
    const tb = textBoxes.find(t => t.id === selectedItemId);
    if (tb) return { ...tb, itemType: 'textbox' };
    return null;
  }, [selectedItemId, elements, textBoxes]);
  
  const getElementCenter = (id: string) => {
      const el = elements.find(e => e.id === id);
      if (!el) return {x: 0, y: 0};
      // Approximation de la taille de l'élément pour le centrage
      return {x: el.positionX, y: el.positionY };
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-4 bg-white border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">VSM</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Value Stream Mapping</h2>
            <p className="text-sm text-gray-500">Visualisez et optimisez vos flux de valeur.</p>
          </div>
        </div>
        <button
          onClick={() => {}} // Placeholder for help modal
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 flex space-x-4 p-4 overflow-hidden">
        {/* Boîte à outils */}
        <div className="w-56 bg-white rounded-lg p-4 shadow-sm border flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-4">Outils</h3>
          <div className="space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg transition-colors text-sm font-medium ${
                  activeTool === tool.id
                    ? `${tool.color || 'bg-blue-600'} text-white shadow-md`
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {tool.icon}
                <span>{tool.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Canvas VSM & Timeline */}
        <div className="flex-1 flex flex-col space-y-4">
          <div
            ref={canvasRef}
            className="flex-1 bg-white border-2 border-dashed border-gray-300 rounded-lg relative overflow-hidden"
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: activeTool !== 'select' && activeTool !== 'connect' ? 'copy' : 'default' }}
          >
            {/* Connexions SVG */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{zIndex: 0}}>
                {connections.map(conn => {
                    const from = getElementCenter(conn.from);
                    const to = getElementCenter(conn.to);
                    return <line key={conn.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
                })}
                <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
                    </marker>
                </defs>
            </svg>
            
            {/* Éléments VSM */}
            {elements.map((el) => (
              <div
                key={el.id}
                className={`absolute p-3 rounded-lg shadow-lg text-white cursor-grab active:cursor-grabbing text-center min-w-[140px] border-2 transition-all ${
                    selectedItemId === el.id ? 'border-yellow-400 scale-105' : 'border-transparent'
                  } ${connectingFrom === el.id ? 'animate-pulse border-yellow-400' : ''}
                  ${{Processus: 'bg-blue-500', Stock: 'bg-orange-500', Client: 'bg-green-500', Fournisseur: 'bg-purple-500', Livraison: 'bg-red-500'}[el.elementType]}`
                }
                style={{ left: el.positionX, top: el.positionY, transform: 'translate(-50%, -50%)', zIndex: 1 }}
                onClick={(e) => handleElementClick(e, el.id)}
                onMouseDown={(e) => handleMouseDown(e, el.id)}
              >
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <ElementIcon type={el.elementType} />
                  <div className="font-bold text-sm">{el.nom}</div>
                </div>
                {el.elementType === 'Processus' && (
                  <div className="text-xs space-y-0.5 bg-black bg-opacity-20 p-1.5 rounded-md">
                    <div>TC: {el.tempsCycle}s</div>
                    <div>TCH: {el.tempsChangt}s</div>
                    <div>Disp: {el.tauxDispo}%</div>
                    <div>Op: {el.nbOperateurs}</div>
                  </div>
                )}
                 {el.elementType === 'Stock' && (
                  <div className="text-xs mt-1">
                    <div>Attente: {el.tempsCycle}s</div>
                  </div>
                )}
              </div>
            ))}
            {/* Zones de texte */}
            {textBoxes.map((tb) => (
                 <div
                    key={tb.id}
                    className={`absolute p-2 rounded-md bg-yellow-100 border border-yellow-300 shadow-sm cursor-grab active:cursor-grabbing ${selectedItemId === tb.id ? 'ring-2 ring-yellow-400' : ''}`}
                    style={{ left: tb.x, top: tb.y, transform: 'translate(-50%, -50%)', zIndex: 1, width: tb.width, height: tb.height }}
                    onClick={(e) => handleElementClick(e, tb.id)}
                    onMouseDown={(e) => handleMouseDown(e, tb.id)}
                >
                    <textarea 
                        value={tb.content}
                        onChange={e => updateTextBoxData(tb.id, { content: e.target.value })}
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-yellow-900"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            ))}
          </div>
          
          {/* Timeline */}
          <div className="bg-white rounded-lg p-4 shadow-sm border h-40 flex flex-col">
            <h4 className="font-semibold text-gray-900 mb-2">Ligne de Temps</h4>
            <div className="flex-1 flex items-end border-l-2 border-b-2 border-gray-300 p-2">
                <div className="h-full flex items-end w-full">
                    {/* VA Time */}
                    <div className="h-1/2 bg-blue-500 rounded-t-sm" style={{width: `${timelineData.ratio}%`}}></div>
                    {/* NVA Time */}
                    <div className="h-full border-t-2 border-red-500 border-dashed relative" style={{width: `${100 - timelineData.ratio}%`}}>
                        <div className="absolute -top-5 text-xs text-red-600 font-medium">Temps de Stock: {timelineData.totalStockTime}s</div>
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

        {/* Panneau de détails */}
        <div className="w-72 bg-white rounded-lg p-4 shadow-sm border flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-gray-600"/>
            <h3 className="font-semibold text-gray-900">Détails de l'élément</h3>
          </div>
          {selectedItem && selectedItem.itemType === 'element' ? (
            <div className="space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-gray-500">Nom</label>
                <input type="text" value={selectedItem.nom} onChange={e => updateElementData(selectedItem.id, { nom: e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1"/>
              </div>
              {selectedItem.elementType === 'Processus' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Clock size={12}/> T. Cycle (s)</label>
                        <input type="number" value={selectedItem.tempsCycle} onChange={e => updateElementData(selectedItem.id, { tempsCycle: +e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1"/>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Clock size={12}/> T. Chgt (s)</label>
                        <input type="number" value={selectedItem.tempsChangt} onChange={e => updateElementData(selectedItem.id, { tempsChangt: +e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1"/>
                    </div>
                  </div>
                   <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Percent size={12}/>Disponibilité</label>
                        <input type="number" value={selectedItem.tauxDispo} onChange={e => updateElementData(selectedItem.id, { tauxDispo: +e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1"/>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Users size={12}/>Opérateurs</label>
                        <input type="number" value={selectedItem.nbOperateurs} onChange={e => updateElementData(selectedItem.id, { nbOperateurs: +e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1"/>
                    </div>
                  </div>
                </>
              )}
               {selectedItem.elementType === 'Stock' && (
                 <div>
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Boxes size={12}/>Temps d'attente (s)</label>
                    <input type="number" value={selectedItem.tempsCycle} onChange={e => updateElementData(selectedItem.id, { tempsCycle: +e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1"/>
                </div>
              )}
              <button onClick={deleteSelectedItem} className="w-full mt-auto flex items-center justify-center gap-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                  <Trash2 className="w-4 h-4"/> Supprimer
              </button>
            </div>
          ) : selectedItem && selectedItem.itemType === 'textbox' ? (
             <div className="space-y-4">
                 <div>
                    <label className="text-xs font-medium text-gray-500">Contenu</label>
                    <textarea value={selectedItem.content} onChange={e => updateTextBoxData(selectedItem.id, { content: e.target.value })} className="w-full p-1.5 border rounded-md text-sm mt-1 h-24"/>
                 </div>
                 <button onClick={deleteSelectedItem} className="w-full mt-auto flex items-center justify-center gap-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    <Trash2 className="w-4 h-4"/> Supprimer
                </button>
             </div>
          ) : (
            <div className="text-center text-sm text-gray-500 py-10">
              <p>Sélectionnez un élément pour voir ses détails.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};