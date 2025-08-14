// src/components/project/editors/PlanActionsEditor.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { A3Module } from '../../../types/database';
import { HelpCircle, X, Layers, User as UserIcon, Table, GanttChartSquare, Plus, Users, Crown, Check } from 'lucide-react';

// --- TYPES & INTERFACES (Mise à jour pour multi-assignés) ---
type ActionType = 'simple' | 'securisation' | 'poka-yoke';
type ActionStatus = 'À faire' | 'En cours' | 'Terminé';

interface User {
    id: string;
    name: string;
    avatarUrl?: string; // Ajout pour les photos
}

interface Action {
    id: string;
    title: string;
    description?: string;
    status: ActionStatus;
    due_date: string;
    start_date: string;
    type: ActionType;
    assignee_ids: string[]; // Changé pour supporter plusieurs assignés
    leader_id?: string; // Ajout pour identifier le leader
    effort: number;
    gain: number;
}

// --- PROPS DU COMPOSANT ---
interface PlanActionsEditorProps {
  module: A3Module;
  onClose: () => void;
}

// --- DONNÉES MOCK (Mise à jour) ---
const mockUsers: User[] = [
    { id: 'user-1', name: 'Claire Martin', avatarUrl: 'https://i.pravatar.cc/150?u=user-1' },
    { id: 'user-2', name: 'Jean Dupont', avatarUrl: 'https://i.pravatar.cc/150?u=user-2' },
    { id: 'user-3', name: 'Pierre Simon', avatarUrl: 'https://i.pravatar.cc/150?u=user-3' },
];

const mockData: Action[] = [
  { id: '1', title: 'Optimiser le rangement des outils', status: 'À faire', due_date: '2025-08-25', start_date: '2025-08-10', type: 'simple', assignee_ids: ['user-1', 'user-2'], leader_id: 'user-1', effort: 3, gain: 8, description: 'Mise en place du 5S pour les postes 1 et 2.' },
  { id: '2', title: 'Créer un gabarit de perçage', status: 'À faire', due_date: '2025-09-30', start_date: '2025-09-01', type: 'poka-yoke', assignee_ids: ['user-3'], leader_id: 'user-3', effort: 8, gain: 9, description: 'Gabarit pour la pièce XA-42 pour éviter les erreurs.' },
  { id: '3', title: 'Mettre à jour la doc sécurité', status: 'En cours', due_date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0], start_date: '2025-08-05', type: 'securisation', assignee_ids: ['user-1'], leader_id: 'user-1', effort: 6, gain: 6, description: 'Revoir la documentation suite au nouvel équipement.' },
  { id: '4', title: 'Installer un carter de protection', status: 'Terminé', due_date: '2025-08-10', start_date: '2025-08-01', type: 'securisation', assignee_ids: ['user-2'], leader_id: 'user-2', effort: 7, gain: 4, description: 'Carter sur la machine Z, zone de coupe.' },
  { id: '5', title: 'Former l\'équipe au nouveau process', status: 'En cours', due_date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0], start_date: '2025-09-05', type: 'simple', assignee_ids: ['user-2', 'user-3'], leader_id: 'user-2', effort: 9, gain: 2, description: 'Formation sur le nouveau logiciel de gestion.' },
];

// --- CONFIGURATION VISUELLE (Conservée) ---
const actionTypeConfig = {
  simple: { name: 'Action Simple', icon: '💡', color: 'border-blue-500', textColor: 'text-blue-600', barBg: 'bg-blue-500', a3Color: 'bg-blue-100 text-blue-800' },
  securisation: { name: 'Sécurisation', icon: '🛡️', color: 'border-red-500', textColor: 'text-red-600', barBg: 'bg-red-500', a3Color: 'bg-red-100 text-red-800' },
  'poka-yoke': { name: 'Poka-Yoke', icon: '🧩', color: 'border-yellow-500', textColor: 'text-yellow-600', barBg: 'bg-yellow-500', a3Color: 'bg-yellow-100 text-yellow-800' },
};

// --- COMPOSANTS UTILITAIRES (Améliorés) ---
const Tooltip = ({ content, children }: { content: string, children: React.ReactNode }) => (
    <div className="relative group">
        {children}
        <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"
             dangerouslySetInnerHTML={{ __html: content }}
        />
    </div>
);

