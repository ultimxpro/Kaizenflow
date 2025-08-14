import React, { useState } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { Plus, X, HelpCircle } from 'lucide-react';

interface FiveSEditorProps {
  module: A3Module;
}

interface FiveSItem {
  id: string;
  text: string;
  checked: boolean;
}

interface FiveSData {
  seiri: FiveSItem[];
  seiton: FiveSItem[];
  seiso: FiveSItem[];
  seiketsu: FiveSItem[];
  shitsuke: FiveSItem[];
}

export const FiveSEditor: React.FC<FiveSEditorProps> = ({ module }) => {
  const { updateA3Module } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  
  const data: FiveSData = module.content || {
    seiri: [],
    seiton: [],
    seiso: [],
    seiketsu: [],
    shitsuke: []
  };

  const updateData = (newData: Partial<FiveSData>) => {
    updateA3Module(module.id, {
      content: { ...data, ...newData }
    });
  };

  const addItem = (category: keyof FiveSData) => {
    const newItem: FiveSItem = {
      id: Date.now().toString(),
      text: '',
      checked: false
    };
    updateData({
      [category]: [...data[category], newItem]
    });
  };

  const updateItem = (category: keyof FiveSData, itemId: string, field: keyof FiveSItem, value: any) => {
    const updatedItems = data[category].map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    updateData({ [category]: updatedItems });
  };

  const removeItem = (category: keyof FiveSData, itemId: string) => {
    const updatedItems = data[category].filter(item => item.id !== itemId);
    updateData({ [category]: updatedItems });
  };

  const sections = [
    {
      key: 'seiri' as const,
      title: 'Seiri - Trier',
      description: 'Éliminer l\'inutile',
      color: 'bg-red-100 border-red-300',
      headerColor: 'bg-red-200 text-red-800'
    },
    {
      key: 'seiton' as const,
      title: 'Seiton - Ranger',
      description: 'Une place pour chaque chose',
      color: 'bg-blue-100 border-blue-300',
      headerColor: 'bg-blue-200 text-blue-800'
    },
    {
      key: 'seiso' as const,
      title: 'Seiso - Nettoyer',
      description: 'Nettoyer et inspecter',
      color: 'bg-green-100 border-green-300',
      headerColor: 'bg-green-200 text-green-800'
    },
    {
      key: 'seiketsu' as const,
      title: 'Seiketsu - Standardiser',
      description: 'Maintenir la propreté',
      color: 'bg-yellow-100 border-yellow-300',
      headerColor: 'bg-yellow-200 text-yellow-800'
    },
    {
      key: 'shitsuke' as const,
      title: 'Shitsuke - Maintenir',
      description: 'Respecter les règles',
      color: 'bg-purple-100 border-purple-300',
      headerColor: 'bg-purple-200 text-purple-800'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header avec aide */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">5S</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Checklist 5S</h2>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Sections 5S */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {sections.map((section) => (
          <div key={section.key} className={`${section.color} border-2 rounded-lg overflow-hidden`}>
            {/* Header de section */}
            <div className={`${section.headerColor} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{section.title}</h3>
                  <p className="text-sm opacity-80">{section.description}</p>
                </div>
                <button
                  onClick={() => addItem(section.key)}
                  className="flex items-center space-x-1 px-3 py-1 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Ajouter</span>
                </button>
              </div>
            </div>

            {/* Liste des items */}
            <div className="p-4 space-y-3">
              {data[section.key].length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Aucun point de contrôle ajouté
                </p>
              ) : (
                data[section.key].map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 bg-white bg-opacity-50 rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => updateItem(section.key, item.id, 'checked', e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItem(section.key, item.id, 'text', e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                      placeholder="Point de contrôle..."
                    />
                    <button
                      onClick={() => removeItem(section.key, item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal d'aide */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comment utiliser la méthode 5S ?
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>La méthode 5S est un outil d'amélioration continue pour organiser l'espace de travail.</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-800 mb-2">Les 5 étapes :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Seiri (Trier) :</strong> Éliminer l'inutile</li>
                    <li><strong>Seiton (Ranger) :</strong> Organiser l'espace</li>
                    <li><strong>Seiso (Nettoyer) :</strong> Nettoyer et inspecter</li>
                    <li><strong>Seiketsu (Standardiser) :</strong> Maintenir l'ordre</li>
                    <li><strong>Shitsuke (Maintenir) :</strong> Respecter les règles</li>
                  </ul>
                </div>
                <p>Ajoutez des points de contrôle pour chaque étape et cochez-les au fur et à mesure.</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
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