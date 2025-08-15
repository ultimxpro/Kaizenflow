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

// =======================================================================
// === NOUVELLES STRUCTURES DE DONNÉES POUR LE MODULE VSM COMPLET ===
// =======================================================================

export type VSMElementType =
  | 'Client'
  | 'Fournisseur'
  | 'Processus'
  | 'Stock'
  | 'ControleProduction'
  | 'Livraison'
  | 'Texte';

export type VSMConnectionArrow = 'pousse' | 'retrait';
export type VSMInfoFlowType = 'manuel' | 'electronique';

export interface VSMGlobalData {
  demandeClient: number; // pièces par mois
  tempsOuverture: number; // secondes par jour
  uniteTemps: 'secondes' | 'minutes' | 'heures' | 'jours';
}

export interface VSMElement {
  id: string;
  type: VSMElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: {
    nom?: string;
    tempsCycle?: number;      // (s) Processus
    tempsChangt?: number;     // (s) Processus
    tauxDispo?: number;       // (%) Processus
    nbOperateurs?: number;    // Processus
    rebut?: number;           // (%) Processus
    quantite?: number;        // Stock (en jours)
    frequence?: string;       // Livraison, Client, Fournisseur
    details?: string;         // ControleProduction, Texte
    contenu?: string;         // Texte
  };
}

export interface VSMConnection {
  id: string;
  from: string;
  to: string;
  type: 'matiere' | 'information';
  data?: {
    arrowType?: VSMConnectionArrow;
    infoType?: VSMInfoFlowType;
    details?: string;
  };
}

export interface VSMContent {
  elements: VSMElement[];
  connections: VSMConnection[];
  global: VSMGlobalData;
}