import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { ArrowLeft } from 'lucide-react';
import { PDCAGrid } from './project/PDCAGrid';
import { SidePanel } from './project/SidePanel';
import { ModuleEditModal } from './project/ModuleEditModal';
import { MoveModuleModal } from './project/MoveModuleModal';
import { A3Module, Project } from '../types/database';

interface ProjectViewProps {
  projectId: string;
  onNavigate: (page: string) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ projectId, onNavigate }) => {
  const [editingModule, setEditingModule] = useState<A3Module | null>(null);
  const [movingModule, setMovingModule] = useState<A3Module | null>(null);
  const { currentUser } = useAuth();
  const { projects, a3Modules, updateProject } = useDatabase();

  const project = projects.find(p => p.id === projectId);
  const projectModules = a3Modules.filter(module => module.project === projectId);

  const handleUpdateProject = (updates: Partial<Project>) => {
    if (projectId) {
      updateProject(projectId, updates);
    }
  };

  // MODIFICATION ICI : La logique automatique est de retour
  useEffect(() => {
    if (!project || !projectModules) return;

    const hasAct = projectModules.some(m => m.quadrant === 'ACT');
    const hasCheck = projectModules.some(m => m.quadrant === 'CHECK');
    const hasDo = projectModules.some(m => m.quadrant === 'DO');
    const hasPlan = projectModules.some(m => m.quadrant === 'PLAN');

    let newStep: Project['pdcaStep'] = 'PLAN';

    if (hasAct) newStep = 'ACT';
    else if (hasCheck) newStep = 'CHECK';
    else if (hasDo) newStep = 'DO';
    else if (hasPlan) newStep = 'PLAN';
    
    if (project.pdcaStep !== newStep) {
      handleUpdateProject({ pdcaStep: newStep });
    }
  }, [projectModules, project?.pdcaStep]); // Se déclenche quand les modules changent


  if (!project) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="text-center">
           <h2 className="text-xl font-semibold text-gray-900 mb-2">Projet non trouvé</h2>
           <button onClick={() => onNavigate('dashboard')} className="text-blue-600 hover:text-blue-700">
             Retour au tableau de bord
           </button>
         </div>
       </div>
    );
  }

  const getPDCABarColor = (step: string) => {
    switch (step) {
      case 'PLAN': return 'bg-blue-500';
      case 'DO': return 'bg-green-500';
      case 'CHECK': return 'bg-orange-500';
      case 'ACT': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };


  return (
    <div className="h-screen bg-gray-50 flex flex-col relative">
      <div className={`absolute top-0 left-0 right-0 h-1 ${getPDCABarColor(project.pdcaStep)} z-20`}></div>
      
      <div className="flex flex-row flex-1 overflow-hidden pt-1">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-gray-100 shadow-sm border-b flex-shrink-0 h-24">
            <div className="max-w-full px-6 h-full flex items-center">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-6 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Retour</span>
              </button>
              
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={project.titre}
                  onChange={(e) => handleUpdateProject({ titre: e.target.value })}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none w-full p-1 -ml-1 hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-md transition-colors"
                  placeholder="Titre du Kaizen"
                />
                <div className="flex items-center mt-1 pl-1">
                   <label className="text-sm font-medium text-gray-500 mr-2 flex-shrink-0">Description du problème :</label>
                   <input
                    type="text"
                    value={project.what || ''}
                    onChange={(e) => handleUpdateProject({ what: e.target.value })}
                    className="text-sm text-gray-600 bg-transparent border-none outline-none w-full hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-md p-1 transition-colors"
                    placeholder="Quel est le problème ? (Quoi ?)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <PDCAGrid 
              projectId={projectId}
              modules={projectModules}
              onEditModule={setEditingModule}
              onMoveModule={setMovingModule}
            />
          </div>
        </div>

        <SidePanel 
          project={project}
          onUpdateProject={handleUpdateProject}
        />
      </div>

      {editingModule && (
        <ModuleEditModal
          module={editingModule}
          onClose={() => setEditingModule(null)}
        />
      )}

      {movingModule && (
        <MoveModuleModal
          module={movingModule}
          onClose={() => setMovingModule(null)}
        />
      )}
    </div>
  );
};