const DateIndicator = ({ dueDate }: { dueDate: string }) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let color = 'text-green-600';
    let text = "À l'heure";
    if (diffDays < 0) { color = 'text-red-600'; text = `En retard de ${Math.abs(diffDays)}j`; }
    else if (diffDays <= 7) { color = 'text-yellow-600'; text = `Échéance proche (${diffDays}j)`; }

    return (
        <div className={`flex items-center text-xs font-semibold ${color}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: 'currentColor' }}></span>
            <span>{text}</span>
        </div>
    );
};

const AssigneeAvatars = ({ assignee_ids, leader_id }) => (
  <div className="flex items-center -space-x-2">
    {assignee_ids.map(id => {
      const user = mockUsers.find(u => u.id === id);
      if (!user) return null;
      const isLeader = id === leader_id;
      return (
        <Tooltip key={id} content={`${user.name}${isLeader ? ' (Leader)' : ''}`}>
          <div className="relative">
            <img src={user.avatarUrl} alt={user.name} className={`w-6 h-6 rounded-full border-2 ${isLeader ? 'border-yellow-400' : 'border-white'}`} />
            {isLeader && <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 bg-white rounded-full p-0.5" />}
          </div>
        </Tooltip>
      );
    })}
  </div>
);

const ActionCard = ({ action, onDragStart, onClick }: { action: Action, onDragStart: (e: React.DragEvent, action: Action) => void, onClick: (action: Action) => void }) => {
  const config = actionTypeConfig[action.type];
  
  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, action)}
      onClick={() => onClick(action)}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm mb-3 border-l-4 ${config.color} p-3 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all`}
    >
      <div className="flex justify-between items-start mb-2">
          <AssigneeAvatars assignee_ids={action.assignee_ids} leader_id={action.leader_id} />
      </div>
      <h3 className="font-bold text-gray-800 text-sm">{action.title}</h3>
      <div className="mt-3">
        <DateIndicator dueDate={action.due_date} />
      </div>
    </div>
  );
};

