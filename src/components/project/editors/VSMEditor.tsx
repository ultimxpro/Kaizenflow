import React, { useState, useRef, useEffect } from 'react';
import { A3Module, VSMElement, VSMConnection, VSMTextBox } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { HelpCircle, Square, Triangle, User, Truck, ArrowRight, Type, Save, Trash2 } from 'lucide-react';

interface VSMEditorProps {
  module: A3Module;
}

export const VSMEditor: React.FC<VSMEditorProps> = ({ module }) => {
  const { updateA3Module, vsmElements, vsmConnections, vsmTextBoxes, createVSMElement, updateVSMElement, deleteVSMElement, createVSMConnection, deleteVSMConnection, createVSMTextBox, updateVSMTextBox, deleteVSMTextBox } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const projectElements = vsmElements.filter(el => el.project === module.project);
  const projectConnections = vsmConnections.filter(conn => conn.project === module.project);
  const projectTextBoxes = vsmTextBoxes.filter(tb => tb.project === module.project);

  const tools = [
    { id: 'Processus', name: 'Processus', icon: <Square className="w-4 h-4" />, color: 'bg-blue-500' },
    { id: 'Stock', name: 'Stock', icon: <Triangle className="w-4 h-4" />, color: 'bg-orange-500' },
    { id: 'Client', name: 'Client', icon: <User className="w-4 h-4" />, color: 'bg-green-500' },
    { id: 'Fournisseur', name: 'Fournisseur', icon: <Truck className="w-4 h-4" />, color: 'bg-purple-500' },
    { id: 'Livraison', name: 'Livraison', icon: <ArrowRight className="w-4 h-4" />, color: 'bg-red-500' },
    { id: 'TextBox', name: 'Zone de texte', icon: <Type className="w-4 h-4" />, color: 'bg-gray-500' }
  ];

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!selectedTool || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'TextBox') {
      createVSMTextBox({
        project: module.project,
        contenu: 'Nouveau texte',
        positionX: x,
        positionY: y
      });
    } else {
      createVSMElement({
        project: module.project,
        elementType: selectedTool as any,
        positionX: x,
        positionY: y,
        nom: `Nouveau ${selectedTool}`,
        tempsCycle: 0,
        tempsChangt: 0,
        tauxDispo: 100,
        nbOperateurs: 1
      });
    }

    setSelectedTool(null);
  };

  const handleElementMouseDown = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedElement || !dragStart || !canvasRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const element = projectElements.find(el => el.id === selectedElement);
    const textBox = projectTextBoxes.find(tb => tb.id === selectedElement);

    if (element) {
      updateVSMElement(selectedElement, {
        positionX: Math.max(0, element.positionX + deltaX),
        positionY: Math.max(0, element.positionY + deltaY)
      });
    } else if (textBox) {
      updateVSMTextBox(selectedElement, {
        positionX: Math.max(0, textBox.positionX + deltaX),
        positionY: Math.max(0, textBox.positionY + deltaY)
      });
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setSelectedElement(null);
    setDragStart(null);
  };

  const calculateTimeline = () => {
    const processElements = projectElements.filter(el => el.elementType === 'Processus');
    const stockElements = projectElements.filter(el => el.elementType === 'Stock');
    
    const totalCycleTime = processElements.reduce((sum, el) => sum + el.tempsCycle, 0);
    const totalLeadTime = totalCycleTime + stockElements.reduce((sum, el) => sum + el.tempsCycle, 0);
    
    return { totalCycleTime, totalLeadTime };
  };

  const { totalCycleTime, totalLeadTime } = calculateTimeline();

  const getElementIcon = (type: string) => {
    const tool = tools.find(t => t.id === type);
    return tool ? tool.icon : <Square className="w-4 h-4" />;
  };

  const getElementColor = (type: string) => {
    const tool = tools.find(t => t.id === type);
    return tool ? tool.color : 'bg-gray-500';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header avec aide */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">VSM</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Value Stream Mapping</h2>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 flex space-x-4">
        {/* Boîte à outils */}
        <div className="w-48 bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Outils</h3>
          <div className="space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  selectedTool === tool.id
                    ? `${tool.color} text-white`
                    : 'bg-white hover:bg-gray-100 text-gray-700'
                }`}
              >
                {tool.icon}
                <span className="text-sm">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Canvas VSM */}
        <div className="flex-1 flex flex-col">
          <div
            ref={canvasRef}
            className="flex-1 bg-white border-2 border-gray-200 rounded-lg relative overflow-hidden cursor-crosshair"
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ minHeight: '500px' }}
          >
            {/* Éléments VSM */}
            {projectElements.map((element) => (
              <div
                key={element.id}
                className={`absolute ${getElementColor(element.elementType)} text-white p-2 rounded-lg cursor-move shadow-lg min-w-24 text-center`}
                style={{
                  left: element.positionX,
                  top: element.positionY,
                  transform: 'translate(-50%, -50%)'
                }}
                onMouseDown={(e) => handleElementMouseDown(element.id, e)}
              >
                <div className="flex items-center justify-center mb-1">
                  {getElementIcon(element.elementType)}
                </div>
                <div className="text-xs font-medium">{element.nom}</div>
                {element.elementType === 'Processus' && (
                  <div className="text-xs mt-1">
                    <div>TC: {element.tempsCycle}s</div>
                    <div>Dispo: {element.tauxDispo}%</div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVSMElement(element.id);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Zones de texte */}
            {projectTextBoxes.map((textBox) => (
              <div
                key={textBox.id}
                className="absolute bg-yellow-100 border border-yellow-300 p-2 rounded cursor-move"
                style={{
                  left: textBox.positionX,
                  top: textBox.positionY,
                  transform: 'translate(-50%, -50%)'
                }}
                onMouseDown={(e) => handleElementMouseDown(textBox.id, e)}
              >
                <input
                  type="text"
                  value={textBox.contenu}
                  onChange={(e) => updateVSMTextBox(textBox.id, { contenu: e.target.value })}
                  className="bg-transparent border-none outline-none text-sm min-w-20"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVSMTextBox(textBox.id);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {selectedTool && (
              <div className="absolute top-4 left-4 bg-blue-100 border border-blue-300 rounded-lg p-2">
                <p className="text-sm text-blue-800">
                  Cliquez pour placer : {tools.find(t => t.id === selectedTool)?.name}
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Ligne de temps</h4>
            <div className="flex space-x-6">
              <div className="text-sm">
                <span className="text-gray-600">Temps de cycle total (VA) :</span>
                <span className="font-medium ml-2">{totalCycleTime}s</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Lead Time total (LT) :</span>
                <span className="font-medium ml-2">{totalLeadTime}s</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Ratio VA/LT :</span>
                <span className="font-medium ml-2">
                  {totalLeadTime > 0 ? Math.round((totalCycleTime / totalLeadTime) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'aide */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comment utiliser le VSM ?
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Le Value Stream Mapping permet de visualiser et analyser les flux de valeur.</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-800 mb-2">Étapes :</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Sélectionnez un outil dans la boîte à outils</li>
                    <li>Cliquez sur le canvas pour placer l'élément</li>
                    <li>Glissez-déposez pour repositionner</li>
                    <li>Remplissez les données de temps</li>
                    <li>Analysez la ligne de temps</li>
                  </ol>
                </div>
                <p>La ligne de temps calcule automatiquement les ratios VA/LT.</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
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