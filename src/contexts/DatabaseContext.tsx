import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project, ProjectMember, A3Module, Action, ActionAssignee, VSMElement, VSMConnection, VSMTextBox, Persona, ModuleAssignee } from '../types/database';

interface DatabaseContextType {
  projects: Project[];
  projectMembers: ProjectMember[];
  a3Modules: A3Module[];
  actions: Action[];
  actionAssignees: ActionAssignee[];
  vsmElements: VSMElement[];
  vsmConnections: VSMConnection[];
  vsmTextBoxes: VSMTextBox[];
  personas: Persona[];
  moduleAssignees: ModuleAssignee[];
  createProject: (titre: string, pilote: string) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addProjectMember: (project: string, user: string, role: 'Pilote' | 'Contributeur') => void;
  updateProjectMember: (id: string, updates: Partial<ProjectMember>) => void;
  removeProjectMember: (id: string) => void;
  createA3Module: (module: Omit<A3Module, 'id'>) => string;
  updateA3Module: (id: string, updates: Partial<A3Module>) => void;
  deleteA3Module: (id: string) => void;
  addModuleAssignee: (module: string, user: string) => void;
  removeModuleAssignee: (module: string, user: string) => void;
  createAction: (action: Omit<Action, 'id'>) => string;
  updateAction: (id: string, updates: Partial<Action>) => void;
  deleteAction: (id: string) => void;
  addActionAssignee: (action: string, user: string) => void;
  removeActionAssignee: (action: string, user: string) => void;
  createVSMElement: (element: Omit<VSMElement, 'id'>) => string;
  updateVSMElement: (id: string, updates: Partial<VSMElement>) => void;
  deleteVSMElement: (id: string) => void;
  createVSMConnection: (connection: Omit<VSMConnection, 'id'>) => string;
  deleteVSMConnection: (id: string) => void;
  createVSMTextBox: (textBox: Omit<VSMTextBox, 'id'>) => string;
  updateVSMTextBox: (id: string, updates: Partial<VSMTextBox>) => void;
  deleteVSMTextBox: (id: string) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

// Mock data for demonstration
const mockProjects: Project[] = [
  {
    id: '1',
    titre: 'Réduction des temps de cycle ligne A',
    theme: 'Optimisation de la productivité sur la ligne d\'assemblage A',
    dateCreation: new Date('2024-01-15'),
    statut: 'En cours',
    pilote: '1',
    kaizenNumber: 'KZN-2024-001',
    location: 'Ligne A, Poste 3',
    cost: 5000,
    benefit: 12000,
    pdcaStep: 'PLAN'
  },
  {
    id: '2',
    titre: 'Amélioration qualité soudure',
    theme: 'Réduction des défauts de soudure sur les pièces principales',
    dateCreation: new Date('2024-01-10'),
    statut: 'En cours',
    pilote: '1',
    kaizenNumber: 'KZN-2024-002',
    location: 'Atelier soudure, Zone B',
    cost: 3000,
    benefit: 8000,
    pdcaStep: 'DO'
  }
];

const mockProjectMembers: ProjectMember[] = [
  {
    id: '1',
    project: '1',
    user: '1',
    roleInProject: 'Leader'
  }
];

const mockA3Modules: A3Module[] = [];

const mockActions: Action[] = [];

const mockActionAssignees: ActionAssignee[] = [];

const mockVSMElements: VSMElement[] = [];
const mockVSMConnections: VSMConnection[] = [];
const mockVSMTextBoxes: VSMTextBox[] = [];

const mockPersonas: Persona[] = [
  {
    id: 'p1',
    nom: 'Opérateur Production',
    fonction: 'Opérateur de ligne',
    photo: undefined
  },
  {
    id: 'p2',
    nom: 'Technicien Maintenance',
    fonction: 'Technicien',
    photo: undefined
  }
];

const mockModuleAssignees: ModuleAssignee[] = [];
export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>(mockProjectMembers);
  const [a3Modules, setA3Modules] = useState<A3Module[]>(mockA3Modules);
  const [actions, setActions] = useState<Action[]>(mockActions);
  const [actionAssignees, setActionAssignees] = useState<ActionAssignee[]>(mockActionAssignees);
  const [vsmElements, setVSMElements] = useState<VSMElement[]>(mockVSMElements);
  const [vsmConnections, setVSMConnections] = useState<VSMConnection[]>(mockVSMConnections);
  const [vsmTextBoxes, setVSMTextBoxes] = useState<VSMTextBox[]>(mockVSMTextBoxes);
  const [personas, setPersonas] = useState<Persona[]>(mockPersonas);
  const [moduleAssignees, setModuleAssignees] = useState<ModuleAssignee[]>(mockModuleAssignees);

