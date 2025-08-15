// src/components/project/editors/vsm/VSMDetailsPanel.tsx

import React from 'react';
import { VSMElement, VSMConnection, VSMGlobalData, VSMMetrics } from './VSMTypes';
import { Trash2, TrendingUp, Clock, Users, Percent, Package, Settings } from 'lucide-react';

interface VSMDetailsPanelProps {
  element?: VSMElement;
  connection?: VSMConnection;
  onUpdateElement: (id: string, updates: Partial<VSMElement>) => void;
  onUpdateConnection: (id: string, updates: Partial<VSMConnection>) => void;
  onDelete: (id: string) => void;
  globalData: VSMGlobalData;
  onUpdateGlobal: (updates: Partial<VSMGlobalData>) => void;
  metrics: VSMMetrics;
  showMetrics: boolean;
}

export const VSMDetailsPanel: React.FC<VSMDetailsPanelProps> = ({
  element,
  connection,
  onUpdateElement,
  onUpdateConnection,
  onDelete,
  globalData,
  onUpdateGlobal,
  metrics,
  showMetrics
}) => {
  const renderElementDetails = () => {
    if (!element) return null;

    const handleDataChange = (field: keyof VSMElement['data'], value: any) => {
      onUpdateElement(element.id, { 
        data: { ...element.data, [field]: value } 
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">
            {element.data.nom || element.type}
          </h3>
          <button
            onClick={() => onDelete(element.id)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={18} className="text-red-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nom</label>
            <input
              type="text"
              value={element.data.nom || ''}
              onChange={(e) => handleDataChange('nom', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {element.type === 'Processus' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Temps de Cycle (s)
                  </label>
                  <input
                    type="number"
                    value={element.data.tempsCycle || 0}
                    onChange={(e) => handleDataChange('tempsCycle', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Temps Changement (s)
                  </label>
                  <input
                    type="number"
                    value={element.data.tempsChangt || 0}
                    onChange={(e) => handleDataChange('tempsChangt', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Disponibilité (%)
                  </label>
                  <input
                    type="number"
                    value={element.data.tauxDispo || 100}
                    onChange={(e) => handleDataChange('tauxDispo', Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Rebut (%)
                  </label>
                  <input
                    type="number"
                    value={element.data.rebut || 0}
                    onChange={(e) => handleDataChange('rebut', Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Nb Opérateurs
                  </label>
                  <input
                    type="number"
                    value={element.data.nbOperateurs || 1}
                    onChange={(e) => handleDataChange('nbOperateurs', Number(e.target.value))}
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Taille de lot
                  </label>
                  <input
                    type="number"
                    value={element.data.lotSize || 1}
                    onChange={(e) => handleDataChange('lotSize', Number(e.target.value))}
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {element.type === 'Stock' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Quantité (jours)
                </label>
                <input
                  type="number"
                  value={element.data.quantite || 0}
                  onChange={(e) => handleDataChange('quantite', Number(e.target.value))}
                  step="0.1"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Détails
                </label>
                <input
                  type="text"
                  value={element.data.details || ''}
                  onChange={(e) => handleDataChange('details', e.target.value)}
                  placeholder="Ex: ~1000 pièces"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          {(element.type === 'Client' || element.type === 'Fournisseur' || element.type === 'Livraison') && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Fréquence
              </label>
              <input
                type="text"
                value={element.data.frequence || ''}
                onChange={(e) => handleDataChange('frequence', e.target.value)}
                placeholder="Ex: 2 fois/semaine"
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {(element.type === 'ControleProduction' || element.type === 'Kaizen') && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Détails
              </label>
              <textarea
                value={element.data.details || ''}
                onChange={(e) => handleDataChange('details', e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConnectionDetails = () => {
    if (!connection) return null;

    const handleDataChange = (field: string, value: any) => {
      onUpdateConnection(connection.id, { 
        data: { ...connection.data, [field]: value } 
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Connexion</h3>
          <button
            onClick={() => onDelete(connection.id)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={18} className="text-red-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
            <select
              value={connection.type}
              onChange={(e) => onUpdateConnection(connection.id, { type: e.target.value as 'matiere' | 'information' })}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="matiere">Flux Matière</option>
              <option value="information">Flux Information</option>
            </select>
          </div>

          {connection.type === 'matiere' && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Type de flèche</label>
              <select
                value={connection.data?.arrowType || 'standard'}
                onChange={(e) => handleDataChange('arrowType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="standard">Standard</option>
                <option value="pousse">Flux poussé</option>
                <option value="retrait">Flux tiré</option>
                <option value="supermarche">Supermarché</option>
              </select>
            </div>
          )}

          {connection.type === 'information' && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Type d'information</label>
              <select
                value={connection.data?.infoType || 'electronique'}
                onChange={(e) => handleDataChange('infoType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="electronique">Électronique</option>
                <option value="manuel">Manuel</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Label</label>
            <input
              type="text"
              value={connection.data?.label || ''}
              onChange={(e) => handleDataChange('label', e.target.value)}
              placeholder="Texte sur la connexion"
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Détails</label>
            <input
              type="text"
              value={connection.data?.details || ''}
              onChange={(e) => handleDataChange('details', e.target.value)}
              placeholder="Informations supplémentaires"
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderGlobalSettings = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800 flex items-center">
        <Settings className="w-5 h-5 mr-2" />
        Paramètres Globaux
      </h3>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Titre du VSM</label>
          <input
            type="text"
            value={globalData.title || ''}
            onChange={(e) => onUpdateGlobal({ title: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Demande Client (p/mois)
            </label>
            <input
              type="number"
              value={globalData.demandeClient}
              onChange={(e) => onUpdateGlobal({ demandeClient: Number(e.target.value) })}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Temps d'ouverture (s/j)
            </label>
            <input
              type="number"
              value={globalData.tempsOuverture}
              onChange={(e) => onUpdateGlobal({ tempsOuverture: Number(e.target.value) })}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderMetrics = () => (
    <div className="space-y-4 bg-emerald-50 rounded-lg p-4">
      <h3 className="text-lg font-bold text-emerald-800">Métriques VSM</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-emerald-600" />
            <span className="text-sm font-medium">Lead Time</span>
          </div>
          <span className="text-sm font-bold">{metrics.leadTime.toFixed(2)} jours</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-emerald-600" />
            <span className="text-sm font-medium">Temps VA</span>
          </div>
          <span className="text-sm font-bold">{metrics.valueAddedTime} s</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Percent className="w-4 h-4 mr-2 text-emerald-600" />
            <span className="text-sm font-medium">Efficacité</span>
          </div>
          <span className="text-sm font-bold">{metrics.processEfficiency.toFixed(2)}%</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-4 h-4 mr-2 text-emerald-600" />
            <span className="text-sm font-medium">Takt Time</span>
          </div>
          <span className="text-sm font-bold">{metrics.taktTime.toFixed(2)} s</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      {element && renderElementDetails()}
      {connection && renderConnectionDetails()}
      {!element && !connection && renderGlobalSettings()}
      {showMetrics && !element && !connection && renderMetrics()}
    </div>
  );
};