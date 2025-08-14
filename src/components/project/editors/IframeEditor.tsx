import React, { useState } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { Monitor, HelpCircle, ExternalLink, AlertTriangle } from 'lucide-react';

interface IframeEditorProps {
  module: A3Module;
}

export const IframeEditor: React.FC<IframeEditorProps> = ({ module }) => {
  const { updateA3Module } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  
  const data = module.content || { url: '' };

  const updateData = (url: string) => {
    updateA3Module(module.id, {
      content: { url }
    });
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header avec aide */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Intégration Web (Iframe)</h2>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 space-y-6">
        {/* Configuration URL */}
        <div className="bg-gray-50 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            URL du contenu à intégrer
          </label>
          <div className="flex space-x-3">
            <input
              type="url"
              value={data.url}
              onChange={(e) => updateData(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="https://app.powerbi.com/view?r=..."
            />
            {data.url && isValidUrl(data.url) && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ouvrir</span>
              </a>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Exemples : Power BI, Tableau, Google Data Studio, etc.
          </p>
        </div>

        {/* Prévisualisation */}
        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <h3 className="text-sm font-medium text-gray-700">Prévisualisation</h3>
          </div>
          
          <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
            {data.url && isValidUrl(data.url) ? (
              <>
                {!iframeError ? (
                  <iframe
                    src={data.url}
                    className="absolute top-0 left-0 w-full h-full border-0"
                    title="Contenu intégré"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    onError={handleIframeError}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <div className="text-center p-6">
                      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-red-800 mb-2">
                        Intégration impossible
                      </h4>
                      <p className="text-sm text-red-600 mb-4">
                        Ce site n'autorise pas l'intégration. Veuillez vérifier les paramètres de partage du site source (ex: Power BI) ou essayer une autre URL.
                      </p>
                      <div className="space-y-2 text-xs text-red-500">
                        <p>• Vérifiez que l'URL est publique</p>
                        <p>• Activez le partage par iframe dans les paramètres</p>
                        <p>• Utilisez une URL d'intégration dédiée</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center p-6">
                  <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {data.url ? 'URL invalide' : 'Saisissez une URL pour voir la prévisualisation'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conseils d'utilisation */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Conseils d'utilisation</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Power BI :</strong> Utilisez l'URL "Intégrer" depuis le menu de partage</li>
            <li>• <strong>Tableau :</strong> Activez l'intégration dans les paramètres de publication</li>
            <li>• <strong>Google Data Studio :</strong> Partagez le rapport avec accès "Lecteur"</li>
            <li>• <strong>Sites web :</strong> Vérifiez que le site autorise l'intégration iframe</li>
          </ul>
        </div>
      </div>

      {/* Modal d'aide */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comment utiliser l'intégration Iframe ?
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>L'outil Iframe permet d'intégrer du contenu web externe dans votre Kaizen.</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-800 mb-2">Cas d'usage :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Tableaux de bord Power BI</li>
                    <li>Rapports Tableau</li>
                    <li>Google Data Studio</li>
                    <li>Applications web métier</li>
                    <li>Documentations en ligne</li>
                  </ul>
                </div>
                <p><strong>Important :</strong> Le site source doit autoriser l'intégration iframe pour que l'affichage fonctionne.</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};