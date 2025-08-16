import React from 'react';
import { A3Module } from '../../types/database';
import { HelpCircle, MessageSquareQuote as MessageSquareQuestion, Image, GitBranch, BookOpen, CheckSquare, Workflow, Monitor, PenTool, Edit, MoreVertical, Trash2, Activity } from 'lucide-react';

interface ModuleCardProps {
  module: A3Module;
  onClick: () => void;
  onMove?: (module: A3Module) => void;
  onDelete?: () => void; // MODIFICATION : Nouvelle prop pour la suppression
}

// RESTAURATION : La fonction getToolIcon est complète
const getToolIcon = (toolType: string) => {
  switch (toolType) {
    case '5W1H': return <HelpCircle className="w-4 h-4" />;
    case '5Pourquoi': return <MessageSquareQuestion className="w-4 h-4" />;
    case 'Image': return <Image className="w-4 h-4" />;
    case '4M': return <GitBranch className="w-4 h-4" />;
    case 'OPL': return <BookOpen className="w-4 h-4" />;
    case '5S': return <CheckSquare className="w-4 h-4" />;
    case 'VSM': return <Workflow className="w-4 h-4" />;
    case 'PlanActions': return <CheckSquare className="w-4 h-4" />;
    case 'Croquis': return <PenTool className="w-4 h-4" />;
    case 'Iframe': return <Monitor className="w-4 h-4" />;
    case 'Indicateurs': return <Activity className="w-4 h-4" />;
    default: return <HelpCircle className="w-4 h-4" />;
  }
};

// RESTAURATION : La fonction getToolColor est complète
const getToolColor = (toolType: string) => {
  switch (toolType) {
    case '5W1H': return 'bg-blue-500';
    case '5Pourquoi': return 'bg-purple-500';
    case 'Image': return 'bg-orange-500';
    case '4M': return 'bg-red-500';
    case 'OPL': return 'bg-indigo-500';
    case '5S': return 'bg-teal-500';
    case 'VSM': return 'bg-emerald-500';
    case 'PlanActions': return 'bg-green-600';
    case 'Croquis': return 'bg-yellow-500';
    case 'Iframe': return 'bg-gray-500';
    case 'Indicateurs': return 'bg-cyan-500';
    default: return 'bg-gray-500';
  }
};

// RESTAURATION : La fonction getContentPreview est complète
const getContentPreview = (module: A3Module): string => {
  if (module.titre) {
    return module.titre;
  }

  const { content, toolType } = module;
  
  if (!content || Object.keys(content).length === 0) {
    return 'Cliquez pour configurer';
  }

  switch (toolType) {
    case '5Pourquoi':
      if (content.problems && content.problems.length > 0) {
        return `${content.problems.length} problème(s) analysé(s)`;
      }
      break;
    case '4M':
      const totalCauses = (content.machine?.length || 0) + (content.methode?.length || 0) + 
                          (content.materiel?.length || 0) + (content.mainOeuvre?.length || 0);
      if (totalCauses > 0) return `${totalCauses} cause(s) identifiée(s)`;
      break;
    // Ajoutez d'autres cas spécifiques si nécessaire
  }

  return module.titre || 'Cliquez pour configurer';
};

export const ModuleCard: React.FC<ModuleCardProps> = ({ module, onClick, onMove, onDelete }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div className="relative">
      <div
        onClick={onClick}
        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
      >
        <div className="flex items-start space-x-3">
          <div className={`${getToolColor(module.toolType)} text-white p-1.5 rounded-md flex-shrink-0`}>
            {getToolIcon(module.toolType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              {/* MODIFICATION : Titre en gras (font-medium -> font-bold) */}
              <h4 className="text-sm font-bold text-gray-900">{module.toolType}</h4>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* MODIFICATION : Ajout du bouton de suppression */}
                {onDelete && (
                    <button
                        onClick={handleDeleteClick}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Supprimer le module"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
                <Edit className="w-3 h-3 text-gray-400" />
                {onMove && (
                  <button
                    onClick={handleMenuClick}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                    title="Déplacer le module"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {getContentPreview(module)}
            </p>
            {/* MODIFICATION : Le point vert a été supprimé */}
          </div>
        </div>
      </div>

      {showMenu && onMove && (
        <div className="absolute top-0 right-0 mt-8 mr-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove(module);
              setShowMenu(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Déplacer le quadrant
          </button>
        </div>
      )}

      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};