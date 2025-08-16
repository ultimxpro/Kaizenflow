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
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl+0</kbd>
                    <span className="text-gray-600">Réinitialiser la vue</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl+Plus</kbd>
                    <span className="text-gray-600">Zoomer</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Ctrl+Moins</kbd>
                    <span className="text-gray-600">Dézoomer</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono mr-3">Alt+Clic</kbd>
                    <span className="text-gray-600">Déplacer la vue</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Types d'éléments */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Types d'éléments</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center mr-2">
                      <span className="text-purple-600 font-bold">F</span>
                    </div>
                    <strong className="text-gray-700">Fournisseur</strong>
                  </div>
                  <p className="text-sm text-gray-600">Source externe de matériaux</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center mr-2">
                      <span className="text-green-600 font-bold">C</span>
                    </div>
                    <strong className="text-gray-700">Client</strong>
                  </div>
                  <p className="text-sm text-gray-600">Destinataire final</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-2">
                      <span className="text-blue-600 font-bold">P</span>
                    </div>
                    <strong className="text-gray-700">Processus</strong>
                  </div>
                  <p className="text-sm text-gray-600">Étape de transformation</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center mr-2">
                      <span className="text-orange-600 font-bold">▲</span>
                    </div>
                    <strong className="text-gray-700">Stock</strong>
                  </div>
                  <p className="text-sm text-gray-600">Inventaire entre processus</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-yellow-100 rounded flex items-center justify-center mr-2">
                      <span className="text-yellow-600 font-bold">⚡</span>
                    </div>
                    <strong className="text-gray-700">Kaizen</strong>
                  </div>
                  <p className="text-sm text-gray-600">Opportunité d'amélioration</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center mr-2">
                      <span className="text-slate-600 font-bold">CP</span>
                    </div>
                    <strong className="text-gray-700">Contrôle Production</strong>
                  </div>
                  <p className="text-sm text-gray-600">Planification et contrôle</p>
                </div>
              </div>
            </section>

            {/* Types de flux */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Types de flux</h3>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-700 mb-2">Flux Matière</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-3">→</span>
                      <span>Standard : Flux normal</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">⭕</span>
                      <span>Flux poussé : Production sur prévisions</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">⬜→</span>
                      <span>Flux tiré : Production sur commande</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">▭</span>
                      <span>Supermarché : Stock géré</span>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-700 mb-2">Flux Information</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-3">- - -</span>
                      <span>Électronique : EDI, ERP</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">━ ━ ━</span>
                      <span>Manuel : Papier, verbal</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Métriques */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Métriques clés</h3>
              <div className="bg-emerald-50 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>Lead Time :</strong> Temps total du début à la fin du processus</li>
                  <li><strong>Temps VA :</strong> Temps où de la valeur est ajoutée au produit</li>
                  <li><strong>Efficacité :</strong> Ratio entre temps VA et Lead Time</li>
                  <li><strong>Takt Time :</strong> Rythme de production nécessaire pour satisfaire la demande</li>
                  <li><strong>TC :</strong> Temps de Cycle - durée d'une opération</li>
                  <li><strong>TCH :</strong> Temps de Changement - durée pour changer de série</li>
                </ul>
              </div>
            </section>

            {/* Conseils */}
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Conseils d'utilisation</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Commencez par placer le client et le fournisseur aux extrémités</li>
                <li>• Ajoutez les processus principaux de gauche à droite</li>
                <li>• Placez les stocks entre les processus</li>
                <li>• Ajoutez le contrôle de production en haut</li>
                <li>• Connectez avec les flux d'information (du haut vers le bas)</li>
                <li>• Connectez avec les flux matière (de gauche à droite)</li>
                <li>• Identifiez les opportunités Kaizen</li>
                <li>• Utilisez le zoom et le pan pour naviguer dans les grandes cartes</li>
              </ul>
            </section>
          </div>
        </div>
        
        <div className="flex justify-end p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};