// --- FORMULAIRE D'ACTION (Fortement amélioré) ---
const ActionModal = ({ isOpen, onClose, onSave, action }: { isOpen: boolean, onClose: () => void, onSave: (action: Action) => void, action: Action | null }) => {
    if (!isOpen) return null;
    
    const [formData, setFormData] = useState<Partial<Action>>(action || { title: '', description: '', assignee_ids: [], status: 'À faire', type: 'simple', due_date: new Date().toISOString().split('T')[0], start_date: new Date().toISOString().split('T')[0], effort: 5, gain: 5 });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: (e.target.type === 'range' || e.target.type === 'number') ? parseInt(value) : value }));
    };

    const toggleAssignee = (userId: string) => {
        setFormData(prev => {
            const currentAssignees = prev.assignee_ids || [];
            const newAssignees = currentAssignees.includes(userId) ? currentAssignees.filter(id => id !== userId) : [...currentAssignees, userId];
            const newLeaderId = newAssignees.includes(prev.leader_id) ? prev.leader_id : (newAssignees[0] || undefined);
            return { ...prev, assignee_ids: newAssignees, leader_id: newLeaderId };
        });
    };

    const setLeader = (userId: string) => {
      if((formData.assignee_ids || []).includes(userId)) {
        setFormData(prev => ({...prev, leader_id: userId}));
      }
    }

    const getQuadrant = (gain: number, effort: number) => {
      if (gain >= 5 && effort < 5) return { name: "Quick Win 🔥", color: "bg-green-200" };
      if (gain >= 5 && effort >= 5) return { name: "Gros projet 🗓️", color: "bg-blue-200" };
      if (gain < 5 && effort < 5) return { name: "Tâche de fond 👌", color: "bg-yellow-200" };
      return { name: "À éviter 🤔", color: "bg-red-200" };
    };
    const currentQuadrant = getQuadrant(formData.gain, formData.effort);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-3xl text-gray-800 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{action ? "Modifier l'action" : "Créer une action"}</h2>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData as Action); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <input name="title" value={formData.title} onChange={handleChange} placeholder="Titre de l'action" className="p-2 border bg-gray-50 border-gray-300 rounded col-span-2" required />
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="p-2 border bg-gray-50 border-gray-300 rounded col-span-2 h-24"></textarea>
                        
                        <div className="col-span-2">
                          <label className="font-semibold text-gray-700 mb-2 block">Équipe</label>
                          <div className="flex flex-wrap gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            {mockUsers.map(user => {
                              const isSelected = (formData.assignee_ids || []).includes(user.id);
                              const isLeader = formData.leader_id === user.id;
                              return (
                                <div key={user.id} className="flex flex-col items-center cursor-pointer" onClick={() => toggleAssignee(user.id)}>
                                  <div className={`relative p-1 rounded-full transition-all ${isSelected ? 'bg-blue-200' : ''}`}>
                                    <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full" />
                                    {isSelected && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"><Check size={12} className="text-white"/></div>}
                                  </div>
                                  <span className="text-xs mt-1 text-gray-600">{user.name}</span>
                                  {isSelected && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setLeader(user.id); }} className={`mt-1 text-xs px-2 py-0.5 rounded-full ${isLeader ? 'bg-yellow-400 text-black' : 'bg-gray-200'}`}>
                                      {isLeader ? 'Leader' : 'Set Leader'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <select name="status" value={formData.status} onChange={handleChange} className="p-2 border bg-gray-50 border-gray-300 rounded"><option>À faire</option><option>En cours</option><option>Terminé</option></select>
                            <div className="relative">
                                <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border bg-gray-50 border-gray-300 rounded appearance-none">
                                  {Object.entries(actionTypeConfig).map(([key, config]) => <option key={key} value={key}>{config.name}</option>)}
                                </select>
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">{formData.type ? actionTypeConfig[formData.type].icon : ''}</span>
                            </div>
                        </div>
                         
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-sm text-gray-500">Date de début</label><input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="p-2 border bg-gray-50 border-gray-300 rounded w-full" /></div>
                          <div><label className="text-sm text-gray-500">Date de fin</label><input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className="p-2 border bg-gray-50 border-gray-300 rounded w-full" /></div>
                        </div>
                        
                        <div className="col-span-2 p-4 border border-gray-200 rounded-lg">
                            <div className="grid grid-cols-2 gap-6 items-center">
                                <div>
                                    <div><label>Effort (Complexité): {formData.effort}</label><input type="range" name="effort" min="1" max="10" value={formData.effort} onChange={handleChange} className="w-full" /></div>
                                    <div className="mt-2"><label>Gain (Impact): {formData.gain}</label><input type="range" name="gain" min="1" max="10" value={formData.gain} onChange={handleChange} className="w-full" /></div>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">Position dans la matrice :</p>
                                    <div className={`mt-2 p-2 rounded-lg font-semibold transition-colors ${currentQuadrant.color}`}>{currentQuadrant.name}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300">Annuler</button>
                        <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">Sauvegarder</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- VUES SPÉCIFIQUES (Améliorées avec Drag & Drop) ---
const HomeView = ({ actions, setActions, onCardClick }) => {
    const [draggedItem, setDraggedItem] = useState<Action | null>(null);
    const columns = useMemo(() => {
        const grouped: { [key in ActionType]: Action[] } = { securisation: [], simple: [], 'poka-yoke': [] };
        actions.forEach(action => { if (grouped[action.type]) grouped[action.type].push(action); });
        return grouped;
    }, [actions]);

    const handleDrop = (e: React.DragEvent, targetType: ActionType) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
        if (!draggedItem || draggedItem.type === targetType) return;
        setActions(actions.map(act => act.id === draggedItem.id ? { ...act, type: targetType } : act), { ...draggedItem, type: targetType });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full" onDragEnd={() => setDraggedItem(null)}>
            {Object.entries(columns).map(([type, items]) => (
                <div key={type} className="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4 transition-colors"
                     onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, type as ActionType)}
                     onDragEnter={(e) => e.currentTarget.classList.add('bg-blue-50', 'border-blue-300')}
                     onDragLeave={(e) => e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300')}>
                    <h2 className={`font-bold mb-4 px-1 flex items-center gap-2 ${actionTypeConfig[type].textColor}`}>
                        <span className="text-lg">{actionTypeConfig[type].icon}</span> {actionTypeConfig[type].name}
                        <span className="text-sm font-normal text-gray-500 ml-auto bg-gray-200 rounded-full px-2">{items.length}</span>
                    </h2>
                    <div className="overflow-y-auto flex-1 pr-2">{items.map(item => <ActionCard key={item.id} action={item} onDragStart={(e, i) => setDraggedItem(i)} onClick={onCardClick} />)}</div>
                </div>
            ))}
        </div>
    );
};

