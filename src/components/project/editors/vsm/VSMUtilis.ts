// src/components/project/editors/vsm/VSMUtils.ts

import { VSMContent, VSMMetrics, VSMElement } from './VSMTypes';

export const unitMultipliers = { 
  secondes: 1, 
  minutes: 60, 
  heures: 3600, 
  jours: 86400 
};

export const elementColors = {
  Fournisseur: { bg: 'bg-purple-100', border: 'border-purple-500', icon: 'text-purple-700' },
  Client: { bg: 'bg-green-100', border: 'border-green-600', icon: 'text-green-700' },
  Processus: { bg: 'bg-blue-100', border: 'border-blue-500', icon: 'text-blue-700' },
  Stock: { bg: 'bg-orange-100', border: 'border-orange-500', icon: 'text-orange-700' },
  ControleProduction: { bg: 'bg-slate-100', border: 'border-slate-500', icon: 'text-slate-700' },
  Livraison: { bg: 'bg-gray-100', border: 'border-gray-500', icon: 'text-gray-700' },
  Kaizen: { bg: 'bg-yellow-100', border: 'border-yellow-500', icon: 'text-yellow-700' },
  Texte: { bg: 'bg-white', border: 'border-gray-300', icon: 'text-gray-600' }
};

export const getInitialContent = (content: any): VSMContent => {
  if (content && content.elements && content.elements.length > 0) {
    return content;
  }
  
  return {
    global: { 
      demandeClient: 18400, 
      tempsOuverture: 28800, 
      uniteTemps: 'secondes',
      title: 'VSM - Ligne de Production',
      company: 'Manufacturing Corp',
      product: 'Pièce métallique ref. XYZ-123',
      author: 'Équipe Kaizen',
      version: '1.0',
      date: new Date().toISOString()
    },
    elements: [
      { id: 'el-fournisseur', type: 'Fournisseur', x: 50, y: 300, width: 150, height: 100, data: { nom: 'Aciérie XYZ', frequence: '2 / semaine', details: 'Livraison par camion\nMOQ: 1000 pièces' } },
      { id: 'el-stock1', type: 'Stock', x: 250, y: 350, width: 80, height: 70, data: { quantite: 5, details: '~2500 pièces' } },
      { id: 'el-decoupe', type: 'Processus', x: 400, y: 300, width: 180, height: 120, data: { nom: 'Découpe Laser', tempsCycle: 39, tempsChangt: 600, tauxDispo: 100, nbOperateurs: 1, rebut: 1, lotSize: 50 } },
      { id: 'el-stock2', type: 'Stock', x: 650, y: 350, width: 80, height: 70, data: { quantite: 2, details: '~1000 pièces' } },
      { id: 'el-pliage', type: 'Processus', x: 800, y: 300, width: 180, height: 120, data: { nom: 'Pliage', tempsCycle: 46, tempsChangt: 900, tauxDispo: 80, nbOperateurs: 1, rebut: 4, lotSize: 25 } },
      { id: 'el-stock3', type: 'Stock', x: 1050, y: 350, width: 80, height: 70, data: { quantite: 1.5, details: '~750 pièces' } },
      { id: 'el-soudure', type: 'Processus', x: 1200, y: 300, width: 180, height: 120, data: { nom: 'Soudure', tempsCycle: 62, tempsChangt: 0, tauxDispo: 90, nbOperateurs: 1, rebut: 1, lotSize: 10 } },
      { id: 'el-stock4', type: 'Stock', x: 1450, y: 350, width: 80, height: 70, data: { quantite: 2.7, details: '~1350 pièces' } },
      { id: 'el-assemblage', type: 'Processus', x: 1600, y: 300, width: 180, height: 120, data: { nom: 'Assemblage', tempsCycle: 40, tempsChangt: 0, tauxDispo: 100, nbOperateurs: 1, rebut: 0.5, lotSize: 20 } },
      { id: 'el-stock5', type: 'Stock', x: 1850, y: 350, width: 80, height: 70, data: { quantite: 1.2, details: '~600 pièces' } },
      { id: 'el-livraison', type: 'Livraison', x: 2000, y: 300, width: 150, height: 100, data: { nom: 'Expédition', frequence: 'Quotidienne', details: 'Transporteur: DHL\nDélai: J+1' } },
      { id: 'el-client', type: 'Client', x: 2200, y: 300, width: 150, height: 100, data: { nom: 'Client Final', frequence: '920 p/jour', details: 'Automobile OEM' } },
      { id: 'el-controleprod', type: 'ControleProduction', x: 1050, y: 80, width: 180, height: 100, data: { nom: 'Planification', details: 'ERP: SAP\nMRP hebdomadaire' } },
      { id: 'el-kaizen1', type: 'Kaizen', x: 850, y: 450, width: 100, height: 80, data: { details: 'Réduire TCH\nde 900s à 300s' } },
      { id: 'el-kaizen2', type: 'Kaizen', x: 1250, y: 450, width: 100, height: 80, data: { details: 'SMED\nChangement < 10min' } },
    ],
    connections: [
      { id: 'c1', from: { elementId: 'el-fournisseur', anchor: 'right' }, to: { elementId: 'el-decoupe', anchor: 'left' }, type: 'matiere', data: { arrowType: 'pousse', label: 'Tôles brutes' } },
      { id: 'c2', from: { elementId: 'el-decoupe', anchor: 'right' }, to: { elementId: 'el-pliage', anchor: 'left' }, type: 'matiere', data: { arrowType: 'pousse', label: 'Pièces découpées' } },
      { id: 'c3', from: { elementId: 'el-pliage', anchor: 'right' }, to: { elementId: 'el-soudure', anchor: 'left' }, type: 'matiere', data: { arrowType: 'pousse' } },
      { id: 'c4', from: { elementId: 'el-soudure', anchor: 'right' }, to: { elementId: 'el-assemblage', anchor: 'left' }, type: 'matiere', data: { arrowType: 'retrait' } },
      { id: 'c5', from: { elementId: 'el-assemblage', anchor: 'right' }, to: { elementId: 'el-livraison', anchor: 'left' }, type: 'matiere', data: { arrowType: 'retrait' } },
      { id: 'c6', from: { elementId: 'el-livraison', anchor: 'right' }, to: { elementId: 'el-client', anchor: 'left' }, type: 'matiere' },
      { id: 'c7', from: { elementId: 'el-client', anchor: 'top' }, to: { elementId: 'el-controleprod', anchor: 'right' }, type: 'information', data: { infoType: 'electronique', details: 'Prévisions 6 mois' } },
      { id: 'c8', from: { elementId: 'el-controleprod', anchor: 'left' }, to: { elementId: 'el-fournisseur', anchor: 'top' }, type: 'information', data: { infoType: 'electronique', details: 'Commandes hebdo' } },
      { id: 'c9', from: { elementId: 'el-controleprod', anchor: 'bottom' }, to: { elementId: 'el-assemblage', anchor: 'top' }, type: 'information', data: { infoType: 'manuel', details: 'Planning quotidien' } },
    ],
    snapshots: [],
    comments: []
  };
};

