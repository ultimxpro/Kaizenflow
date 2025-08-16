import React, { useState, useEffect, useMemo } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { 
  TrendingUp, Plus, X, HelpCircle, Settings, Calendar, Tag,
  BarChart3, LineChart, PieChart, Activity, Target, AlertTriangle,
  CheckCircle2, XCircle, Clock, Save, Download, Upload, Eye,
  ChevronLeft, ChevronRight, Trash2, Edit2, Link2, Filter
} from 'lucide-react';
import { Line, Bar, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter } from 'recharts';

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

export const IndicatorsEditor: React.FC<{ module: A3Module; onClose: () => void }> = ({ module, onClose }) => {
  const { updateA3Module, actions } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<string | null>(null);
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  
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

  // Sauvegarde automatique
  useEffect(() => {
    const timer = setTimeout(() => {
      updateA3Module(module.id, { content });
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, module.id, updateA3Module]);

  // Gestion des indicateurs
  const addIndicator = () => {
    const newIndicator: Indicator = {
      id: `ind-${Date.now()}`,
      name: `Indicateur ${content.indicators.length + 1}`,
      description: '',
      type: 'line',
      unit: '',
      frequency: 'daily',
      dataPoints: [],
      linkedActions: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      color: CHART_COLORS[content.indicators.length % CHART_COLORS.length],
      showTrend: true,
      showAverage: true
    };
    
    setContent({
      ...content,
      indicators: [...content.indicators, newIndicator],
      selectedIndicatorId: newIndicator.id
    });
    setEditingIndicator(newIndicator.id);
  };

  const updateIndicator = (id: string, updates: Partial<Indicator>) => {
    setContent({
      ...content,
      indicators: content.indicators.map(ind => 
        ind.id === id ? { ...ind, ...updates, updatedAt: new Date() } : ind
      )
    });
  };

  const deleteIndicator = (id: string) => {
    const newIndicators = content.indicators.filter(i => i.id !== id);
    setContent({
      ...content,
      indicators: newIndicators,
      selectedIndicatorId: newIndicators.length > 0 ? newIndicators[0].id : null
    });
  };

  // Ajout de point de données
  const addDataPoint = (indicatorId: string, value: number, date: string, comment?: string) => {
    const indicator = content.indicators.find(i => i.id === indicatorId);
    if (!indicator) return;

    const newPoint: DataPoint = {
      id: `dp-${Date.now()}`,
      date,
      value,
      comment
    };

    // Vérification SPC si applicable
    if (indicator.type === 'spc' && indicator.controlLimits) {
      const { upperControl, lowerControl } = indicator.controlLimits;
      if (value > upperControl || value < lowerControl) {
        newPoint.outOfControl = true;
      }
    }

    updateIndicator(indicatorId, {
      dataPoints: [...indicator.dataPoints, newPoint].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    });
  };

  const deleteDataPoint = (indicatorId: string, pointId: string) => {
    const indicator = content.indicators.find(i => i.id === indicatorId);
    if (!indicator) return;

    updateIndicator(indicatorId, {
      dataPoints: indicator.dataPoints.filter(p => p.id !== pointId)
    });
  };

  // Calculs statistiques
  const calculateStats = (indicator: Indicator) => {
    if (indicator.dataPoints.length === 0) return null;
    
    const values = indicator.dataPoints.map(p => p.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calcul de l'écart-type
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calcul de la tendance (régression linéaire simple)
    const xValues = indicator.dataPoints.map((_, i) => i);
    const n = values.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = sum;
    const sumXY = xValues.reduce((acc, x, i) => acc + x * values[i], 0);
    const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trend = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';
    
    // Calcul du Cp et Cpk pour SPC
    let cp, cpk;
    if (indicator.controlLimits?.upperSpec && indicator.controlLimits?.lowerSpec) {
      const specRange = indicator.controlLimits.upperSpec - indicator.controlLimits.lowerSpec;
      cp = specRange / (6 * stdDev);
      
      const cpu = (indicator.controlLimits.upperSpec - avg) / (3 * stdDev);
      const cpl = (avg - indicator.controlLimits.lowerSpec) / (3 * stdDev);
      cpk = Math.min(cpu, cpl);
    }
    
    return {
      avg,
      min,
      max,
      stdDev,
      trend,
      slope,
      cp,
      cpk,
      lastValue: values[values.length - 1],
      firstValue: values[0],
      improvement: ((values[values.length - 1] - values[0]) / values[0]) * 100
    };
  };

  // Actions du projet liées
  const projectActions = actions.filter(a => a.project === module.project);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl flex flex-col w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Indicateurs de Performance</h1>
              <p className="text-sm text-gray-600">Suivi et vérification des résultats - Phase CHECK</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'detail' : 'grid')}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
              title="Changer la vue"
            >
              {viewMode === 'grid' ? <Eye className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
              title="Paramètres"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
              title="Aide"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white hover:bg-red-100 rounded-lg transition-colors shadow-sm"
              title="Fermer"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-gray-50 border-r p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Bouton d'ajout */}
              <button
                onClick={addIndicator}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Nouvel Indicateur</span>
              </button>

              {/* Liste des indicateurs */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700 px-2">Mes Indicateurs</h3>
                {content.indicators.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">
                    Aucun indicateur créé
                  </p>
                ) : (
                  content.indicators.map(indicator => {
                    const stats = calculateStats(indicator);
                    return (
                      <div
                        key={indicator.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          indicator.id === content.selectedIndicatorId
                            ? 'bg-white shadow-md border-l-4'
                            : 'hover:bg-white hover:shadow-sm'
                        }`}
                        style={{
                          borderLeftColor: indicator.id === content.selectedIndicatorId ? indicator.color : 'transparent'
                        }}
                        onClick={() => setContent({ ...content, selectedIndicatorId: indicator.id })}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 text-sm">{indicator.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {indicator.dataPoints.length} points • {indicator.unit}
                            </p>
                            {stats && (
                              <div className="flex items-center mt-2 space-x-2">
                                {stats.trend === 'up' && (
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                )}
                                {stats.trend === 'down' && (
                                  <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />
                                )}
                                <span className="text-xs font-medium text-gray-600">
                                  {stats.lastValue.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              indicator.status === 'active' ? 'bg-green-100 text-green-700' :
                              indicator.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {indicator.status === 'active' ? 'Actif' :
                               indicator.status === 'completed' ? 'Terminé' : 'Pausé'}
                            </span>
                            {indicator.linkedActions.length > 0 && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Link2 className="w-3 h-3 mr-1" />
                                {indicator.linkedActions.length}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Résumé global */}
              {content.indicators.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-700 mb-3">Vue d'ensemble</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Indicateurs actifs:</span>
                      <span className="font-semibold">
                        {content.indicators.filter(i => i.status === 'active').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total points:</span>
                      <span className="font-semibold">
                        {content.indicators.reduce((sum, i) => sum + i.dataPoints.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Actions liées:</span>
                      <span className="font-semibold">
                        {new Set(content.indicators.flatMap(i => i.linkedActions)).size}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 bg-gray-100 overflow-auto">
            {selectedIndicator ? (
              viewMode === 'grid' ? (
                <GridView
                  indicators={content.indicators}
                  onSelectIndicator={(id) => setContent({ ...content, selectedIndicatorId: id })}
                  onEditIndicator={setEditingIndicator}
                  onDeleteIndicator={deleteIndicator}
                  calculateStats={calculateStats}
                />
              ) : (
                <DetailView
                  indicator={selectedIndicator}
                  onUpdateIndicator={(updates) => updateIndicator(selectedIndicator.id, updates)}
                  onAddDataPoint={addDataPoint}
                  onDeleteDataPoint={deleteDataPoint}
                  calculateStats={calculateStats}
                  projectActions={projectActions}
                  onEdit={() => setEditingIndicator(selectedIndicator.id)}
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Aucun indicateur sélectionné
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Créez votre premier indicateur pour commencer le suivi
                  </p>
                  <button
                    onClick={addIndicator}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Créer un indicateur
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {editingIndicator && (
          <IndicatorEditModal
            indicator={content.indicators.find(i => i.id === editingIndicator)!}
            onSave={(updates) => {
              updateIndicator(editingIndicator, updates);
              setEditingIndicator(null);
            }}
            onClose={() => setEditingIndicator(null)}
            projectActions={projectActions}
          />
        )}

        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    </div>
  );
};

// Vue grille des indicateurs
const GridView: React.FC<{
  indicators: Indicator[];
  onSelectIndicator: (id: string) => void;
  onEditIndicator: (id: string) => void;
  onDeleteIndicator: (id: string) => void;
  calculateStats: (indicator: Indicator) => any;
}> = ({ indicators, onSelectIndicator, onEditIndicator, onDeleteIndicator, calculateStats }) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {indicators.map(indicator => {
          const stats = calculateStats(indicator);
          return (
            <div
              key={indicator.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => onSelectIndicator(indicator.id)}
            >
              <div className="p-4 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{indicator.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{indicator.description}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditIndicator(indicator.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteIndicator(indicator.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                {indicator.dataPoints.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={indicator.dataPoints}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={indicator.color}
                        strokeWidth={2}
                        dot={false}
                      />
                      {indicator.controlLimits && (
                        <>
                          <ReferenceLine 
                            y={indicator.controlLimits.target} 
                            stroke="#10B981" 
                            strokeDasharray="5 5"
                          />
                          <ReferenceLine 
                            y={indicator.controlLimits.upperControl} 
                            stroke="#EF4444" 
                            strokeDasharray="3 3"
                          />
                          <ReferenceLine 
                            y={indicator.controlLimits.lowerControl} 
                            stroke="#EF4444" 
                            strokeDasharray="3 3"
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[150px] flex items-center justify-center text-gray-400">
                    <p className="text-sm">Aucune donnée</p>
                  </div>
                )}
                
                {stats && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Moyenne</p>
                      <p className="text-sm font-semibold">{stats.avg.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Tendance</p>
                      <p className="text-sm font-semibold">
                        {stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Variation</p>
                      <p className={`text-sm font-semibold ${
                        stats.improvement > 0 ? 'text-green-600' : 
                        stats.improvement < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {stats.improvement > 0 ? '+' : ''}{stats.improvement.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Vue détaillée d'un indicateur
const DetailView: React.FC<{
  indicator: Indicator;
  onUpdateIndicator: (updates: Partial<Indicator>) => void;
  onAddDataPoint: (indicatorId: string, value: number, date: string, comment?: string) => void;
  onDeleteDataPoint: (indicatorId: string, pointId: string) => void;
  calculateStats: (indicator: Indicator) => any;
  projectActions: any[];
  onEdit: () => void;
}> = ({ indicator, onUpdateIndicator, onAddDataPoint, onDeleteDataPoint, calculateStats, projectActions, onEdit }) => {
  const [newValue, setNewValue] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newComment, setNewComment] = useState('');
  const stats = calculateStats(indicator);

  const handleAddPoint = () => {
    if (newValue) {
      onAddDataPoint(indicator.id, parseFloat(newValue), newDate, newComment || undefined);
      setNewValue('');
      setNewComment('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{indicator.name}</h2>
            <p className="text-gray-600 mt-1">{indicator.description}</p>
          </div>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Valeur actuelle</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.lastValue.toFixed(2)} {indicator.unit}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Moyenne</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.avg.toFixed(2)} {indicator.unit}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Tendance</p>
              <div className="flex items-center space-x-2">
                {stats.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
                {stats.trend === 'down' && <TrendingUp className="w-5 h-5 text-red-500 transform rotate-180" />}
                {stats.trend === 'stable' && <div className="w-5 h-0.5 bg-gray-400" />}
                <span className="text-xl font-bold text-gray-800">
                  {stats.trend === 'up' ? 'Hausse' : stats.trend === 'down' ? 'Baisse' : 'Stable'}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Évolution</p>
              <p className={`text-xl font-bold ${
                stats.improvement > 0 ? 'text-green-600' : 
                stats.improvement < 0 ? 'text-red-600' : 'text-gray-800'
              }`}>
                {stats.improvement > 0 ? '+' : ''}{stats.improvement.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Graphique principal */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Évolution</h3>
        <ResponsiveContainer width="100%" height={400}>
          {indicator.type === 'spc' ? (
            <ComposedChart data={indicator.dataPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={indicator.color}
                strokeWidth={2}
              />
              {indicator.dataPoints.map((point, index) => 
                point.outOfControl && (
                  <Scatter
                    key={`oc-${index}`}
                    data={[point]}
                    fill="#EF4444"
                  />
                )
              )}
              {indicator.controlLimits && (
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
                  {indicator.controlLimits.upperSpec && (
                    <ReferenceLine 
                      y={indicator.controlLimits.upperSpec} 
                      stroke="#F59E0B" 
                      strokeDasharray="2 2"
                      label="USL"
                    />
                  )}
                  {indicator.controlLimits.lowerSpec && (
                    <ReferenceLine 
                      y={indicator.controlLimits.lowerSpec} 
                      stroke="#F59E0B" 
                      strokeDasharray="2 2"
                      label="LSL"
                    />
                  )}
                </>
              )}
            </ComposedChart>
          ) : (
            <LineChart data={indicator.dataPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={indicator.color}
                strokeWidth={2}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Ajout de données */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Ajouter une mesure</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valeur ({indicator.unit})
            </label>
            <input
              type="number"
              step="0.01"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optionnel"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddPoint}
              disabled={!newValue}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des données */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Historique des mesures</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Valeur</th>
                <th className="text-left py-2">Commentaire</th>
                <th className="text-left py-2">Statut</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {indicator.dataPoints.map(point => (
                <tr key={point.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{new Date(point.date).toLocaleDateString()}</td>
                  <td className="py-2 font-medium">
                    {point.value.toFixed(2)} {indicator.unit}
                  </td>
                  <td className="py-2 text-gray-600">{point.comment || '-'}</td>
                  <td className="py-2">
                    {point.outOfControl ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                        Hors contrôle
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => onDeleteDataPoint(indicator.id, point.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-500"
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
    </div>
  );
};

// Modal d'édition d'indicateur
const IndicatorEditModal: React.FC<{
  indicator: Indicator;
  onSave: (updates: Partial<Indicator>) => void;
  onClose: () => void;
  projectActions: any[];
}> = ({ indicator, onSave, onClose, projectActions }) => {
  const [formData, setFormData] = useState({
    name: indicator.name,
    description: indicator.description,
    type: indicator.type,
    unit: indicator.unit,
    frequency: indicator.frequency,
    status: indicator.status,
    color: indicator.color,
    showTrend: indicator.showTrend,
    showAverage: indicator.showAverage,
    targetImprovement: indicator.targetImprovement || 0,
    linkedActions: indicator.linkedActions,
    controlLimits: indicator.controlLimits || {
      target: 0,
      upperControl: 0,
      lowerControl: 0
    }
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Modifier l'indicateur</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="%, €, pièces..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="line">Courbe</option>
                <option value="bar">Barres</option>
                <option value="area">Aires</option>
                <option value="spc">SPC</option>
                <option value="pareto">Pareto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Actif</option>
                <option value="paused">Pausé</option>
                <option value="completed">Terminé</option>
              </select>
            </div>
          </div>

          {formData.type === 'spc' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">Limites de contrôle</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cible</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.controlLimits.target}
                    onChange={(e) => setFormData({
                      ...formData,
                      controlLimits: {
                        ...formData.controlLimits,
                        target: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LSC</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.controlLimits.upperControl}
                    onChange={(e) => setFormData({
                      ...formData,
                      controlLimits: {
                        ...formData.controlLimits,
                        upperControl: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LIC</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.controlLimits.lowerControl}
                    onChange={(e) => setFormData({
                      ...formData,
                      controlLimits: {
                        ...formData.controlLimits,
                        lowerControl: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Actions liées</label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {projectActions.map(action => (
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
                  <span className="text-sm text-gray-700">{action.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal d'aide
const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Guide des Indicateurs</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Qu'est-ce qu'un indicateur ?</h3>
            <p className="text-gray-600 text-sm">
              Un indicateur de performance (KPI) permet de mesurer l'efficacité des actions mises en place 
              et de vérifier l'atteinte des objectifs fixés dans votre A3.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Types d'indicateurs</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <LineChart className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <strong>Courbe :</strong> Évolution dans le temps, idéal pour les tendances
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <BarChart3 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Barres :</strong> Comparaisons entre périodes ou catégories
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Activity className="w-4 h-4 text-purple-500 mt-0.5" />
                <div>
                  <strong>SPC :</strong> Contrôle statistique avec limites de contrôle
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Target className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <strong>Pareto :</strong> Analyse des causes principales (80/20)
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Bonnes pratiques</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Choisissez des indicateurs SMART (Spécifiques, Mesurables, Atteignables, Réalistes, Temporels)</li>
              <li>• Limitez-vous à 3-5 indicateurs clés par problème</li>
              <li>• Définissez des cibles et des seuils d'alerte</li>
              <li>• Collectez les données régulièrement</li>
              <li>• Analysez les tendances, pas seulement les valeurs ponctuelles</li>
              <li>• Liez vos indicateurs aux actions correctives</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Contrôle statistique (SPC)</h3>
            <p className="text-gray-600 text-sm mb-2">
              Le SPC permet de distinguer les variations normales des variations anormales :
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>LSC/LIC :</strong> Limites de contrôle (±3σ)</li>
              <li>• <strong>Cible :</strong> Valeur objectif à atteindre</li>
              <li>• <strong>Points hors contrôle :</strong> Signalent un problème à investiguer</li>
              <li>• <strong>Cp/Cpk :</strong> Indices de capabilité du processus</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};