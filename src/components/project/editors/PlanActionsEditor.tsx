import React, { useState, useMemo } from 'react';
import { A3Module, Action, User } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, HelpCircle, Eye, Kanban, BarChart3, Edit, Trash2, X, CheckSquare, Calendar, User as UserIcon } from 'lucide-react';

interface PlanActionsEditorProps {
  module: A3Module;
  onClose: () => void;
}

// --- SOUS-COMPOSANT : FORMULAIRE D'ACTION ---
const ActionFormModal: React.FC<{
    action: Partial<Action>;
    users: User[];
    initialAssignees: string[];
    onClose: () => void;
    onSave: (actionData: Partial<Action>, assignees: string[]) => void;
}> = ({ action, users, initialAssignees, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Action>>(action);
    const [assignees, setAssignees] = useState<string[]>(initialAssignees);

    const handleSave = () => { onSave(formData, assignees); };
    const handleAssigneeToggle = (userId: string) => {
        setAssignees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">{action.id ? "Modifier l'action" : "Nouvelle action"}</h3>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.titre || ''} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} className="w-full h-24 p-2 border border-gray-300 rounded-lg resize-none" placeholder="Décrivez l'action à réaliser..."/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type d'action</label><select value={formData.typeAction || 'Simple'} onChange={(e) => setFormData({ ...formData, typeAction: e.target.value as any })} className="w-full p-2 border border-gray-300 rounded-lg"><option value="Simple">Simple</option><option value="Sécurisation">Sécurisation</option><option value="Poka-Yoke">Poka-Yoke</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut</label><select value={formData.statut || 'À Faire'} onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })} className="w-full p-2 border border-gray-300 rounded-lg"><option value="À Faire">À Faire</option><option value="En Cours">En Cours</option><option value="Fait">Fait</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label><input type="date" value={formData.dateEcheance || ''} onChange={(e) => setFormData({...formData, dateEcheance: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg"/></div>
                            <div className="flex items-end gap-2">
                                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Durée</label><input type="number" min="1" value={formData.duration || 1} onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-lg"/></div>
                                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Unité</label><select value={formData.durationUnit || 'jours'} onChange={(e) => setFormData({...formData, durationUnit: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded-lg"><option value="jours">Jours</option><option value="semaines">Semaines</option><option value="mois">Mois</option></select></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Personnes assignées</label>
                            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-2">{users.map(user => (<label key={user.id} className="flex items-center space-x-3 cursor-pointer p-1 hover:bg-gray-50 rounded"><input type="checkbox" checked={assignees.includes(user.id)} onChange={() => handleAssigneeToggle(user.id)} className="h-4 w-4 rounded" /><span>{user.nom}</span></label>))}</div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Effort (1-10): {formData.effort || 5}</label><input type="range" min="1" max="10" value={formData.effort || 5} onChange={(e) => setFormData({...formData, effort: parseInt(e.target.value)})} className="w-full"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Gain (1-10): {formData.gain || 5}</label><input type="range" min="1" max="10" value={formData.gain || 5} onChange={(e) => setFormData({...formData, gain: parseInt(e.target.value)})} className="w-full"/></div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-8 pt-4 border-t"><button onClick={onClose} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Annuler</button><button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sauvegarder</button></div>
                </div>
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
export const PlanActionsEditor: React.FC<PlanActionsEditorProps> = ({ module, onClose }) => {
  const { actions, actionAssignees, createAction, updateAction, deleteAction, addActionAssignee, removeActionAssignee, projectMembers } = useDatabase();
  const { currentUser, users } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [activeView, setActiveView] = useState<'matrix' | 'kanban' | 'gantt'>('matrix');
  const [editingAction, setEditingAction] = useState<Partial<Action> | null>(null);
  const [showActionForm, setShowActionForm] = useState(false);

  const projectActions = useMemo(() => actions.filter(action => action.project === module.project), [actions, module.project]);
  const members = useMemo(() => {
    const memberIds = projectMembers.filter(pm => pm.project === module.project).map(pm => pm.user);
    return users.filter(u => memberIds.includes(u.id));
  }, [projectMembers, users, module.project]);

  const handleSaveAction = (actionData: Partial<Action>, assignees: string[]) => {
      let actionId = actionData.id;
      const dataToSave = {
          titre: actionData.titre || 'Nouvelle Action', typeAction: actionData.typeAction || 'Simple',
          dateEcheance: actionData.dateEcheance || new Date().toISOString().split('T')[0],
          statut: actionData.statut || 'À Faire', effort: actionData.effort || 5, gain: actionData.gain || 5,
          duration: actionData.duration || 1, durationUnit: actionData.durationUnit || 'jours',
          project: module.project, createdBy: actionData.createdBy || currentUser?.id || ''
      };

      if (actionId) { updateAction(actionId, dataToSave); } 
      else { actionId = createAction(dataToSave); }

      const currentAssignees = actionAssignees.filter(aa => aa.action === actionId).map(aa => aa.user);
      const toAdd = assignees.filter(id => !currentAssignees.includes(id));
      const toRemove = currentAssignees.filter(id => !assignees.includes(id));
      toAdd.forEach(userId => addActionAssignee(actionId!, userId));
      toRemove.forEach(userId => {
          const assignment = actionAssignees.find(aa => aa.action === actionId && aa.user === userId);
          if(assignment) removeActionAssignee(assignment.id);
      });
      setShowActionForm(false);
      setEditingAction(null);
  };
  
  const handleOpenForm = (action?: Partial<Action>) => {
      setEditingAction(action || {});
      setShowActionForm(true);
  };

  const getActionAssignees = (actionId: string) => actionAssignees.filter(aa => aa.action === actionId).map(aa => users.find(u => u.id === aa.user)).filter(Boolean) as User[];
  
  // --- VUES ---
  const ActionCard: React.FC<{ action: Action }> = ({ action }) => {
    const assignees = getActionAssignees(action.id);
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow w-full">
        <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 pr-2">{action.titre || 'Action sans titre'}</h4>
            <div className="flex items-center space-x-1 flex-shrink-0">
                <button onClick={() => handleOpenForm(action)} className="text-gray-400 hover:text-blue-600 p-1"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => {if(confirm("Supprimer cette action ?")) deleteAction(action.id)}} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${action.statut === 'Fait' ? 'bg-green-100 text-green-700' : action.statut === 'En Cours' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{action.statut}</span>
            {action.dateEcheance && <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(action.dateEcheance).toLocaleDateString('fr-FR')}</span>}
        </div>
        {assignees.length > 0 && (
          <div className="flex items-center -space-x-2 mt-2">
            {assignees.map(user => <div key={user.id} title={user.nom} className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold border-2 border-white">{user.nom.split(' ').map(n=>n[0]).join('')}</div>)}
          </div>
        )}
      </div>
    );
  };

  const MatrixView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <div className="flex flex-col space-y-4 min-h-0">
            {['Sécurisation', 'Simple', 'Poka-Yoke'].map(type => {
                const typeColor = type === 'Sécurisation' ? 'border-red-400' : type === 'Simple' ? 'border-blue-400' : 'border-green-400';
                return (
                    <div key={type} className={`bg-white rounded-lg p-4 border-t-4 ${typeColor} shadow-sm flex-1 flex flex-col transition-all hover:shadow-xl`}>
                        <h4 className="font-semibold text-gray-800 mb-3 text-center">{type === 'Simple' ? 'Actions Simples' : `Action de ${type}`}</h4>
                        <div className="space-y-3 flex-1 overflow-y-auto p-1 min-h-0">
                            {projectActions.filter(a=>a.typeAction === type).map(action => <ActionCard key={action.id} action={action} />)}
                        </div>
                    </div>
                )
            })}
        </div>
        <div className="bg-white rounded-lg p-6 border flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Matrice Gain/Effort</h3>
            <div className="relative w-full aspect-square max-w-sm">
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    <div className="border-r border-b border-gray-300 bg-green-50 flex items-center justify-center text-center text-green-700 font-bold text-xs p-2">Fort Gain / Faible Effort</div>
                    <div className="border-b border-gray-300 bg-blue-50 flex items-center justify-center text-center text-blue-700 font-bold text-xs p-2">Fort Gain / Fort Effort</div>
                    <div className="border-r border-gray-300 bg-yellow-50 flex items-center justify-center text-center text-yellow-700 font-bold text-xs p-2">Faible Gain / Faible Effort</div>
                    <div className="bg-red-50 flex items-center justify-center text-center text-red-700 font-bold text-xs p-2">Faible Gain / Fort Effort</div>
                </div>
                {projectActions.map(action => (
                    <div 
                        key={action.id}
                        className="absolute w-4 h-4 bg-gray-800 rounded-full border-2 border-white cursor-pointer hover:scale-150 transition-transform"
                        style={{ left: `calc(${(action.effort - 1) * 100 / 9}% - 8px)`, bottom: `calc(${(action.gain - 1) * 100 / 9}% - 8px)` }}
                        title={`Action: ${action.titre}\nEffort: ${action.effort}, Gain: ${action.gain}`}
                        onClick={() => handleOpenForm(action)}
                    ></div>
                ))}
            </div>
            <div className="w-full text-center mt-2 text-sm font-medium text-gray-700">→ Effort</div>
        </div>
    </div>
  );

  const KanbanView = () => (
    <div className="flex space-x-6 h-full overflow-x-auto pb-4">
        {members.map(member => (
            <div key={member.id} className="w-72 bg-gray-50 rounded-lg p-4 border flex flex-col flex-shrink-0">
                <div className="flex items-center space-x-2 mb-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">{member.nom.split(' ').map(n=>n[0]).join('')}</div>
                    <h4 className="font-semibold text-gray-800">{member.nom}</h4>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto p-1 min-h-0">
                    {projectActions.filter(action => getActionAssignees(action.id).some(a => a.id === member.id)).map(action => (
                        <ActionCard key={action.id} action={action} />
                    ))}
                </div>
            </div>
        ))}
    </div>
  );

  const GanttView = () => (
    <div className="bg-white rounded-lg p-6 border h-full overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vue Gantt Simplifiée</h3>
        <p className="text-sm text-gray-500">Cette vue est une représentation et n'est pas interactive.</p>
        <div className="mt-6 space-y-4">
            {members.map(member => (
                <div key={member.id}>
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold">{member.nom.split(' ').map(n=>n[0]).join('')}</div>
                        <h5 className="font-medium text-gray-800 text-sm">{member.nom}</h5>
                    </div>
                    <div className="w-full bg-gray-100 rounded-lg p-2 min-h-[40px] relative">
                        {projectActions.filter(action => getActionAssignees(action.id).some(a => a.id === member.id)).map(action => {
                            const left = Math.random() * 70; // Logique de positionnement simplifiée
                            const width = Math.max(10, action.duration * 2); // Logique de largeur simplifiée
                            return (
                            <div key={action.id} title={action.titre} className="absolute bg-blue-500 text-white text-xs font-medium rounded p-1 h-6 truncate" style={{ left: `${left}%`, width: `${width}%`}}>
                                {action.titre}
                            </div>
                        )})}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
        <div className="bg-white rounded-2xl shadow-xl flex flex-col w-full h-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b" style={{ flexGrow: 0, flexShrink: 0 }}>
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><CheckSquare className="w-6 h-6" /></div>
                    <h1 className="text-2xl font-bold text-gray-900">Plan d'Actions</h1>
                </div>
                 <div className="flex items-center space-x-3">
                    <button onClick={() => setShowHelp(true)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center" title="Aide"><HelpCircle className="w-5 h-5 text-gray-600" /></button>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center" title="Fermer"><X className="w-5 h-5 text-gray-600" /></button>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                        <button onClick={() => setActiveView('matrix')} className={`px-3 py-1 rounded text-sm font-medium flex items-center ${activeView === 'matrix' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}><Eye className="w-4 h-4 mr-1.5" />Matrice</button>
                        <button onClick={() => setActiveView('kanban')} className={`px-3 py-1 rounded text-sm font-medium flex items-center ${activeView === 'kanban' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}><Kanban className="w-4 h-4 mr-1.5" />Kanban</button>
                        <button onClick={() => setActiveView('gantt')} className={`px-3 py-1 rounded text-sm font-medium flex items-center ${activeView === 'gantt' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}><BarChart3 className="w-4 h-4 mr-1.5" />Gantt</button>
                    </div>
                    <button onClick={() => handleOpenForm()} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm">
                        <Plus className="w-5 h-5" /><span>Nouvelle Action</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeView === 'matrix' && <MatrixView />}
                    {activeView === 'kanban' && <KanbanView />}
                    {activeView === 'gantt' && <GanttView />}
                </div>
            </div>

            {showActionForm && editingAction && (
                <ActionFormModal 
                    action={editingAction}
                    users={users}
                    initialAssignees={actionAssignees.filter(aa => aa.action === editingAction.id).map(aa => aa.user)}
                    onClose={() => { setShowActionForm(false); setEditingAction(null); }}
                    onSave={handleSaveAction}
                />
            )}
        </div>
    </div>
  );
};