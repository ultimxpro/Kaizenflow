import React from 'react';
import { X, HelpCircle, MessageSquareQuote as MessageSquareQuestion, Image, GitBranch, BookOpen, CheckSquare, Workflow, Monitor, PenTool } from 'lucide-react';

interface ModuleSelectionModalProps {
  quadrant: string;
  allowedTools: string[];
  onSelect: (toolType: string) => void;
  onClose: () => void;
}

const toolsConfig = {
  // MODIFICATION ICI : Le bloc pour '5W1H' a été supprimé
  '5Pourquoi': {
    name: '5 Pourquoi',
    icon: <MessageSquareQuestion className="w-6 h-6" />,
    description: 'Analyse des causes racines',
    color: 'bg-purple-500'
  },
  '4M': {
    name: '4M (Ishikawa)',
    icon: <GitBranch className="w-6 h-6" />,
    description: 'Diagramme en arêtes de poisson',
    color: 'bg-red-500'
  },
  'VSM': {
    name: 'VSM',
    icon: <Workflow className="w-6 h-6" />,
    description: 'Value Stream Mapping',
    color: 'bg-emerald-500'
  },
  'OPL': {
    name: 'OPL',
    icon: <BookOpen className="w-6 h-6" />,
    description: 'One Point Lesson',
    color: 'bg-indigo-500'
  },
  '5S': {
    name: '5S',
    icon: <CheckSquare className="w-6 h-6" />,
    description: 'Checklist 5S',
    color: 'bg-teal-500'
  },
  'PlanActions': {
    name: 'Plan d\'Actions',
    icon: <CheckSquare className="w-6 h-6" />,
    description: 'Gestion des actions et matrice Gain/Effort',
    color: 'bg-green-600'
  },
  'Croquis': {
    name: 'Croquis',
    icon: <PenTool className="w-6 h-6" />,
    description: 'Outil de dessin libre',
    color: 'bg-yellow-500'
  },
  'Iframe': {
    name: 'Iframe',
    icon: <Monitor className="w-6 h-6" />,
    description: 'Intégration web (Power BI, etc.)',
    color: 'bg-gray-500'
  }
};

export const ModuleSelectionModal: React.FC<ModuleSelectionModalProps> = ({
  quadrant,
  allowedTools,
  onSelect,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Ajouter un module - {quadrant}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Sélectionnez l'outil que vous souhaitez ajouter à ce quadrant :
          </p>
          
          <div className="space-y-3">
            {allowedTools.map((toolType) => {
              const tool = toolsConfig[toolType as keyof typeof toolsConfig];
              if (!tool) return null;
              
              return (
                <button
                  key={toolType}
                  onClick={() => onSelect(toolType)}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
                >
                  <div className={`${tool.color} text-white p-2 rounded-lg flex-shrink-0`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                    <p className="text-xs text-gray-600 truncate">{tool.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};