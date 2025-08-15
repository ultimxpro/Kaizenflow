// src/components/project/editors/vsm/VSMCanvas.tsx

import React, { forwardRef, useRef, useCallback } from 'react';
import { VSMContent, VSMElement, ViewState } from './VSMTypes';
import { VSMNode } from './VSMNode';
import { VSMConnectionLine } from './VSMConnectionLine';

interface VSMCanvasProps {
  content: VSMContent;
  viewState: ViewState;
  setViewState: (state: ViewState | ((prev: ViewState) => ViewState)) => void;
  mode: 'select' | 'connect' | 'pan';
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  connectingFrom: { elementId: string; anchor: 'top' | 'bottom' | 'left' | 'right' } | null;
  setConnectingFrom: (from: { elementId: string; anchor: 'top' | 'bottom' | 'left' | 'right' } | null) => void;
  showGrid: boolean;
  onUpdateElement: (id: string, updates: Partial<VSMElement>) => void;
  onDeleteConnection: (id: string) => void;
  onAnchorClick: (elementId: string, anchor: 'top' | 'bottom' | 'left' | 'right') => void;
}

export const VSMCanvas = forwardRef<HTMLDivElement, VSMCanvasProps>(({
  content,
  viewState,
  setViewState,
  mode,
  selectedItemId,
  setSelectedItemId,
  connectingFrom,
  setConnectingFrom,
  showGrid,
  onUpdateElement,
  onDeleteConnection,
  onAnchorClick
}, ref) => {
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = 1.1;
      const newZoom = e.deltaY < 0 ? viewState.zoom * zoomFactor : viewState.zoom / zoomFactor;
      setViewState(vs => ({ ...vs, zoom: Math.max(0.2, Math.min(3, newZoom)) }));
    }
  }, [viewState.zoom, setViewState]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    }
  }, [mode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewState(vs => ({ ...vs, pan: { x: vs.pan.x + dx, y: vs.pan.y + dy } }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [setViewState]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    if (ref && 'current' in ref && ref.current) {
      ref.current.style.cursor = mode === 'pan' ? 'grab' : mode === 'connect' ? 'crosshair' : 'default';
    }
  }, [mode, ref]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setSelectedItemId(null);
      if (mode === 'connect') {
        setConnectingFrom(null);
      }
    }
  }, [mode, setSelectedItemId, setConnectingFrom]);

  return (
    <div 
      ref={ref}
      className="flex-1 overflow-hidden relative bg-gray-100 canvas-background" 
      onWheel={handleWheel} 
      onMouseDown={handleMouseDown} 
      onMouseMove={handleMouseMove} 
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ cursor: mode === 'pan' ? 'grab' : mode === 'connect' ? 'crosshair' : 'default' }}
    >
      {/* Grid Background */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
            backgroundSize: `${50 * viewState.zoom}px ${50 * viewState.zoom}px`,
            backgroundPosition: `${viewState.pan.x}px ${viewState.pan.y}px`
          }}
        />
      )}
      
      {/* Canvas Content */}
      <div 
        className="absolute top-0 left-0" 
        style={{ 
          transform: `translate(${viewState.pan.x}px, ${viewState.pan.y}px) scale(${viewState.zoom})`, 
          transformOrigin: '0 0' 
        }}
      >
        {/* Connections */}
        <svg 
          className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none" 
          style={{ overflow: 'visible' }}
        >
          {content.connections.map(conn => (
            <VSMConnectionLine 
              key={conn.id} 
              connection={conn} 
              elements={content.elements}
              isSelected={selectedItemId === conn.id}
              onSelect={() => setSelectedItemId(conn.id)}
              onDelete={() => onDeleteConnection(conn.id)}
            />
          ))}
        </svg>
        
        {/* Elements */}
        {content.elements.map(el => (
          <VSMNode 
            key={el.id} 
            element={el} 
            isSelected={selectedItemId === el.id} 
            onSelect={() => setSelectedItemId(el.id)} 
            onUpdate={(updates) => onUpdateElement(el.id, updates)} 
            zoom={viewState.zoom} 
            onAnchorClick={onAnchorClick} 
            isConnecting={mode === 'connect'}
            connectingFrom={connectingFrom}
          />
        ))}
      </div>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-lg shadow-md text-sm font-medium">
        Zoom: {Math.round(viewState.zoom * 100)}%
      </div>
      
      {/* Mode indicator */}
      <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-lg shadow-md text-sm">
        Mode: <span className="font-medium">
          {mode === 'select' && 'Sélection'}
          {mode === 'connect' && 'Connexion'}
          {mode === 'pan' && 'Déplacement'}
        </span>
      </div>
    </div>
  );
});

VSMCanvas.displayName = 'VSMCanvas';