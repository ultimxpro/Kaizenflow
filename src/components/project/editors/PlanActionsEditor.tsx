import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// --- FONCTION UTILITAIRE ---
const getQuadrant = (gain: number, effort: number) => {
    if (gain >= 5 && effort < 5) return { name: "Quick Win 🔥", color: "bg-green-100", textColor: "text-green-800" };
    if (gain >= 5 && effort >= 5) return { name: "Gros projet 🗓️", color: "bg-blue-100", textColor: "text-blue-800" };
    if (gain < 5 && effort < 5) return { name: "Tâche de fond 👌", color: "bg-yellow-100", textColor: "text-yellow-800" };
    return { name: "À éviter 🤔", color: "bg-red-100", textColor: "text-red-800" };
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
const getDateOfISOWeek = (weekString: string): Date => {
    if (!weekString) return new Date();
    const [year, week] = weekString.split('-W').map(Number);
    const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    const dayOfWeek = simple.getUTCDay();
    const isoWeekStart = simple;
    if (dayOfWeek <= 4) {
        isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    } else {
        isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    }
    return isoWeekStart;
};

const ActionModal = React.memo(({ isOpen, onClose, onSave, action, projectMembers }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (action: Action) => void, 
    action: Action | null, 
    projectMembers: User[]
}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState<Partial<Action>>({});
    const [duration, setDuration] = useState(7);
    const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('days');
    const [weekValue, setWeekValue] = useState('');
    const [monthValue, setMonthValue] = useState('');

    useEffect(() => {
        const initialStartDate = action?.start_date || new Date().toISOString().split('T')[0];
        const initialData = action || { 
            title: '', description: '', assignee_ids: [], status: 'À faire', 
            type: 'simple', due_date: '', start_date: initialStartDate, 
            effort: 5, gain: 5 
        };
        setFormData(initialData);

        if (action && action.start_date && action.due_date) {
            const start = new Date(action.start_date);
            const end = new Date(action.due_date);
            const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 0 && diffDays % 30 === 0 && diffDays / 30 > 0) {
                setDuration(diffDays / 30);
                setDurationUnit('months');
            } else if (diffDays > 0 && diffDays % 7 === 0 && diffDays / 7 > 0) {
                setDuration(diffDays / 7);
                setDurationUnit('weeks');
            } else {
                setDuration(Math.max(1, diffDays));
                setDurationUnit('days');
            }
        } else {
            setDuration(7);
            setDurationUnit('days');
        }
    }, [action]);

    useEffect(() => {
        if (!formData.start_date) return;
        const startDate = new Date(formData.start_date + 'T00:00:00');
        let endDate = new Date(startDate);
        const newDuration = Math.max(1, duration);

        if (durationUnit === 'days') {
            endDate.setDate(startDate.getDate() + newDuration - 1);
        } else if (durationUnit === 'weeks') {
            endDate.setDate(startDate.getDate() + newDuration * 7 - 1);
        } else if (durationUnit === 'months') {
            endDate.setMonth(startDate.getMonth() + newDuration);
            endDate.setDate(endDate.getDate() - 1);
        }
        setFormData(prev => ({ ...prev, due_date: endDate.toISOString().split('T')[0] }));
    }, [formData.start_date, duration, durationUnit]);

    const handleDateInputChange = (value: string) => {
        let startDateStr = '';
        if (durationUnit === 'days') {
            startDateStr = value;
        } else if (durationUnit === 'weeks') {
            setWeekValue(value);
            if (value) {
                startDateStr = getDateOfISOWeek(value).toISOString().split('T')[0];
            }
        } else if (durationUnit === 'months') {
            setMonthValue(value);
            if (value) {
                startDateStr = `${value}-01`;
            }
        }
        setFormData(p => ({ ...p, start_date: startDateStr }));
    };

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
            let newLeaderId = newAssignees.includes(prev.leader_id) ? prev.leader_id : (newAssignees[0] || undefined);
            if(newAssignees.length === 0) newLeaderId = undefined;
            return { ...prev, assignee_ids: newAssignees, leader_id: newLeaderId };
        });
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
                                        <div onClick={() => toggleAssignee(user.id)} className={`p-1 rounded-full cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-200'}`}>
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
                                        <label className="text-xs text-gray-500">
                                            {durationUnit === 'days' && "Date de début"}
                                            {durationUnit === 'weeks' && "Semaine de début"}
                                            {durationUnit === 'months' && "Mois de début"}
                                        </label>
                                        
                                        {durationUnit === 'days' && (
                                            <input type="date" value={formData.start_date || ''} onChange={(e) => handleDateInputChange(e.target.value)} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                        )}
                                        {durationUnit === 'weeks' && (
                                            <input type="week" value={weekValue} onChange={(e) => handleDateInputChange(e.target.value)} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                        )}
                                        {durationUnit === 'months' && (
                                            <input type="month" value={monthValue} onChange={(e) => handleDateInputChange(e.target.value)} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                        )}
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
                                {formData.due_date && formData.start_date && <p className="text-xs text-gray-500 mt-2">Période : <span className="font-semibold">{new Date(formData.start_date + 'T00:00:00').toLocaleDateString('fr-FR')} au {new Date(formData.due_date + 'T00:00:00').toLocaleDateString('fr-FR')}</span></p>}
                            </div>
                        </div>
                    </PDCASection>

                    <PDCASection title="Priorisation" icon={<GanttChartSquare size={20} />}>
                        <div className="grid grid-cols-2 gap-6 items-center">
                            <div>
                                <div><label>Effort (Complexité): {formData.effort || 5}</label><input type="range" name="effort" min="1" max="10" value={formData.effort || 5} onChange={e => handleRangeChange('effort', e.target.value)} className="w-full" /></div>
                                <div className="mt-2"><label>Gain (Impact): {formData.gain || 5}</label><input type="range" name="gain" min="1" max="10" value={formData.gain || 5} onChange={e => handleRangeChange('gain', e.target.value)} className="w-full" /></div>
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
                            <p className="text-xs text-gray-500">Sélectionnez un membre</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0" onDragEnd={() => setDraggedItem(null)}>
                {(Object.entries(columns) as [ActionStatus, Action[]][]).map(([status, items]) => (
                    <div 
                        key={status} 
                        className={`flex flex-col rounded-xl transition-all duration-300 h-full overflow-hidden shadow-lg ${status === 'À faire' ? 'bg-gradient-to-b from-orange-50 to-orange-100 border-2 border-orange-200' : 'bg-gradient-to-b from-green-50 to-green-100 border-2 border-green-200'}`}
                        onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, status)}
                        onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('bg-blue-50', 'ring-2', 'ring-blue-400', 'scale-105')}
                        onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('bg-blue-50', 'ring-2', 'ring-blue-400', 'scale-105')}
                    >
                        <div className={`p-4 border-b-2 flex-shrink-0 ${status === 'À faire' ? 'border-orange-300 bg-orange-200' : 'border-green-300 bg-green-200'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'À faire' ? 'bg-orange-500' : 'bg-green-500'}`}>
                                        {status === 'À faire' ? '⏳' : '✅'}
                                    </div>
                                    <h2 className={`font-bold text-lg ${status === 'À faire' ? 'text-orange-800' : 'text-green-800'}`}>{status}</h2>
                                </div>
                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${status === 'À faire' ? 'bg-orange-300 text-orange-800' : 'bg-green-300 text-green-800'}`}>{items.length}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 min-h-0">
                            {items.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${status === 'À faire' ? 'bg-orange-200' : 'bg-green-200'}`}>
                                        {status === 'À faire' ? '📝' : '🎉'}
                                    </div>
                                    <p className={`text-sm font-medium ${status === 'À faire' ? 'text-orange-600' : 'text-green-600'}`}>{status === 'À faire' ? 'Aucune tâche en attente' : 'Aucune tâche terminée'}</p>
                                    <p className="text-xs text-gray-500 mt-1">{status === 'À faire' ? 'Les nouvelles tâches apparaîtront ici' : 'Glissez les tâches terminées ici'}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map(item => (<ActionCard key={item.id} action={item} users={users} onDragStart={(e, action) => setDraggedItem(action)} onClick={onCardClick} />))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 flex-shrink-0 bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression de {selectedUserData?.nom}</span>
                    <span className="text-sm font-bold text-gray-900">{filteredActions.length > 0 ? Math.round((columns['Fait'].length / filteredActions.length) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${filteredActions.length > 0 ? (columns['Fait'].length / filteredActions.length) * 100 : 0}%` }}></div>
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
        const newValues = { 'quick-wins': { gain: 8, effort: 3 }, 'major-projects': { gain: 8, effort: 8 }, 'fill-ins': { gain: 3, effort: 3 }, 'thankless-tasks': { gain: 3, effort: 8 } }[quadrant] || { gain: 5, effort: 5 };
        setActions(actions.map(a => a.id === draggedItem.id ? {...a, ...newValues} : a), {...draggedItem, ...newValues});
    };

    const Quadrant = ({ title, emoji, items, bgColor, quadrantName }: { title: string, emoji: string, items: Action[], bgColor: string, quadrantName: string }) => (
        <div className={`rounded-lg p-2 flex flex-col ${bgColor}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, quadrantName)} onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('ring-2', 'ring-blue-400')} onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('ring-2', 'ring-blue-400')}>
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

