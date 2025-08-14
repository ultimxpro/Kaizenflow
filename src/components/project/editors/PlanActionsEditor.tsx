// src/components/project/editors/PlanActionsEditor.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { A3Module, User } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { useAuth } from '../../../contexts/AuthContext';
import { HelpCircle, X, Layers, User as UserIcon, Table, GanttChartSquare, Plus, Users, Check, Calendar, Tag, Activity, AlertTriangle } from 'lucide-react';

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

const GanttView = ({ actions, setActions, users, onCardClick }: { actions: Action[], setActions: (actions: Action[], changedItem: Action | null) => void, users: User[], onCardClick: (action: Action) => void }) => {
    const ganttRef = useRef<HTMLDivElement>(null);
    const [dragState, setDragState] = useState<{ actionId: string; mode: 'move' | 'resize-start' | 'resize-end'; startX: number; originalStart: Date; originalEnd: Date; } | null>(null);
    const [pendingChange, setPendingChange] = useState<{ action: Action, newStart: string, newEnd: string } | null>(null);

    const validActions = useMemo(() => actions
        .filter(a => a.start_date && a.due_date && !isNaN(new Date(a.start_date).getTime()) && !isNaN(new Date(a.due_date).getTime()))
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
        [actions]
    );

    const { startDate, endDate, totalDays } = useMemo(() => {
        if (validActions.length === 0) return { startDate: new Date(), endDate: new Date(), totalDays: 30 };
        const minTime = Math.min(...validActions.map(a => new Date(a.start_date).getTime()));
        const maxTime = Math.max(...validActions.map(a => new Date(a.due_date).getTime()));
        
        const start = new Date(minTime);
        start.setDate(start.getDate() - 7);
        const end = new Date(maxTime);
        end.setDate(end.getDate() + 7);

        const days = Math.max(30, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return { startDate: start, endDate: end, totalDays: days };
    }, [validActions]);
    
    const timelineLabels = useMemo(() => {
        const labels = [];
        let currentDay = new Date(startDate);
        while(currentDay <= endDate) {
            labels.push(new Date(currentDay));
            currentDay.setDate(currentDay.getDate() + 1);
        }
        return labels;
    }, [startDate, endDate]);

    const handleMouseDown = (e: React.MouseEvent, action: Action, mode: 'move' | 'resize-start' | 'resize-end') => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({
            actionId: action.id, mode, startX: e.clientX,
            originalStart: new Date(action.start_date), originalEnd: new Date(action.due_date)
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState || !ganttRef.current) return;

        const dayWidth = ganttRef.current.scrollWidth / totalDays;
        const deltaDays = Math.round((e.clientX - dragState.startX) / dayWidth);
        
        let newStart = new Date(dragState.originalStart);
        let newEnd = new Date(dragState.originalEnd);

        if (dragState.mode === 'move') {
            newStart.setDate(newStart.getDate() + deltaDays);
            newEnd.setDate(newEnd.getDate() + deltaDays);
        } else if (dragState.mode === 'resize-start') {
            newStart.setDate(newStart.getDate() + deltaDays);
        } else { // resize-end
            newEnd.setDate(newEnd.getDate() + deltaDays);
        }
        
        if (newEnd <= newStart) {
            if (dragState.mode === 'resize-end') newEnd.setDate(newStart.getDate() + 1);
            else newStart.setDate(newEnd.getDate() - 1);
        }
        
        setActions(prevActions => prevActions.map(act =>
            act.id === dragState.actionId
                ? { ...act, start_date: newStart.toISOString().split('T')[0], due_date: newEnd.toISOString().split('T')[0] }
                : act
        ), null);

    }, [dragState, totalDays, setActions]);

    const handleMouseUp = useCallback(() => {
        if (!dragState) return;
        const finalAction = actions.find(a => a.id === dragState.actionId);
        if (finalAction) {
            const originalAction = {
                ...finalAction,
                start_date: dragState.originalStart.toISOString().split('T')[0],
                due_date: dragState.originalEnd.toISOString().split('T')[0]
            };
            setActions(actions.map(a => a.id === originalAction.id ? originalAction : a), null);
            setPendingChange({ 
                action: originalAction, 
                newStart: finalAction.start_date, 
                newEnd: finalAction.due_date 
            });
        }
        setDragState(null);
    }, [dragState, actions, setActions]);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const confirmChange = () => {
        if (!pendingChange) return;
        const { action, newStart, newEnd } = pendingChange;
        const updatedAction = { ...action, start_date: newStart, due_date: newEnd };
        setActions(actions.map(a => a.id === action.id ? updatedAction : a), updatedAction);
        setPendingChange(null);
    };

    const cancelChange = () => {
        setPendingChange(null);
    };

    const getDaysFromStart = (dateStr: string) => (new Date(dateStr).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (validActions.length === 0) return <div className="text-center p-8 text-gray-500">Aucune action avec des dates valides.</div>;

    return (
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-md h-full flex flex-col">
            <div className="flex-1 overflow-auto" ref={ganttRef}>
                <div className="relative" style={{ width: `${totalDays * 40}px`, minHeight: '100%' }}>
                    <div className="sticky top-0 bg-white z-20 flex border-b-2">
                        {timelineLabels.map((day, index) => (
                            <div key={index} className="flex-shrink-0 w-10 text-center text-xs text-gray-500 border-r py-1">
                                <div className="font-semibold">{day.getDate() === 1 ? day.toLocaleDateString('fr-FR', { month: 'short' }) : ''}</div>
                                <div>{day.getDate()}</div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="absolute inset-0 top-10 pointer-events-none">
                        {timelineLabels.map((day, index) => (
                           <div key={index} className={`absolute top-0 bottom-0 border-r ${(day.getDay() === 0 || day.getDay() === 6) ? 'bg-gray-50' : ''}`} style={{ left: `${index * 40}px`, width: '40px' }}/>
                        ))}
                         <div className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed z-10" style={{ left: `${getDaysFromStart(new Date().toISOString()) * 40}px` }}>
                            <span className="absolute -top-6 -translate-x-1/2 text-xs bg-red-500 text-white px-1 rounded">Auj.</span>
                        </div>
                    </div>

                    <div className="pt-4 relative" style={{ height: `${validActions.length * 40 + 20}px`}}>
                        {validActions.map((action, index) => {
                            const left = getDaysFromStart(action.start_date) * 40;
                            const duration = Math.max(1, getDaysFromStart(action.due_date) - getDaysFromStart(action.start_date));
                            const width = duration * 40;
                            const config = actionTypeConfig[action.type];
                            const isDragging = dragState?.actionId === action.id;

                            return (
                                <div key={action.id} className="absolute h-8" style={{ top: `${index * 40}px`, left: `${left}px`, width: `${width}px`}}>
                                    <Tooltip content={`<strong>${action.title}</strong><br>Du ${new Date(action.start_date).toLocaleDateString()} au ${new Date(action.due_date).toLocaleDateString()}`}>
                                      <div
                                        onMouseDown={(e) => handleMouseDown(e, action, 'move')}
                                        className={`absolute inset-0 rounded ${config.barBg} cursor-grab hover:cursor-grab flex items-center px-2 text-white text-xs font-semibold overflow-hidden transition-all duration-75 ${isDragging ? 'opacity-70 scale-105 shadow-lg' : 'shadow'}`}
                                        title={`${action.title} - ${new Date(action.start_date).toLocaleDateString('fr-FR')} → ${new Date(action.due_date).toLocaleDateString('fr-FR')}`}
                                      >
                                          {/* Poignée de redimensionnement gauche */}
                                          <div 
                                            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black hover:bg-opacity-20 rounded-l"
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              handleMouseDown(e, action, 'resize-start');
                                            }}
                                          />
                                          
                                          <span className="flex-1 truncate px-2">{action.title}</span>
                                          <div className="flex-shrink-0 flex -space-x-1 pr-1">
                                            {action.assignee_ids.slice(0, 3).map(id => {
                                              const user = users.find(u => u.id === id);
                                              return user ? (
                                                <img key={id} src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.nom} className="w-4 h-4 rounded-full border border-white" />
                                              ) : null;
                                            })}
                                          </div>
                                          
                                          {/* Poignée de redimensionnement droite */}
                                          <div 
                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black hover:bg-opacity-20 rounded-r"
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              handleMouseDown(e, action, 'resize-end');
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
             {pendingChange && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex items-start gap-4">
                           <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-yellow-500"/>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Confirmer la modification</h3>
                                <p className="text-sm text-gray-600 mt-2">Voulez-vous sauvegarder les nouvelles dates pour l'action "{pendingChange.action.title}" ?</p>
                                <div className="mt-4 text-sm space-y-2">
                                    <p><strong>Anciennes dates:</strong> {new Date(pendingChange.action.start_date).toLocaleDateString()} → {new Date(pendingChange.action.due_date).toLocaleDateString()}</p>
                                    <p><strong>Nouvelles dates:</strong> {new Date(pendingChange.newStart).toLocaleDateString()} → {new Date(pendingChange.newEnd).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={cancelChange} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Annuler</button>
                            <button onClick={confirmChange} className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Confirmer</button>
                        </div>
                    </div>
                </div>
            )}
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
        setActions(updatedActions); // <-- AJOUTER CETTE LIGNE
        saveActionsToDb(updatedActions);
        setIsActionModalOpen(false);
        setEditingAction(null);
    }, [actions, saveActionsToDb]);

const handleSetActions = useCallback((updatedActions: Action[], changedItem: Action | null) => {
        setActions(updatedActions);
        // On sauvegarde en base de données uniquement si un `changedItem` est fourni (drag & drop classique)
        // ou après confirmation pour le Gantt. Si `changedItem` est null, c'est une mise à jour temporaire de l'UI.
        if (changedItem) {
            saveActionsToDb(updatedActions);
        }
    }, [saveActionsToDb, actions]); // Ajout de 'actions' pour le bon fonctionnement du handleMouseUp du Gantt

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
                                {view === 'gantt' && <GanttView actions={actions} setActions={handleSetActions} users={currentProjectMembers} onCardClick={openActionModal} />}
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