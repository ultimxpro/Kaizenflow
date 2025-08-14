// PlanActionsEditor.tsx

// --- DÉPENDANCES ---
// Assurez-vous d'avoir installé ces dépendances dans votre projet :
// npm install @supabase/supabase-js tippy.js
// Assurez-vous également que React, ReactDOM et Font Awesome sont configurés.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // Assurez-vous que votre bundler peut gérer les imports CSS

// --- CONFIGURATION & DONNÉES ---
const useMockData = true; // Mettre à false pour utiliser Supabase (après configuration CORS)

// Remplacez par vos propres informations Supabase si vous n'utilisez pas les données mock
const supabaseUrl = 'https://hvaxjxqisjpbsprwtexo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2YXhqeHFpc2pwYnNwcmtldHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg2MzM0NDYsImV4cCI6MjAzNDIwOTQ0Nn0.p4x2i9m1DqHD2cFHw4Kuc-0q52vQ3O2a5y--u6B4-S4';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Données de démonstration enrichies
const mockUsers = [
    { id: 'user-1', name: 'Claire Martin' },
    { id: 'user-2', name: 'Jean Dupont' },
    { id: 'user-3', name: 'Pierre Simon' },
];
const mockData = [
  { id: '1', title: 'Optimiser le rangement des outils', status: 'À faire', due_date: '2025-08-25', start_date: '2025-08-10', type: 'simple', assignee_id: 'user-1', effort: 3, gain: 8, description: 'Mise en place du 5S pour les postes 1 et 2.' },
  { id: '2', title: 'Créer un gabarit de perçage', status: 'À faire', due_date: '2025-09-30', start_date: '2025-09-01', type: 'poka-yoke', assignee_id: 'user-3', effort: 8, gain: 9, description: 'Gabarit pour la pièce XA-42 pour éviter les erreurs.' },
  { id: '3', title: 'Mettre à jour la doc sécurité', status: 'En cours', due_date: '2025-08-14', start_date: '2025-08-05', type: 'securisation', assignee_id: 'user-1', effort: 6, gain: 6, description: 'Revoir la documentation suite au nouvel équipement.' },
  { id: '4', title: 'Installer un carter de protection', status: 'Terminé', due_date: '2025-08-10', start_date: '2025-08-01', type: 'securisation', assignee_id: 'user-2', effort: 7, gain: 4, description: 'Carter sur la machine Z, zone de coupe.' },
  { id: '5', title: 'Former l\'équipe au nouveau process', status: 'En cours', due_date: '2025-09-15', start_date: '2025-09-05', type: 'simple', assignee_id: 'user-2', effort: 9, gain: 2, description: 'Formation sur le nouveau logiciel de gestion.' },
];

// --- CONFIGURATION VISUELLE ---
const actionTypeConfig = {
  simple: { name: 'Action Simple', icon: <i className="fa-solid fa-lightbulb text-blue-500"></i>, color: 'border-blue-500', textColor: 'text-blue-500', progressBg: 'bg-blue-500' },
  securisation: { name: 'Sécurisation', icon: <i className="fa-solid fa-shield-halved text-red-500"></i>, color: 'border-red-500', textColor: 'text-red-500', progressBg: 'bg-red-500' },
  'poka-yoke': { name: 'Poka-Yoke', icon: <i className="fa-solid fa-puzzle-piece text-yellow-500"></i>, color: 'border-yellow-500', textColor: 'text-yellow-500', progressBg: 'bg-yellow-500' },
};

// --- HOOK POUR INFOBULLES ---
const useTippy = (content) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            const instance = tippy(ref.current, {
                content: content,
                theme: 'kaizen',
                animation: 'fade',
                arrow: true,
                allowHTML: true,
            });
            return () => {
                if (instance) {
                    instance.destroy();
                }
            };
        }
    }, [content]);
    return ref;
};

// --- COMPOSANTS ---

