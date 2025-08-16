import React, { useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { A3Module } from '../../types/database';
import { PDCAGridQuadrant } from './PDCAGridQuadrant';
import { ModuleSelectionModal } from './ModuleSelectionModal';
import { Target, Play, CheckCircle, RefreshCw } from 'lucide-react';

interface PDCAGridProps {
  projectId: string;
  modules: A3Module[];
  onEditModule: (module: A3Module) => void;
  onMoveModule?: (module: A3Module) => void;
}

const quadrants = [
  { 
    id: 'PLAN', 
    title: 'PLAN', 
    subtitle: 'Description du phénomène',
    icon: <Target className="w-6 h-6" />,
    color: 'border-blue-200 bg-blue-50',
    headerColor: 'bg-blue-100 text-blue-800',
    allowedTools: ['5Pourquoi', '4M', 'VSM', 'Croquis', 'Iframe']
  },
  { 
    id: 'DO', 
    title: 'DO', 
    subtitle: 'Description de la solution',
    icon: <Play className="w-6 h-6" />,
    color: 'border-green-200 bg-green-50',
    headerColor: 'bg-green-100 text-green-800',
    allowedTools: ['5S', 'PlanActions', 'Croquis', 'Iframe']
  },
   { 
    id: 'CHECK', 
    title: 'CHECK', 
    subtitle: 'Vérification des résultats',
    icon: <CheckCircle className="w-6 h-6" />,
    color: 'border-orange-200 bg-orange-50',
    headerColor: 'bg-orange-100 text-orange-800',
    allowedTools: ['Indicateurs', 'Croquis', 'Iframe'] // Ajout d'Indicateurs
  },
  { 
    id: 'ACT', 
    title: 'ACT', 
    subtitle: 'Standardisation et expansion',
    icon: <RefreshCw className="w-6 h-6" />,
    color: 'border-purple-200 bg-purple-50',
    headerColor: 'bg-purple-100 text-purple-800',
    allowedTools: ['OPL', 'Croquis', 'Iframe']
  }
];

const uniqueTools = ['5Pourquoi', '4M', 'VSM', '5S', 'PlanActions'];

export const PDCAGrid: React.FC<PDCAGridProps> = ({ projectId, modules, onEditModule, onMoveModule }) => {
  const [showModuleSelection, setShowModuleSelection] = useState<string | null>(null);
  const { createA3Module, deleteA3Module } = useDatabase();

  const handleAddModule = (quadrant: string, toolType: string) => {
    const nextPosition = modules
      .filter(m => m.quadrant === quadrant)
      .length;
    
    createA3Module({
      project: projectId,
      quadrant: quadrant as 'PLAN' | 'DO' | 'CHECK' | 'ACT',
      toolType: toolType as any,
      content: {},
      position: nextPosition
    });
    
    setShowModuleSelection(null);
  };

  const getModulesForQuadrant = (quadrant: string) => {
    return modules
      .filter(module => module.quadrant === quadrant)
      .sort((a, b) => a.position - b.position);
  };

  const getAllowedToolsForQuadrant = (quadrantId: string) => {
    const quadrantConfig = quadrants.find(q => q.id === quadrantId);
    if (!quadrantConfig) return [];
    
    const existingToolTypes = modules.map(m => m.toolType);
    
    return quadrantConfig.allowedTools.filter(tool => {
      if (uniqueTools.includes(tool)) {
        return !existingToolTypes.includes(tool);
      }
      return true;
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
        {quadrants.map((quadrant) => {
          const quadrantModules = getModulesForQuadrant(quadrant.id);
          
          return (
            <PDCAGridQuadrant
              key={quadrant.id}
              id={quadrant.id}
              title={quadrant.title}
              subtitle={quadrant.subtitle}
              icon={quadrant.icon}
              color={quadrant.color}
              headerColor={quadrant.headerColor}
              modules={quadrantModules}
              onEditModule={onEditModule}
              onMoveModule={onMoveModule}
              onAddModule={() => setShowModuleSelection(quadrant.id)}
              // MODIFICATION : On "branche" la fonction de suppression ici
              onDeleteModule={(moduleId) => {
                if(confirm('Êtes-vous sûr de vouloir supprimer ce module ?')) {
                  deleteA3Module(moduleId);
                }
              }}
            />
          );
        })}
      </div>

      {showModuleSelection && (
        <ModuleSelectionModal
          quadrant={showModuleSelection}
          allowedTools={getAllowedToolsForQuadrant(showModuleSelection)}
          onSelect={(toolType) => handleAddModule(showModuleSelection, toolType)}
          onClose={() => setShowModuleSelection(null)}
        />
      )}
    </>
  );
};