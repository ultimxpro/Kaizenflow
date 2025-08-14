import React from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { A3Module } from '../../types/database';
import { X, Target, Play, CheckCircle, RefreshCw } from 'lucide-react';

interface MoveModuleModalProps {
  module: A3Module;
  onClose: () => void;
}

const quadrants = [
  { 
    id: 'PLAN', 
    title: 'PLAN', 
    subtitle: 'Planifier',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  { 
    id: 'DO', 
    title: 'DO', 
    subtitle: 'Faire',
    icon: <Play className="w-5 h-5" />,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  { 
    id: 'CHECK', 
    title: 'CHECK', 
    subtitle: 'Vérifier',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  { 
    id: 'ACT', 
    title: 'ACT', 
    subtitle: 'Agir',
    icon: <RefreshCw className="w-5 h-5" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

export const MoveModuleModal: React.FC<MoveModuleModalProps> = ({ module, onClose }) => {
  const { updateA3Module } = useDatabase();

  const handleMove = (newQuadrant: string) => {
    updateA3Module(module.id, { 
      quadrant: newQuadrant as 'PLAN' | 'DO' | 'CHECK' | 'ACT' 
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Déplacer le module {module.toolType}
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
            Sélectionnez le quadrant de destination :
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {quadrants.map((quadrant) => (
              <button
                key={quadrant.id}
                onClick={() => handleMove(quadrant.id)}
                disabled={quadrant.id === module.quadrant}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  quadrant.id === module.quadrant
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300'
                    : `${quadrant.color} hover:shadow-md`
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  {quadrant.icon}
                  <span className="font-medium">{quadrant.title}</span>
                </div>
                <p className="text-xs opacity-80">{quadrant.subtitle}</p>
                {quadrant.id === module.quadrant && (
                  <p className="text-xs mt-1 font-medium">Position actuelle</p>
                )}
              </button>
            ))}
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