const GanttView = ({ actions, users, onUpdateAction, onCardClick, ganttScale, setGanttScale }: { 
    actions: Action[], 
    users: User[], 
    onUpdateAction: (id: string, updates: Partial<Action>) => void, 
    onCardClick: (action: Action) => void,
    ganttScale: 'day' | 'week' | 'month',
    setGanttScale: (scale: 'day' | 'week' | 'month') => void
}) => {
    const ganttRef = useRef<HTMLDivElement>(null);
  
    const [confirmationModal, setConfirmationModal] = useState<{
        action: Action;
        newStartDate: string;
        newEndDate: string;
        originalStartDate: string;
        originalEndDate: string;
    } | null>(null);

    const [dragState, setDragState] = useState<{
        actionId: string;
        mode: 'move' | 'resize-right';
        startX: number;
        originalStartDate: Date;
        originalEndDate: Date;
        scale: 'day' | 'week' | 'month';
    } | null>(null);

    const validActions = useMemo(() => actions
        .filter(a => a.start_date && a.due_date && !isNaN(new Date(a.start_date).getTime()) && !isNaN(new Date(a.due_date).getTime()))
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
        [actions]
    );

    const getGanttDateRange = useCallback(() => {
        if (validActions.length === 0) {
            const today = new Date();
            const start = new Date(today);
            start.setHours(0,0,0,0);
            start.setDate(today.getDate() - 30);
            const end = new Date(today);
            end.setHours(0,0,0,0);
            end.setDate(today.getDate() + 60);
            return { start, end };
        }
        const allDates = validActions.flatMap(a => [new Date(a.start_date), new Date(a.due_date)]);
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        minDate.setHours(0,0,0,0);
        maxDate.setHours(0,0,0,0);
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 14);
        return { start: minDate, end: maxDate };
    }, [validActions]);

    const { start: ganttStartDate, end: ganttEndDate } = getGanttDateRange();

    const getISOWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };
    
    const timelineColumns = useMemo(() => {
        if (!ganttStartDate || !ganttEndDate) return [];
        const columns = [];
        let current = new Date(ganttStartDate);
        while (current <= ganttEndDate) {
            let label = '', nextDate = new Date(current), width = 0;
            switch (ganttScale) {
                case 'day': label = current.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); nextDate.setDate(current.getDate() + 1); width = 50; break;
                case 'week': label = `S${getISOWeekNumber(current)}`; nextDate.setDate(current.getDate() + 7); width = 80; break;
                case 'month': label = current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); nextDate.setMonth(current.getMonth() + 1); width = 150; break;
            }
            columns.push({ date: new Date(current), label, width });
            current = nextDate;
        }
        return columns;
    }, [ganttStartDate, ganttEndDate, ganttScale]);
    
    const totalWidth = useMemo(() => timelineColumns.reduce((acc, col) => acc + col.width, 0), [timelineColumns]);

    const calculateBarPositionAndWidth = (action: Action) => {
        if (!ganttStartDate || !ganttEndDate || totalWidth === 0) return { left: 0, width: 0 };
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const timelineDurationMs = ganttEndDate.getTime() - ganttStartDate.getTime();
        if (timelineDurationMs <= 0) return { left: 0, width: 0 };
        const pixelsPerMs = totalWidth / timelineDurationMs;
        const actionStart = new Date(action.start_date + 'T00:00:00');
        const actionEnd = new Date(action.due_date + 'T00:00:00');
        const startOffsetMs = actionStart.getTime() - ganttStartDate.getTime();
        const actionDurationMs = (actionEnd.getTime() - actionStart.getTime()) + MS_PER_DAY;
        const left = Math.max(0, startOffsetMs * pixelsPerMs);
        const width = Math.max(10, actionDurationMs * pixelsPerMs);
        return { left, width };
    };

    const snapDateToScale = (date: Date, scale: 'day' | 'week' | 'month') => {
        const newDate = new Date(date);
        newDate.setUTCHours(0, 0, 0, 0);
        switch (scale) {
            case 'week':
                const day = newDate.getUTCDay();
                const diff = newDate.getUTCDate() - day + (day === 0 ? -6 : 1);
                newDate.setUTCDate(diff);
                break;
            case 'month':
                newDate.setUTCDate(1);
                break;
        }
        return newDate;
    };

    const handleMouseDown = (e: React.MouseEvent, actionId: string, mode: 'move' | 'resize-right') => {
        e.preventDefault();
        e.stopPropagation();
        const action = validActions.find(a => a.id === actionId);
        if (!action) return;
        setDragState({
            actionId, mode, startX: e.clientX,
            originalStartDate: new Date(action.start_date),
            originalEndDate: new Date(action.due_date),
            scale: ganttScale,
        });
    };

    // --- BLOC CORRIGÉ ---
    useEffect(() => {
        if (!dragState) {
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState || !ganttRef.current || !ganttStartDate || !ganttEndDate) return;
            const timelineDurationMs = ganttEndDate.getTime() - ganttStartDate.getTime();
            if (totalWidth === 0 || timelineDurationMs <= 0) return;
            
            const msPerPixel = timelineDurationMs / totalWidth;
            const deltaX = e.clientX - dragState.startX;
            const deltaTime = deltaX * msPerPixel;

            let newStartDate, newEndDate;

            if (dragState.mode === 'resize-right') {
                newStartDate = new Date(dragState.originalStartDate);
                newEndDate = new Date(dragState.originalEndDate.getTime() + deltaTime);
                if (newEndDate.getTime() < newStartDate.getTime()) {
                    newEndDate = new Date(newStartDate.getTime());
                }
            } else { // 'move'
                newStartDate = new Date(dragState.originalStartDate.getTime() + deltaTime);
                newEndDate = new Date(dragState.originalEndDate.getTime() + deltaTime);
            }
            
            onUpdateAction(dragState.actionId, {
                start_date: newStartDate.toISOString().split('T')[0],
                due_date: newEndDate.toISOString().split('T')[0],
            });
        };

        const handleMouseUp = () => {
            if (!dragState) return;
            // Utilise 'actions' directement car 'validActions' pourrait être périmé dans cette closure
            const action = actions.find(a => a.id === dragState.actionId);
            if (!action) { 
                setDragState(null); 
                return;
            };
            
            const currentStartDate = new Date(action.start_date);
            const currentEndDate = new Date(action.due_date);
            
            const finalStartDate = snapDateToScale(currentStartDate, dragState.scale);
            const durationMs = currentEndDate.getTime() - currentStartDate.getTime();
            const finalEndDate = new Date(finalStartDate.getTime() + durationMs);

            const finalStartDateStr = finalStartDate.toISOString().split('T')[0];
            const finalEndDateStr = finalEndDate.toISOString().split('T')[0];
            
            onUpdateAction(dragState.actionId, {
                start_date: finalStartDateStr,
                due_date: finalEndDateStr,
            });

            const originalStartDateStr = dragState.originalStartDate.toISOString().split('T')[0];
            const originalEndDateStr = dragState.originalEndDate.toISOString().split('T')[0];
            if (finalStartDateStr !== originalStartDateStr || finalEndDateStr !== originalEndDateStr) {
                setConfirmationModal({ action, newStartDate: finalStartDateStr, newEndDate: finalEndDateStr, originalStartDate: originalStartDateStr, originalEndDate: originalEndDateStr });
            }
            
            setDragState(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, actions, ganttStartDate, ganttEndDate, totalWidth, onUpdateAction]); // Dépendances mises à jour pour la robustesse

    const handleConfirm = () => setConfirmationModal(null);
    const handleCancel = () => {
        if (!confirmationModal) return;
        onUpdateAction(confirmationModal.action.id, {
            start_date: confirmationModal.originalStartDate,
            due_date: confirmationModal.originalEndDate,
        });
        setConfirmationModal(null);
    };
    
    const formatDuration = (days: number) => {
        if (days >= 28 && Math.abs(days % 7) < 2) {
            const months = Math.round(days / 30.44);
            return `${months} mois`;
        }
        if (days >= 7 && days % 7 === 0) {
            const weeks = days / 7;
            return `${weeks} sem.`;
        }
        return `${days}j`;
    };

    if (validActions.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <GanttChartSquare className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Aucune action planifiée</h3>
                <p className="text-sm">Créez des actions pour voir le Gantt.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Diagramme de Gantt</h3>
                <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                    <button onClick={() => setGanttScale('day')} className={`px-3 py-1 text-sm rounded ${ganttScale === 'day' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Jour</button>
                    <button onClick={() => setGanttScale('week')} className={`px-3 py-1 text-sm rounded ${ganttScale === 'week' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Semaine</button>
                    <button onClick={() => setGanttScale('month')} className={`px-3 py-1 text-sm rounded ${ganttScale === 'month' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Mois</button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="grid" style={{ gridTemplateColumns: '300px 1fr' }}>
                    <div className="sticky top-0 bg-gray-100 border-r border-b border-gray-200 z-20">
                        <div className="h-12 flex items-center px-4 font-semibold text-gray-700">Action</div>
                    </div>
                    <div className="sticky top-0 bg-gray-100 border-b border-gray-200 z-20">
                        <div className="relative flex" style={{ width: `${totalWidth}px` }}>
                            {timelineColumns.map((col, index) => (
                                <div key={index} className="flex-shrink-0 text-center py-3 border-r border-gray-200" style={{ width: `${col.width}px` }}>
                                    <span className="text-xs font-medium text-gray-600">{col.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-r border-gray-200">
                        {validActions.map(action => (
                            <div key={action.id} className="h-12 flex items-center px-4 border-b border-gray-100 hover:bg-gray-50">
                                 <div className="flex items-center gap-2 w-full">
                                    <AssigneeAvatars assignee_ids={action.assignee_ids} users={users} />
                                    <p className="text-sm font-medium text-gray-800 truncate" title={action.title}>{action.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div ref={ganttRef} className="relative">
                        {timelineColumns.map((col, index, arr) => (
                            <div key={index} className="absolute top-0 bottom-0 border-r border-gray-100" style={{ left: `${arr.slice(0, index).reduce((acc, c) => acc + c.width, 0)}px`, width: `${col.width}px`, zIndex: 1 }}></div>
                        ))}
                        
                        {validActions.map((action, index) => {
                            const { left, width } = calculateBarPositionAndWidth(action);
                            const config = actionTypeConfig[action.type];
                            const quadrant = getQuadrant(action.gain, action.effort);
                            const duration = Math.ceil((new Date(action.due_date).getTime() - new Date(action.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            const isCompleted = action.status === 'Fait';
                            const tooltipContent = `<div class="text-left p-1"><div class="font-bold text-base mb-2">${action.title}</div><div class="text-xs text-gray-300 mb-2">${new Date(action.start_date + 'T00:00:00').toLocaleDateString('fr-FR')} → ${new Date(action.due_date + 'T00:00:00').toLocaleDateString('fr-FR')}</div><div class="text-xs font-semibold px-2 py-1 rounded-full w-fit ${quadrant.color} ${quadrant.textColor}">${quadrant.name}</div></div>`;

                            return (
                                <div key={action.id} className="absolute h-12 flex items-center" style={{ top: `${index * 48}px`, left: `${left}px`, width: `${width}px`, zIndex: 10 }}>
                                    <Tooltip content={tooltipContent}>
                                        <div
                                            className={`w-full h-8 ${config.barBg} rounded shadow-sm cursor-move flex items-center justify-between px-2 relative transition-all group-hover:brightness-110 ${isCompleted ? 'opacity-60' : ''}`}
                                            onMouseDown={(e) => handleMouseDown(e, action.id, 'move')}
                                            onDoubleClick={() => onCardClick(action)}
                                        >
                                            <p className="text-xs font-semibold text-white truncate">
                                                {isCompleted && '✅ '}
                                                {action.title}
                                            </p>
                                            <span className="text-xs text-white/80 font-mono ml-2">{formatDuration(duration)}</span>
                                            <div 
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-black bg-opacity-10 hover:bg-opacity-30 rounded-r-md"
                                                onMouseDown={(e) => handleMouseDown(e, action.id, 'resize-right')}
                                            />
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {confirmationModal && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-800">Confirmer le changement ?</h3>
                        <p className="text-sm text-gray-600 mt-2">L'échéance de l'action <strong className="text-blue-600">{confirmationModal.action.title}</strong> va être modifiée.</p>
                        <div className="text-xs mt-4 space-y-1">
                            <p>Date d'origine : {new Date(confirmationModal.originalStartDate + 'T00:00:00').toLocaleDateString('fr-FR')} → {new Date(confirmationModal.originalEndDate + 'T00:00:00').toLocaleDateString('fr-FR')}</p>
                            <p className="font-bold">Nouvelle date : {new Date(confirmationModal.newStartDate + 'T00:00:00').toLocaleDateString('fr-FR')} → {new Date(confirmationModal.newEndDate + 'T00:00:00').toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={handleCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold">Annuler</button>
                            <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">Confirmer</button>
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

    const [view, setView] = useState('gantt');
    const [actions, setActions] = useState<Action[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState<Action | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    
    const [ganttScale, setGanttScale] = useState<'day' | 'week' | 'month'>('week');

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
    }, [module, updateA3Module, setActions]);

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

    const handleUpdateAction = useCallback((actionId: string, updates: Partial<Action>) => {
        setActions(currentActions => {
            const updatedActions = currentActions.map(action =>
                action.id === actionId
                    ? { ...action, ...updates }
                    : action
            );
            
            // On met à jour la base de données ici, avec la liste fraîchement mise à jour
            updateA3Module(module.id, { content: { ...module.content, actions: updatedActions } });
            
            // On retourne la nouvelle liste pour que React mette à jour l'état
            return updatedActions;
        });
    }, [module.id, module.content, updateA3Module]); // Les dépendances sont stables !
    
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
                                {view === 'gantt' && <GanttView 
                                    actions={actions} 
                                    users={currentProjectMembers} 
                                    onUpdateAction={handleUpdateAction} 
                                    onCardClick={openActionModal}
                                    ganttScale={ganttScale}
                                    setGanttScale={setGanttScale}
                                />}
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