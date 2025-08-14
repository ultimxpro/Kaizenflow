import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { Plus, FolderOpen, Users, LogOut, Calendar } from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';

interface DashboardProps {
  onNavigate: (page: string, projectId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { currentUser, logout } = useAuth();
  const { projects, projectMembers, actions, actionAssignees } = useDatabase();

  const myProjects = projects.filter(project => project.pilote === currentUser?.id);
  const contributorProjects = projects.filter(project => {
    const membership = projectMembers.find(member => 
      member.project === project.id && 
      member.user === currentUser?.id && 
      member.roleInProject === 'Membre'
    );
    return membership && project.pilote !== currentUser?.id;
  });

  // Get actions assigned to current user
  const assignedActions = actions.filter(action => {
    return actionAssignees.some(assignee => 
      assignee.action === action.id && assignee.user === currentUser?.id
    );
  });

  // Get actions created by current user
  const createdActions = actions.filter(action => action.createdBy === currentUser?.id);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR').format(date);
  };

  const formatActionDate = (dateString: string) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('fr-FR').format(new Date(dateString));
  };

  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const handleLogout = () => {
    logout();
    onNavigate('login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900">KaizenFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Bonjour, {currentUser?.nom}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
          <p className="text-gray-600">Gérez vos projets d'amélioration continue</p>
        </div>

        {/* New Project Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau Kaizen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* My Kaizens */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FolderOpen className="w-5 h-5 mr-2 text-blue-600" />
                Mes Kaizens
              </h2>
              <p className="text-gray-600 text-sm mt-1">Projets que vous pilotez</p>
            </div>
            <div className="p-6">
              {myProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun projet Kaizen en cours</p>
                  <p className="text-gray-400 text-sm">Créez votre premier projet pour commencer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onNavigate('project', project.id)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{project.titre}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.statut === 'En cours' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {project.statut}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{project.theme}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Créé le {formatDate(project.dateCreation)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kaizens where I contribute */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-600" />
                Les Kaizens où j'interviens
              </h2>
              <p className="text-gray-600 text-sm mt-1">Projets où vous contribuez</p>
            </div>
            <div className="p-6">
              {contributorProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune contribution active</p>
                  <p className="text-gray-400 text-sm">Vous serez invité à collaborer sur des projets</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contributorProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onNavigate('project', project.id)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{project.titre}</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Membre
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{project.theme}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Créé le {formatDate(project.dateCreation)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions assigned to me */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-orange-600" />
                Actions qui me sont assignées
              </h2>
              <p className="text-gray-600 text-sm mt-1">Tâches à réaliser</p>
            </div>
            <div className="p-6">
              {assignedActions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune action assignée</p>
                  <p className="text-gray-400 text-sm">Les actions vous seront assignées dans les projets</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedActions.map((action) => {
                    const project = projects.find(p => p.id === action.project);
                    return (
                      <div
                        key={action.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all"
                      >
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{action.titre}</h4>
                        <p className="text-xs text-gray-600 mb-2">Projet: {project?.titre}</p>
                        {action.dateEcheance && (
                          <div className={`flex items-center text-xs ${
                            isOverdue(action.dateEcheance) && action.statut !== 'Fait' 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                          }`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>Échéance: {formatActionDate(action.dateEcheance)}</span>
                          </div>
                        )}
                        <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                          action.statut === 'À Faire' ? 'bg-gray-100 text-gray-700' :
                          action.statut === 'En Cours' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {action.statut}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions I created */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Plus className="w-5 h-5 mr-2 text-purple-600" />
                Actions que j'ai créées
              </h2>
              <p className="text-gray-600 text-sm mt-1">Actions initiées par vous</p>
            </div>
            <div className="p-6">
              {createdActions.length === 0 ? (
                <div className="text-center py-8">
                  <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune action créée</p>
                  <p className="text-gray-400 text-sm">Créez des actions dans vos projets</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {createdActions.map((action) => {
                    const project = projects.find(p => p.id === action.project);
                    return (
                      <div
                        key={action.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all"
                      >
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{action.titre}</h4>
                        <p className="text-xs text-gray-600 mb-2">Projet: {project?.titre}</p>
                        {action.dateEcheance && (
                          <div className={`flex items-center text-xs ${
                            isOverdue(action.dateEcheance) && action.statut !== 'Fait' 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                          }`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>Échéance: {formatActionDate(action.dateEcheance)}</span>
                          </div>
                        )}
                        <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                          action.statut === 'À Faire' ? 'bg-gray-100 text-gray-700' :
                          action.statut === 'En Cours' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {action.statut}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};