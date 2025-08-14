import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';

type Page = 'login' | 'dashboard' | 'project';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const navigate = (page: Page, projectId?: string) => {
    setCurrentPage(page);
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login onNavigate={navigate} />;
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'project':
        return currentProjectId ? (
          <ProjectView projectId={currentProjectId} onNavigate={navigate} />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      default:
        return <Login onNavigate={navigate} />;
    }
  };

  return (
    <AuthProvider>
      <DatabaseProvider>
        <div className="App">
          {renderCurrentPage()}
        </div>
      </DatabaseProvider>
    </AuthProvider>
  );
}

export default App;