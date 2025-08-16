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
    <div className="relative w-full">
      {/* Diagramme visuel simplifié */}
      <div className="mb-8">
        <svg className="w-full h-48" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet">
          {/* Arête centrale */}
          <line x1="50" y1="100" x2="700" y2="100" stroke="#374151" strokeWidth="3" />
          
          {/* Flèche */}
          <polygon points="700,100 680,90 680,110" fill="#EF4444" />
          
          {/* Branches supérieures */}
          {topBranches.map((branch, index) => {
            const x = 150 + (index * 120);
            return (
              <g key={branch.id}>
                <line 
                  x1={x} 
                  y1="100" 
                  x2={x - 40} 
                  y2="40" 
                  stroke={branch.color} 
                  strokeWidth="2"
                  opacity="0.7"
                />
                <circle cx={x - 40} cy="40" r="20" fill={branch.color} opacity="0.2" />
                <text 
                  x={x - 40} 
                  y="20" 
                  textAnchor="middle" 
                  className="text-xs font-semibold"
                  fill={branch.color}
                >
                  {branch.name.substring(0, 10)}
                </text>
              </g>
            );
          })}
          
          {/* Branches inférieures */}
          {bottomBranches.map((branch, index) => {
            const x = 150 + (index * 120);
            return (
              <g key={branch.id}>
                <line 
                  x1={x} 
                  y1="100" 
                  x2={x - 40} 
                  y2="160" 
                  stroke={branch.color} 
                  strokeWidth="2"
                  opacity="0.7"
                />
                <circle cx={x - 40} cy="160" r="20" fill={branch.color} opacity="0.2" />
                <text 
                  x={x - 40} 
                  y="180" 
                  textAnchor="middle" 
                  className="text-xs font-semibold"
                  fill={branch.color}
                >
                  {branch.name.substring(0, 10)}
                </text>
              </g>
            );
          })}
          
          {/* Effet/Problème */}
          <rect x="710" y="85" width="80" height="30" rx="5" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" />
          <text x="750" y="104" textAnchor="middle" className="text-sm font-bold" fill="#991B1B">
            EFFET
          </text>
        </svg>
      </div>

      {/* Cartes des branches M */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {diagram.branches.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
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

// Composant carte pour une branche
const BranchCard: React.FC<{
  branch: Branch;
  onAddCause: (branchId: string, parentId?: string) => void;
  onUpdateCause: (branchId: string, causeId: string, text: string) => void;
  onDeleteCause: (branchId: string, causeId: string) => void;
  editingCause: string | null;
  setEditingCause: (id: string | null) => void;
}> = ({ branch, onAddCause, onUpdateCause, onDeleteCause, editingCause, setEditingCause }) => {
  const mainCauses = branch.causes.filter(c => c.level === 0);
  
  return (
    <div 
      className="bg-white rounded-xl shadow-lg overflow-hidden border-2 hover:shadow-xl transition-shadow"
      style={{ borderColor: `${branch.color}30` }}
    >
      {/* En-tête de la carte */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: `${branch.color}10`, borderBottom: `3px solid ${branch.color}` }}
      >
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: branch.color }}
          >
            <span className="text-white">{branch.icon}</span>
          </div>
          <h3 className="font-bold text-gray-800">{branch.name}</h3>
        </div>
        <span 
          className="px-2 py-1 rounded-full text-xs font-semibold bg-white"
          style={{ color: branch.color }}
        >
          {mainCauses.length} cause{mainCauses.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste des causes avec scroll */}
      <div className="p-4 max-h-64 overflow-y-auto">
        <div className="space-y-2">
          {mainCauses.length === 0 ? (
            <p className="text-center text-gray-400 italic py-4">
              Aucune cause identifiée
            </p>
          ) : (
            mainCauses.map((cause, index) => (
              <CauseItemCard
                key={cause.id}
                cause={cause}
                branchId={branch.id}
                branchColor={branch.color}
                onUpdate={onUpdateCause}
                onDelete={onDeleteCause}
                onAddSubCause={onAddCause}
                isEditing={editingCause === cause.id}
                setEditing={setEditingCause}
                allCauses={branch.causes}
                index={index}
              />
            ))
          )}
        </div>
      </div>

      {/* Bouton d'ajout */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onAddCause(branch.id)}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium bg-white hover:bg-gray-50 border-2 border-dashed rounded-lg transition-colors"
          style={{ borderColor: `${branch.color}50`, color: branch.color }}
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une cause</span>
        </button>
      </div>
    </div>
  );
};

// Composant pour une cause dans la carte
const CauseItemCard: React.FC<{
  cause: Cause;
  branchId: string;
  branchColor: string;
  onUpdate: (branchId: string, causeId: string, text: string) => void;
  onDelete: (branchId: string, causeId: string) => void;
  onAddSubCause: (branchId: string, parentId: string) => void;
  isEditing: boolean;
  setEditing: (id: string | null) => void;
  allCauses: Cause[];
  index: number;
  level?: number;
}> = ({ cause, branchId, branchColor, onUpdate, onDelete, onAddSubCause, isEditing, setEditing, allCauses, index, level = 0 }) => {
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
    <div className={`${level > 0 ? 'ml-6' : ''}`}>
      <div className="group relative">
        {/* Indicateur de niveau */}
        {level > 0 && (
          <div className="absolute -left-4 top-3 w-3 h-0.5" style={{ backgroundColor: `${branchColor}50` }} />
        )}
        
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-500 w-6">
              {index + 1}.
            </span>
            <input
              type="text"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="flex-1 px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                borderColor: branchColor,
                focusBorderColor: branchColor
              }}
              placeholder="Entrez une cause..."
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-start space-x-2">
            <span className="text-sm font-semibold text-gray-500 w-6 pt-2">
              {level === 0 ? `${index + 1}.` : `${index + 1}.`}
            </span>
            <div 
              className="flex-1 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setEditing(cause.id)}
            >
              <p className="text-sm text-gray-800">
                {cause.text || <span className="text-gray-400 italic">Cliquez pour ajouter une cause</span>}
              </p>
            </div>
            
            {/* Actions */}
            {cause.text && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                {level === 0 && (
                  <button
                    onClick={() => onAddSubCause(branchId, cause.id)}
                    className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Ajouter une sous-cause"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(branchId, cause.id)}
                  className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sous-causes */}
      {subCauses.length > 0 && (
        <div className="mt-2 space-y-2 pl-2 border-l-2" style={{ borderColor: `${branchColor}20` }}>
          {subCauses.map((subCause, i) => (
            <CauseItemCard
              key={subCause.id}
              cause={subCause}
              branchId={branchId}
              branchColor={branchColor}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddSubCause={onAddSubCause}
              isEditing={false}
              setEditing={setEditing}
              allCauses={allCauses}
              index={i}
              level={level + 1}
            />
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