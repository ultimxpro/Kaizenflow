
// src/components/project/editors/PlanActionsEditor.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { A3Module, User } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { useAuth } from '../../../contexts/AuthContext';
import { HelpCircle, X, Layers, User as UserIcon, Table, GanttChartSquare, Plus, Users, Check, Calendar, Tag, Activity } from 'lucide-react';

// --- TYPES & INTERFACES ---
type ActionType = 'simple' | 'securisation' | 'poka-yoke';
type ActionStatus = 'À faire' | 'Fait';

interface Action {
    id: string;
    title: string;
    description?: string;
    status: ActionStatus;
    due_date: string;
    start_date: string;
    type: ActionType;
    assignee_ids: string[];
    leader_id?: string;
    effort: number;
    gain: number;
}

// --- PROPS DU COMPOSANT ---
interface PlanActionsEditorProps {
    module: A3Module;
    onClose: () => void;
}

// --- CONFIGURATION VISUELLE ---
const actionTypeConfig = {
    simple: { name: 'Action Simple', icon: '💡', color: 'border-blue-500', textColor: 'text-blue-600', barBg: 'bg-blue-500', a3Color: 'bg-blue-100 text-blue-800', lightBg: 'bg-blue-50' },
    securisation: { name: 'Sécurisation', icon: '🛡️', color: 'border-red-500', textColor: 'text-red-600', barBg: 'bg-red-500', a3Color: 'bg-red-100 text-red-800', lightBg: 'bg-red-50' },
    'poka-yoke': { name: 'Poka-Yoke', icon: '🧩', color: 'border-yellow-500', textColor: 'text-yellow-600', barBg: 'bg-yellow-500', a3Color: 'bg-yellow-100 text-yellow-800', lightBg: 'bg-yellow-50' },
};


// --- COMPOSANTS UTILITAIRES ---
const Tooltip = ({ content, children }: { content: string, children: React.ReactNode }) => (
    <div className="relative group">
        {children}
        <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"
             dangerouslySetInnerHTML={{ __html: content }}
        />
    </div>
);

