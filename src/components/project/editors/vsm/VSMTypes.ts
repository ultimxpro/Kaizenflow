// src/components/project/editors/vsm/VSMTypes.ts

export type VSMElementType =
  | 'Client'
  | 'Fournisseur'
  | 'Processus'
  | 'Stock'
  | 'ControleProduction'
  | 'Livraison'
  | 'Texte'
  | 'Kaizen';

export type VSMConnectionArrow = 'pousse' | 'retrait' | 'supermarche';
export type VSMInfoFlowType = 'manuel' | 'electronique';

export interface VSMGlobalData {
  demandeClient: number;
  tempsOuverture: number;
  uniteTemps: 'secondes' | 'minutes' | 'heures' | 'jours';
  title?: string;
  company?: string;
  product?: string;
  author?: string;
  version?: string;
  date?: string;
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
    tempsCycle?: number;
    tempsChangt?: number;
    tauxDispo?: number;
    nbOperateurs?: number;
    rebut?: number;
    lotSize?: number;
    quantite?: number;
    frequence?: string;
    details?: string;
    contenu?: string;
  };
}

export interface VSMConnection {
  id: string;
  from: { elementId: string; anchor: 'top' | 'bottom' | 'left' | 'right' };
  to: { elementId: string; anchor: 'top' | 'bottom' | 'left' | 'right' };
  type: 'matiere' | 'information';
  data?: {
    arrowType?: VSMConnectionArrow;
    infoType?: VSMInfoFlowType;
    details?: string;
    label?: string;
  };
}

export interface VSMMetrics {
  leadTime: number;
  valueAddedTime: number;
  processEfficiency: number;
  taktTime: number;
  uptime: number;
  firstPassYield: number;
}

export interface VSMContent {
  elements: VSMElement[];
  connections: VSMConnection[];
  global: VSMGlobalData;
  snapshots?: any[];
  comments?: any[];
}

export interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
}