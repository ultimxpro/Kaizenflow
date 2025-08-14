import React, { useState } from 'react';
import { A3Module } from '../../../types/database';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { Plus, HelpCircle, ChevronRight, X, Network, Flag, RotateCcw } from 'lucide-react';

interface FiveWhyEditorProps {
  module: A3Module;
  onClose: () => void;
}

interface Problem {
  id: string;
  problem: string;
  whys: string[];
  rootCause: string;
  expandedLevel: number;
  intermediateCause: { level: number; text: string } | null;
}

export const FiveWhyEditor: React.FC<FiveWhyEditorProps> = ({ module, onClose }) => {
  const { updateA3Module } = useDatabase();
  const [showHelp, setShowHelp] = useState(false);
  
  const [problems, setProblems] = useState<Problem[]>(module.content?.problems || []);

  const updateProblems = (newProblems: Problem[]) => {
    setProblems(newProblems);
    updateA3Module(module.id, {
      content: { ...module.content, problems: newProblems }
    });
  };

  const addProblem = () => {
    const newProblem: Problem = {
      id: Date.now().toString(),
      problem: '',
      whys: ['', '', '', '', ''],
      rootCause: '',
      expandedLevel: 0,
      intermediateCause: null
    };
    const newProblems = [...problems, newProblem];
    updateProblems(newProblems);
  };

  const updateProblemField = (problemId: string, field: keyof Problem, value: any) => {
    const updatedProblems = problems.map(p => 
      p.id === problemId ? { ...p, [field]: value } : p
    );
    updateProblems(updatedProblems);
  };

  const updateWhy = (problemId: string, whyIndex: number, value: string) => {
    const updatedProblems = problems.map(p => {
      if (p.id === problemId) {
        const newWhys = [...p.whys];
        newWhys[whyIndex] = value;
        return { ...p, whys: newWhys };
      }
      return p;
    });
    updateProblems(updatedProblems);
  };
  
  const setIntermediateCause = (problemId: string, level: number) => {
    const updatedProblems = problems.map(p => {
      if (p.id === problemId) {
        const causeText = p.whys[level - 1] || '';
        return { ...p, intermediateCause: { level, text: causeText } };
      }
      return p;
    });
    updateProblems(updatedProblems);
  };

  const updateIntermediateCauseText = (problemId: string, text: string) => {
    const updatedProblems = problems.map(p =>
      p.id === problemId && p.intermediateCause ? { ...p, intermediateCause: { ...p.intermediateCause, text } } : p
    );
    updateProblems(updatedProblems);
  };

  const clearIntermediateCause = (problemId: string) => {
    updateProblemField(problemId, 'intermediateCause', null);
  };


  const expandToLevel = (problemId: string, level: number) => {
    updateProblemField(problemId, 'expandedLevel', level);
  };

  const deleteProblem = (problemId: string) => {
    updateProblems(problems.filter(p => p.id !== problemId));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
        <div 
            className="bg-white rounded-2xl shadow-xl flex flex-col w-full h-full overflow-hidden"
        >
            <div 
            className="flex items-center justify-between p-6 border-b bg-white"
            style={{ flexGrow: 0, flexShrink: 0 }}
            >
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <Network className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Analyse des 5 Pourquoi</h1>
            </div>
            <div className="flex items-center space-x-3">
                <button
                onClick={() => setShowHelp(true)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                title="Aide"
                >
                <HelpCircle className="w-5 h-5 text-gray-600" />
                </button>
                <button
                onClick={onClose}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                title="Fermer"
                >
                <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>
            </div>

            <div 
            className="bg-gray-50"
            style={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflowY: 'auto',
                width: '100%'
            }}
            >
            <div 
                className="p-6 pb-4 bg-gray-50"
                style={{ flexShrink: 0 }}
            >
                <button
                onClick={addProblem}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Ajouter un nouveau problème</span>
                </button>
            </div>

            <div 
                className="px-6 pb-6"
                style={{ 
                flexGrow: 1,
                overflowY: 'auto',
                width: '100%'
                }}
            >
                <div className="space-y-8" style={{ width: '100%' }}>
                {problems.length === 0 ? (
                    <div 
                    className="text-center flex flex-col justify-center items-center"
                    style={{ height: '100%', minHeight: '400px' }}
                    >
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Network className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune analyse en cours</h3>
                    <p className="text-gray-500 mb-6">Commencez par ajouter un problème à analyser</p>
                    <button
                        onClick={addProblem}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Créer ma première analyse
                    </button>
                    </div>
                ) : (
                    problems.map((problem, problemIndex) => (
                    <div 
                        key={problem.id} 
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                        style={{ width: '100%' }}
                    >
                        <div className="flex items-center justify-between mb-6">
                        <h3 
                          className="text-lg font-semibold text-gray-900 truncate"
                          title={`Analyse #${problemIndex + 1}${problem.problem ? `: ${problem.problem}` : ''}`}
                        >
                            {`Analyse #${problemIndex + 1}${problem.problem ? `: ${problem.problem}` : ''}`}
                        </h3>
                        <button
                            onClick={() => deleteProblem(problem.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                            Supprimer
                        </button>
                        </div>

                        <div 
                        className="overflow-x-auto"
                        style={{ width: '100%' }}
                        >
                        <div className="flex items-start space-x-4 min-w-max pb-4">
                            <div className="flex-shrink-0">
                            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 w-56">
                                <label className="block text-sm font-bold text-red-800 mb-3">
                                PROBLÈME
                                </label>
                                <textarea
                                value={problem.problem}
                                onChange={(e) => updateProblemField(problem.id, 'problem', e.target.value)}
                                className="w-full h-24 text-sm border border-red-300 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Décrivez clairement le problème à analyser..."
                                />
                            </div>
                            </div>
                            
                            {problem.whys.map((why, whyIndex) => {
                                const isVisible = whyIndex <= problem.expandedLevel;
                                const isLastVisible = whyIndex === problem.expandedLevel;
                                
                                // Ne rien afficher pour ce "Pourquoi" si une cause intermédiaire a été définie à un niveau inférieur ou égal
                                if (problem.intermediateCause && whyIndex >= problem.intermediateCause.level -1) return null;
                                if (!isVisible) return null;

                                return (
                                    <React.Fragment key={whyIndex}>
                                      {/* Affiche la flèche AVANT chaque boîte "Pourquoi" (sauf la première) */}
                                      {whyIndex >= 0 && <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 mt-16" />}
                                      
                                      <div className="flex flex-col items-center space-y-2 flex-shrink-0">
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-56">
                                          <label className="block text-sm font-bold text-blue-800 mb-3">
                                              POURQUOI {whyIndex + 1} ?
                                          </label>
                                          <textarea
                                              value={why}
                                              onChange={(e) => updateWhy(problem.id, whyIndex, e.target.value)}
                                              className="w-full h-24 text-sm border border-blue-300 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                              placeholder={`Répondez au pourquoi ${whyIndex + 1}...`}
                                          />
                                          </div>
                                          {!problem.intermediateCause && (
                                          <button 
                                              onClick={() => setIntermediateCause(problem.id, whyIndex + 1)}
                                              className="flex items-center space-x-2 text-xs font-semibold text-orange-600 hover:text-orange-800 transition-colors px-2 py-1 rounded-md hover:bg-orange-100"
                                          >
                                              <Flag className="w-3 h-3"/>
                                              <span>Définir comme cause</span>
                                          </button>
                                          )}
                                      </div>

                                      {isLastVisible && whyIndex < 4 && !problem.intermediateCause && (
                                          <button
                                              onClick={() => expandToLevel(problem.id, whyIndex + 1)}
                                              className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors mt-16"
                                              title="Ajouter le pourquoi suivant"
                                          >
                                              <Plus className="w-4 h-4" />
                                          </button>
                                      )}
                                    </React.Fragment>
                                );
                            })}
                            
                            {problem.intermediateCause && (
                                <>
                                <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 mt-16" />
                                <div className="flex flex-col items-center space-y-2 flex-shrink-0">
                                    <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4 w-56">
                                        <label className="block text-sm font-bold text-orange-800 mb-3">
                                        CAUSE IDENTIFIÉE
                                        </label>
                                        <textarea
                                        value={problem.intermediateCause.text}
                                        onChange={(e) => updateIntermediateCauseText(problem.id, e.target.value)}
                                        className="w-full h-24 text-sm border border-orange-300 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Décrivez la cause identifiée..."
                                        />
                                    </div>
                                    <button 
                                        onClick={() => clearIntermediateCause(problem.id)}
                                        className="flex items-center space-x-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
                                    >
                                        <RotateCcw className="w-3 h-3"/>
                                        <span>Reprendre l'analyse</span>
                                    </button>
                                </div>
                                </>
                            )}
                            
                            {problem.expandedLevel >= 4 && !problem.intermediateCause && (
                            <>
                                <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 mt-16" />
                                <div className="flex-shrink-0">
                                <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 w-56">
                                    <label className="block text-sm font-bold text-green-800 mb-3">
                                    CAUSE RACINE
                                    </label>
                                    <textarea
                                    value={problem.rootCause}
                                    onChange={(e) => updateProblemField(problem.id, 'rootCause', e.target.value)}
                                    className="w-full h-24 text-sm border border-green-300 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Identifiez la cause racine du problème..."
                                    />
                                </div>
                                </div>
                            </>
                            )}
                        </div>
                        </div>
                    </div>
                    ))
                )}
                </div>
            </div>
            </div>
        </div>

        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  🔍 Méthode des 5 Pourquoi
                </h3>
                <div className="space-y-4 text-sm text-gray-700">
                  <p>
                    <strong>Objectif :</strong> Identifier la cause racine d'un problème en posant successivement la question "Pourquoi ?"
                  </p>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="font-semibold text-purple-800 mb-2">Comment procéder :</p>
                    <ol className="list-decimal list-inside space-y-1 text-purple-700">
                      <li>Décrivez clairement le problème</li>
                      <li>Demandez "Pourquoi ce problème survient-il ?"</li>
                      <li>Pour chaque réponse, redemandez "Pourquoi ?"</li>
                      <li>Continuez jusqu'à identifier la cause racine</li>
                      <li>Généralement, 5 itérations suffisent</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-semibold text-blue-800 mb-2">💡 Conseils :</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Restez factuel, évitez les suppositions</li>
                      <li>Impliquez l'équipe dans l'analyse</li>
                      <li>Documentez chaque étape</li>
                      <li>Vérifiez la logique de l'enchaînement</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowHelp(false)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    J'ai compris
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};