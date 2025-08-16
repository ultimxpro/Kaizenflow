import React, { useState, useEffect, useMemo } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import {
  TrendingUp, Plus, X, HelpCircle, Settings, Calendar, Tag,
  BarChart3, LineChart, PieChart, Activity, Target, AlertTriangle,
  CheckCircle2, XCircle, Clock, Save, Download, Upload, Eye,
  ChevronLeft, ChevronRight, Trash2, Edit2, Link2, Filter
} from 'lucide-react';
import { 
  Line, Bar, Area, ComposedChart, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  ReferenceLine, Scatter 
} from 'recharts';

// Types
interface DataPoint {
  id: string;
  date: string;
  value: number;
  comment?: string;
  outOfControl?: boolean;
}

interface ControlLimits {
  target: number;
  upperControl: number;
  lowerControl: number;
  upperSpec?: number;
  lowerSpec?: number;
}

interface Indicator {
  id: string;
  name: string;
  description: string;
  type: 'line' | 'bar' | 'area' | 'spc' | 'pareto';
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dataPoints: DataPoint[];
  controlLimits?: ControlLimits;
  linkedActions: string[]; // IDs des actions liées
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  color: string;
  showTrend: boolean;
  showAverage: boolean;
  targetImprovement?: number; // % d'amélioration visé
}

interface IndicatorsContent {
  indicators: Indicator[];
  selectedIndicatorId: string | null;
}

// Configuration des couleurs
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

// Composant Tooltip personnalisé pour éviter les erreurs
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value} {entry.payload.unit || ''}
        </p>
      ))}
      {payload[0]?.payload?.comment && (
        <p className="text-xs text-gray-600 mt-1 italic">
          {payload[0].payload.comment}
        </p>
      )}
    </div>
  );
};

