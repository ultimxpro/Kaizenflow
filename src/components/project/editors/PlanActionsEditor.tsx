// src/components/project/editors/PlanActionsEditor.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { A3Module, User } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { useAuth } from '../../../contexts/AuthContext';
import { HelpCircle, X, Layers, User as UserIcon, Table, GanttChartSquare, Plus, Users, Crown, Check, Calendar, Tag, Activity } from 'lucide-react';

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
    simple: { name: 'Action Simple', icon: '💡', color: 'border-blue-500', textColor: 'text-blue-600', barBg: 'bg-blue-500', a3Color: 'bg-blue-100 text-blue-800' },
    securisation: { name: 'Sécurisation', icon: '🛡️', color: 'border-red-500', textColor: 'text-red-600', barBg: 'bg-red-500', a3Color: 'bg-red-100 text-red-800' },
    'poka-yoke': { name: 'Poka-Yoke', icon: '🧩', color: 'border-yellow-500', textColor: 'text-yellow-600', barBg: 'bg-yellow-500', a3Color: 'bg-yellow-100 text-yellow-800' },
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

// ## DEBUT DU CODE CORRIGÉ 1/2 ##
const AssigneeAvatars = ({ assignee_ids, leader_id, users }: { assignee_ids: string[], leader_id?: string, users: User[] }) => (
    <div className="flex items-center -space-x-2">
        {assignee_ids.map(id => {
            const user = users.find(u => u.id === id);
            if (!user) return null;
            const isLeader = id === leader_id;
            return (
                <Tooltip key={id} content={`${user.nom}${isLeader ? ' (Leader)' : ''}`}>
                    <div className="relative">
                        <img 
                            src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} 
                            alt={user.nom} 
                            className="w-6 h-6 rounded-full border-2 border-white" 
                        />
                        {isLeader && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-white">
                                <Crown className="w-2.5 h-2.5 text-yellow-800" />
                            </div>
                        )}
                    </div>
                </Tooltip>
            );
        })}
    </div>
);
// ## FIN DU CODE CORRIGÉ 1/2 ##


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
                <AssigneeAvatars assignee_ids={action.assignee_ids} leader_id={action.leader_id} users={users} />
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

            if (diffDays % 30 === 0 && diffDays > 0) {
                setDuration(diffDays / 30);
                setDurationUnit('months');
            } else if (diffDays % 7 === 0 && diffDays > 0) {
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
            let newLeaderId = newAssignees.includes(prev.leader_id) ? prev.leader_id : (newAssignees[0] || undefined);
            if(newAssignees.length === 0) newLeaderId = undefined;
            return { ...prev, assignee_ids: newAssignees, leader_id: newLeaderId };
        });
    };

    const setLeader = (userId: string) => {
        if((formData.assignee_ids || []).includes(userId)) {
            setFormData(prev => ({...prev, leader_id: userId}));
        }
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
                        {/* ## DEBUT DU CODE CORRIGÉ 2/2 ## */}
                        <div className="flex flex-wrap gap-4">
                            {projectMembers.map(user => {
                                const isSelected = (formData.assignee_ids || []).includes(user.id);
                                const isLeader = formData.leader_id === user.id;
                                return (
                                    <div key={user.id} className="flex flex-col items-center">
                                        <div 
                                            onClick={() => toggleAssignee(user.id)} 
                                            className={`p-1 rounded-full cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-200'}`}
                                        >
                                            <div className="relative">
                                                <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.nom} className="w-14 h-14 rounded-full" />
                                                {isSelected && (
                                                    <Tooltip content={isLeader ? "Leader actuel" : "Promouvoir Leader"}>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setLeader(user.id); }} className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                                                            {isLeader ? (
                                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                                                                    <Crown className="w-3 h-3 text-yellow-800" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-5 h-5 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300">
                                                                    <Crown className="w-3 h-3 text-gray-400 hover:text-yellow-500" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs mt-1 font-semibold text-gray-700">{user.nom}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* ## FIN DU CODE CORRIGÉ 2/2 ## */}
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
                                        <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Durée</label>
                                        <div className="flex">
                                            <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value))} min="1" className="p-2 border bg-white border-gray-300 rounded-l w-1/2"/>
                                            <select value={durationUnit} onChange={e => setDurationUnit(e.target.value as any)} className="p-2 border bg-white border-gray-300 rounded-r w-1/2">
                                                <option value="days">Jours</option>
                                                <option value="weeks">Semaines</option>
                                                <option value="months">Mois</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                {formData.due_date && <p className="text-xs text-gray-500 mt-2">Date de fin prévisionnelle : <span className="font-semibold">{new Date(formData.due_date).toLocaleDateString()}</span></p>}
                            </div>
                        </div>
                    </PDCASection>

                    <PDCASection title="Priorisation" icon={<GanttChartSquare size={20} />}>
                        <div className="grid grid-cols-2 gap-6 items-center">
                            <div>
                                <div><label>Effort (Complexité): {formData.effort}</label><input type="range" name="effort" min="1" max="10" value={formData.effort} onChange={e => handleRangeChange('effort', e.target.value)} className="w-full" /></div>
                                <div className="mt-2"><label>Gain (Impact): {formData.gain}</label><input type="range" name="gain" min="1" max="10" value={formData.gain} onChange={e => handleRangeChange('gain', e.target.value)} className="w-full" /></div>
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
                    <h2 className={`font-bold mb-4 px-1 flex items-center gap-2 ${actionTypeConfig[type as ActionType].textColor}`}>
                        <span className="text-lg">{actionTypeConfig[type as ActionType].icon}</span> {actionTypeConfig[type as ActionType].name}
                        <span className="text-sm font-normal text-gray-500 ml-auto bg-gray-200 rounded-full px-2">{items.length}</span>
                    </h2>
                    <div className="overflow-y-auto flex-1 pr-2">{items.map(item => <ActionCard key={item.id} action={item} users={users} onDragStart={(e, i) => setDraggedItem(i)} onClick={onCardClick} />)}</div>
                </div>
            ))}
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
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
        if (!draggedItem || draggedItem.status === targetStatus) return;
        setActions(actions.map(act => act.id === draggedItem.id ? { ...act, status: targetStatus } : act), { ...draggedItem, status: targetStatus });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4 flex-shrink-0">
                <select onChange={(e) => setSelectedUser(e.target.value)} value={selectedUser} className="p-2 border bg-white border-gray-300 rounded shadow-sm text-gray-800">
                    {users.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0" onDragEnd={() => setDraggedItem(null)}>
                {Object.entries(columns).map(([status, items]) => (
                    <div key={status} className="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4 transition-colors"
                         onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, status as ActionStatus)}
                         onDragEnter={(e) => e.currentTarget.classList.add('bg-blue-50', 'border-blue-300')}
                         onDragLeave={(e) => e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300')}>
                        <h2 className="font-bold text-gray-700 mb-4 px-1">{status} <span className="text-sm font-normal text-gray-500">{items.length}</span></h2>
                        <div className="overflow-y-auto flex-1 pr-2">{items.map(item => <ActionCard key={item.id} action={item} users={users} onDragStart={(e, i) => setDraggedItem(i)} onClick={onCardClick} />)}</div>
                    </div>
                ))}
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
        e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
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
        <div className={`rounded-lg p-4 flex flex-col ${bgColor} transition-transform duration-200 hover:scale-105`}
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => handleDrop(e, quadrantName)}
             onDragEnter={(e) => (e.currentTarget as HTMLDivElement).classList.add('ring-2', 'ring-blue-400')}
             onDragLeave={(e) => (e.currentTarget as HTMLDivElement).classList.remove('ring-2', 'ring-blue-400')}>
            <h3 className="font-bold text-center mb-2 text-slate-800">{title} <span className="text-xl">{emoji}</span></h3>
            <div className="matrix-quadrant bg-white bg-opacity-40 rounded p-2 overflow-y-auto flex-grow">
                {items.map(action => <ActionCard key={action.id} action={action} users={users} onDragStart={(e, i) => setDraggedItem(i)} onClick={onCardClick} />)}
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

const GanttView = ({ actions, users, onCardClick }: { actions: Action[], users: User[], onCardClick: (action: Action) => void }) => {
    if (actions.length === 0) return <div className="text-center p-8 text-gray-500">Aucune action à afficher.</div>;

    const sortedActions = [...actions].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const startDate = new Date(Math.min(...sortedActions.map(a => new Date(a.start_date).getTime())));
    const endDate = new Date(Math.max(...sortedActions.map(a => new Date(a.due_date).getTime())));
    startDate.setDate(startDate.getDate() - 2);
    endDate.setDate(endDate.getDate() + 2);

    const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const getDaysFromStart = (dateStr: string) => (new Date(dateStr).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const todayPosition = (getDaysFromStart(new Date().toISOString()) / totalDays) * 100;

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
                        const leader = users.find(u => u.id === action.leader_id);
                        const tooltipContent = `<strong>${action.title}</strong><br>Du ${new Date(action.start_date).toLocaleDateString()} au ${new Date(action.due_date).toLocaleDateString()}<br>Leader: ${leader?.nom || 'N/A'}`;

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
        if (actionData.id && actions.find(a => a.id === actionData.id)) {
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