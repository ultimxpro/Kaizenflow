import React, { useState, useEffect, useRef } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { Plus, X, HelpCircle, GitBranch, Image as ImageIcon, Trash2 } from 'lucide-react';

// --- Interfaces ---
interface Cause { id: string; text: string; imageUrl?: string; }
interface IshikawaDiagram { id: string; name: string; problem: string; machine: Cause[]; methode: Cause[]; materiel: Cause[]; mainOeuvre: Cause[]; }
interface IshikawaContent { diagrams: IshikawaDiagram[]; activeDiagramId: string | null; }

// --- Sous-composant CauseItem ---
const CauseItem: React.FC<{
    cause: Cause; index: number; onUpdate: (field: 'text' | 'imageUrl', value: string) => void;
    onRemove: () => void;
}> = ({ cause, index, onUpdate, onRemove }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdate('imageUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex items-start space-x-2 text-sm p-2 rounded-md hover:bg-gray-200 bg-white border border-gray-200">
            <span className="font-semibold pt-1 text-gray-500">{index + 1}.</span>
            <div className="flex-1 flex flex-col">
                <input
                    type="text" value={cause.text} onChange={(e) => onUpdate('text', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nouvelle cause..."
                />
                {cause.imageUrl && <img src={cause.imageUrl} alt="Aperçu de la cause" className="mt-1.5 w-full h-24 object-cover rounded-md border"/>}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-blue-500 pt-1" title="Ajouter une image"><ImageIcon className="w-4 h-4" /></button>
            <button onClick={onRemove} className="text-gray-400 hover:text-red-500 pt-1" title="Supprimer la cause"><Trash2 className="w-4 h-4" /></button>
        </div>
    );
};

// --- Sous-composant CategoryColumn ---
const CategoryColumn: React.FC<{
    diagram: IshikawaDiagram; categoryKey: keyof Omit<IshikawaDiagram, 'id' | 'name' | 'problem'>;
    title: string; color: string; onUpdateDiagram: (updatedDiagram: IshikawaDiagram) => void;
}> = ({ diagram, categoryKey, title, color, onUpdateDiagram }) => {
    const causes = diagram[categoryKey] || [];
    const handleAddCause = () => { onUpdateDiagram({ ...diagram, [categoryKey]: [...causes, { id: Date.now().toString(), text: '' }] }); };
    const handleUpdateCause = (causeId: string, field: 'text' | 'imageUrl', value: string) => {
        const updatedCauses = causes.map(c => c.id === causeId ? { ...c, [field]: value } : c);
        onUpdateDiagram({ ...diagram, [categoryKey]: updatedCauses });
    };
    const handleRemoveCause = (causeId: string) => { onUpdateDiagram({ ...diagram, [categoryKey]: causes.filter(c => c.id !== causeId) }); };

    return (
        <div className="bg-gray-200 rounded-lg flex flex-col h-full border-t-4" style={{ borderColor: color }}>
            <h3 className="font-bold text-center text-gray-800 p-3">{title}</h3>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
                {causes.map((cause, index) => (
                    <CauseItem 
                        key={cause.id} cause={cause} index={index}
                        onUpdate={(field, value) => handleUpdateCause(cause.id, field, value)}
                        onRemove={() => handleRemoveCause(cause.id)}
                    />
                ))}
            </div>
            <button onClick={handleAddCause} className="mt-auto p-2 flex items-center justify-center space-x-1 text-xs text-gray-500 hover:text-blue-600 font-medium border-t">
                <Plus className="w-3.5 h-3.5" /><span>Ajouter une cause</span>
            </button>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
export const IshikawaEditor: React.FC<{ module: A3Module; onClose: () => void; }> = ({ module, onClose }) => {
  const { updateA3Module } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  
  const initializeData = (): IshikawaContent => {
    const content = module.content;
    if (content && content.diagrams && content.diagrams.length > 0) {
      return { diagrams: content.diagrams, activeDiagramId: content.activeDiagramId || content.diagrams[0].id };
    }
    const firstDiagram: IshikawaDiagram = { id: Date.now().toString(), name: 'Analyse #1', problem: '', machine: [], methode: [], materiel: [], mainOeuvre: [] };
    return { diagrams: [firstDiagram], activeDiagramId: firstDiagram.id };
  };

  const [content, setContent] = useState<IshikawaContent>(initializeData());
  const activeDiagram = content.diagrams.find(d => d.id === content.activeDiagramId);

  useEffect(() => {
    const timer = setTimeout(() => { updateA3Module(module.id, { content }); }, 500);
    return () => clearTimeout(timer);
  }, [content, module.id, updateA3Module]);

  const handleUpdateDiagram = (updatedDiagram: IshikawaDiagram) => {
      setContent(prev => ({ ...prev, diagrams: prev.diagrams.map(d => d.id === updatedDiagram.id ? updatedDiagram : d) }));
  };
  
  const handleAddDiagram = () => {
      const newDiagram: IshikawaDiagram = {
          id: Date.now().toString(), name: `Analyse #${content.diagrams.length + 1}`, problem: activeDiagram?.problem || '',
          machine: [], methode: [], materiel: [], mainOeuvre: []
      };
      setContent(prev => ({ diagrams: [...prev.diagrams, newDiagram], activeDiagramId: newDiagram.id }));
  };
  
  const categories = [
    { key: 'machine' as const, title: 'Machine', color: '#EF4444' }, // Rouge
    { key: 'methode' as const, title: 'Méthode', color: '#3B82F6' }, // Bleu
    { key: 'materiel' as const, title: 'Matériel', color: '#F59E0B' }, // Jaune/Ambre
    { key: 'mainOeuvre' as const, title: 'Main d\'œuvre', color: '#22C55E' } // Vert
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
      <div className="bg-white rounded-2xl shadow-xl flex flex-col w-full h-full overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b" style={{ flexGrow: 0, flexShrink: 0 }}>
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <GitBranch className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Diagramme d'Ishikawa (4M)</h1>
            </div>
            <div className="flex items-center space-x-3">
                <button onClick={() => setShowHelp(true)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center" title="Aide"><HelpCircle className="w-5 h-5 text-gray-600" /></button>
                <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center" title="Fermer"><X className="w-5 h-5 text-gray-600" /></button>
            </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
            <div className="w-1/5 bg-gray-50 border-r p-4 overflow-y-auto">
                <button onClick={handleAddDiagram} className="w-full flex items-center justify-center space-x-2 px-4 py-2 mb-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Nouvelle Analyse</span>
                </button>
                <div className="space-y-2">
                    {content.diagrams.map(d => (
                        <button 
                            key={d.id}
                            onClick={() => setContent(prev => ({...prev, activeDiagramId: d.id}))}
                            className={`w-full text-left p-2 rounded-md text-sm ${content.activeDiagramId === d.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {d.name}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="w-4/5 bg-gray-100 flex flex-col overflow-y-auto p-6">
                {activeDiagram ? (
                    <div className="w-full h-full flex flex-col space-y-6">
                        <div className="bg-white border rounded-lg p-3 shadow-sm flex-shrink-0">
                             <label className="block text-sm font-bold text-gray-800 mb-1">Problème / Effet</label>
                             <textarea
                                value={activeDiagram.problem}
                                onChange={(e) => handleUpdateDiagram({ ...activeDiagram, problem: e.target.value })}
                                className="w-full h-16 text-sm border-gray-300 rounded-md px-2 py-1"
                                placeholder="Décrivez le problème à analyser..."
                             />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 min-h-0">
                            {categories.map(cat => (
                                <CategoryColumn
                                    key={cat.key}
                                    diagram={activeDiagram}
                                    categoryKey={cat.key}
                                    title={cat.title}
                                    color={cat.color}
                                    onUpdateDiagram={handleUpdateDiagram}
                                />
                            ))}
                        </div>
                    </div>
                ) : <p className="m-auto text-gray-500">Sélectionnez ou créez une analyse pour commencer.</p>}
            </div>
        </div>
        
        {showHelp && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4">Comment utiliser le diagramme d'Ishikawa ?</h3>
                 <p className="text-sm text-gray-600">Le diagramme d'Ishikawa (ou 4M) permet d'identifier et de classer les causes possibles d'un problème en 4 grandes familles pour trouver la cause racine.</p>
                 <div className="flex justify-end mt-6">
                    <button onClick={() => setShowHelp(false)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Compris</button>
                 </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};