export const IndicatorsEditor: React.FC<{ module: A3Module; onClose: () => void }> = ({ module, onClose }) => {
  const { updateA3Module, actions, a3Modules } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedIndicatorForData, setSelectedIndicatorForData] = useState<string | null>(null);
  
  // État pour l'entrée de données
  const [newDataPoint, setNewDataPoint] = useState({
    date: new Date().toISOString().split('T')[0],
    value: '',
    comment: ''
  });

  // Initialisation des données
  const initializeContent = (): IndicatorsContent => {
    if (module.content?.indicators) {
      return module.content as IndicatorsContent;
    }
    return {
      indicators: [],
      selectedIndicatorId: null
    };
  };

  const [content, setContent] = useState<IndicatorsContent>(initializeContent());
  const selectedIndicator = content.indicators.find(i => i.id === content.selectedIndicatorId);

  // Récupérer les actions du module Plan d'action
  const availableActions = useMemo(() => {
    const actionModule = a3Modules.find(m => 
      m.projectId === module.projectId && 
      m.type === 'action-plan'
    );
    
    if (actionModule?.content?.actions) {
      return actionModule.content.actions;
    }
    return [];
  }, [a3Modules, module.projectId]);

  // Sauvegarder les modifications
  const saveContent = async (newContent: IndicatorsContent) => {
    setContent(newContent);
    await updateA3Module(module.id, { content: newContent });
  };

  // Ajouter un nouvel indicateur
  const addIndicator = () => {
    const newIndicator: Indicator = {
      id: `ind-${Date.now()}`,
      name: 'Nouvel indicateur',
      description: '',
      type: 'line',
      unit: '',
      frequency: 'weekly',
      dataPoints: [],
      linkedActions: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      color: CHART_COLORS[content.indicators.length % CHART_COLORS.length],
      showTrend: true,
      showAverage: true
    };
    
    setEditingIndicator(newIndicator);
  };

  // Sauvegarder un indicateur
  const saveIndicator = (indicator: Indicator) => {
    const updatedIndicators = editingIndicator && 
      content.indicators.find(i => i.id === editingIndicator.id)
      ? content.indicators.map(i => i.id === indicator.id ? indicator : i)
      : [...content.indicators, indicator];
    
    saveContent({
      ...content,
      indicators: updatedIndicators
    });
    
    setEditingIndicator(null);
  };

  // Supprimer un indicateur
  const deleteIndicator = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet indicateur ?')) {
      saveContent({
        ...content,
        indicators: content.indicators.filter(i => i.id !== id),
        selectedIndicatorId: content.selectedIndicatorId === id ? null : content.selectedIndicatorId
      });
    }
  };

  // Ajouter un point de données
  const addDataPoint = () => {
    if (!selectedIndicatorForData || !newDataPoint.value) return;
    
    const indicator = content.indicators.find(i => i.id === selectedIndicatorForData);
    if (!indicator) return;
    
    const dataPoint: DataPoint = {
      id: `dp-${Date.now()}`,
      date: newDataPoint.date,
      value: parseFloat(newDataPoint.value),
      comment: newDataPoint.comment || undefined
    };
    
    // Vérifier si hors contrôle (SPC)
    if (indicator.controlLimits) {
      const { upperControl, lowerControl } = indicator.controlLimits;
      if (dataPoint.value > upperControl || dataPoint.value < lowerControl) {
        dataPoint.outOfControl = true;
      }
    }
    
    const updatedIndicator = {
      ...indicator,
      dataPoints: [...indicator.dataPoints, dataPoint].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      updatedAt: new Date()
    };
    
    saveContent({
      ...content,
      indicators: content.indicators.map(i => 
        i.id === selectedIndicatorForData ? updatedIndicator : i
      )
    });
    
    // Réinitialiser le formulaire
    setNewDataPoint({
      date: new Date().toISOString().split('T')[0],
      value: '',
      comment: ''
    });
    
    setShowDataEntry(false);
    setSelectedIndicatorForData(null);
  };

  // Calculer les statistiques
  const calculateStats = (indicator: Indicator) => {
    if (indicator.dataPoints.length === 0) return null;
    
    const values = indicator.dataPoints.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calcul de la tendance
    let trend = 0;
    if (values.length >= 2) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trend = ((avgSecond - avgFirst) / avgFirst) * 100;
    }
    
    return { avg, min, max, trend, last: values[values.length - 1] };
  };

  // Préparer les données pour les graphiques
  const prepareChartData = (indicator: Indicator) => {
    return indicator.dataPoints.map(dp => ({
      date: new Date(dp.date).toLocaleDateString('fr-FR'),
      value: dp.value,
      comment: dp.comment,
      unit: indicator.unit,
      ...(indicator.controlLimits && {
        target: indicator.controlLimits.target,
        ucl: indicator.controlLimits.upperControl,
        lcl: indicator.controlLimits.lowerControl
      })
    }));
  };

  // Render Chart
  const renderChart = (indicator: Indicator) => {
    const data = prepareChartData(indicator);
    const stats = calculateStats(indicator);
    
    if (data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
          <Plus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">Ajouter un indicateur</p>
          <p className="text-sm text-gray-500 mt-1">Cliquez pour créer un nouvel indicateur</p>
        </div>
      </div>
    </div>
  );

  // Vue détaillée d'un indicateur
  const DetailView = () => {
    if (!selectedIndicator) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <Eye className="w-12 h-12 mx-auto mb-2" />
            <p>Sélectionnez un indicateur pour voir les détails</p>
          </div>
        </div>
      );
    }
    
    const stats = calculateStats(selectedIndicator);
    const linkedActionDetails = availableActions.filter((a: any) => 
      selectedIndicator.linkedActions.includes(a.id)
    );
    
    return (
      <div className="bg-white rounded-lg">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedIndicator.name}</h2>
              <p className="text-gray-600 mt-1">{selectedIndicator.description}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setSelectedIndicatorForData(selectedIndicator.id);
                  setShowDataEntry(true);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter donnée</span>
              </button>
              <button
                onClick={() => setEditingIndicator(selectedIndicator)}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {stats && (
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Valeur actuelle</p>
                <p className="text-2xl font-bold">{stats.last} {selectedIndicator.unit}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Moyenne</p>
                <p className="text-2xl font-bold">{stats.avg.toFixed(2)} {selectedIndicator.unit}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Min</p>
                <p className="text-2xl font-bold">{stats.min} {selectedIndicator.unit}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Max</p>
                <p className="text-2xl font-bold">{stats.max} {selectedIndicator.unit}</p>
              </div>
              <div className={`rounded-lg p-3 ${
                stats.trend > 0 ? 'bg-green-50' : 
                stats.trend < 0 ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <p className="text-sm text-gray-600">Tendance</p>
                <p className={`text-2xl font-bold ${
                  stats.trend > 0 ? 'text-green-600' : 
                  stats.trend < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stats.trend > 0 ? '↑' : stats.trend < 0 ? '↓' : '→'} {Math.abs(stats.trend).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6">
          {renderChart(selectedIndicator)}
        </div>
        
        {selectedIndicator.dataPoints.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="font-semibold mb-3">Historique des données</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Valeur</th>
                    <th className="px-3 py-2 text-left">Commentaire</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIndicator.dataPoints
                    .slice()
                    .reverse()
                    .map((dp) => (
                      <tr key={dp.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {new Date(dp.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {dp.value} {selectedIndicator.unit}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {dp.comment || '-'}
                        </td>
                        <td className="px-3 py-2">
                          {dp.outOfControl ? (
                            <span className="text-red-600 flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Hors contrôle
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => {
                              if (confirm('Supprimer cette donnée ?')) {
                                const updatedIndicator = {
                                  ...selectedIndicator,
                                  dataPoints: selectedIndicator.dataPoints.filter(
                                    d => d.id !== dp.id
                                  )
                                };
                                saveContent({
                                  ...content,
                                  indicators: content.indicators.map(i =>
                                    i.id === selectedIndicator.id ? updatedIndicator : i
                                  )
                                });
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {linkedActionDetails.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="font-semibold mb-3">Actions liées</h3>
            <div className="space-y-2">
              {linkedActionDetails.map((action: any) => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      action.status === 'completed' ? 'bg-green-500' :
                      action.status === 'in-progress' ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-gray-600">
                        Responsable: {action.responsible} | Échéance: {new Date(action.dueDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    action.status === 'completed' ? 'bg-green-100 text-green-800' :
                    action.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {action.status === 'completed' ? 'Terminé' :
                     action.status === 'in-progress' ? 'En cours' : 'À faire'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold">Indicateurs de Performance</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Vue grille"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('detail')}
                  className={`p-2 rounded ${viewMode === 'detail' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Vue détaillée"
                >
                  <LineChart className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={addIndicator}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvel indicateur</span>
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {viewMode === 'detail' && content.indicators.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex space-x-2 overflow-x-auto">
              {content.indicators.map((indicator) => (
                <button
                  key={indicator.id}
                  onClick={() => saveContent({
                    ...content,
                    selectedIndicatorId: indicator.id
                  })}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    content.selectedIndicatorId === indicator.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {indicator.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'grid' ? <GridView /> : <DetailView />}
      </div>
      
      {/* Modals */}
      <IndicatorEditModal />
      <DataEntryModal />
      
      {/* Help Panel */}
      {showHelp && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg z-40 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Aide - Module Indicateurs</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">📊 Types d'indicateurs</h4>
                <ul className="space-y-1 text-gray-600 ml-4">
                  <li>• <strong>Ligne:</strong> Pour suivre une évolution dans le temps</li>
                  <li>• <strong>Barres:</strong> Pour comparer des valeurs discrètes</li>
                  <li>• <strong>Aire:</strong> Pour visualiser des volumes cumulés</li>
                  <li>• <strong>SPC:</strong> Carte de contrôle statistique avec limites</li>
                  <li>• <strong>Pareto:</strong> Pour identifier les causes principales</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">🎯 Bonnes pratiques</h4>
                <ul className="space-y-1 text-gray-600 ml-4">
                  <li>• Définir des objectifs SMART pour chaque indicateur</li>
                  <li>• Mettre à jour régulièrement les données</li>
                  <li>• Lier les indicateurs aux actions correctives</li>
                  <li>• Analyser les tendances plutôt que les points isolés</li>
                  <li>• Utiliser les limites de contrôle pour détecter les anomalies</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">💡 Conseils d'utilisation</h4>
                <ul className="space-y-1 text-gray-600 ml-4">
                  <li>• Cliquez sur un indicateur pour voir les détails</li>
                  <li>• Utilisez les actions liées pour le suivi</li>
                  <li>• Exportez les données pour des analyses approfondies</li>
                  <li>• Documentez les points hors contrôle avec des commentaires</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
            <BarChart3 className="w-12 h-12 mx-auto mb-2" />
            <p>Aucune donnée disponible</p>
            <button
              onClick={() => {
                setSelectedIndicatorForData(indicator.id);
                setShowDataEntry(true);
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Ajouter des données
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend />
          
          {indicator.type === 'bar' && (
            <Bar dataKey="value" fill={indicator.color} name={indicator.name} />
          )}
          
          {indicator.type === 'area' && (
            <Area 
              type="monotone" 
              dataKey="value" 
              fill={indicator.color} 
              stroke={indicator.color} 
              name={indicator.name}
              fillOpacity={0.6}
            />
          )}
          
          {(indicator.type === 'line' || indicator.type === 'spc') && (
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={indicator.color} 
              name={indicator.name}
              strokeWidth={2}
              dot={{ fill: indicator.color }}
            />
          )}
          
          {indicator.type === 'spc' && indicator.controlLimits && (
            <>
              <ReferenceLine 
                y={indicator.controlLimits.target} 
                stroke="#10B981" 
                strokeDasharray="5 5" 
                label="Cible"
              />
              <ReferenceLine 
                y={indicator.controlLimits.upperControl} 
                stroke="#EF4444" 
                strokeDasharray="3 3" 
                label="UCL"
              />
              <ReferenceLine 
                y={indicator.controlLimits.lowerControl} 
                stroke="#EF4444" 
                strokeDasharray="3 3" 
                label="LCL"
              />
            </>
          )}
          
          {indicator.showAverage && stats && (
            <ReferenceLine 
              y={stats.avg} 
              stroke="#6B7280" 
              strokeDasharray="4 4" 
              label={`Moy: ${stats.avg.toFixed(2)}`}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // Modal d'édition d'indicateur
  const IndicatorEditModal = () => {
    if (!editingIndicator) return null;
    
    const [formData, setFormData] = useState(editingIndicator);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {content.indicators.find(i => i.id === editingIndicator.id) 
                ? 'Modifier l\'indicateur' 
                : 'Nouvel indicateur'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'indicateur
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: Taux de défauts"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Décrivez l'objectif de cet indicateur..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de graphique
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="line">Ligne</option>
                    <option value="bar">Barres</option>
                    <option value="area">Aire</option>
                    <option value="spc">Carte de contrôle (SPC)</option>
                    <option value="pareto">Pareto</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fréquence
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unité
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Ex: %, pièces, €"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Couleur
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>
              </div>
              
              {formData.type === 'spc' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Limites de contrôle</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Cible</label>
                      <input
                        type="number"
                        value={formData.controlLimits?.target || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          controlLimits: {
                            ...formData.controlLimits!,
                            target: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">UCL</label>
                      <input
                        type="number"
                        value={formData.controlLimits?.upperControl || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          controlLimits: {
                            ...formData.controlLimits!,
                            upperControl: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">LCL</label>
                      <input
                        type="number"
                        value={formData.controlLimits?.lowerControl || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          controlLimits: {
                            ...formData.controlLimits!,
                            lowerControl: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actions liées
                </label>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
                  {availableActions.length > 0 ? (
                    <div className="space-y-2">
                      {availableActions.map((action: any) => (
                        <label key={action.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.linkedActions.includes(action.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  linkedActions: [...formData.linkedActions, action.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  linkedActions: formData.linkedActions.filter(id => id !== action.id)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{action.title}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Aucune action disponible. Créez des actions dans le module Plan d'action.
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.showTrend}
                    onChange={(e) => setFormData({ ...formData, showTrend: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Afficher la tendance</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.showAverage}
                    onChange={(e) => setFormData({ ...formData, showAverage: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Afficher la moyenne</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingIndicator(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={() => saveIndicator(formData)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal d'entrée de données
  const DataEntryModal = () => {
    if (!showDataEntry || !selectedIndicatorForData) return null;
    
    const indicator = content.indicators.find(i => i.id === selectedIndicatorForData);
    if (!indicator) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Ajouter une donnée - {indicator.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newDataPoint.date}
                  onChange={(e) => setNewDataPoint({ ...newDataPoint, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur {indicator.unit && `(${indicator.unit})`}
                </label>
                <input
                  type="number"
                  value={newDataPoint.value}
                  onChange={(e) => setNewDataPoint({ ...newDataPoint, value: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={newDataPoint.comment}
                  onChange={(e) => setNewDataPoint({ ...newDataPoint, comment: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Note ou observation..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDataEntry(false);
                  setSelectedIndicatorForData(null);
                  setNewDataPoint({
                    date: new Date().toISOString().split('T')[0],
                    value: '',
                    comment: ''
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={addDataPoint}
                disabled={!newDataPoint.value}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vue grille des indicateurs
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {content.indicators.map((indicator) => {
        const stats = calculateStats(indicator);
        
        return (
          <div key={indicator.id} className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{indicator.name}</h3>
                  <p className="text-sm text-gray-600">{indicator.description}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedIndicatorForData(indicator.id);
                      setShowDataEntry(true);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Ajouter des données"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingIndicator(indicator)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteIndicator(indicator.id)}
                    className="p-1 text-gray-500 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {stats && (
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Dernière:</span>
                    <p className="font-medium">{stats.last} {indicator.unit}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Moyenne:</span>
                    <p className="font-medium">{stats.avg.toFixed(2)} {indicator.unit}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Min/Max:</span>
                    <p className="font-medium">{stats.min}/{stats.max}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tendance:</span>
                    <p className={`font-medium ${
                      stats.trend > 0 ? 'text-green-600' : 
                      stats.trend < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stats.trend > 0 ? '↑' : stats.trend < 0 ? '↓' : '→'} 
                      {Math.abs(stats.trend).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4">
              {renderChart(indicator)}
            </div>
            
            {indicator.linkedActions.length > 0 && (
              <div className="px-4 pb-4">
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Link2 className="w-3 h-3" />
                  <span>{indicator.linkedActions.length} action(s) liée(s)</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      <div 
        onClick={addIndicator}
        className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[400px] cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="text-center">