export const calculateMetrics = (content: VSMContent): VSMMetrics => {
  const processes = content.elements.filter(el => el.type === 'Processus');
  const stocks = content.elements.filter(el => el.type === 'Stock');
  
  const valueAddedTime = processes.reduce((sum, p) => sum + (p.data.tempsCycle || 0), 0);
  const leadTime = valueAddedTime + stocks.reduce((sum, s) => sum + ((s.data.quantite || 0) * 86400), 0);
  const processEfficiency = leadTime > 0 ? (valueAddedTime / leadTime) * 100 : 0;
  
  const taktTime = content.global.tempsOuverture / (content.global.demandeClient / 30);
  
  const avgUptime = processes.length > 0 
    ? processes.reduce((sum, p) => sum + (p.data.tauxDispo || 100), 0) / processes.length 
    : 100;
  
  const avgYield = processes.length > 0 
    ? processes.reduce((sum, p) => sum + (100 - (p.data.rebut || 0)), 0) / processes.length 
    : 100;

  return {
    leadTime: leadTime / 86400,
    valueAddedTime,
    processEfficiency,
    taktTime,
    uptime: avgUptime,
    firstPassYield: avgYield
  };
};

export const getAnchorPoint = (el: VSMElement, anchor: 'top'|'bottom'|'left'|'right') => {
  switch(anchor) {
    case 'top': return { x: el.x + el.width / 2, y: el.y };
    case 'bottom': return { x: el.x + el.width / 2, y: el.y + el.height };
    case 'left': return { x: el.x, y: el.y + el.height / 2 };
    case 'right': return { x: el.x + el.width, y: el.y + el.height / 2 };
  }
};