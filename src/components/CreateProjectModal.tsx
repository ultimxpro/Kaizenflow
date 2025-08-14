import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { X } from 'lucide-react';

interface CreateProjectModalProps {
  onClose: () => void;
  onNavigate: (page: string, projectId?: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onNavigate }) => {
  const [titre, setTitre] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { createProject, addProjectMember } = useDatabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !titre.trim()) return;

    setLoading(true);

    try {
      const projectId = createProject(titre.trim(), currentUser.id);
      addProjectMember(projectId, currentUser.id, 'Pilote');
      
      onClose();
      onNavigate('project', projectId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Nouveau Projet Kaizen</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label htmlFor="titre" className="block text-sm font-medium text-gray-700 mb-2">
              Titre du Kaizen
            </label>
            <input
              type="text"
              id="titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Réduction des temps d'attente..."
              required
            />
            <p className="text-gray-500 text-xs mt-2">
              Décrivez brièvement l'objectif d'amélioration à atteindre
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !titre.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};