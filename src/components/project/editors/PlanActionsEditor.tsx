// src/components/project/editors/PlanActionsEditor.tsx

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
// Helper pour convertir une string "YYYY-W##" en date du lundi correspondant
const getDateOfISOWeek = (weekString: string): Date => {
    const [year, week] = weekString.split('-W').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const isoWeekStart = simple;
    if (dayOfWeek <= 4) {
        isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
        isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return isoWeekStart;
};

const ActionModal = React.memo(({ isOpen, onClose, onSave, action, projectMembers, ganttScale }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (action: Action) => void, 
    action: Action | null, 
    projectMembers: User[],
    ganttScale: 'day' | 'week' | 'month' // Nouvelle prop
}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState<Partial<Action>>({});
    const [duration, setDuration] = useState(7);
    const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('days');

    // State local pour les inputs week/month
    const [weekValue, setWeekValue] = useState('');
    const [monthValue, setMonthValue] = useState('');

    useEffect(() => {
        // ... (Logique d'initialisation du formulaire, légèrement modifiée)
        const initialStartDate = action?.start_date || new Date().toISOString().split('T')[0];
        const initialData = action || { 
            title: '', description: '', assignee_ids: [], status: 'À faire', 
            type: 'simple', due_date: '', start_date: initialStartDate, 
            effort: 5, gain: 5 
        };
        setFormData(initialData);
        // ... (Le reste de l'initialisation de la durée est inchangé)
    }, [action]);

    // EFFET PRINCIPAL pour la synchronisation des dates
    useEffect(() => {
        if (!formData.start_date) return;
        const startDate = new Date(formData.start_date);
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
        if (ganttScale === 'day') {
            startDateStr = value;
        } else if (ganttScale === 'week') {
            setWeekValue(value);
            if (value) {
                startDateStr = getDateOfISOWeek(value).toISOString().split('T')[0];
            }
        } else if (ganttScale === 'month') {
            setMonthValue(value);
            if (value) {
                startDateStr = `${value}-01`;
            }
        }
        setFormData(p => ({ ...p, start_date: startDateStr }));
    };

    // ... (autres handlers: handleChange, handleRangeChange, toggleAssignee, getQuadrant sont inchangés)

    return (
        <div className="fixed inset-0 ..."> {/* Conteneur de la modale */}
            <div className="bg-white rounded-lg ..."> {/* Contenu de la modale */}
                <h2 ...>...</h2>
                <form ...>
                    {/* ... (Sections Description, Équipe, etc. inchangées) ... */}
                    
                    <PDCASection title="Détails" icon={<Table size={20} />}>
                        <div className="space-y-6">
                            {/* ... (Statut & Type d'action inchangés) ... */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 flex items-center mb-2"><Calendar size={14} className="mr-2"/> Échéance</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500">
                                            {ganttScale === 'day' && "Date de début"}
                                            {ganttScale === 'week' && "Semaine de début"}
                                            {ganttScale === 'month' && "Mois de début"}
                                        </label>
                                        
                                        {/* INPUT DE DATE CONDITIONNEL */}
                                        {ganttScale === 'day' && (
                                            <input type="date" value={formData.start_date || ''} onChange={(e) => handleDateInputChange(e.target.value)} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                        )}
                                        {ganttScale === 'week' && (
                                            <input type="week" value={weekValue} onChange={(e) => handleDateInputChange(e.target.value)} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                        )}
                                        {ganttScale === 'month' && (
                                            <input type="month" value={monthValue} onChange={(e) => handleDateInputChange(e.target.value)} className="p-2 border bg-white border-gray-300 rounded w-full" />
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Durée</label>
                                        {/* ... (Input de durée inchangé) ... */}
                                    </div>
                                </div>
                                {formData.due_date && <p className="text-xs text-gray-500 mt-2">Période : <span className="font-semibold">{new Date(formData.start_date + 'T00:00:00').toLocaleDateString('fr-FR')} au {new Date(formData.due_date + 'T00:00:00').toLocaleDateString('fr-FR')}</span></p>}
                            </div>
                        </div>
                    </PDCASection>

                    {/* ... (Section Priorisation & boutons inchangés) ... */}
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

// Remplace complètement l'ancien GanttView dans src/components/project/editors/PlanActionsEditor.tsx

// Remplacez votre GanttView par celui-ci

// Remplacez votre GanttView par cette version finale avec aimantation

// Remplacez votre GanttView par cette version finale et complète

// Remplacez votre GanttView par cette version finale et complète

const GanttView = ({ actions, users, onUpdateAction, onCardClick }: { actions: Action[], users: User[], onUpdateAction: (id: string, updates: Partial<Action>) => void, onCardClick: (action: Action) => void }) => {
  const [ganttScale, setGanttScale] = useState<'day' | 'week' | 'month'>('week');
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
      start.setDate(today.getDate() - 30);
      const end = new Date(today);
      end.setDate(today.getDate() + 60);
      return { start, end };
    }
    const allDates = validActions.flatMap(a => [new Date(a.start_date), new Date(a.due_date)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
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
    const columns = [];
    let current = new Date(ganttStartDate);
    while (current <= ganttEndDate) {
      let label = '';
      let nextDate = new Date(current);
      switch (ganttScale) {
        case 'day':
          label = current.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          nextDate.setDate(current.getDate() + 1);
          break;
        case 'week':
          label = `S${getISOWeekNumber(current)}`;
          nextDate.setDate(current.getDate() + 7);
          break;
        case 'month':
          label = current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          nextDate.setMonth(current.getMonth() + 1);
          break;
      }
      columns.push({
        date: new Date(current),
        label,
        width: ganttScale === 'day' ? 50 : ganttScale === 'week' ? 80 : 150
      });
      current = nextDate;
    }
    return columns;
  }, [ganttStartDate, ganttEndDate, ganttScale]);
  
  const calculateBarPosition = (action: Action) => {
    const totalDuration = ganttEndDate.getTime() - ganttStartDate.getTime();
    if (totalDuration <= 0) return { left: 0, width: 0 };
    
    const actionStart = new Date(action.start_date).getTime();
    const actionEnd = new Date(action.due_date).getTime();
    const startOffset = actionStart - ganttStartDate.getTime();
    const actionDuration = actionEnd - actionStart;
    const left = (startOffset / totalDuration) * 100;
    const width = (actionDuration / totalDuration) * 100;
    return { left: Math.max(0, left), width: Math.max(0.5, width) };
  };

  const snapDateToScale = (date: Date, scale: 'day' | 'week' | 'month') => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    switch (scale) {
      case 'day':
        break;
      case 'week':
        const day = newDate.getDay();
        const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
        newDate.setDate(diff);
        break;
      case 'month':
        newDate.setDate(1);
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
      actionId,
      mode,
      startX: e.clientX,
      originalStartDate: new Date(action.start_date),
      originalEndDate: new Date(action.due_date),
      scale: ganttScale,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !ganttRef.current) return;
      const rect = ganttRef.current.getBoundingClientRect();
      if (rect.width === 0) return;
      const totalTime = ganttEndDate.getTime() - ganttStartDate.getTime();
      const pixelToTime = totalTime / rect.width;
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = deltaX * pixelToTime;
      let newStartDate = new Date(dragState.originalStartDate);
      let newEndDate = new Date(dragState.originalEndDate);
      if (dragState.mode === 'move') {
        newStartDate = new Date(dragState.originalStartDate.getTime() + deltaTime);
        newEndDate = new Date(dragState.originalEndDate.getTime() + deltaTime);
      } else if (dragState.mode === 'resize-right') {
        newEndDate = new Date(dragState.originalEndDate.getTime() + deltaTime);
      }
      newStartDate = snapDateToScale(newStartDate, dragState.scale);
      newEndDate = snapDateToScale(newEndDate, dragState.scale);
      if (newEndDate <= newStartDate) {
          const minDuration = dragState.scale === 'week' ? 7 : 1;
          newEndDate.setDate(newStartDate.getDate() + minDuration);
      }
      onUpdateAction(dragState.actionId, {
        start_date: newStartDate.toISOString().split('T')[0],
        due_date: newEndDate.toISOString().split('T')[0],
      });
    };

    const handleMouseUp = () => {
      if (!dragState) return;
      const action = validActions.find(a => a.id === dragState.actionId);
      if (!action) {
        setDragState(null);
        return;
      };
      const originalStartDateStr = dragState.originalStartDate.toISOString().split('T')[0];
      const originalEndDateStr = dragState.originalEndDate.toISOString().split('T')[0];
      if (action.start_date !== originalStartDateStr || action.due_date !== originalEndDateStr) {
        setConfirmationModal({
          action: action,
          newStartDate: action.start_date,
          newEndDate: action.due_date,
          originalStartDate: originalStartDateStr,
          originalEndDate: originalEndDateStr
        });
      }
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
  }, [dragState, onUpdateAction, validActions, ganttStartDate, ganttEndDate]);

  const handleConfirm = () => {
    if (!confirmationModal) return;
    setConfirmationModal(null);
  };

  const handleCancel = () => {
    if (!confirmationModal) return;
    onUpdateAction(confirmationModal.action.id, {
      start_date: confirmationModal.originalStartDate,
      due_date: confirmationModal.originalEndDate,
    });
    setConfirmationModal(null);
  };

  if (validActions.length === 0) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
            <GanttChartSquare className="w-16 h-16 mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2">Aucune action planifiée</h3>
            <p className="text-sm">Créez des actions avec des dates pour voir le Gantt.</p>
        </div>
    );
  }

  const totalWidth = timelineColumns.reduce((acc, col) => acc + col.width, 0);

  return (
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Diagramme de Gantt</h3>
            <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                <button onClick={() => setGanttScale('day')} className={`px-3 py-1 text-sm rounded ${ganttScale === 'day' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Jour</button>
                <button onClick={() => setGanttScale('week')} className={`px-3 py-1 text-sm rounded ${ganttScale === 'week' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Semaine</button>
                <button onClick={() => setGanttScale('month')} className={`px-3 py-1 text-sm rounded ${ganttScale === 'month' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>Mois</button>
            </div>
        </div>

        <div className="flex-1 overflow-auto">
            <div className="grid" style={{ gridTemplateColumns: '250px 1fr' }}>
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
                    {validActions.map(action => {
                         const config = actionTypeConfig[action.type];
                         return(
                            <div key={action.id} className={`h-12 flex items-center px-4 border-b border-gray-100 border-l-4 ${config.color}`}>
                                <p className="text-sm font-medium text-gray-800 truncate" title={action.title}>{action.title}</p>
                            </div>
                         )
                    })}
                </div>
                
                <div ref={ganttRef} className="relative overflow-hidden" style={{ width: `${totalWidth}px` }}>
                    {timelineColumns.map((col, index, arr) => (
                        <div key={index} className="absolute top-0 bottom-0 border-r border-gray-100" style={{ left: `${arr.slice(0, index).reduce((acc, c) => acc + c.width, 0) + col.width}px`, zIndex: 1 }}></div>
                    ))}
                    
                    {validActions.map((action, index) => {
                        const { left, width } = calculateBarPosition(action);
                        const config = actionTypeConfig[action.type];
                        const startDate = new Date(action.start_date);
                        const endDate = new Date(action.due_date);
                        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                        return (
                            <div key={action.id} className="absolute h-8 flex items-center group" style={{ top: `${index * 48 + 8}px`, left: `${left}%`, width: `${width}%`, zIndex: 10 }}>
                                <div
                                    className={`w-full h-full ${config.barBg} rounded shadow-sm cursor-move flex items-center justify-between px-2 relative transition-all group-hover:opacity-90`}
                                    onMouseDown={(e) => handleMouseDown(e, action.id, 'move')}
                                    onClick={() => onCardClick(action)}
                                >
                                    <p className="text-xs font-semibold text-white truncate">{action.title}</p>
                                    <span className="text-xs text-white/80 font-mono ml-2">{duration}j</span>
                                    <div 
                                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-black bg-opacity-10 hover:bg-opacity-30 rounded-r-md"
                                      onMouseDown={(e) => handleMouseDown(e, action.id, 'resize-right')}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {confirmationModal && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-800">Confirmer le changement ?</h3>
              <p className="text-sm text-gray-600 mt-2">
                L'échéance de l'action <strong className="text-blue-600">{confirmationModal.action.title}</strong> va être modifiée.
              </p>
              <div className="text-xs mt-4 space-y-1">
                  <p>Date d'origine : {new Date(confirmationModal.originalStartDate + 'T00:00:00').toLocaleDateString('fr-FR')} → {new Date(confirmationModal.originalEndDate + 'T00:00:00').toLocaleDateString('fr-FR')}</p>
                  <p className="font-bold">Nouvelle date : {new Date(confirmationModal.newStartDate + 'T00:00:00').toLocaleDateString('fr-FR')} → {new Date(confirmationModal.newEndDate + 'T00:00:00').toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={handleCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold">
                  Annuler
                </button>
                <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">
                  Confirmer
                </button>
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

    const [view, setView] = useState('gantt'); // Mettre 'gantt' par défaut pour voir les changements
    const [actions, setActions] = useState<Action[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState<Action | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    
    // NOUVEAU : L'état de l'échelle est maintenant ici !
    const [ganttScale, setGanttScale] = useState<'day' | 'week' | 'month'>('week');

    const currentProjectMembers = useMemo(() => { /* ... (inchangé) ... */ }, [projectMembers, allUsersInApp, module.project]);

    useEffect(() => { /* ... (inchangé) ... */ }, [module]);

    const saveActionsToDb = useCallback((updatedActions: Action[]) => { /* ... (inchangé) ... */ }, [module, updateA3Module, setActions]);

    const handleSaveAction = useCallback((actionData: Action) => { /* ... (inchangé) ... */ }, [actions, saveActionsToDb]);

    const handleUpdateAction = useCallback((actionId: string, updates: Partial<Action>) => { /* ... (inchangé) ... */ }, [actions, saveActionsToDb]);
    
    const handleSetActions = useCallback((updatedActions: Action[], changedItem: Action) => { /* ... (inchangé) ... */ }, [saveActionsToDb]);

    const openActionModal = (action: Action | null = null) => {
        setEditingAction(action);
        setIsActionModalOpen(true);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-8 z-50">
            <div className="bg-white rounded-2xl shadow-xl flex flex-col w-full h-full overflow-hidden">
                {/* Header (inchangé) */}
                <header>...</header>

                <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden p-4 sm:p-6">
                    {/* Barre de navigation des vues (inchangée) */}
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4 flex-shrink-0">...</div>

                    <main className="flex-1 overflow-y-auto min-h-0">
                        {loading || !currentProjectMembers ? <div className="text-center p-8">Chargement...</div> : (
                            <>
                                {view === 'home' && <HomeView ... />}
                                {view === 'kanban' && <KanbanByPersonView ... />}
                                {view === 'matrix' && <MatrixView ... />}
                                
                                {view === 'gantt' && <GanttView 
                                    actions={actions} 
                                    users={currentProjectMembers} 
                                    onUpdateAction={handleUpdateAction} 
                                    onCardClick={openActionModal}
                                    // On passe l'état et la fonction de mise à jour
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
                    // On passe l'échelle actuelle à la modale !
                    ganttScale={ganttScale} 
                />}
                
                {/* Modale d'aide (inchangée) */}
                {showHelp && ( <div>...</div> )}
            </div>
        </div>
    );
};