import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Plus, Crown, X } from 'lucide-react';
import { AddMemberModal } from './AddMemberModal';
import { Project } from '../../types/database';

interface SidePanelProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ project, onUpdateProject }) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const { users } = useAuth();
  const { projectMembers, updateProjectMember, removeProjectMember } = useDatabase();

  const members = projectMembers.filter(pm => pm.project === project.id);

  const handleFieldChange = (field: keyof Project, value: any) => {
    onUpdateProject({ [field]: value });
  };

  const handleStatusChange = (statut: 'En cours' | 'Terminé') => {
    onUpdateProject({ statut });
  };

  const getStepActiveColor = (step: string) => {
    switch (step) {
      case 'PLAN': return 'bg-blue-500 text-white';
      case 'DO': return 'bg-green-500 text-white';
      case 'CHECK': return 'bg-orange-500 text-white';
      case 'ACT': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const setNewLeader = (memberId: string) => {
    const currentLeader = members.find(m => m.roleInProject === 'Leader');
    if (currentLeader && currentLeader.id !== memberId) {
      updateProjectMember(currentLeader.id, { roleInProject: 'Membre' });
    }
    updateProjectMember(memberId, { roleInProject: 'Leader' });
  };

  const removeMember = (memberId: string) => {
    if (confirm('Êtes-vous sûr de vouloir retirer ce membre du projet ?')) {
      removeProjectMember(memberId);
    }
  };

  const formatDateForInput = (date: Date) => {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  return (
    <div className="w-96 bg-gray-100 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Informations Kaizen (Bloc Complet Restauré) */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Informations Kaizen</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="font-medium text-gray-500">Numéro</label>
              <p className="text-gray-900 font-medium">{project.kaizenNumber}</p>
            </div>
            <div>
              <label className="font-medium text-gray-500">Date d'ouverture</label>
              <p className="text-gray-900">
                {new Intl.DateTimeFormat('fr-FR').format(new Date(project.dateCreation))}
              </p>
            </div>
            <div>
              <label className="font-medium text-gray-500 mb-1 block">Date du problème</label>
              <input
                type="date"
                value={formatDateForInput(project.dateProbleme)}
                onChange={(e) => handleFieldChange('dateProbleme', new Date(e.target.value))}
                className="w-full border border-gray-300 rounded px-2 py-1.5"
              />
            </div>
            <div>
              <label className="font-medium text-gray-500 mb-1 block">Lieu (Où ?)</label>
              <input
                type="text"
                value={project.location || ''}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5"
                placeholder="Ex: Ligne 2, Poste 5"
              />
            </div>
          </div>
        </div>

        {/* Bénéfice / Coût (Bloc Complet Restauré) */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Bénéfice / Coût (B/C)</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-500 w-12">Coût:</label>
              <input
                type="number"
                value={project.cost || 0}
                onChange={(e) => handleFieldChange('cost', parseFloat(e.target.value) || 0)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 w-24"
                min="0"
              />
              <span className="text-sm text-gray-600">€</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-500 w-12">Gain:</label>
              <input
                type="number"
                value={project.benefit || 0}
                onChange={(e) => handleFieldChange('benefit', parseFloat(e.target.value) || 0)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 w-24"
                min="0"
              />
              <span className="text-sm text-gray-600">€</span>
            </div>
            <div className="flex items-center space-x-2 pt-2 border-t">
              <label className="text-sm font-medium text-gray-700 w-12">B/C:</label>
              <span className={`text-sm font-bold ${(project.benefit - project.cost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(project.benefit - project.cost).toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>
        </div>

        {/* Statut du Kaizen (Avec affichage automatique) */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
           <h3 className="text-base font-semibold text-gray-900 mb-4">Statut du Kaizen</h3>
           <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Statut</label>
              <select
                value={project.statut}
                onChange={(e) => handleStatusChange(e.target.value as 'En cours' | 'Terminé')}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
              >
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Étape Actuelle (Automatique)</label>
              <div className={`px-3 py-2 text-sm font-bold rounded-md text-center ${getStepActiveColor(project.pdcaStep)}`}>
                {project.pdcaStep}
              </div>
            </div>
          </div>
        </div>

        {/* Équipe (Bloc Complet Restauré) */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Équipe</h3>
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>
          <div className="space-y-3">
            {members.map((member) => {
              const user = users?.find(u => u.id === member.user);
              const isLeader = member.roleInProject === 'Leader';
              
              return (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user?.nom?.split(' ').map(n => n.charAt(0)).join('') || '?'}
                        </span>
                      </div>
                      {isLeader && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                          <Crown className="w-3 h-3 text-yellow-800" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user?.nom || 'Utilisateur inconnu'}</p>
                      <p className="text-xs text-gray-500">{member.roleInProject}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {!isLeader && (
                      <button
                        onClick={() => setNewLeader(member.id)}
                        className="text-gray-400 hover:text-yellow-500 transition-colors p-1 rounded-full"
                        title="Définir comme leader"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full"
                      title="Retirer du projet"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Aucun membre assigné</p>
            )}
          </div>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          projectId={project.id}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  );
};