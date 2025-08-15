// src/components/project/editors/vsm/VSMNode.tsx

import React, { useCallback, useMemo } from 'react';
import { VSMElement } from './VSMTypes';
import { elementColors } from './VSMUtils';
import { 
  User, Truck, Square, Triangle, Factory, Package, Zap, Type, Users
} from 'lucide-react';

interface VSMNodeProps {
  element: VSMElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<VSMElement>) => void;
  zoom: number;
  onAnchorClick: (elementId: string, anchor: 'top' | 'bottom' | 'left' | 'right') => void;
  isConnecting: boolean;
  connectingFrom: { elementId: string; anchor: 'top' | 'bottom' | 'left' | 'right' } | null;
}

export const VSMNode: React.FC<VSMNodeProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  zoom,
  onAnchorClick,
  isConnecting,
  connectingFrom
}) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    
    const startX = e.clientX / zoom;
    const startY = e.clientY / zoom;
    const { x: startElX, y: startElY } = element;

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX / zoom - startX;
      const dy = me.clientY / zoom - startY;
      const newX = Math.round((startElX + dx) / 10) * 10;
      const newY = Math.round((startElY + dy) / 10) * 10;
      onUpdate({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element, zoom, onSelect, onUpdate]);

  const nodeContent = useMemo(() => {
    const colors = elementColors[element.type];
    
    switch (element.type) {
      case 'Processus':
        return (
          <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} rounded flex flex-col p-2`}>
            <div className="flex items-center justify-between mb-1">
              <Square className={`w-4 h-4 ${colors.icon}`} />
              <span className="text-xs font-bold text-gray-800">{element.data.nom}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>TC: {element.data.tempsCycle || 0}s</div>
              <div>TCH: {element.data.tempsChangt || 0}s</div>
              <div>Disp: {element.data.tauxDispo || 100}%</div>
              <div>Rebut: {element.data.rebut || 0}%</div>
            </div>
            {element.data.nbOperateurs && (
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border rounded-full px-2 py-0.5 flex items-center">
                <Users className="w-3 h-3 mr-1" />
                <span className="text-xs font-bold">{element.data.nbOperateurs}</span>
              </div>
            )}
          </div>
        );
      
      case 'Stock':
        return (
          <div className={`w-full h-full flex flex-col items-center justify-center ${colors.bg}`}>
            <svg viewBox="0 0 100 80" className="w-full h-full">
              <polygon 
                points="50,10 90,70 10,70" 
                className={`fill-current ${colors.icon} opacity-30`}
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Triangle className={`w-4 h-4 ${colors.icon}`} />
              <span className="text-xs font-bold mt-1">{element.data.quantite || 0} j</span>
              {element.data.details && (
                <span className="text-xs text-gray-600">{element.data.details}</span>
              )}
            </div>
          </div>
        );
      
      case 'Fournisseur':
        return (
          <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} rounded flex flex-col items-center justify-center p-2`}>
            <Truck className={`w-6 h-6 ${colors.icon}`} />
            <span className="text-xs font-bold mt-1">{element.data.nom}</span>
            {element.data.frequence && (
              <span className="text-xs text-gray-600">{element.data.frequence}</span>
            )}
          </div>
        );
      
      case 'Client':
        return (
          <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} rounded flex flex-col items-center justify-center p-2`}>
            <User className={`w-6 h-6 ${colors.icon}`} />
            <span className="text-xs font-bold mt-1">{element.data.nom}</span>
            {element.data.frequence && (
              <span className="text-xs text-gray-600">{element.data.frequence}</span>
            )}
          </div>
        );
      
      case 'ControleProduction':
        return (
          <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} rounded flex flex-col items-center justify-center p-2`}>
            <Factory className={`w-6 h-6 ${colors.icon}`} />
            <span className="text-xs font-bold mt-1">{element.data.nom}</span>
            {element.data.details && (
              <span className="text-xs text-gray-600 text-center">{element.data.details}</span>
            )}
          </div>
        );
      
      case 'Livraison':
        return (
          <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} rounded flex flex-col items-center justify-center p-2`}>
            <Package className={`w-6 h-6 ${colors.icon}`} />
            <span className="text-xs font-bold mt-1">{element.data.nom}</span>
            {element.data.frequence && (
              <span className="text-xs text-gray-600">{element.data.frequence}</span>
            )}
          </div>
        );
      
      case 'Kaizen':
        return (
          <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} rounded flex flex-col items-center justify-center p-2`}>
            <Zap className={`w-5 h-5 ${colors.icon}`} />
            {element.data.details && (
              <span className="text-xs text-center font-semibold mt-1">{element.data.details}</span>
            )}
          </div>
        );
      
      case 'Texte':
        return (
          <div className={`w-full h-full ${colors.bg} border ${colors.border} rounded p-2`}>
            <textarea
              className="w-full h-full bg-transparent resize-none outline-none text-xs"
              value={element.data.contenu || ''}
              onChange={(e) => onUpdate({ data: { ...element.data, contenu: e.target.value } })}
              placeholder="Texte..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full bg-gray-100 border-2 border-gray-400 rounded flex items-center justify-center">
            <span className="text-xs">{element.type}</span>
          </div>
        );
    }
  }, [element, onUpdate]);

  const anchors = ['top', 'bottom', 'left', 'right'] as const;
  const isConnectingFromThis = connectingFrom?.elementId === element.id;

  return (
    <div 
      className={`absolute group ${isSelected ? 'z-20' : 'z-10'}`}
      style={{ 
        left: element.x, 
        top: element.y, 
        width: element.width, 
        height: element.height 
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={`w-full h-full relative ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
        {nodeContent}
      </div>
      
      {/* Connection anchors */}
      {isConnecting && !isConnectingFromThis && anchors.map(anchor => (
        <div 
          key={anchor}
          className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair transition-opacity"
          style={{
            top: anchor === 'top' ? -6 : anchor === 'bottom' ? 'auto' : '50%',
            bottom: anchor === 'bottom' ? -6 : 'auto',
            left: anchor === 'left' ? -6 : anchor === 'right' ? 'auto' : '50%',
            right: anchor === 'right' ? -6 : 'auto',
            transform: anchor === 'top' || anchor === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAnchorClick(element.id, anchor);
          }}
        />
      ))}
    </div>
  );
};