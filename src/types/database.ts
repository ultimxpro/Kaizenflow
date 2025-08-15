export interface User {
  id: string;
  email: string;
  password: string;
  nom: string;
  avatarUrl?: string;
}

export interface Persona {
  id: string;
  nom: string;
  fonction: string;
  photo?: string;
}

export interface Project {
  id: string;
  pilote: string;
  titre: string;
  what?: string;
  theme?: string;
  dateCreation: Date;
  dateProbleme?: Date;
  kaizenNumber: string;
  location?: string;
  cost: number;
  benefit: number;
  statut: 'En cours' | 'Terminé';
  pdcaStep: 'PLAN' | 'DO' | 'CHECK' | 'ACT';
}

export interface ProjectMember {
  id: string;
  project: string; // Project ID
  user: string; // User ID
  roleInProject: 'Leader' | 'Membre';
}

export interface A3Module {
  id: string;
  project: string; // Project ID
  quadrant: 'PLAN' | 'DO' | 'CHECK' | 'ACT';
  toolType: '5Pourquoi' | 'Image' | '4M' | 'OPL' | '5S' | 'VSM' | 'PlanActions' | 'Croquis' | 'Iframe';
  content: any;
  position: number;
  titre?: string;
  dateEcheance?: string;
}

export interface ModuleAssignee {
  id: string;
  module: string; // A3Module ID
  user: string; // User ID
}

export interface Action {
  id: string;
  title: string;
  description?: string;
  type: 'simple' | 'securisation' | 'poka-yoke';
  start_date: string; 
  due_date: string;
  status: 'À faire' | 'Fait';
  effort: number;
  gain: number;
  project: string;
  createdBy: string;
  assignee_ids: string[];
  leader_id?: string;
}

export interface ActionAssignee {
  id: string;
  action: string; // Action ID
  user: string; // User ID
}

// ... (le reste de vos types ToolData, VSMElement, etc. reste inchangé)
export interface ToolData {
  '5Pourquoi': {
    problem: string;
    why1: string;
    why2: string;
    why3: string;
    why4: string;
    why5: string;
    rootCause: string;
  };
  'Image': {
    url: string;
    description: string;
  };
  '4M': {
    machine: Array<{ id: string; text: string; }>;
    methode: Array<{ id: string; text: string; }>;
    materiel: Array<{ id: string; text: string; }>;
    mainOeuvre: Array<{ id: string; text: string; }>;
  };
  'OPL': {
    titre: string;
    situationAvant: {
      description: string;
      imageUrl: string;
    };
    situationApres: {
      description: string;
      imageUrl: string;
    };
    pointsCles: string;
  };
  '5S': {
    seiri: Array<{ id: string; text: string; checked: boolean; }>;
    seiton: Array<{ id: string; text: string; checked: boolean; }>;
    seiso: Array<{ id: string; text: string; checked: boolean; }>;
    seiketsu: Array<{ id: string; text: string; checked: boolean; }>;
    shitsuke: Array<{ id: string; text: string; checked: boolean; }>;
  };
  'VSM': {
    projectId: string;
  };
  'Iframe': {
    url: string;
  };
  'Croquis': {
    sketches: Array<{
      id: string;
      name: string;
      imageData: string;
      createdAt: Date;
    }>;
    activeSketchId?: string;
  };
}

export interface VSMElement {
  id: string;
  project: string;
  elementType: 'Processus' | 'Stock' | 'Livraison' | 'Client' | 'Fournisseur';
  positionX: number;
  positionY: number;
  nom: string;
  tempsCycle: number;
  tempsChangt: number;
  tauxDispo: number;
  nbOperateurs: number;
}

export interface VSMConnection {
  id: string;
  project: string;
  elementSource: string;
  elementCible: string;
  typeFleche: 'Simple' | 'Double';
}

export interface VSMTextBox {
  id: string;
  project: string;
  contenu: string;
  positionX: number;
  positionY: number;
}