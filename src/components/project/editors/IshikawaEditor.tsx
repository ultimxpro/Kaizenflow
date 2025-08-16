import React, { useState, useEffect, useRef, useMemo } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { 
  GitBranch, Plus, X, HelpCircle, Settings, ChevronRight, 
  Trash2, Edit2, Save, Download, Upload, ZoomIn, ZoomOut,
  Maximize2, Copy, Users, Factory, DollarSign, Package,
  Gauge, Clock, Shield, Briefcase, Eye
} from 'lucide-react';

// Types
interface Cause {
  id: string;
  text: string;
  level: number; // 0 = branche principale, 1 = sous-cause, 2 = sous-sous-cause
  parentId?: string;
}

interface Branch {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  causes: Cause[];
}

interface IshikawaDiagram {
  id: string;
  name: string;
  problem: string;
  mType: '4M' | '5M' | '6M' | '7M' | '8M' | '9M';
  branches: Branch[];
  createdAt: Date;
  updatedAt: Date;
}

// Configuration des différents types de M
const M_CONFIGS = {
  '4M': [
    { id: 'main-oeuvre', name: 'Main d\'œuvre', icon: <Users size={16} />, color: '#3B82F6' },
    { id: 'methode', name: 'Méthode', icon: <Briefcase size={16} />, color: '#10B981' },
    { id: 'materiel', name: 'Matériel', icon: <Factory size={16} />, color: '#F59E0B' },
    { id: 'matiere', name: 'Matière', icon: <Package size={16} />, color: '#EF4444' }
  ],
  '5M': [
    { id: 'main-oeuvre', name: 'Main d\'œuvre', icon: <Users size={16} />, color: '#3B82F6' },
    { id: 'methode', name: 'Méthode', icon: <Briefcase size={16} />, color: '#10B981' },
    { id: 'materiel', name: 'Matériel', icon: <Factory size={16} />, color: '#F59E0B' },
    { id: 'matiere', name: 'Matière', icon: <Package size={16} />, color: '#EF4444' },
    { id: 'milieu', name: 'Milieu', icon: <Shield size={16} />, color: '#8B5CF6' }
  ],
  '6M': [
    { id: 'main-oeuvre', name: 'Main d\'œuvre', icon: <Users size={16} />, color: '#3B82F6' },
    { id: 'methode', name: 'Méthode', icon: <Briefcase size={16} />, color: '#10B981' },
    { id: 'materiel', name: 'Matériel', icon: <Factory size={16} />, color: '#F59E0B' },
    { id: 'matiere', name: 'Matière', icon: <Package size={16} />, color: '#EF4444' },
    { id: 'milieu', name: 'Milieu', icon: <Shield size={16} />, color: '#8B5CF6' },
    { id: 'mesure', name: 'Mesure', icon: <Gauge size={16} />, color: '#EC4899' }
  ],
  '7M': [
    { id: 'main-oeuvre', name: 'Main d\'œuvre', icon: <Users size={16} />, color: '#3B82F6' },
    { id: 'methode', name: 'Méthode', icon: <Briefcase size={16} />, color: '#10B981' },
    { id: 'materiel', name: 'Matériel', icon: <Factory size={16} />, color: '#F59E0B' },
    { id: 'matiere', name: 'Matière', icon: <Package size={16} />, color: '#EF4444' },
    { id: 'milieu', name: 'Milieu', icon: <Shield size={16} />, color: '#8B5CF6' },
    { id: 'mesure', name: 'Mesure', icon: <Gauge size={16} />, color: '#EC4899' },
    { id: 'management', name: 'Management', icon: <Briefcase size={16} />, color: '#06B6D4' }
  ],
  '8M': [
    { id: 'main-oeuvre', name: 'Main d\'œuvre', icon: <Users size={16} />, color: '#3B82F6' },
    { id: 'methode', name: 'Méthode', icon: <Briefcase size={16} />, color: '#10B981' },
    { id: 'materiel', name: 'Matériel', icon: <Factory size={16} />, color: '#F59E0B' },
    { id: 'matiere', name: 'Matière', icon: <Package size={16} />, color: '#EF4444' },
    { id: 'milieu', name: 'Milieu', icon: <Shield size={16} />, color: '#8B5CF6' },
    { id: 'mesure', name: 'Mesure', icon: <Gauge size={16} />, color: '#EC4899' },
    { id: 'management', name: 'Management', icon: <Briefcase size={16} />, color: '#06B6D4' },
    { id: 'moyens-financiers', name: 'Moyens financiers', icon: <DollarSign size={16} />, color: '#84CC16' }
  ],
  '9M': [
    { id: 'main-oeuvre', name: 'Main d\'œuvre', icon: <Users size={16} />, color: '#3B82F6' },
    { id: 'methode', name: 'Méthode', icon: <Briefcase size={16} />, color: '#10B981' },
    { id: 'materiel', name: 'Matériel', icon: <Factory size={16} />, color: '#F59E0B' },
    { id: 'matiere', name: 'Matière', icon: <Package size={16} />, color: '#EF4444' },
    { id: 'milieu', name: 'Milieu', icon: <Shield size={16} />, color: '#8B5CF6' },
    { id: 'mesure', name: 'Mesure', icon: <Gauge size={16} />, color: '#EC4899' },
    { id: 'management', name: 'Management', icon: <Briefcase size={16} />, color: '#06B6D4' },
    { id: 'moyens-financiers', name: 'Moyens financiers', icon: <DollarSign size={16} />, color: '#84CC16' },
    { id: 'maintenance', name: 'Maintenance', icon: <Clock size={16} />, color: '#F97316' }
  ]
};