const DateIndicator = ({ dueDate, status }: { dueDate: string, status: ActionStatus }) => {
    if (status === 'Fait') {
        return (
            <div className="flex items-center text-xs font-semibold text-green-600">
                <Check size={14} className="mr-1" />
                <span>Terminé</span>
            </div>
        );
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let color = 'text-gray-500';
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

const AssigneeAvatars = ({ assignee_ids, users }: { assignee_ids: string[], users: User[] }) => (
    <div className="flex items-center -space-x-2">
        {assignee_ids.map(id => {
            const user = users.find(u => u.id === id);
            if (!user) return null;
            return (
                <Tooltip key={id} content={user.nom}>
                    <img
                        src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`}
                        alt={user.nom}
                        className="w-6 h-6 rounded-full border-2 border-white"
                    />
                </Tooltip>
            );
        })}
    </div>
);


const ActionCard = ({ action, users, onDragStart, onClick }: { action: Action, users: User[], onDragStart: (e: React.DragEvent, action: Action) => void, onClick: (action: Action) => void }) => {
    const config = actionTypeConfig[action.type];

    return (
        <div
            draggable="true"
            onDragStart={(e) => onDragStart(e, action)}
            onClick={() => onClick(action)}
            className={`bg-white border border-gray-200 rounded-lg shadow-sm mb-3 border-l-4 ${config.color} p-3 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all`}
        >
            <div className="flex justify-between items-start mb-2">
                <AssigneeAvatars assignee_ids={action.assignee_ids} users={users} />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">{action.title}</h3>
            <div className="mt-3">
                <DateIndicator dueDate={action.due_date} status={action.status} />
            </div>
        </div>
    );
};

const PDCASection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            {icon} <span className="ml-2">{title}</span>
        </h3>
        {children}
    </div>
);

// --- FORMULAIRE D'ACTION ---
const ActionModal = React.memo(({ isOpen, onClose, onSave, action, projectMembers }: { isOpen: boolean, onClose: () => void, onSave: (action: Action) => void, action: Action | null, projectMembers: User[]}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState<Partial<Action>>({});
    const [duration, setDuration] = useState(1);
    const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('days');

    useEffect(() => {
        const initialData = action || { title: '', description: '', assignee_ids: [], status: 'À faire', type: 'simple', due_date: '', start_date: new Date().toISOString().split('T')[0], effort: 5, gain: 5 };
        setFormData(initialData);

        if(action && action.start_date && action.due_date) {
            const start = new Date(action.start_date);
            const end = new Date(action.due_date);
            const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays > 0 && diffDays % 30 === 0) {
                setDuration(diffDays / 30);
                setDurationUnit('months');
            } else if (diffDays > 0 && diffDays % 7 === 0) {
                setDuration(diffDays / 7);
                setDurationUnit('weeks');
            } else {
                setDuration(Math.max(1, diffDays));
                setDurationUnit('days');
            }
        }
    }, [action]);

    useEffect(() => {
        if (!formData.start_date) return;
        const startDate = new Date(formData.start_date);
        let endDate = new Date(startDate);
        const newDuration = Math.max(1, duration);

        if (durationUnit === 'days') {
            endDate.setDate(startDate.getDate() + newDuration);
        } else if (durationUnit === 'weeks') {
            endDate.setDate(startDate.getDate() + newDuration * 7);
        } else if (durationUnit === 'months') {
            endDate.setMonth(startDate.getMonth() + newDuration);
        }
        setFormData(prev => ({ ...prev, due_date: endDate.toISOString().split('T')[0] }));
    }, [formData.start_date, duration, durationUnit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const handleRangeChange = (name: 'effort' | 'gain', value: string) => {
        setFormData(p => ({ ...p, [name]: parseInt(value) }));
    };

    const toggleAssignee = (userId: string) => {
        setFormData(prev => {
            const currentAssignees = prev.assignee_ids || [];
            const newAssignees = currentAssignees.includes(userId) ? currentAssignees.filter(id => id !== userId) : [...currentAssignees, userId];
            // La logique du leader est simplifiée
            let newLeaderId = newAssignees.includes(prev.leader_id) ? prev.leader_id : (newAssignees[0] || undefined);
            if(newAssignees.length === 0) newLeaderId = undefined;
            return { ...prev, assignee_ids: newAssignees, leader_id: newLeaderId };
        });
    };

    const getQuadrant = (gain: number, effort: number) => {
        if (gain >= 5 && effort < 5) return { name: "Quick Win 🔥", color: "bg-green-200" };
        if (gain >= 5 && effort >= 5) return { name: "Gros projet 🗓️", color: "bg-blue-200" };
        if (gain < 5 && effort < 5) return { name: "Tâche de fond 👌", color: "bg-yellow-200" };
        return { name: "À éviter 🤔", color: "bg-red-200" };
    };
    const currentQuadrant = getQuadrant(formData.gain || 5, formData.effort || 5);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-3xl text-gray-800 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{action ? "Modifier l'action" : "Créer une action"}</h2>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData as Action); }} className="space-y-6">
                    <PDCASection title="Description" icon={<Layers size={20} />}>
                        <div className="space-y-4">
                            <input name="title" value={formData.title || ''} onChange={handleChange} placeholder="Titre de l'action" className="p-2 w-full border bg-white border-gray-300 rounded" required />
                            <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Description détaillée de l'action..." className="p-2 w-full border bg-white border-gray-300 rounded h-24"></textarea>
                        </div>
                    </PDCASection>

                    <PDCASection title="Équipe" icon={<Users size={20} />}>
                        <div className="flex flex-wrap gap-4">
                            {projectMembers.map(user => {
                                const isSelected = (formData.assignee_ids || []).includes(user.id);
                                return (
                                    <div key={user.id} className="flex flex-col items-center">
                                        <div
                                            onClick={() => toggleAssignee(user.id)}
                                            className={`p-1 rounded-full cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-200'}`}
                                        >
                                            <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.nom} className="w-14 h-14 rounded-full" />
                                        </div>
                                        <span className="text-xs mt-1 font-semibold text-gray-700">{user.nom}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </PDCASection>

                    <PDCASection title="Détails" icon={<Table size={20} />}>
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-semibold text-gray-600 flex items-center mb-2"><Activity size={14} className="mr-2"/> Statut</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setFormData(p => ({...p, status: 'À faire'}))} className={`py-2 px-4 rounded-lg flex-1 ${formData.status === 'À faire' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>À faire</button>
                                    <button type="button" onClick={() => setFormData(p => ({...p, status: 'Fait'}))} className={`py-2 px-4 rounded-lg flex-1 ${formData.status === 'Fait' ? 'bg-green-600 text-white' : 'bg-white border'}`}>Fait</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 flex items-center mb-2"><Tag size={14} className="mr-2"/> Type d'action</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(actionTypeConfig).map(([key, config]) => (
                                        <button type="button" key={key} onClick={() => setFormData(p => ({...p, type: key as ActionType}))} className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 ${formData.type === key ? `${config.a3Color} font-bold ring-2 ring-current` : 'bg-white border'}`}>
                                            {config.icon} {config.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600 flex items-center mb-2"><Calendar size={14} className="mr-2"/> Échéance</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500">Date de début</label>
                                        <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Durée</label>
                                        <div className="flex">
                                            <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 1)} min="1" className="p-2 border bg-white border-gray-300 rounded-l w-1/2"/>
                                            <select value={durationUnit} onChange={e => setDurationUnit(e.target.value as any)} className="p-2 border bg-white border-gray-300 rounded-r w-1/2">
                                                <option value="days">Jours</option>
                                                <option value="weeks">Semaines</option>
                                                <option value="months">Mois</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                {formData.due_date && <p className="text-xs text-gray-500 mt-2">Date de fin prévisionnelle : <span className="font-semibold">{new Date(formData.due_date).toLocaleDateString('fr-FR')}</span></p>}
                            </div>
                        </div>
                    </PDCASection>

                    <PDCASection title="Priorisation" icon={<GanttChartSquare size={20} />}>
                        <div className="grid grid-cols-2 gap-6 items-center">
                            <div>
                                <div><label>Effort (Complexité): {formData.effort}</label><input type="range" name="effort" min="1" max="10" value={formData.effort || 5} onChange={e => handleRangeChange('effort', e.target.value)} className="w-full" /></div>
                                <div className="mt-2"><label>Gain (Impact): {formData.gain}</label><input type="range" name="gain" min="1" max="10" value={formData.gain || 5} onChange={e => handleRangeChange('gain', e.target.value)} className="w-full" /></div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-500">Position dans la matrice :</p>
                                <div className={`mt-2 p-2 rounded-lg font-semibold transition-colors ${currentQuadrant.color}`}>{currentQuadrant.name}</div>
                            </div>
                        </div>
                    </PDCASection>

                    <div className="mt-8 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Annuler</button>
                        <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Sauvegarder l'Action</button>
                    </div>
                </form>
            </div>
        </div>
    );
});


// --- VUES SPÉCIFIQUES ---
const HomeView = ({ actions, setActions, users, onCardClick }: { actions: Action[], setActions: (actions: Action[], changedItem: Action) => void, users: User[], onCardClick: (action: Action) => void }) => {
    const [draggedItem, setDraggedItem] = useState<Action | null>(null);
    const columns = useMemo(() => {
        const grouped: { [key in ActionType]: Action[] } = { securisation: [], simple: [], 'poka-yoke': [] };
        actions.forEach(action => { if (grouped[action.type]) grouped[action.type].push(action); });
        return grouped;
    }, [actions]);

    const handleDrop = (e: React.DragEvent, targetType: ActionType) => {
        e.preventDefault();
        (e.currentTarget as HTMLDivElement).classList.remove('bg-blue-50', 'border-blue-300');
        if (!draggedItem || draggedItem.type === targetType) return;
        setActions(actions.map(act => act.id === draggedItem.id ? { ...act, type: targetType } : act), { ...draggedItem, type: targetType });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full" onDragEnd={() => setDraggedItem(null)}>
            {Object.entries(columns).map(([type, items]) => {
                const config = actionTypeConfig[type as ActionType];
                return (
                    <div key={type} className={`flex flex-col rounded-lg transition-colors ${config.lightBg} h-full overflow-hidden`}
                         onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, type as ActionType)}
                         onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('bg-blue-50', 'border-blue-300')}
                         onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('bg-blue-50', 'border-blue-300')}>
                        <h2 className={`font-bold p-4 flex items-center gap-2 ${config.textColor}`}>
                            <span className="text-lg">{config.icon}</span> {config.name}
                            <span className="text-sm font-normal text-gray-500 ml-auto bg-gray-200 rounded-full px-2">{items.length}</span>
                        </h2>
                        <div className="overflow-y-auto flex-1 px-4 pb-2">
                            {items.map(item => <ActionCard key={item.id} action={item} users={users} onDragStart={(e, action) => setDraggedItem(action)} onClick={onCardClick} />)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const KanbanByPersonView = ({ actions, setActions, users, onCardClick }: { actions: Action[], setActions: (actions: Action[], changedItem: Action) => void, users: User[], onCardClick: (action: Action) => void }) => {
    const [selectedUser, setSelectedUser] = useState(users[0]?.id || '');
    const [draggedItem, setDraggedItem] = useState<Action | null>(null);

    const filteredActions = useMemo(() => actions.filter(a => a.assignee_ids.includes(selectedUser)), [actions, selectedUser]);
    const columns = useMemo(() => {
        const grouped: { [key in ActionStatus]: Action[] } = { 'À faire': [], 'Fait': [] };
        filteredActions.forEach(action => { if (grouped[action.status]) grouped[action.status].push(action); });
        return grouped;
    }, [filteredActions]);

    const handleDrop = (e: React.DragEvent, targetStatus: ActionStatus) => {
        e.preventDefault();
        (e.currentTarget as HTMLDivElement).classList.remove('bg-blue-50', 'ring-2', 'ring-blue-400', 'scale-105');
        if (!draggedItem || draggedItem.status === targetStatus) return;
        setActions(actions.map(act => act.id === draggedItem.id ? { ...act, status: targetStatus } : act), { ...draggedItem, status: targetStatus });
    };

    const selectedUserData = users.find(u => u.id === selectedUser);

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header avec sélecteur utilisateur amélioré */}
            <div className="mb-6 flex-shrink-0 flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100 flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        {selectedUserData && (
                            <img 
                                src={selectedUserData.avatarUrl || `https://i.pravatar.cc/150?u=${selectedUserData.id}`} 
                                alt={selectedUserData.nom} 
                                className="w-10 h-10 rounded-full border-2 border-blue-200"
                            />
                        )}
                        <div>
                            <label htmlFor="user-select" className="font-semibold text-gray-700 block">Kanban personnel</label>
                            <p className="text-xs text-gray-500">Sélectionnez un membre de l'équipe</p>
                        </div>
                    </div>
                    <select 
                        id="user-select" 
                        onChange={(e) => setSelectedUser(e.target.value)} 
                        value={selectedUser} 
                        className="p-3 border bg-white border-gray-300 rounded-lg shadow-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-48"
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
                    </select>
                </div>
            </div>
            
            {/* Statistiques rapides */}
            <div className="mb-4 flex-shrink-0 flex justify-center gap-4">
                <div className="bg-orange-100 border border-orange-200 rounded-lg px-4 py-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium text-orange-800">{columns['À faire'].length} à faire</span>
                </div>
                <div className="bg-green-100 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">{columns['Fait'].length} terminées</span>
                </div>
            </div>

            {/* Colonnes Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0" onDragEnd={() => setDraggedItem(null)}>
                {(Object.entries(columns) as [ActionStatus, Action[]][]).map(([status, items]) => (
                    <div 
                        key={status} 
                        className={`flex flex-col rounded-xl transition-all duration-300 h-full overflow-hidden shadow-lg ${
                            status === 'À faire' 
                                ? 'bg-gradient-to-b from-orange-50 to-orange-100 border-2 border-orange-200' 
                                : 'bg-gradient-to-b from-green-50 to-green-100 border-2 border-green-200'
                        }`}
                         onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, status)}
                        onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('bg-blue-50', 'ring-2', 'ring-blue-400', 'scale-105')}
                        onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('bg-blue-50', 'ring-2', 'ring-blue-400', 'scale-105')}
                    >
                        {/* Header de colonne */}
                        <div className={`p-4 border-b-2 flex-shrink-0 ${
                            status === 'À faire' 
                                ? 'border-orange-300 bg-orange-200' 
                                : 'border-green-300 bg-green-200'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        status === 'À faire' ? 'bg-orange-500' : 'bg-green-500'
                                    }`}>
                                        {status === 'À faire' ? '⏳' : '✅'}
                                    </div>
                                    <h2 className={`font-bold text-lg ${
                                        status === 'À faire' ? 'text-orange-800' : 'text-green-800'
                                    }`}>
                                        {status}
                                    </h2>
                                </div>
                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                    status === 'À faire' 
                                        ? 'bg-orange-300 text-orange-800' 
                                        : 'bg-green-300 text-green-800'
                                }`}>
                                    {items.length}
                                </span>
                            </div>
                        </div>
                        
                        {/* Zone de contenu avec défilement */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-0">
                            {items.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                                        status === 'À faire' ? 'bg-orange-200' : 'bg-green-200'
                                    }`}>
                                        {status === 'À faire' ? '📝' : '🎉'}
                                    </div>
                                    <p className={`text-sm font-medium ${
                                        status === 'À faire' ? 'text-orange-600' : 'text-green-600'
                                    }`}>
                                        {status === 'À faire' ? 'Aucune tâche en attente' : 'Aucune tâche terminée'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {status === 'À faire' ? 'Les nouvelles tâches apparaîtront ici' : 'Glissez les tâches terminées ici'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map(item => (
                                        <ActionCard 
                                            key={item.id} 
                                            action={item} 
                                            users={users} 
                                            onDragStart={(e, action) => setDraggedItem(action)} 
                                            onClick={onCardClick} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Footer avec progression */}
            <div className="mt-4 flex-shrink-0 bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression de {selectedUserData?.nom}</span>
                    <span className="text-sm font-bold text-gray-900">
                        {filteredActions.length > 0 ? Math.round((columns['Fait'].length / filteredActions.length) * 100) : 0}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ 
                            width: `${filteredActions.length > 0 ? (columns['Fait'].length / filteredActions.length) * 100 : 0}%` 
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

const MatrixView = ({ actions, setActions, users, onCardClick }: { actions: Action[], setActions: (actions: Action[], changedItem: Action) => void, users: User[], onCardClick: (action: Action) => void }) => {
    const [draggedItem, setDraggedItem] = useState<Action | null>(null);
    const matrix = useMemo(() => {
        const q: { [key: string]: Action[] } = { 'quick-wins': [], 'major-projects': [], 'fill-ins': [], 'thankless-tasks': [] };
        actions.forEach(a => {
            if (a.gain >= 5 && a.effort < 5) q['quick-wins'].push(a);
            else if (a.gain >= 5 && a.effort >= 5) q['major-projects'].push(a);
            else if (a.gain < 5 && a.effort < 5) q['fill-ins'].push(a);
            else q['thankless-tasks'].push(a);
        });
        return q;
    }, [actions]);

    const handleDrop = (e: React.DragEvent, quadrant: string) => {
        e.preventDefault();
        (e.currentTarget as HTMLDivElement).classList.remove('ring-2', 'ring-blue-400');
        if(!draggedItem) return;
        const newValues = {
            'quick-wins': { gain: 8, effort: 3 },
            'major-projects': { gain: 8, effort: 8 },
            'fill-ins': { gain: 3, effort: 3 },
            'thankless-tasks': { gain: 3, effort: 8 }
        }[quadrant] || { gain: 5, effort: 5 };
        setActions(actions.map(a => a.id === draggedItem.id ? {...a, ...newValues} : a), {...draggedItem, ...newValues});
    };

    const Quadrant = ({ title, emoji, items, bgColor, quadrantName }: { title: string, emoji: string, items: Action[], bgColor: string, quadrantName: string }) => (
        <div className={`rounded-lg p-2 flex flex-col ${bgColor}`}
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => handleDrop(e, quadrantName)}
             onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('ring-2', 'ring-blue-400')}
             onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('ring-2', 'ring-blue-400')}>
            <h3 className="font-bold text-center mb-2 text-slate-800 text-sm">{title} <span className="text-lg">{emoji}</span></h3>
            <div className="matrix-quadrant bg-white bg-opacity-40 rounded p-2 overflow-y-auto flex-grow min-h-0">
                {items.map(action => <ActionCard key={action.id} action={action} users={users} onDragStart={(e, act) => setDraggedItem(act)} onClick={onCardClick} />)}
            </div>
        </div>
    );
    return (
        <div className="relative p-8 bg-white border border-gray-200 rounded-lg shadow-inner h-full flex flex-col overflow-hidden" onDragEnd={() => setDraggedItem(null)}>
            <div className="absolute top-1/2 left-0 -translate-y-1/2 -rotate-90 font-bold text-gray-500 tracking-wider">GAIN</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 font-bold text-gray-500 tracking-wider">EFFORT</div>
            <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1 pl-6 pt-6 min-h-0">
                <Quadrant title="Quick Win" emoji="🔥" items={matrix['quick-wins']} bgColor="bg-green-200" quadrantName="quick-wins" />
                <Quadrant title="Gros projet" emoji="🗓️" items={matrix['major-projects']} bgColor="bg-blue-200" quadrantName="major-projects" />
                <Quadrant title="Tâche de fond" emoji="👌" items={matrix['fill-ins']} bgColor="bg-yellow-200" quadrantName="fill-ins" />
                <Quadrant title="À éviter" emoji="🤔" items={matrix['thankless-tasks']} bgColor="bg-red-200" quadrantName="thankless-tasks" />
            </div>
        </div>
    );
};

const GanttView = ({ actions, users, onCardClick }: { actions: Action[], users: User[], onCardClick: (action: Action) => void }) => {
    const [scale, setScale] = useState<'day' | 'week' | 'month'>('day');
    const [dragState, setDragState] = useState<{
        actionId: string | null;
        mode: 'move' | 'resize-start' | 'resize-end' | null;
        startX: number;
        originalStart: Date;
        originalEnd: Date;
    }>({
        actionId: null,
        mode: null,
        startX: 0,
        originalStart: new Date(),
        originalEnd: new Date()
    });
    
    if (actions.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <GanttChartSquare className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Aucune action planifiée</h3>
                <p className="text-sm">Créez des actions avec des dates pour voir le diagramme de Gantt</p>
            </div>
        );
    }

    const validActions = actions.filter(a => 
        a.start_date && a.due_date && 
        !isNaN(new Date(a.start_date).getTime()) && 
        !isNaN(new Date(a.due_date).getTime())
    ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    
    if (validActions.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <Calendar className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Dates manquantes</h3>
                <p className="text-sm">Ajoutez des dates de début et de fin aux actions pour voir le Gantt</p>
            </div>
        );
    }

    // Calcul des dates limites
    const minTime = Math.min(...validActions.map(a => new Date(a.start_date).getTime()));
    const maxTime = Math.max(...validActions.map(a => new Date(a.due_date).getTime()));
    
    const startDate = new Date(minTime);
    const endDate = new Date(maxTime);
    
    // Ajustement des dates selon l'échelle
    if (scale === 'week') {
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Début de semaine
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()) + 7); // Fin de semaine + 1 semaine
    } else if (scale === 'month') {
        startDate.setDate(1); // Début du mois
        endDate.setMonth(endDate.getMonth() + 1, 1); // Début du mois suivant
    } else {
        startDate.setDate(startDate.getDate() - 3); // 3 jours avant
        endDate.setDate(endDate.getDate() + 3); // 3 jours après
    }

    // Fonction pour obtenir le numéro de semaine française (ISO 8601)
    const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // Fonction pour obtenir le lundi d'une semaine donnée
    const getMondayOfWeek = (year: number, week: number): Date => {
        const jan4 = new Date(year, 0, 4);
        const jan4Day = jan4.getDay() || 7;
        const mondayOfWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
        return new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000);
    };

    // Calcul des unités et largeur
    const getTimeUnits = () => {
        const units = [];
        let current = new Date(startDate);
        
        while (current <= endDate) {
            units.push(new Date(current));
            
            if (scale === 'day') {
                current.setDate(current.getDate() + 1);
            } else if (scale === 'week') {
                current.setDate(current.getDate() + 7);
            } else {
                current.setMonth(current.getMonth() + 1);
            }
        }
        return units;
    };

    const timeUnits = getTimeUnits();
    const unitWidth = scale === 'day' ? 40 : scale === 'week' ? 80 : 120;
    const totalWidth = timeUnits.length * unitWidth;

    const getPositionAndWidth = (action: Action) => {
        const actionStart = new Date(action.start_date);
        const actionEnd = new Date(action.due_date);
        
        let startPos = 0;
        let endPos = 0;
        
        if (scale === 'day') {
            startPos = (actionStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            endPos = (actionEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        } else if (scale === 'week') {
            startPos = (actionStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
            endPos = (actionEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
        } else {
            const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
            const actionStartMonth = actionStart.getFullYear() * 12 + actionStart.getMonth();
            const actionEndMonth = actionEnd.getFullYear() * 12 + actionEnd.getMonth();
            
            startPos = actionStartMonth - startMonth;
            endPos = actionEndMonth - startMonth + 1;
        }
        
        return {
            left: Math.max(0, startPos * unitWidth),
            width: Math.max(unitWidth * 0.1, (endPos - startPos) * unitWidth)
        };
    };

    const formatTimeUnit = (date: Date) => {
        if (scale === 'day') {
            return {
                main: date.getDate().toString(),
                sub: date.getDate() === 1 ? date.toLocaleDateString('fr-FR', { month: 'short' }) : ''
            };
        } else if (scale === 'week') {
            const weekEnd = new Date(date);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return {
                main: `S${Math.ceil(date.getDate() / 7)}`,
                sub: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
            };
        } else {
            return {
                main: date.toLocaleDateString('fr-FR', { month: 'short' }),
                sub: date.getFullYear().toString()
            };
        }
    };

    // Fonctions de drag & drop
    const handleMouseDown = (e: React.MouseEvent, actionId: string, mode: 'move' | 'resize-start' | 'resize-end') => {
        e.preventDefault();
        const action = actions.find(a => a.id === actionId);
        if (!action) return;

        setDragState({
            actionId,
            mode,
            startX: e.clientX,
            originalStart: new Date(action.start_date),
            originalEnd: new Date(action.due_date)
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState.actionId || !dragState.mode) return;

        const deltaX = e.clientX - dragState.startX;
        const unitWidth = scale === 'day' ? 40 : scale === 'week' ? 80 : 120;
        
        let unitsToMove = Math.round(deltaX / unitWidth);
        let newStartDate = new Date(dragState.originalStart);
        let newEndDate = new Date(dragState.originalEnd);

        switch (scale) {
            case 'day':
                if (dragState.mode === 'move') {
                    newStartDate.setDate(newStartDate.getDate() + unitsToMove);
                    newEndDate.setDate(newEndDate.getDate() + unitsToMove);
                } else if (dragState.mode === 'resize-end') {
                    newEndDate.setDate(newEndDate.getDate() + unitsToMove);
                } else if (dragState.mode === 'resize-start') {
                    newStartDate.setDate(newStartDate.getDate() + unitsToMove);
                }
                break;
            case 'week':
                if (dragState.mode === 'move') {
                    newStartDate.setDate(newStartDate.getDate() + (unitsToMove * 7));
                    newEndDate.setDate(newEndDate.getDate() + (unitsToMove * 7));
                } else if (dragState.mode === 'resize-end') {
                    newEndDate.setDate(newEndDate.getDate() + (unitsToMove * 7));
                } else if (dragState.mode === 'resize-start') {
                    newStartDate.setDate(newStartDate.getDate() + (unitsToMove * 7));
                }
                break;
            case 'month':
                if (dragState.mode === 'move') {
                    newStartDate.setMonth(newStartDate.getMonth() + unitsToMove);
                    newEndDate.setMonth(newEndDate.getMonth() + unitsToMove);
                } else if (dragState.mode === 'resize-end') {
                    newEndDate.setMonth(newEndDate.getMonth() + unitsToMove);
                } else if (dragState.mode === 'resize-start') {
                    newStartDate.setMonth(newStartDate.getMonth() + unitsToMove);
                }
                break;
        }

        // Validation : la date de fin doit être après la date de début
        if (newEndDate <= newStartDate) return;
    };

    const handleMouseUp = () => {
        setDragState({
            actionId: null,
            mode: null,
            startX: 0,
            originalStart: new Date(),
            originalEnd: new Date()
        });
    };

    const today = new Date();
    const todayPosition = (() => {
        if (scale === 'day') {
            return ((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * unitWidth;
        } else if (scale === 'week') {
            return ((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) * unitWidth;
        } else {
            const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
            const todayMonth = today.getFullYear() * 12 + today.getMonth();
            return (todayMonth - startMonth) * unitWidth;
        }
    })();

    return (
        <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Header avec sélecteur d'échelle */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <GanttChartSquare className="w-5 h-5 text-blue-600" />
                    Diagramme de Gantt
                </h3>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
                    {[
                        { key: 'day', label: 'Jours', icon: '📅' },
                        { key: 'week', label: 'Semaines', icon: '📊' },
                        { key: 'month', label: 'Mois', icon: '🗓️' }
                    ].map(({ key, label, icon }) => (
                        <button
                            key={key}
                            onClick={() => setScale(key as any)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                                scale === key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <span>{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Zone de défilement horizontal */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="relative" style={{ width: `${totalWidth}px`, minHeight: '100%' }}
                     onMouseMove={handleMouseMove}
                     onMouseUp={handleMouseUp}
                     onMouseLeave={handleMouseUp}>
                    {/* Timeline Header */}
                    <div className="sticky top-0 bg-white z-20 border-b-2 border-gray-200">
                        <div className="flex h-16">
                            {timeUnits.map((unit, index) => {
                                const formatted = formatTimeUnit(unit);
                                return (
                                    <div
                                        key={index}
                                        className="border-r border-gray-200 flex flex-col items-center justify-center text-center bg-gradient-to-b from-gray-50 to-white"
                                        style={{ width: `${unitWidth}px` }}
                                    >
                                        <div className="text-sm font-semibold text-gray-900">{formatted.main}</div>
                                        {formatted.sub && (
                                            <div className="text-xs text-gray-500">{formatted.sub}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ligne "Aujourd'hui" */}
                    {todayPosition >= 0 && todayPosition <= totalWidth && (
                        <div
                            className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed z-10 pointer-events-none"
                            style={{ left: `${todayPosition}px` }}
                        >
                            <div className="absolute -top-6 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                                Aujourd'hui
                            </div>
                        </div>
                    )}

                    {/* Grille de fond */}
                    <div className="absolute inset-0 top-16">
                        {timeUnits.map((_, index) => (
                            <div
                                key={index}
                                className="absolute top-0 bottom-0 border-r border-gray-100"
                                style={{ left: `${index * unitWidth}px` }}
                            />
                        ))}
                    </div>

                    {/* Barres d'actions */}
                    <div className="relative pt-4 pb-4" style={{ marginTop: '64px' }}>
                        {validActions.map((action, index) => {
                            const { left, width } = getPositionAndWidth(action);
                            const config = actionTypeConfig[action.type];
                            const assignees = action.assignee_ids.map(id => users.find(u => u.id === id)).filter(Boolean);
                            
                            const tooltipContent = `
                                <div class="text-left">
                                    <div class="font-bold text-sm mb-1">${action.title}</div>
                                    <div class="text-xs text-gray-600 mb-1">
                                        ${new Date(action.start_date).toLocaleDateString('fr-FR')} → 
                                        ${new Date(action.due_date).toLocaleDateString('fr-FR')}
                                    </div>
                                    <div class="text-xs">
                                        <span class="font-medium">Équipe:</span> 
                                        ${assignees.map(u => u?.nom).join(', ') || 'Non assigné'}
                                    </div>
                                    <div class="text-xs mt-1">
                                        <span class="inline-block px-1.5 py-0.5 rounded text-xs" style="background-color: ${config.color.replace('border-', 'bg-').replace('-500', '-100')}; color: ${config.textColor.replace('text-', '').replace('-600', '')}">
                                            ${config.icon} ${config.name}
                                        </span>
                                    </div>
                                </div>
                            `;

                            const isBeingDragged = dragState.actionId === action.id;

                            return (
                                <div
                                    key={action.id}
                                    className="absolute flex items-center"
                                    style={{
                                        top: `${index * 50 + 10}px`,
                                        left: `${left}px`,
                                        width: `${width}px`,
                                        height: '36px'
                                    }}
                                >
                                    <Tooltip content={tooltipContent}>
                                        <div
                                            onClick={() => onCardClick(action)}
                                            className={`w-full h-full ${config.barBg} rounded-lg cursor-pointer flex items-center px-3 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all hover:scale-105 border-l-4 ${isBeingDragged ? 'opacity-75 scale-105' : ''}`}
                                            style={{ borderLeftColor: config.color.replace('border-', '').replace('-500', '') }}
                                            onMouseDown={(e) => handleMouseDown(e, action.id, 'move')}
                                            title={`${action.title} - ${action.start_date} (${Math.ceil((new Date(action.due_date).getTime() - new Date(action.start_date).getTime()) / (1000 * 60 * 60 * 24))} jours)`}
                                        >
                                            {/* Poignée de redimensionnement gauche */}
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    handleMouseDown(e, action.id, 'resize-start');
                                                }}
                                            />
                                            
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                                <span className="text-xs">{config.icon}</span>
                                                <span className="truncate flex-1">{action.title}</span>
                                                {assignees.length > 0 && (
                                                    <div className="flex -space-x-1">
                                                        {assignees.slice(0, 3).map((user, i) => (
                                                            <img
                                                                key={i}
                                                                src={user?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id}`}
                                                                alt={user?.nom}
                                                                className="w-5 h-5 rounded-full border border-white"
                                                            />
                                                        ))}
                                                        {assignees.length > 3 && (
                                                            <div className="w-5 h-5 rounded-full bg-gray-600 border border-white flex items-center justify-center text-xs">
                                                                +{assignees.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Poignée de redimensionnement droite */}
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    handleMouseDown(e, action.id, 'resize-end');
                                                }}
                                            />
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer avec légende */}
            <div className="border-t bg-gray-50 p-3">
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                        <span>💡 Glissez les barres pour déplacer, tirez les bords pour redimensionner</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                            <span className="font-medium">Légende :</span>
                            {Object.entries(actionTypeConfig).map(([key, config]) => (
                                <div key={key} className="flex items-center gap-1">
                                    <div className={`w-3 h-3 ${config.barBg} rounded`}></div>
                                    <span>{config.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-right">
                            <div>Période : {startDate.toLocaleDateString('fr-FR')} → {endDate.toLocaleDateString('fr-FR')}</div>
                            <div>{validActions.length} action(s) planifiée(s)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
const TabButton = ({ active, onClick, children, icon }: { active: boolean, onClick: () => void, children: React.ReactNode, icon: React.ReactNode }) => (
    <button onClick={onClick} className={`py-2 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${active ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
        {icon} {children}
    </button>
);

export const PlanActionsEditor: React.FC<PlanActionsEditorProps> = ({ module, onClose }) => {
    const { users: allUsersInApp } = useAuth();
    const { projectMembers, updateA3Module } = useDatabase();

    const [view, setView] = useState('home');
    const [actions, setActions] = useState<Action[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState<Action | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    const currentProjectMembers = useMemo(() => {
        const memberIds = projectMembers
            .filter(pm => pm.project === module.project)
            .map(pm => pm.user);
        return allUsersInApp.filter(user => memberIds.includes(user.id));
    }, [projectMembers, allUsersInApp, module.project]);


    useEffect(() => {
        const savedActions = module.content?.actions || [];
        setActions(savedActions);
        setLoading(false);
    }, [module]);

    const saveActionsToDb = useCallback((updatedActions: Action[]) => {
        setActions(updatedActions);
        updateA3Module(module.id, { content: { ...module.content, actions: updatedActions } });
    }, [module, updateA3Module]);

    const handleSaveAction = useCallback((actionData: Action) => {
        let updatedActions;
        if (actionData.id && actions.some(a => a.id === actionData.id)) {
            updatedActions = actions.map(a => a.id === actionData.id ? actionData : a);
        } else {
            updatedActions = [...actions, { ...actionData, id: Date.now().toString() }];
        }
        saveActionsToDb(updatedActions);
        setIsActionModalOpen(false);
        setEditingAction(null);
    }, [actions, saveActionsToDb]);

    const handleSetActions = useCallback((updatedActions: Action[], changedItem: Action) => {
        saveActionsToDb(updatedActions);
    }, [saveActionsToDb]);

    const openActionModal = (action: Action | null = null) => {
        setEditingAction(action);
        setIsActionModalOpen(true);
    };

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
                        {loading || !currentProjectMembers ? <div className="text-center p-8">Chargement...</div> : (
                            <>
                                {view === 'home' && <HomeView actions={actions} setActions={handleSetActions} users={currentProjectMembers} onCardClick={openActionModal} />}
                                {view === 'kanban' && <KanbanByPersonView actions={actions} setActions={handleSetActions} users={currentProjectMembers} onCardClick={openActionModal} />}
                                {view === 'matrix' && <MatrixView actions={actions} setActions={handleSetActions} users={currentProjectMembers} onCardClick={openActionModal} />}
                                {view === 'gantt' && <GanttView actions={actions} users={currentProjectMembers} onCardClick={openActionModal} />}
                            </>
                        )}
                    </main>
                </div>

                {isActionModalOpen && <ActionModal
                    isOpen={isActionModalOpen}
                    onClose={() => { setIsActionModalOpen(false); setEditingAction(null); }}
                    onSave={handleSaveAction}
                    action={editingAction}
                    projectMembers={currentProjectMembers}
                />}

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
