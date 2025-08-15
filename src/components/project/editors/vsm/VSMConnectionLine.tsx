// src/components/project/editors/vsm/VSMConnectionLine.tsx

import React, { useMemo } from 'react';
import { VSMConnection, VSMElement } from './VSMTypes';
import { getAnchorPoint } from './VSMUtils';

interface VSMConnectionLineProps {
  connection: VSMConnection;
  elements: VSMElement[];
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export const VSMConnectionLine: React.FC<VSMConnectionLineProps> = ({
  connection,
  elements,
  isSelected,
  onSelect,
  onDelete
}) => {
  const pathData = useMemo(() => {
    const fromEl = elements.find(el => el.id === connection.from.elementId);
    const toEl = elements.find(el => el.id === connection.to.elementId);
    
    if (!fromEl || !toEl) return null;
    
    const p1 = getAnchorPoint(fromEl, connection.from.anchor);
    const p2 = getAnchorPoint(toEl, connection.to.anchor);
    
    // Calculate control points for curved path
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let path: string;
    
    if (connection.type === 'information') {
      // Curved path for information flow
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      // Calculate perpendicular offset for curve
      const offset = Math.min(distance * 0.2, 50);
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;
      
      const ctrlX = midX + Math.cos(perpAngle) * offset;
      const ctrlY = midY + Math.sin(perpAngle) * offset;
      
      path = `M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`;
    } else {
      // Straight path for material flow
      path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }
    
    return { path, p1, p2 };
  }, [connection, elements]);

  if (!pathData) return null;

  const isInfo = connection.type === 'information';
  const isPushed = connection.data?.arrowType === 'pousse';
  const isRetrait = connection.data?.arrowType === 'retrait';
  const isSupermarche = connection.data?.arrowType === 'supermarche';
  const isManual = connection.data?.infoType === 'manuel';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && isSelected) {
      onDelete();
    }
  };

  return (
    <g className="pointer-events-auto">
      {/* Définition des marqueurs */}
      <defs>
        <marker 
          id={`arrow-${connection.id}`} 
          viewBox="0 0 10 10" 
          refX="8" 
          refY="5" 
          markerWidth="6" 
          markerHeight="6" 
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={isInfo ? "#6B7280" : "#374151"} />
        </marker>
        
        <marker 
          id={`push-${connection.id}`} 
          viewBox="0 0 10 10" 
          refX="5" 
          refY="5" 
          markerWidth="8" 
          markerHeight="8"