export const IshikawaEditor: React.FC<{ module: A3Module; onClose: () => void }> = ({ module, onClose }) => {
  const { updateA3Module } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null);
  const [editingCause, setEditingCause] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialisation des données
  const initializeData = (): IshikawaDiagram[] => {
    if (module.content?.diagrams && Array.isArray(module.content.diagrams)) {
      return module.content.diagrams;
    }
    
    const defaultDiagram: IshikawaDiagram = {
      id: `diag-${Date.now()}`,
      name: 'Analyse Ishikawa #1',
      problem: '',
      mType: '5M',
      branches: M_CONFIGS['5M'].map(config => ({
        ...config,
        causes: []
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return [defaultDiagram];
  };

  const [diagrams, setDiagrams] = useState<IshikawaDiagram[]>(initializeData);
  const selectedDiagram = diagrams.find(d => d.id === selectedDiagramId) || diagrams[0];

  useEffect(() => {
    if (diagrams.length > 0 && !selectedDiagramId) {
      setSelectedDiagramId(diagrams[0].id);
    }
  }, [diagrams, selectedDiagramId]);

  // Sauvegarde automatique
  useEffect(() => {
    const timer = setTimeout(() => {
      updateA3Module(module.id, { content: { diagrams } });
    }, 1000);
    return () => clearTimeout(timer);
  }, [diagrams, module.id, updateA3Module]);

  // Gestion des diagrammes
  const addDiagram = () => {
    const newDiagram: IshikawaDiagram = {
      id: `diag-${Date.now()}`,
      name: `Analyse Ishikawa #${diagrams.length + 1}`,
      problem: '',
      mType: '5M',
      branches: M_CONFIGS['5M'].map(config => ({
        ...config,
        causes: []
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setDiagrams([...diagrams, newDiagram]);
    setSelectedDiagramId(newDiagram.id);
  };

  const updateDiagram = (updates: Partial<IshikawaDiagram>) => {
    setDiagrams(diagrams.map(d => 
      d.id === selectedDiagram.id 
        ? { ...d, ...updates, updatedAt: new Date() }
        : d
    ));
  };

  const deleteDiagram = (id: string) => {
    if (diagrams.length === 1) {
      alert('Vous devez conserver au moins un diagramme');
      return;
    }
    setDiagrams(diagrams.filter(d => d.id !== id));
    if (selectedDiagramId === id) {
      setSelectedDiagramId(diagrams[0].id);
    }
  };

  // Changement du type de M
  const changeMType = (newType: IshikawaDiagram['mType']) => {
    const newBranches = M_CONFIGS[newType].map(config => {
      const existingBranch = selectedDiagram.branches.find(b => b.id === config.id);
      return existingBranch || { ...config, causes: [] };
    });
    updateDiagram({ mType: newType, branches: newBranches });
  };

  // Gestion des causes
  const addCause = (branchId: string, parentId?: string) => {
    const newCause: Cause = {
      id: `cause-${Date.now()}`,
      text: '',
      level: parentId ? 1 : 0,
      parentId
    };

    const updatedBranches = selectedDiagram.branches.map(branch => {
      if (branch.id === branchId) {
        return { ...branch, causes: [...branch.causes, newCause] };
      }
      return branch;
    });

    updateDiagram({ branches: updatedBranches });
    setEditingCause(newCause.id);
  };

  const updateCause = (branchId: string, causeId: string, text: string) => {
    const updatedBranches = selectedDiagram.branches.map(branch => {
      if (branch.id === branchId) {
        return {
          ...branch,
          causes: branch.causes.map(cause =>
            cause.id === causeId ? { ...cause, text } : cause
          )
        };
      }
      return branch;
    });
    updateDiagram({ branches: updatedBranches });
  };

  const deleteCause = (branchId: string, causeId: string) => {
    const updatedBranches = selectedDiagram.branches.map(branch => {
      if (branch.id === branchId) {
        // Supprimer la cause et ses sous-causes
        const causesToDelete = new Set([causeId]);
        const findChildren = (parentId: string) => {
          branch.causes.forEach(c => {
            if (c.parentId === parentId) {
              causesToDelete.add(c.id);
              findChildren(c.id);
            }
          });
        };
        findChildren(causeId);
        
        return {
          ...branch,
          causes: branch.causes.filter(c => !causesToDelete.has(c.id))
        };
      }
      return branch;
    });
    updateDiagram({ branches: updatedBranches });
  };

  // Export
  const exportDiagram = () => {
    const dataStr = JSON.stringify(selectedDiagram, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportName = `ishikawa_${selectedDiagram.name}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  };

  // Calcul des statistiques
  const stats = useMemo(() => {
    const totalCauses = selectedDiagram.branches.reduce((sum, branch) => 
      sum + branch.causes.length, 0
    );
    const branchesWithCauses = selectedDiagram.branches.filter(b => b.causes.length > 0).length;
    const avgCausesPerBranch = branchesWithCauses > 0 
      ? (totalCauses / branchesWithCauses).toFixed(1)
      : '0';
    
    return { totalCauses, branchesWithCauses, avgCausesPerBranch };
  }, [selectedDiagram]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl flex flex-col w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Diagramme d'Ishikawa</h1>
              <p className="text-sm text-gray-600">Analyse des causes et effets - {selectedDiagram.mType}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
              title="Paramètres"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={exportDiagram}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
              title="Exporter"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
              title="Aide"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white hover:bg-red-100 rounded-lg transition-colors shadow-sm"
              title="Fermer"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Liste des diagrammes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700">Diagrammes</h3>
                  <button
                    onClick={addDiagram}
                    className="p-1 hover:bg-white rounded transition-colors"
                    title="Nouveau diagramme"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="space-y-1">
                  {diagrams.map(diag => (
                    <div
                      key={diag.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        diag.id === selectedDiagramId
                          ? 'bg-white shadow-sm border border-orange-200'
                          : 'hover:bg-white'
                      }`}
                      onClick={() => setSelectedDiagramId(diag.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {diag.name}
                        </span>
                        {diagrams.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDiagram(diag.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{diag.mType}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistiques */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-2">Statistiques</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total causes:</span>
                    <span className="font-semibold">{stats.totalCauses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Branches actives:</span>
                    <span className="font-semibold">{stats.branchesWithCauses}/{selectedDiagram.branches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Moy. par branche:</span>
                    <span className="font-semibold">{stats.avgCausesPerBranch}</span>
                  </div>
                </div>
              </div>

              {/* Contrôles de zoom */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-2">Affichage</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm flex-1 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Réinitialiser"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto p-8">
            {/* Problem Definition */}
            <div className="mb-6 max-w-2xl mx-auto">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Problème / Effet à analyser
              </label>
              <textarea
                value={selectedDiagram.problem}
                onChange={(e) => updateDiagram({ problem: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors resize-none"
                rows={2}
                placeholder="Décrivez le problème ou l'effet que vous souhaitez analyser..."
              />
            </div>

            {/* Ishikawa Diagram */}
            <div 
              ref={canvasRef}
              className="relative bg-white rounded-xl shadow-lg p-8 min-h-[600px] overflow-auto"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            >
              <FishboneDiagram
                diagram={selectedDiagram}
                onAddCause={addCause}
                onUpdateCause={updateCause}
                onDeleteCause={deleteCause}
                editingCause={editingCause}
                setEditingCause={setEditingCause}
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        {showSettings && (
          <SettingsModal
            diagram={selectedDiagram}
            onChangeMType={changeMType}
            onUpdateDiagram={updateDiagram}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showHelp && (
          <HelpModal onClose={() => setShowHelp(false)} />
        )}
      </div>
    </div>
  );
};

// Composant du diagramme en arêtes de poisson
const FishboneDiagram: React.FC<{
  diagram: IshikawaDiagram;
  onAddCause: (branchId: string, parentId?: string) => void;
  onUpdateCause: (branchId: string, causeId: string, text: string) => void;
  onDeleteCause: (branchId: string, causeId: string) => void;
  editingCause: string | null;
  setEditingCause: (id: string | null) => void;
}> = ({ diagram, onAddCause, onUpdateCause, onDeleteCause, editingCause, setEditingCause }) => {
  const totalBranches = diagram.branches.length;
  const topBranches = diagram.branches.slice(0, Math.ceil(totalBranches / 2));
  const bottomBranches = diagram.branches.slice(Math.ceil(totalBranches / 2));

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Arête centrale */}
      <div className="absolute top-1/2 left-0 right-32 h-1 bg-gradient-to-r from-gray-400 to-red-500 transform -translate-y-1/2" />
      
      {/* Flèche finale */}
      <div className="absolute top-1/2 right-20 transform -translate-y-1/2">
        <div className="relative">
          <div className="absolute -left-4 top-1/2 w-0 h-0 border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent border-l-[30px] border-l-red-500 transform -translate-y-1/2" />
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold">
            EFFET
          </div>
        </div>
      </div>

      {/* Branches supérieures */}
      <div className="absolute top-0 left-0 right-32 h-1/2 flex justify-around items-end pb-2">
        {topBranches.map((branch, index) => (
          <BranchComponent
            key={branch.id}
            branch={branch}
            position="top"
            index={index}
            totalInGroup={topBranches.length}
            onAddCause={onAddCause}
            onUpdateCause={onUpdateCause}
            onDeleteCause={onDeleteCause}
            editingCause={editingCause}
            setEditingCause={setEditingCause}
          />
        ))}
      </div>

      {/* Branches inférieures */}
      <div className="absolute bottom-0 left-0 right-32 h-1/2 flex justify-around items-start pt-2">
        {bottomBranches.map((branch, index) => (
          <BranchComponent
            key={branch.id}
            branch={branch}
            position="bottom"
            index={index}
            totalInGroup={bottomBranches.length}
            onAddCause={onAddCause}
            onUpdateCause={onUpdateCause}
            onDeleteCause={onDeleteCause}
            editingCause={editingCause}
            setEditingCause={setEditingCause}
          />
        ))}
      </div>
    </div>
  );
};

// Composant pour une branche
const BranchComponent: React.FC<{
  branch: Branch;
  position: 'top' | 'bottom';
  index: number;
  totalInGroup: number;
  onAddCause: (branchId: string, parentId?: string) => void;
  onUpdateCause: (branchId: string, causeId: string, text: string) => void;
  onDeleteCause: (branchId: string, causeId: string) => void;
  editingCause: string | null;
  setEditingCause: (id: string | null) => void;
}> = ({ branch, position, index, totalInGroup, onAddCause, onUpdateCause, onDeleteCause, editingCause, setEditingCause }) => {
  const angle = position === 'top' ? -45 : 45;
  const mainCauses = branch.causes.filter(c => c.level === 0);
  
  // Calcul de la longueur de la branche en fonction du nombre de causes
  const branchLength = Math.max(200, mainCauses.length * 80);
  
  return (
    <div className="relative flex-1 h-full">
      {/* Ligne de la branche - plus longue et stylisée */}
      <svg 
        className="absolute left-1/2 transform -translate-x-1/2"
        style={{
          width: '300px',
          height: '300px',
          top: position === 'top' ? '30%' : '-30%',
        }}
      >
        <line
          x1="150"
          y1={position === 'top' ? 150 : 0}
          x2={position === 'top' ? 250 : 50}
          y2={position === 'top' ? 50 : 100}
          stroke={branch.color}
          strokeWidth="2"
          opacity="0.6"
        />
        
        {/* Petites lignes pour les causes */}
        {mainCauses.map((cause, i) => {
          const spacing = 60 / (mainCauses.length + 1);
          const offset = spacing * (i + 1);
          const x = position === 'top' 
            ? 150 + (100 * offset / 60)
            : 150 - (100 * offset / 60);
          const y = position === 'top'
            ? 150 - (100 * offset / 60)
            : 0 + (100 * offset / 60);
            
          return (
            <line
              key={`line-${cause.id}`}
              x1={x}
              y1={y}
              x2={x + (position === 'top' ? -15 : 15)}
              y2={y}
              stroke={branch.color}
              strokeWidth="1.5"
              opacity="0.5"
            />
          );
        })}
      </svg>
      
      {/* Nom de la branche */}
      <div 
        className={`absolute left-1/2 transform -translate-x-1/2 ${
          position === 'top' ? 'top-0' : 'bottom-0'
        } z-10`}
      >
        <div 
          className="px-4 py-2 rounded-lg shadow-lg font-semibold text-sm flex items-center space-x-2 bg-white"
          style={{ 
            borderLeft: `4px solid ${branch.color}`,
            borderTop: `2px solid ${branch.color}20`
          }}
        >
          <span style={{ color: branch.color }}>{branch.icon}</span>
          <span className="text-gray-800">{branch.name}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {mainCauses.length}
          </span>
        </div>
      </div>

      {/* Causes distribuées le long de la branche */}
      {mainCauses.map((cause, i) => {
        // Calcul de la position le long de la branche
        const progress = (i + 1) / (mainCauses.length + 1);
        const xOffset = progress * 120 + 20;
        const yOffset = position === 'top' 
          ? 100 - (progress * 50)
          : 100 + (progress * 50);
        
        return (
          <div
            key={cause.id}
            className="absolute"
            style={{
              left: `calc(50% + ${xOffset}px)`,
              [position === 'top' ? 'top' : 'bottom']: `${yOffset}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <CauseItem
              cause={cause}
              branchId={branch.id}
              branchColor={branch.color}
              onUpdate={onUpdateCause}
              onDelete={onDeleteCause}
              onAddSubCause={onAddCause}
              isEditing={editingCause === cause.id}
              setEditing={setEditingCause}
              position={position}
              allCauses={branch.causes}
              index={i}
            />
          </div>
        );
      })}
      
      {/* Bouton d'ajout positionné après la dernière cause */}
      <div 
        className="absolute"
        style={{
          left: `calc(50% + ${((mainCauses.length + 1) / (mainCauses.length + 2)) * 120 + 20}px)`,
          [position === 'top' ? 'top' : 'bottom']: `${100 + (position === 'top' ? -(((mainCauses.length + 1) / (mainCauses.length + 2)) * 50) : (((mainCauses.length + 1) / (mainCauses.length + 2)) * 50))}px`,
          transform: 'translateX(-50%)'
        }}
      >
        <button
          onClick={() => onAddCause(branch.id)}
          className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-white hover:bg-gray-50 border-2 border-dashed rounded-lg transition-all hover:shadow-md"
          style={{ borderColor: `${branch.color}50`, color: branch.color }}
        >
          <Plus className="w-3 h-3" />
          <span>Ajouter</span>
        </button>
      </div>
    </div>
  );
};

// Composant pour une cause
const CauseItem: React.FC<{
  cause: Cause;
  branchId: string;
  branchColor: string;
  onUpdate: (branchId: string, causeId: string, text: string) => void;
  onDelete: (branchId: string, causeId: string) => void;
  onAddSubCause: (branchId: string, parentId: string) => void;
  isEditing: boolean;
  setEditing: (id: string | null) => void;
  position: 'top' | 'bottom';
  allCauses: Cause[];
  index: number;
}> = ({ cause, branchId, branchColor, onUpdate, onDelete, onAddSubCause, isEditing, setEditing, position, allCauses, index }) => {
  const [localText, setLocalText] = useState(cause.text);
  const subCauses = allCauses.filter(c => c.parentId === cause.id);

  useEffect(() => {
    setLocalText(cause.text);
  }, [cause.text]);

  const handleSave = () => {
    onUpdate(branchId, cause.id, localText);
    setEditing(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setLocalText(cause.text);
      setEditing(null);
    }
  };

  return (
    <div className="relative">
      {/* Cause principale */}
      <div className="relative group">
        {isEditing ? (
          <div className="flex items-center space-x-1 z-20">
            <input
              type="text"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="px-3 py-1.5 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 bg-white shadow-lg"
              style={{ 
                borderColor: branchColor,
                focusBorderColor: branchColor,
                minWidth: '120px'
              }}
              placeholder="Entrez une cause..."
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 shadow-lg"
            >
              <Save className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div 
            className="px-3 py-2 bg-white border-2 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all text-sm min-w-[100px] max-w-[200px]"
            style={{ 
              borderColor: `${branchColor}40`,
              backgroundColor: cause.text ? 'white' : `${branchColor}10`
            }}
            onClick={() => setEditing(cause.id)}
          >
            <div className="text-xs truncate">
              {cause.text || <span className="text-gray-400 italic">Cliquez pour ajouter</span>}
            </div>
            
            {/* Actions au survol */}
            {cause.text && (
              <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-30">
                {cause.level === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubCause(branchId, cause.id);
                    }}
                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
                    title="Ajouter une sous-cause"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(branchId, cause.id);
                  }}
                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sous-causes - affichées verticalement pour éviter le chevauchement */}
      {subCauses.length > 0 && (
        <div 
          className={`absolute ${position === 'top' ? 'top-full mt-2' : 'bottom-full mb-2'} left-0 space-y-2`}
          style={{ minWidth: '150px' }}
        >
          <div 
            className="absolute left-4 w-0.5 bg-gray-300"
            style={{ 
              height: `${subCauses.length * 40}px`,
              top: position === 'top' ? 0 : 'auto',
              bottom: position === 'bottom' ? 0 : 'auto',
              backgroundColor: `${branchColor}30`
            }}
          />
          {subCauses.map((subCause, i) => (
            <div key={subCause.id} className="flex items-start space-x-2 pl-8">
              <div 
                className="w-4 h-0.5 bg-gray-300 mt-3"
                style={{ backgroundColor: `${branchColor}50` }}
              />
              <CauseItem
                cause={subCause}
                branchId={branchId}
                branchColor={branchColor}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAddSubCause={onAddSubCause}
                isEditing={false}
                setEditing={setEditing}
                position={position}
                allCauses={allCauses}
                index={i}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Modal des paramètres
const SettingsModal: React.FC<{
  diagram: IshikawaDiagram;
  onChangeMType: (type: IshikawaDiagram['mType']) => void;
  onUpdateDiagram: (updates: Partial<IshikawaDiagram>) => void;
  onClose: () => void;
}> = ({ diagram, onChangeMType, onUpdateDiagram, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Paramètres du diagramme</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nom du diagramme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du diagramme
            </label>
            <input
              type="text"
              value={diagram.name}
              onChange={(e) => onUpdateDiagram({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Type de M */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'analyse (nombre de M)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(M_CONFIGS).map((type) => (
                <button
                  key={type}
                  onClick={() => onChangeMType(type as IshikawaDiagram['mType'])}
                  className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                    diagram.mType === type
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            {/* Description du type sélectionné */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Branches du {diagram.mType} :
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                {M_CONFIGS[diagram.mType].map(config => (
                  <li key={config.id} className="flex items-center space-x-2">
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span>{config.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal d'aide
const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              Guide d'utilisation - Diagramme d'Ishikawa
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Introduction */}
            <section>
              <h4 className="font-semibold text-gray-800 mb-2">
                Qu'est-ce que le diagramme d'Ishikawa ?
              </h4>
              <p className="text-sm text-gray-600">
                Le diagramme d'Ishikawa (ou diagramme en arêtes de poisson) est un outil 
                d'analyse des causes et effets. Il permet d'identifier et de visualiser 
                toutes les causes possibles d'un problème ou d'un effet observé.
              </p>
            </section>

            {/* Types de M */}
            <section>
              <h4 className="font-semibold text-gray-800 mb-2">Les différents types de M</h4>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <strong className="text-gray-700">4M :</strong> Main d'œuvre, Méthode, Matériel, Matière
                  <p className="text-xs mt-1">Utilisé principalement en production industrielle</p>
                </div>
                <div>
                  <strong className="text-gray-700">5M :</strong> + Milieu (environnement)
                  <p className="text-xs mt-1">Le plus couramment utilisé, intègre l'environnement de travail</p>
                </div>
                <div>
                  <strong className="text-gray-700">6M :</strong> + Mesure
                  <p className="text-xs mt-1">Pour les processus nécessitant des contrôles qualité</p>
                </div>
                <div>
                  <strong className="text-gray-700">7M :</strong> + Management
                  <p className="text-xs mt-1">Intègre les aspects organisationnels et de gestion</p>
                </div>
                <div>
                  <strong className="text-gray-700">8M :</strong> + Moyens financiers
                  <p className="text-xs mt-1">Pour les analyses incluant les contraintes budgétaires</p>
                </div>
                <div>
                  <strong className="text-gray-700">9M :</strong> + Maintenance
                  <p className="text-xs mt-1">Pour les environnements industriels complexes</p>
                </div>
              </div>
            </section>

            {/* Comment utiliser */}
            <section>
              <h4 className="font-semibold text-gray-800 mb-2">Comment utiliser le diagramme ?</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Définissez clairement le problème ou l'effet à analyser</li>
                <li>Choisissez le type de M adapté à votre contexte</li>
                <li>Pour chaque branche (M), identifiez les causes principales</li>
                <li>Ajoutez des sous-causes pour détailler chaque cause principale</li>
                <li>Analysez l'ensemble pour identifier les causes racines</li>
                <li>Priorisez les causes sur lesquelles agir</li>
              </ol>
            </section>

            {/* Raccourcis */}
            <section>
              <h4 className="font-semibold text-gray-800 mb-2">Actions disponibles</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• <strong>Cliquer sur une cause :</strong> Éditer le texte</li>
                <li>• <strong>Bouton + sur une cause :</strong> Ajouter une sous-cause</li>
                <li>• <strong>Bouton poubelle :</strong> Supprimer la cause et ses sous-causes</li>
                <li>• <strong>Enter :</strong> Valider l'édition</li>
                <li>• <strong>Escape :</strong> Annuler l'édition</li>
              </ul>
            </section>

            {/* Conseils */}
            <section>
              <h4 className="font-semibold text-gray-800 mb-2">Conseils d'utilisation</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Impliquez l'équipe dans l'identification des causes</li>
                <li>• Soyez spécifique dans la formulation des causes</li>
                <li>• N'hésitez pas à créer plusieurs niveaux de sous-causes</li>
                <li>• Utilisez des données factuelles plutôt que des suppositions</li>
                <li>• Gardez le diagramme lisible en limitant le texte</li>
              </ul>
            </section>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-colors"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};