const DateIndicator = ({ dueDate }) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    let color = 'text-green-600';
    let text = "À l'heure";
    if (diffDays < 0) { color = 'text-red-600'; text = `En retard de ${Math.abs(Math.round(diffDays))}j`; }
    else if (diffDays <= 7) { color = 'text-yellow-600'; text = `Échéance proche (${Math.round(diffDays)}j)`; }

    const tippyRef = useTippy(`Échéance: ${due.toLocaleDateString('fr-FR')}`);
    return (
        <div ref={tippyRef} className={`flex items-center text-xs font-semibold ${color}`}>
            <i className="fa-solid fa-circle mr-2 text-[6px]"></i>
            <span>{text}</span>
        </div>
    );
};

const ActionCard = ({ action, onDragStart, onClick }) => {
  const config = actionTypeConfig[action.type];
  const user = mockUsers.find(u => u.id === action.assignee_id);
  const tooltipContent = `
    <div>
        <h4 class="font-bold">${action.title}</h4>
        <p class="text-xs text-gray-300">${action.description || "Pas de description."}</p>
        <p class="text-xs mt-2"><strong>Responsable:</strong> ${user?.name || 'N/A'}</p>
    </div>
  `;
  const tippyRef = useTippy(tooltipContent);
  
  return (
    <div
      ref={tippyRef}
      draggable="true"
      onDragStart={(e) => onDragStart(e, action)}
      onClick={() => onClick(action)}
      className={`action-card bg-white rounded-lg shadow-sm mb-3 border-l-4 ${config.color} p-3 hover:shadow-md`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`flex items-center text-xs font-semibold ${config.textColor}`}>
          {React.cloneElement(config.icon, { className: 'mr-2' })}
          {config.name.toUpperCase()}
        </span>
        <span className="text-xs font-medium text-gray-500">{user?.name || 'N/A'}</span>
      </div>
      <h3 className="font-bold text-gray-800 text-sm">{action.title}</h3>
      <div className="mt-3">
        <DateIndicator dueDate={action.due_date} />
      </div>
    </div>
  );
};

const ActionModal = ({ isOpen, onClose, onSave, action }) => {
    if (!isOpen) return null;
    const [formData, setFormData] = useState(action || { title: '', description: '', assignee_id: '', status: 'À faire', type: 'simple', due_date: new Date().toISOString().split('T')[0], start_date: new Date().toISOString().split('T')[0], effort: 5, gain: 5 });
    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value) : e.target.value }));
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">{action ? "Modifier l'action" : "Créer une action"}</h2>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="title" value={formData.title} onChange={handleChange} placeholder="Titre de l'action" className="p-2 border rounded col-span-2" required />
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="p-2 border rounded col-span-2 h-24"></textarea>
                        <select name="assignee_id" value={formData.assignee_id} onChange={handleChange} className="p-2 border rounded">
                            <option value="">-- Responsable --</option>
                            {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <select name="status" value={formData.status} onChange={handleChange} className="p-2 border rounded"><option>À faire</option><option>En cours</option><option>Terminé</option></select>
                        <select name="type" value={formData.type} onChange={handleChange} className="p-2 border rounded"><option value="simple">Action Simple</option><option value="securisation">Sécurisation</option><option value="poka-yoke">Poka-Yoke</option></select>
                        <div><label className="text-sm text-gray-600">Date de début</label><input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="p-2 border rounded w-full" /></div>
                        <div><label className="text-sm text-gray-600">Date de fin</label><input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className="p-2 border rounded w-full" /></div>
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div><label>Effort: {formData.effort}</label><input type="range" name="effort" min="1" max="10" value={formData.effort} onChange={handleChange} className="w-full" /></div>
                            <div><label>Gain: {formData.gain}</label><input type="range" name="gain" min="1" max="10" value={formData.gain} onChange={handleChange} className="w-full" /></div>
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

// --- VUES SPÉCIFIQUES ---
const HomeView = ({ actions, onCardClick }) => {
    const columns = useMemo(() => {
        const grouped = { securisation: [], simple: [], 'poka-yoke': [] };
        actions.forEach(action => { if (grouped[action.type]) grouped[action.type].push(action); });
        return grouped;
    }, [actions]);
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(columns).map(([type, items]) => (
                <div key={type} className="home-column bg-gray-200 rounded-lg p-4">
                    <h2 className={`font-bold mb-4 px-1 flex items-center gap-2 ${actionTypeConfig[type].textColor}`}>
                        {actionTypeConfig[type].icon} {actionTypeConfig[type].name}
                        <span className="text-sm font-normal text-gray-500">{items.length}</span>
                    </h2>
                    <div>{items.map(item => <ActionCard key={item.id} action={item} onDragStart={() => {}} onClick={onCardClick} />)}</div>
                </div>
            ))}
        </div>
    );
};

