import React, { useState, useEffect, useRef } from 'react';
import { A3Module, Action } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, X, HelpCircle, Calendar, Users, Target, Zap, CheckCircle, Clock, User, Trash2, Edit3 } from 'lucide-react';

interface PlanActionsEditorProps {
  module: A3Module;
  onClose: () => void;
}

interface ActionWithAssignees extends Action {
  assignees: string[];
}

type ViewMode = 'list' | 'matrix' | 'gantt';
type GanttScale = 'day' | 'week' | 'month';

// Fonction pour obtenir le numéro de semaine ISO
const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const PlanActionsEditor: React.FC<PlanActionsEditorProps> = ({ module, onClose }) => {
  const { updateA3Module, actions, actionAssignees, createAction, updateAction, deleteAction, addActionAssignee, removeActionAssignee } = useDatabase();
  const { users } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [ganttScale, setGanttScale] = useState<GanttScale>('week');
  const [showAddAction, setShowAddAction] = useState(false);
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    actionId: string;
    mode: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    startDate: number;
    startDuration: number;
  } | null>(null);

  const ganttRef = useRef<HTMLDivElement>(null);

  // Récupérer les actions du projet
  const projectActions = actions.filter(action => action.project === module.project);
  
  // Enrichir les actions avec leurs assignés
  const actionsWithAssignees: ActionWithAssignees[] = projectActions.map(action => ({
    ...action,
    assignees: actionAssignees
      .filter(assignee => assignee.action === action.id)
      .map(assignee => assignee.user)
  }));

  const [newAction, setNewAction] = useState({
    titre: '',
    typeAction: 'Simple' as Action['typeAction'],
    dateEcheance: '',
    statut: 'À Faire' as Action['statut'],
    effort: 5,
    gain: 5,
    duree: 7,
    assignees: [] as string[]
  });

  // Calculer la plage de dates pour le Gantt
  const getGanttDateRange = () => {
    if (actionsWithAssignees.length === 0) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      const end = new Date(today);
      end.setDate(today.getDate() + 60);
      return { start, end };
    }

    const dates = actionsWithAssignees.map(action => {
      const echeance = new Date(action.dateEcheance);
      const debut = new Date(echeance);
      debut.setDate(echeance.getDate() - (action.duree || 7));
      return { debut, echeance };
    });

    const allDates = dates.flatMap(d => [d.debut, d.echeance]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Ajouter une marge
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  };

  // Générer les colonnes de timeline selon l'échelle
  const generateTimelineColumns = () => {
    const { start, end } = getGanttDateRange();
    const columns = [];
    const current = new Date(start);

    while (current <= end) {
      let label = '';
      let nextDate = new Date(current);

      switch (ganttScale) {
        case 'day':
          label = current.toLocaleDateString('fr-FR', { 
            weekday: 'short', 
            day: '2-digit', 
            month: 'short',
            year: 'numeric'
          });
          nextDate.setDate(current.getDate() + 1);
          break;
        case 'week':
          const weekNum = getISOWeekNumber(current);
          const year = current.getFullYear();
          label = `S${weekNum} ${year}`;
          nextDate.setDate(current.getDate() + 7);
          break;
        case 'month':
          label = current.toLocaleDateString('fr-FR', { 
            month: 'long', 
            year: 'numeric' 
          });
          nextDate.setMonth(current.getMonth() + 1);
          break;
      }

      columns.push({
        date: new Date(current),
        label,
        width: ganttScale === 'day' ? 80 : ganttScale === 'week' ? 100 : 120
      });

      current.setTime(nextDate.getTime());
    }

    return columns;
  };

  // Calculer la position et largeur d'une barre dans le Gantt
  const calculateBarPosition = (action: ActionWithAssignees) => {
    const { start, end } = getGanttDateRange();
    const echeance = new Date(action.dateEcheance);
    const duree = action.duree || 7;
    const debut = new Date(echeance);
    debut.setDate(echeance.getDate() - duree);

    const totalDuration = end.getTime() - start.getTime();
    const actionStart = debut.getTime() - start.getTime();
    const actionDuration = duree * 24 * 60 * 60 * 1000; // durée en millisecondes

    const left = Math.max(0, (actionStart / totalDuration) * 100);
    const width = Math.min(100 - left, (actionDuration / totalDuration) * 100);

    return { left, width: Math.max(width, 1) }; // largeur minimale de 1%
  };

  // Gestion du drag and drop
  const handleMouseDown = (e: React.MouseEvent, actionId: string, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();

    const action = actionsWithAssignees.find(a => a.id === actionId);
    if (!action) return;

    const echeance = new Date(action.dateEcheance);
    const duree = action.duree || 7;

    setDragState({
      actionId,
      mode,
      startX: e.clientX,
      startDate: echeance.getTime(),
      startDuration: duree
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !ganttRef.current) return;

      const rect = ganttRef.current.getBoundingClientRect();
      const { start, end } = getGanttDateRange();
      const totalDuration = end.getTime() - start.getTime();
      const pixelToTime = totalDuration / rect.width;
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = deltaX * pixelToTime;

      const action = actionsWithAssignees.find(a => a.id === dragState.actionId);
      if (!action) return;

      let newEcheance = new Date(dragState.startDate);
      let newDuree = dragState.startDuration;

      switch (dragState.mode) {
        case 'move':
          newEcheance = new Date(dragState.startDate + deltaTime);
          break;
        case 'resize-left':
          const newDebut = new Date(dragState.startDate - (dragState.startDuration * 24 * 60 * 60 * 1000) + deltaTime);
          const originalEcheance = new Date(dragState.startDate);
          newDuree = Math.max(1, Math.round((originalEcheance.getTime() - newDebut.getTime()) / (24 * 60 * 60 * 1000)));
          break;
        case 'resize-right':
          newDuree = Math.max(1, Math.round(dragState.startDuration + deltaTime / (24 * 60 * 60 * 1000)));
          break;
      }

      // Contraintes
      if (newEcheance < start) newEcheance = new Date(start);
      if (newEcheance > end) newEcheance = new Date(end);

      updateAction(dragState.actionId, {
        dateEcheance: newEcheance.toISOString().split('T')[0],
        duree: newDuree
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, actionsWithAssignees, updateAction]);

  const handleAddAction = () => {
    if (!newAction.titre.trim()) return;

    const actionId = createAction({
      titre: newAction.titre,
      typeAction: newAction.typeAction,
      dateEcheance: newAction.dateEcheance,
      statut: newAction.statut,
      effort: newAction.effort,
      gain: newAction.gain,
      duree: newAction.duree,
      project: module.project,
      createdBy: '1' // TODO: utiliser l'utilisateur actuel
    });

    // Ajouter les assignés
    newAction.assignees.forEach(userId => {
      addActionAssignee(actionId, userId);
    });

    // Reset du formulaire
    setNewAction({
      titre: '',
      typeAction: 'Simple',
      dateEcheance: '',
      statut: 'À Faire',
      effort: 5,
      gain: 5,
      duree: 7,
      assignees: []
    });
    setShowAddAction(false);
  };

  const handleDeleteAction = (actionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette action ?')) {
      deleteAction(actionId);
    }
  };

  const toggleAssignee = (actionId: string, userId: string) => {
    const isAssigned = actionAssignees.some(a => a.action === actionId && a.user === userId);
    if (isAssigned) {
      removeActionAssignee(actionId, userId);
    } else {
      addActionAssignee(actionId, userId);
    }
  };

  const getStatusColor = (statut: Action['statut']) => {
    switch (statut) {
      case 'À Faire': return 'bg-gray-200 text-gray-800';
      case 'En Cours': return 'bg-blue-200 text-blue-800';
      case 'Fait': return 'bg-green-200 text-green-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getTypeColor = (type: Action['typeAction']) => {
    switch (type) {
      case 'Sécurisation': return 'bg-red-100 text-red-800 border-red-200';
      case 'Simple': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Poka-Yoke': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const timelineColumns = generateTimelineColumns();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Plan d'Actions</h2>
        </div>
        <div className="flex items-center space-x-3">
          {/* Sélecteur de vue */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'matrix' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Matrice
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'gantt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Gantt
            </button>
          </div>

          {/* Échelle pour le Gantt */}
          {viewMode === 'gantt' && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setGanttScale('day')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  ganttScale === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setGanttScale('week')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  ganttScale === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setGanttScale('month')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  ganttScale === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mois
              </button>
            </div>
          )}

          <button
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Bouton d'ajout */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddAction(true)}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Action</span>
        </button>
      </div>

      {/* Contenu selon la vue */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' && (
          <div className="space-y-4 overflow-y-auto h-full">
            {actionsWithAssignees.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune action définie</p>
                <p className="text-gray-400 text-sm">Ajoutez votre première action pour commencer</p>
              </div>
            ) : (
              actionsWithAssignees.map((action) => (
                <div key={action.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{action.titre}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(action.typeAction)}`}>
                          {action.typeAction}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(action.statut)}`}>
                          {action.statut}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Échéance: {new Date(action.dateEcheance).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Durée: {action.duree || 7} jours</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Target className="w-4 h-4" />
                          <span>Effort: {action.effort}/10</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Zap className="w-4 h-4" />
                          <span>Gain: {action.gain}/10</span>
                        </div>
                      </div>
                      {action.assignees.length > 0 && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div className="flex space-x-1">
                            {action.assignees.map(userId => {
                              const user = users?.find(u => u.id === userId);
                              return (
                                <span key={userId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {user?.nom || 'Utilisateur inconnu'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingAction(action.id)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'matrix' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Matrice Gain / Effort</h3>
            <div className="relative w-full h-96 border border-gray-300">
              {/* Axes */}
              <div className="absolute bottom-0 left-0 w-full h-px bg-gray-400"></div>
              <div className="absolute bottom-0 left-0 w-px h-full bg-gray-400"></div>
              
              {/* Labels */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm text-gray-600">
                Effort (1-10)
              </div>
              <div className="absolute top-1/2 -left-12 transform -translate-y-1/2 -rotate-90 text-sm text-gray-600">
                Gain (1-10)
              </div>

              {/* Quadrants */}
              <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-green-50 border-l border-b border-gray-200 flex items-center justify-center">
                <span className="text-xs text-green-700 font-medium">Gain élevé / Effort faible</span>
              </div>
              <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-yellow-50 border-r border-b border-gray-200 flex items-center justify-center">
                <span className="text-xs text-yellow-700 font-medium">Gain élevé / Effort élevé</span>
              </div>
              <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-50 border-l border-t border-gray-200 flex items-center justify-center">
                <span className="text-xs text-blue-700 font-medium">Gain faible / Effort faible</span>
              </div>
              <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-red-50 border-r border-t border-gray-200 flex items-center justify-center">
                <span className="text-xs text-red-700 font-medium">Gain faible / Effort élevé</span>
              </div>

              {/* Points des actions */}
              {actionsWithAssignees.map((action) => {
                const x = (action.effort / 10) * 100;
                const y = 100 - (action.gain / 10) * 100;
                
                return (
                  <div
                    key={action.id}
                    className="absolute w-3 h-3 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:bg-blue-700"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    title={`${action.titre} (Effort: ${action.effort}, Gain: ${action.gain})`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'gantt' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">Diagramme de Gantt</h3>
            </div>
            
            <div className="flex-1 overflow-auto" ref={ganttRef}>
              {/* Timeline header */}
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <div className="flex">
                  <div className="w-64 px-4 py-3 font-medium text-gray-900 border-r border-gray-200">
                    Actions
                  </div>
                  <div className="flex">
                    {timelineColumns.map((column, index) => (
                      <div
                        key={index}
                        className="px-2 py-3 text-xs font-medium text-gray-600 border-r border-gray-200 text-center"
                        style={{ minWidth: `${column.width}px` }}
                      >
                        {column.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions rows */}
              <div className="relative">
                {actionsWithAssignees.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune action à afficher</p>
                  </div>
                ) : (
                  actionsWithAssignees.map((action, actionIndex) => {
                    const { left, width } = calculateBarPosition(action);
                    
                    return (
                      <div key={action.id} className="flex border-b border-gray-100 hover:bg-gray-50">
                        {/* Action info */}
                        <div className="w-64 px-4 py-3 border-r border-gray-200">
                          <div className="font-medium text-sm text-gray-900 truncate" title={action.titre}>
                            {action.titre}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {action.duree || 7} jours
                          </div>
                        </div>

                        {/* Timeline area */}
                        <div className="flex-1 relative h-12 flex items-center">
                          {/* Barre de l'action */}
                          <div
                            className="absolute h-6 bg-blue-500 rounded cursor-move hover:bg-blue-600 transition-colors"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              minWidth: '20px'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, action.id, 'move')}
                          >
                            {/* Poignée gauche pour redimensionner */}
                            <div
                              className="absolute left-0 top-0 w-1 h-full bg-blue-700 cursor-col-resize hover:bg-blue-800"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, action.id, 'resize-left');
                              }}
                            />
                            
                            {/* Texte de l'action */}
                            <div className="px-2 text-xs text-white font-medium truncate leading-6">
                              {action.titre}
                            </div>
                            
                            {/* Poignée droite pour redimensionner */}
                            <div
                              className="absolute right-0 top-0 w-1 h-full bg-blue-700 cursor-col-resize hover:bg-blue-800"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, action.id, 'resize-right');
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'ajout d'action */}
      {showAddAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Nouvelle Action</h3>
              <button
                onClick={() => setShowAddAction(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre de l'action
                </label>
                <input
                  type="text"
                  value={newAction.titre}
                  onChange={(e) => setNewAction({ ...newAction, titre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Mettre en place un nouveau processus..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'action
                  </label>
                  <select
                    value={newAction.typeAction}
                    onChange={(e) => setNewAction({ ...newAction, typeAction: e.target.value as Action['typeAction'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Simple">Simple</option>
                    <option value="Sécurisation">Sécurisation</option>
                    <option value="Poka-Yoke">Poka-Yoke</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={newAction.statut}
                    onChange={(e) => setNewAction({ ...newAction, statut: e.target.value as Action['statut'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="À Faire">À Faire</option>
                    <option value="En Cours">En Cours</option>
                    <option value="Fait">Fait</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={newAction.dateEcheance}
                    onChange={(e) => setNewAction({ ...newAction, dateEcheance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newAction.duree}
                    onChange={(e) => setNewAction({ ...newAction, duree: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effort (1-10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newAction.effort}
                    onChange={(e) => setNewAction({ ...newAction, effort: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">{newAction.effort}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gain (1-10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newAction.gain}
                    onChange={(e) => setNewAction({ ...newAction, gain: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">{newAction.gain}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignés
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {users?.map((user) => (
                    <label key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newAction.assignees.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAction({
                              ...newAction,
                              assignees: [...newAction.assignees, user.id]
                            });
                          } else {
                            setNewAction({
                              ...newAction,
                              assignees: newAction.assignees.filter(id => id !== user.id)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{user.nom}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowAddAction(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddAction}
                disabled={!newAction.titre.trim() || !newAction.dateEcheance}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'aide */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comment utiliser le Plan d'Actions ?
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Le Plan d'Actions permet de gérer et suivre les actions d'amélioration.</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-800 mb-2">Fonctionnalités :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Vue Liste :</strong> Affichage détaillé des actions</li>
                    <li><strong>Matrice Gain/Effort :</strong> Priorisation visuelle</li>
                    <li><strong>Gantt :</strong> Planification temporelle</li>
                    <li><strong>Assignation :</strong> Responsabilités claires</li>
                  </ul>
                </div>
                <p>Utilisez la matrice pour prioriser et le Gantt pour planifier dans le temps.</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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