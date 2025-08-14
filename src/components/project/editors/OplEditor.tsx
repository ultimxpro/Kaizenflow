import React, { useState } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { Upload, HelpCircle } from 'lucide-react';

interface OplEditorProps {
  module: A3Module;
}

interface OplData {
  titre: string;
  situationAvant: {
    description: string;
    imageUrl: string;
  };
  situationApres: {
    description: string;
    imageUrl: string;
  };
  pointsCles: string;
}

export const OplEditor: React.FC<OplEditorProps> = ({ module }) => {
  const { updateA3Module } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  
  const data: OplData = module.content || {
    titre: '',
    situationAvant: { description: '', imageUrl: '' },
    situationApres: { description: '', imageUrl: '' },
    pointsCles: ''
  };

  const updateData = (newData: Partial<OplData>) => {
    updateA3Module(module.id, {
      content: { ...data, ...newData }
    });
  };

  const updateSituation = (type: 'situationAvant' | 'situationApres', field: 'description' | 'imageUrl', value: string) => {
    updateData({
      [type]: { ...data[type], [field]: value }
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header avec aide */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">OPL</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">One Point Lesson</h2>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Titre */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-indigo-800 mb-2">
            Titre de la leçon
          </label>
          <input
            type="text"
            value={data.titre}
            onChange={(e) => updateData({ titre: e.target.value })}
            className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Ex: Procédure de changement d'outil..."
          />
        </div>

        {/* Comparaison Avant/Après */}
        <div className="grid grid-cols-2 gap-6">
          {/* Situation AVANT */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-4 text-center">
              AVANT
            </h3>
            
            {/* Image AVANT */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-red-700 mb-2">
                Image de la situation
              </label>
              {data.situationAvant.imageUrl ? (
                <div className="relative">
                  <img
                    src={data.situationAvant.imageUrl}
                    alt="Situation avant"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <button
                    onClick={() => updateSituation('situationAvant', 'imageUrl', '')}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-red-300 rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-600">Cliquez pour ajouter une image</p>
                  <input
                    type="url"
                    placeholder="URL de l'image..."
                    className="mt-2 w-full px-2 py-1 text-xs border border-red-300 rounded"
                    onBlur={(e) => e.target.value && updateSituation('situationAvant', 'imageUrl', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Description AVANT */}
            <div>
              <label className="block text-sm font-medium text-red-700 mb-2">
                Description
              </label>
              <textarea
                value={data.situationAvant.description}
                onChange={(e) => updateSituation('situationAvant', 'description', e.target.value)}
                className="w-full h-24 text-sm border border-red-300 rounded px-2 py-1 resize-none"
                placeholder="Décrivez la situation problématique..."
              />
            </div>
          </div>

          {/* Situation APRÈS */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-4 text-center">
              APRÈS
            </h3>
            
            {/* Image APRÈS */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-green-700 mb-2">
                Image de la solution
              </label>
              {data.situationApres.imageUrl ? (
                <div className="relative">
                  <img
                    src={data.situationApres.imageUrl}
                    alt="Situation après"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <button
                    onClick={() => updateSituation('situationApres', 'imageUrl', '')}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-600">Cliquez pour ajouter une image</p>
                  <input
                    type="url"
                    placeholder="URL de l'image..."
                    className="mt-2 w-full px-2 py-1 text-xs border border-green-300 rounded"
                    onBlur={(e) => e.target.value && updateSituation('situationApres', 'imageUrl', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Description APRÈS */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-2">
                Description
              </label>
              <textarea
                value={data.situationApres.description}
                onChange={(e) => updateSituation('situationApres', 'description', e.target.value)}
                className="w-full h-24 text-sm border border-green-300 rounded px-2 py-1 resize-none"
                placeholder="Décrivez la solution mise en place..."
              />
            </div>
          </div>
        </div>

        {/* Points clés */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-800 mb-2">
            Points clés à retenir
          </label>
          <textarea
            value={data.pointsCles}
            onChange={(e) => updateData({ pointsCles: e.target.value })}
            className="w-full h-32 text-sm border border-blue-300 rounded px-3 py-2 resize-none"
            placeholder="Listez les points importants à retenir de cette leçon..."
          />
        </div>
      </div>

      {/* Modal d'aide */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comment créer un OPL ?
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Un One Point Lesson (OPL) est un outil de formation visuel qui explique un point spécifique en une page.</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-800 mb-2">Structure :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Titre :</strong> Sujet de la leçon</li>
                    <li><strong>Avant :</strong> Situation problématique</li>
                    <li><strong>Après :</strong> Solution appliquée</li>
                    <li><strong>Points clés :</strong> Éléments à retenir</li>
                  </ul>
                </div>
                <p>Utilisez des images pour rendre la leçon plus claire et mémorable.</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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