const KanbanByPersonView = ({ actions, setActions, onCardClick }) => {
    const [selectedUser, setSelectedUser] = useState(mockUsers[0].id);
    const [draggedItem, setDraggedItem] = useState(null);
    
    const filteredActions = useMemo(() => actions.filter(a => a.assignee_id === selectedUser), [actions, selectedUser]);
    const columns = useMemo(() => {
        const grouped = { 'À faire': [], 'En cours': [], 'Terminé': [] };
        filteredActions.forEach(action => { if (grouped[action.status]) grouped[action.status].push(action); });
        return grouped;
    }, [filteredActions]);

    const handleDrop = (e, targetStatus) => {
        e.preventDefault(); e.currentTarget.classList.remove('drag-over');
        if (!draggedItem || draggedItem.status === targetStatus) return;
        const updatedActions = actions.map(act => act.id === draggedItem.id ? { ...act, status: targetStatus } : act);
        setActions(updatedActions, { ...draggedItem, status: targetStatus });
    };
    
    return (
        <div>
            <div className="mb-4">
                <select onChange={(e) => setSelectedUser(e.target.value)} value={selectedUser} className="p-2 border rounded shadow-sm">
                    {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" onDragEnd={() => setDraggedItem(null)}>
                {Object.entries(columns).map(([status, items]) => (
                    <div key={status} className="kanban-column bg-gray-200 rounded-lg p-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, status)} onDragEnter={(e) => e.currentTarget.classList.add('drag-over')} onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}>
                        <h2 className="font-bold text-gray-700 mb-4 px-1">{status} <span className="text-sm font-normal text-gray-500">{items.length}</span></h2>
                        <div>{items.map(item => <ActionCard key={item.id} action={item} onDragStart={(e, i) => setDraggedItem(i)} onClick={onCardClick} />)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MatrixView = ({ actions, onCardClick }) => {
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

    const Quadrant = ({ title, emoji, items, bgColor }) => (
        <div className={`rounded-lg p-4 flex flex-col ${bgColor}`}>
            <h3 className="font-bold text-center mb-2">{title} <span className="text-xl">{emoji}</span></h3>
            <div className="matrix-quadrant bg-white bg-opacity-60 rounded p-2 overflow-y-auto flex-grow">
                {items.map(action => <ActionCard key={action.id} action={action} onDragStart={() => {}} onClick={onCardClick} />)}
            </div>
        </div>
    );
    return (
        <div className="relative p-8 bg-white rounded-lg shadow-md">
            <div className="absolute top-1/2 -left-4 -translate-y-1/2 -rotate-90 font-bold text-gray-600 tracking-wider">GAIN</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 font-bold text-gray-600 tracking-wider">EFFORT</div>
            <div className="grid grid-cols-2 grid-rows-2 gap-4">
                <Quadrant title="Quick Win" emoji="🔥" items={matrix['quick-wins']} bgColor="bg-green-100" />
                <Quadrant title="Gros projet" emoji="🗓️" items={matrix['major-projects']} bgColor="bg-yellow-100" />
                <Quadrant title="Effort simple" emoji="👌" items={matrix['fill-ins']} bgColor="bg-blue-100" />
                <Quadrant title="En dernier" emoji="🤔" items={matrix['thankless-tasks']} bgColor="bg-red-100" />
            </div>
        </div>
    );
};

const GanttView = ({ actions, onCardClick }) => {
    if (actions.length === 0) return <div className="text-center p-8">Aucune action à afficher.</div>;
    
    const sortedActions = [...actions].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const startDate = new Date(Math.min(...sortedActions.map(a => new Date(a.start_date))));
    const endDate = new Date(Math.max(...sortedActions.map(a => new Date(a.due_date))));
    startDate.setDate(startDate.getDate() - 2);
    endDate.setDate(endDate.getDate() + 2);
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const todayPosition = ((new Date() - startDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;

    const getDaysFromStart = (date) => (new Date(date) - startDate) / (1000 * 3600 * 24);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Chronologie Gantt</h2>
            <div className="relative" style={{ minWidth: '800px' }}>
                {/* Today Line */}
                {todayPosition > 0 && todayPosition < 100 &&
                    <div className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed z-10" style={{ left: `${todayPosition}%` }}>
                        <span className="absolute -top-5 -translate-x-1/2 text-xs bg-red-500 text-white px-1 rounded">Auj.</span>
                    </div>
                }
                {sortedActions.map((action, index) => {
                    const left = (getDaysFromStart(action.start_date) / totalDays) * 100;
                    const width = (getDaysFromStart(action.due_date) - getDaysFromStart(action.start_date)) / totalDays * 100;
                    const config = actionTypeConfig[action.type];
                    const tooltipContent = `<strong>${action.title}</strong><br>Du ${new Date(action.start_date).toLocaleDateString()} au ${new Date(action.due_date).toLocaleDateString()}<br>Responsable: ${mockUsers.find(u => u.id === action.assignee_id)?.name || 'N/A'}`;
                    const tippyRef = useTippy(tooltipContent);
                    return (
                        <div key={action.id} className="w-full h-10 mb-2 flex items-center">
                            <div className="w-1/4 pr-4 text-sm font-medium truncate">{action.title}</div>
                            <div className="w-3/4 h-full relative">
                                <div ref={tippyRef} onClick={() => onCardClick(action)} className={`gantt-bar absolute h-full rounded ${config.progressBg} cursor-pointer`} style={{ left: `${left}%`, width: `${width}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL DE L'APPLICATION ---
const PlanActionsEditor = () => {
  const [view, setView] = useState('home');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);

  useEffect(() => {
    setActions(mockData.map(d => ({...d, assignee_name: mockUsers.find(u => u.id === d.assignee_id)?.name })));
    setLoading(false);
  }, []);

  const handleSaveAction = (actionData) => {
      if (actionData.id) {
          setActions(actions.map(a => a.id === actionData.id ? actionData : a));
      } else {
          setActions([...actions, { ...actionData, id: Date.now().toString() }]);
      }
      setIsModalOpen(false); setEditingAction(null);
  };
  
  const handleSetActions = (updatedActions, changedItem) => setActions(updatedActions);
  const openModal = (action = null) => { setEditingAction(action); setIsModalOpen(true); };

  const TabButton = ({ active, onClick, children, icon }) => (
    <button onClick={onClick} className={`py-2 px-4 rounded-md text-sm font-medium flex items-center gap-2 ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
      <i className={`fa-solid ${icon}`}></i> {children}
    </button>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Plan d'Actions Kaizen</h1>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm">
                <TabButton active={view === 'home'} onClick={() => setView('home')} icon="fa-layer-group">Par Type</TabButton>
                <TabButton active={view === 'kanban'} onClick={() => setView('kanban')} icon="fa-user-group">Par Personne</TabButton>
                <TabButton active={view ==='matrix'} onClick={() => setView('matrix')} icon="fa-table-cells-large">Matrice</TabButton>
                <TabButton active={view === 'gantt'} onClick={() => setView('gantt')} icon="fa-chart-gantt">Gantt</TabButton>
            </div>
            <button onClick={() => openModal()} className="py-2 px-4 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 flex items-center gap-2">
                <i className="fa-solid fa-plus"></i> Nouvelle Action
            </button>
        </div>
      </header>
      
      <main>
        {loading ? <div className="text-center p-8">Chargement...</div> : (
            <>
                {view === 'home' && <HomeView actions={actions} onCardClick={openModal} />}
                {view === 'kanban' && <KanbanByPersonView actions={actions} setActions={handleSetActions} onCardClick={openModal} />}
                {view === 'matrix' && <MatrixView actions={actions} onCardClick={openModal} />}
                {view === 'gantt' && <GanttView actions={actions} onCardClick={openModal} />}
            </>
        )}
      </main>

      <ActionModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingAction(null); }}
        onSave={handleSaveAction}
        action={editingAction}
      />
    </div>
  );
};

export default PlanActionsEditor;