const KanbanByPersonView = ({ actions, setActions, onCardClick }) => {
    const [selectedUser, setSelectedUser] = useState(mockUsers[0].id);
    const [draggedItem, setDraggedItem] = useState<Action | null>(null);
    
    const filteredActions = useMemo(() => actions.filter(a => a.assignee_ids.includes(selectedUser)), [actions, selectedUser]);
    const columns = useMemo(() => {
        const grouped: { [key in ActionStatus]: Action[] } = { 'À faire': [], 'En cours': [], 'Terminé': [] };
        filteredActions.forEach(action => { if (grouped[action.status]) grouped[action.status].push(action); });
        return grouped;
    }, [filteredActions]);

    const handleDrop = (e: React.DragEvent, targetStatus: ActionStatus) => {
        e.preventDefault(); 
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
        if (!draggedItem || draggedItem.status === targetStatus) return;
        setActions(actions.map(act => act.id === draggedItem.id ? { ...act, status: targetStatus } : act), { ...draggedItem, status: targetStatus });
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="mb-4 flex-shrink-0">
                <select onChange={(e) => setSelectedUser(e.target.value)} value={selectedUser} className="p-2 border bg-white border-gray-300 rounded shadow-sm text-gray-800">
                    {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0" onDragEnd={() => setDraggedItem(null)}>
                {Object.entries(columns).map(([status, items]) => (
                    <div key={status} className="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4 transition-colors" 
                         onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, status as ActionStatus)} 
                         onDragEnter={(e) => e.currentTarget.classList.add('bg-blue-50', 'border-blue-300')} 
                         onDragLeave={(e) => e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300')}>
                        <h2 className="font-bold text-gray-700 mb-4 px-1">{status} <span className="text-sm font-normal text-gray-500">{items.length}</span></h2>
                        <div className="overflow-y-auto flex-1 pr-2">{items.map(item => <ActionCard key={item.id} action={item} onDragStart={(e, i) => setDraggedItem(i)} onClick={onCardClick} />)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MatrixView = ({ actions, setActions, onCardClick }) => {
    const [draggedItem, setDraggedItem] = useState<Action | null>(null);
    const matrix = useMemo(() => {
        const q = { 'quick-wins': [], 'major-projects': [], 'fill-ins': [], 'thankless-tasks': [] };
        actions.forEach(a => {
            if (a.gain >= 5 && a.effort < 5) q['quick-wins'].push(a);
            else if (a.gain >= 5 && a.effort >= 5) q['major-projects'].push(a);
            else if (a.gain < 5 && a.effort < 5) q['fill-ins'].push(a);
            else q['thankless-tasks'].push(a);
        });
        return q;
    }, [actions]);

    const handleDrop = (e, quadrant) => {
        e.preventDefault();
        e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
        if(!draggedItem) return;
        const newValues = {
            'quick-wins': { gain: 8, effort: 3 },
            'major-projects': { gain: 8, effort: 8 },
            'fill-ins': { gain: 3, effort: 3 },
            'thankless-tasks': { gain: 3, effort: 8 }
        }[quadrant];
        setActions(actions.map(a => a.id === draggedItem.id ? {...a, ...newValues} : a), {...draggedItem, ...newValues});
    };

    const Quadrant = ({ title, emoji, items, bgColor, quadrantName }) => (
        <div className={`rounded-lg p-4 flex flex-col ${bgColor} transition-transform duration-200 hover:scale-105`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, quadrantName)}
            onDragEnter={(e) => e.currentTarget.classList.add('ring-2', 'ring-blue-400')}
            onDragLeave={(e) => e.currentTarget.classList.remove('ring-2', 'ring-blue-400')}>
            <h3 className="font-bold text-center mb-2 text-slate-800">{title} <span className="text-xl">{emoji}</span></h3>
            <div className="matrix-quadrant bg-white bg-opacity-40 rounded p-2 overflow-y-auto flex-grow">
                {items.map(action => <ActionCard key={action.id} action={action} onDragStart={(e, i) => setDraggedItem(i)} onClick={onCardClick} />)}
            </div>
        </div>
    );
    return (
        <div className="relative p-8 bg-white border border-gray-200 rounded-lg shadow-inner h-full flex flex-col" onDragEnd={() => setDraggedItem(null)}>
            <div className="absolute top-1/2 -left-6 -translate-y-1/2 -rotate-90 font-bold text-gray-500 tracking-wider">GAIN</div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-bold text-gray-500 tracking-wider">EFFORT</div>
            <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1">
                <Quadrant title="Quick Win" emoji="🔥" items={matrix['quick-wins']} bgColor="bg-green-200" quadrantName="quick-wins" />
                <Quadrant title="Gros projet" emoji="🗓️" items={matrix['major-projects']} bgColor="bg-blue-200" quadrantName="major-projects" />
                <Quadrant title="Tâche de fond" emoji="👌" items={matrix['fill-ins']} bgColor="bg-yellow-200" quadrantName="fill-ins" />
                <Quadrant title="À éviter" emoji="🤔" items={matrix['thankless-tasks']} bgColor="bg-red-200" quadrantName="thankless-tasks" />
            </div>
        </div>
    );
};

const GanttView = ({ actions, onCardClick }) => {
    if (actions.length === 0) return <div className="text-center p-8 text-gray-500">Aucune action à afficher.</div>;
    
    const sortedActions = [...actions].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const startDate = new Date(Math.min(...sortedActions.map(a => new Date(a.start_date).getTime())));
    const endDate = new Date(Math.max(...sortedActions.map(a => new Date(a.due_date).getTime())));
    startDate.setDate(startDate.getDate() - 2);
    endDate.setDate(endDate.getDate() + 2);

    const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const getDaysFromStart = (date) => (new Date(date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const todayPosition = (getDaysFromStart(new Date()) / totalDays) * 100;

    return (
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-md overflow-x-auto h-full">
            <div className="relative pt-4" style={{ minWidth: '800px' }}>
                {todayPosition >= 0 && todayPosition <= 100 &&
                    <div className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed z-10" style={{ left: `${todayPosition}%` }}>
                        <span className="absolute -top-5 -translate-x-1/2 text-xs bg-red-500 text-white px-1 rounded">Auj.</span>
                    </div>
                }
                <div className="space-y-3">
                    {sortedActions.map((action) => {
                        const left = (getDaysFromStart(action.start_date) / totalDays) * 100;
                        const duration = Math.max(1, getDaysFromStart(action.due_date) - getDaysFromStart(action.start_date));
                        const width = (duration / totalDays) * 100;
                        const config = actionTypeConfig[action.type];
                        const leader = mockUsers.find(u => u.id === action.leader_id);
                        const tooltipContent = `<strong>${action.title}</strong><br>Du ${new Date(action.start_date).toLocaleDateString()} au ${new Date(action.due_date).toLocaleDateString()}<br>Leader: ${leader?.name || 'N/A'}`;
                        
                        return (
                            <div key={action.id} className="w-full h-10 flex items-center">
                                <div className="w-1/4 pr-4 text-sm font-medium truncate text-gray-700">{action.title}</div>
                                <div className="w-3/4 h-full relative bg-gray-200 rounded">
                                    <Tooltip content={tooltipContent}>
                                        <div onClick={() => onCardClick(action)} className={`absolute h-3/4 top-1/2 -translate-y-1/2 rounded ${config.barBg} cursor-pointer`} style={{ left: `${left}%`, width: `${width}%` }}></div>
                                    </Tooltip>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL (Nouvelle structure) ---
export const PlanActionsEditor: React.FC<PlanActionsEditorProps> = ({ module, onClose }) => {
  const [view, setView] = useState('home');
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setActions(mockData);
    setLoading(false);
  }, [module]);

  const handleSaveAction = (actionData: Action) => {
      let updatedActions;
      if (actionData.id && actions.find(a => a.id === actionData.id)) {
          updatedActions = actions.map(a => a.id === actionData.id ? actionData : a);
      } else {
          updatedActions = [...actions, { ...actionData, id: Date.now().toString() }];
      }
      setActions(updatedActions);
      setIsActionModalOpen(false); 
      setEditingAction(null);
  };
  
  const handleSetActions = (updatedActions: Action[], changedItem: Action) => {
      setActions(updatedActions);
  };
  
  const openActionModal = (action: Action | null = null) => { 
      setEditingAction(action); 
      setIsActionModalOpen(true); 
  };

  const TabButton = ({ active, onClick, children, icon }: { active: boolean, onClick: () => void, children: React.ReactNode, icon: React.ReactNode }) => (
    <button onClick={onClick} className={`py-2 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${active ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
      {icon} {children}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-8 z-50">
      <div className="bg-white rounded-2xl shadow-xl flex flex-col w-full h-full overflow-hidden">
        
        <header className="flex items-center justify-between p-4 sm:p-6 border-b bg-white flex-shrink-0">
          <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <GanttChartSquare className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Plan d'Actions</h1>
          </div>
          <div className="flex items-center space-x-3">
              <button onClick={() => setShowHelp(true)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center" title="Aide">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center" title="Fermer">
                  <X className="w-5 h-5 text-gray-600" />
              </button>
          </div>
        </header>

        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden p-4 sm:p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4 flex-shrink-0">
                <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
                    <TabButton active={view === 'home'} onClick={() => setView('home')} icon={<Layers size={16} />}>Par Type</TabButton>
                    <TabButton active={view === 'kanban'} onClick={() => setView('kanban')} icon={<UserIcon size={16} />}>Par Personne</TabButton>
                    <TabButton active={view === 'matrix'} onClick={() => setView('matrix')} icon={<Table size={16} />}>Matrice</TabButton>
                    <TabButton active={view === 'gantt'} onClick={() => setView('gantt')} icon={<GanttChartSquare size={16} />}>Gantt</TabButton>
                </div>
                <button onClick={() => openActionModal()} className="py-2 px-4 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 flex items-center gap-2">
                    <Plus size={16} /> Nouvelle Action
                </button>
            </div>
            
            <main className="flex-1 overflow-y-auto min-h-0">
                {loading ? <div className="text-center p-8">Chargement...</div> : (
                    <>
                        {view === 'home' && <HomeView actions={actions} setActions={handleSetActions} onCardClick={openActionModal} />}
                        {view === 'kanban' && <KanbanByPersonView actions={actions} setActions={handleSetActions} onCardClick={openActionModal} />}
                        {view === 'matrix' && <MatrixView actions={actions} setActions={handleSetActions} onCardClick={openActionModal} />}
                        {view === 'gantt' && <GanttView actions={actions} onCardClick={openActionModal} />}
                    </>
                )}
            </main>
        </div>

        <ActionModal 
          isOpen={isActionModalOpen} 
          onClose={() => { setIsActionModalOpen(false); setEditingAction(null); }}
          onSave={handleSaveAction}
          action={editingAction}
        />

        {showHelp && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
                 <div className="flex items-start">
                    <div className="p-2 bg-blue-100 rounded-full mr-4">
                        <HelpCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aide : Le Plan d'Actions</h3>
                        <div className="text-sm text-gray-600 space-y-3">
                           <p>Le Plan d'Actions est le cœur de votre projet Kaizen. Il vous permet de transformer les idées en tâches concrètes et de suivre leur progression.</p>
                           <ul className="list-disc list-inside space-y-2 pl-2">
                               <li><strong className="text-blue-600">Par Type :</strong> Organisez vos actions en catégories (<span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">Simple 💡</span>, <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">Sécurisation 🛡️</span>, <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">Poka-Yoke 🧩</span>).</li>
                               <li><strong className="text-blue-600">Par Personne :</strong> Suivez l'avancement des tâches pour chaque membre de l'équipe avec un Kanban.</li>
                               <li><strong className="text-blue-600">Matrice :</strong> Priorisez les actions en évaluant leur Gain et leur Effort.</li>
                               <li><strong className="text-blue-600">Gantt :</strong> Visualisez le planning complet de vos actions dans le temps.</li>
                           </ul>
                        </div>
                    </div>
                 </div>
                 <div className="flex justify-end mt-6">
                    <button onClick={() => setShowHelp(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Compris</button>
                 </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};