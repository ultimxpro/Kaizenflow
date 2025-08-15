// src/components/project/editors/vsm/VSMHelp.tsx

import React from 'react';
import { X, Keyboard, Mouse, Info } from 'lucide-react';

interface VSMHelpProps {
  onClose: () => void;
}

export const VSMHelp: React.FC<VSMHelpProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Info className="w-6 h-6 mr-2 text-emerald-500" />
            Guide d'utilisation VSM
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {/* Introduction */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Value Stream Mapping (VSM)
              </h3>
              <p className="text-gray-600 mb-3">
                Le VSM est un outil de lean management qui permet de visualiser et analyser 
                le flux de matériaux et d'informations nécessaires pour amener un produit 
                ou service jusqu'au client.
              </p>
            </section>

            {/* Modes */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Mouse className="w-5 h-5 mr-2" />
                Modes de travail
              </h3>
              <div className="space-y-2">
                <div className="flex items-start">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">V</kbd>
                  <div>
                    <strong className="text-gray-700">Mode Sélection :</strong>
                    <span className="text-gray-600 ml-2">Sélectionner et déplacer les éléments</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">C</kbd>
                  <div>
                    <strong className="text-gray-700">Mode Connexion :</strong>
                    <span className="text-gray-600 ml-2">Créer des connexions entre éléments</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">H</kbd>
                  <div>
                    <strong className="text-gray-700">Mode Pan :</strong>
                    <span className="text-gray-600 ml-2">Déplacer la vue</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Raccourcis clavier */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Keyboard className="w-5 h-5 mr-2" />
                Raccourcis clavier
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Delete</kbd>
                    <span className="text-gray-600">Supprimer l'élément sélectionné</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl+D</kbd>
                    <span className="text-gray-600">Dupliquer l'élément</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl+C</kbd>
                    <span className="text-gray-600">Copier l'élément</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl+V</kbd>
                    <span className="text-gray-600">Coller l'élément</span>
                  </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl +</kbd>
                        <span className="text-gray-600">Zoomer</span>
                    </div>
                    <div className="flex items-center">
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl -</kbd>
                        <span className="text-gray-600">Dézoomer</span>
                    </div>
                    <div className="flex items-center">
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl+0</kbd>
                        <span className="text-gray-600">Réinitialiser le zoom</span>
                    </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="flex justify-end p-4 border-t bg-gray-50">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
                Compris
            </button>
        </div>
      </div>
    </div>
  );
};