  const createProject = (titre: string, pilote: string): string => {
    // Generate unique Kaizen number
    const currentYear = new Date().getFullYear();
    const existingNumbers = projects
      .filter(p => p.kaizenNumber.startsWith(`KZN-${currentYear}-`))
      .map(p => parseInt(p.kaizenNumber.split('-')[2]))
      .sort((a, b) => b - a);
    
    const nextNumber = existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
    const kaizenNumber = `KZN-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

    const newProject: Project = {
      id: Date.now().toString(),
      titre,
      theme: '',
      dateCreation: new Date(),
      statut: 'En cours',
      pilote,
      kaizenNumber,
      location: '',
      cost: 0,
      benefit: 0,
      pdcaStep: 'PLAN'
    };

    setProjects(prev => [...prev, newProject]);
    return newProject.id;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(project => 
      project.id === id ? { ...project, ...updates } : project
    ));
  };

  const addProjectMember = (project: string, user: string, role: 'Leader' | 'Membre') => {
    const newMember: ProjectMember = {
      id: Date.now().toString(),
      project,
      user,
      roleInProject: role
    };

    setProjectMembers(prev => [...prev, newMember]);
  };

  const updateProjectMember = (id: string, updates: Partial<ProjectMember>) => {
    setProjectMembers(prev => prev.map(member => 
      member.id === id ? { ...member, ...updates } : member
    ));
  };

  const removeProjectMember = (id: string) => {
    setProjectMembers(prev => prev.filter(member => member.id !== id));
  };

  const createA3Module = (module: Omit<A3Module, 'id'>): string => {
    const newModule: A3Module = {
      id: Date.now().toString(),
      ...module
    };

    setA3Modules(prev => [...prev, newModule]);
    return newModule.id;
  };

  const updateA3Module = (id: string, updates: Partial<A3Module>) => {
    setA3Modules(prev => prev.map(module => 
      module.id === id ? { ...module, ...updates } : module
    ));
  };

  const deleteA3Module = (id: string) => {
    setA3Modules(prev => prev.filter(module => module.id !== id));
    setModuleAssignees(prev => prev.filter(assignee => assignee.module !== id));
  };

  const addModuleAssignee = (module: string, user: string) => {
    const existingAssignee = moduleAssignees.find(a => a.module === module && a.user === user);
    if (!existingAssignee) {
      const newAssignee: ModuleAssignee = {
        id: Date.now().toString(),
        module,
        user
      };
      setModuleAssignees(prev => [...prev, newAssignee]);
    }
  };

  const removeModuleAssignee = (module: string, user: string) => {
    setModuleAssignees(prev => prev.filter(assignee => 
      !(assignee.module === module && assignee.user === user)
    ));
  };

  const createAction = (action: Omit<Action, 'id'>): string => {
    const newAction: Action = {
      id: Date.now().toString(),
      ...action
    };

    setActions(prev => [...prev, newAction]);
    return newAction.id;
  };

  const updateAction = (id: string, updates: Partial<Action>) => {
    setActions(prev => prev.map(action => 
      action.id === id ? { ...action, ...updates } : action
    ));
  };

  const deleteAction = (id: string) => {
    setActions(prev => prev.filter(action => action.id !== id));
    setActionAssignees(prev => prev.filter(assignee => assignee.action !== id));
  };

  const addActionAssignee = (action: string, user: string) => {
    const existingAssignee = actionAssignees.find(a => a.action === action && a.user === user);
    if (!existingAssignee) {
      const newAssignee: ActionAssignee = {
        id: Date.now().toString(),
        action,
        user
      };
      setActionAssignees(prev => [...prev, newAssignee]);
    }
  };

  const removeActionAssignee = (action: string, user: string) => {
    setActionAssignees(prev => prev.filter(assignee => 
      !(assignee.action === action && assignee.user === user)
    ));
  };

  const createVSMElement = (element: Omit<VSMElement, 'id'>): string => {
    const newElement: VSMElement = {
      id: Date.now().toString(),
      ...element
    };
    setVSMElements(prev => [...prev, newElement]);
    return newElement.id;
  };

  const updateVSMElement = (id: string, updates: Partial<VSMElement>) => {
    setVSMElements(prev => prev.map(element => 
      element.id === id ? { ...element, ...updates } : element
    ));
  };

  const deleteVSMElement = (id: string) => {
    setVSMElements(prev => prev.filter(element => element.id !== id));
    setVSMConnections(prev => prev.filter(conn => 
      conn.elementSource !== id && conn.elementCible !== id
    ));
  };

  const createVSMConnection = (connection: Omit<VSMConnection, 'id'>): string => {
    const newConnection: VSMConnection = {
      id: Date.now().toString(),
      ...connection
    };
    setVSMConnections(prev => [...prev, newConnection]);
    return newConnection.id;
  };

  const deleteVSMConnection = (id: string) => {
    setVSMConnections(prev => prev.filter(conn => conn.id !== id));
  };

  const createVSMTextBox = (textBox: Omit<VSMTextBox, 'id'>): string => {
    const newTextBox: VSMTextBox = {
      id: Date.now().toString(),
      ...textBox
    };
    setVSMTextBoxes(prev => [...prev, newTextBox]);
    return newTextBox.id;
  };

  const updateVSMTextBox = (id: string, updates: Partial<VSMTextBox>) => {
    setVSMTextBoxes(prev => prev.map(textBox => 
      textBox.id === id ? { ...textBox, ...updates } : textBox
    ));
  };

  const deleteVSMTextBox = (id: string) => {
    setVSMTextBoxes(prev => prev.filter(textBox => textBox.id !== id));
  };
  const value = {
    projects,
    projectMembers,
    a3Modules,
    actions,
    actionAssignees,
    vsmElements,
    vsmConnections,
    vsmTextBoxes,
    personas,
    moduleAssignees,
    createProject,
    updateProject,
    addProjectMember,
    updateProjectMember,
    removeProjectMember,
    createA3Module,
    updateA3Module,
    deleteA3Module,
    addModuleAssignee,
    removeModuleAssignee,
    createAction,
    updateAction,
    deleteAction,
    addActionAssignee,
    removeActionAssignee,
    createVSMElement,
    updateVSMElement,
    deleteVSMElement,
    createVSMConnection,
    deleteVSMConnection,
    createVSMTextBox,
    updateVSMTextBox,
    deleteVSMTextBox
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};