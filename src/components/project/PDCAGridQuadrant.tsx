import React from 'react';
import { A3Module } from '../../types/database';
import { ModuleCard } from './ModuleCard';
import { Plus } from 'lucide-react';

interface PDCAGridQuadrantProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  headerColor: string;
  modules: A3Module[];
  onEditModule: (module: A3Module) => void;
  onMoveModule?: (module: A3Module) => void;
  onAddModule: () => void;
  onDeleteModule?: (moduleId: string) => void; // MODIFICATION : Nouvelle prop pour la suppression
}

const hoverShadows = {
    PLAN: 'hover:shadow-[0_8px_30px_rgb(59,130,246,0.12)]',
    DO: 'hover:shadow-[0_8px_30px_rgb(34,197,94,0.12)]',
    CHECK: 'hover:shadow-[0_8px_30px_rgb(249,115,22,0.12)]',
    ACT: 'hover:shadow-[0_8px_30px_rgb(139,92,246,0.12)]',
}

export const PDCAGridQuadrant: React.FC<PDCAGridQuadrantProps> = ({
  title,
  subtitle,
  icon,
  color,
  headerColor,
  modules,
  onEditModule,
  onMoveModule,
  onAddModule,
  onDeleteModule // MODIFICATION : Récupération de la prop
}) => {
  const hoverShadow = hoverShadows[title as keyof typeof hoverShadows] || '';

  return (
    <div className={`${color} border-2 rounded-xl flex flex-col h-full transition-all duration-300 ease-in-out hover:scale-[1.02] ${hoverShadow} group`}>
      <div className={`${headerColor} p-4 rounded-t-xl border-b flex-shrink-0`}>
        <div className="flex items-center space-x-3">
          <div className="transition-transform duration-300 ease-in-out group-hover:scale-110">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-lg transition-transform duration-300 ease-in-out group-hover:scale-105">{title}</h3>
            <p className="text-sm opacity-80">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto min-h-0">
        {modules.length === 0 ? (
          <div className="text-center py-8 h-full flex items-center justify-center">
            <button
              onClick={onAddModule}
              className="flex items-center justify-center space-x-2 w-full h-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-white hover:bg-opacity-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Ajouter un module</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onClick={() => onEditModule(module)}
                onMove={onMoveModule}
                // MODIFICATION : On passe la fonction de suppression à la carte
                onDelete={onDeleteModule ? () => onDeleteModule(module.id) : undefined}
              />
            ))}
            <button
              onClick={onAddModule}
              className="flex items-center justify-center space-x-2 w-full py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-white hover:bg-opacity-30 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">Ajouter</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};