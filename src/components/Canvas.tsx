import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Element, Tool, Action, ElementType, Binding } from '../types';
import {
  generateId,
  getElementAtPosition,
  isLineType,
  isShapeType,
  findSnapTarget,
  resolveBindingPoint,
  getShapeAnchors,
  getLineHandleAtPosition,
} from '../utils/drawing';
import { ElementRenderer } from './ElementRenderer';
import { Toolbar } from './Toolbar';
import { NamingDialog } from './NamingDialog';

const SHAPE_TYPE_LIST: ElementType[] = ['mandatory-vp', 'optional-vp', 'variant'];

export function Canvas() {
  const [elements, setElements] = useState<Element[]>([]);
  const [action, setAction] = useState<Action>('none');
  const [tool, setTool] = useState<Tool>('selection');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Naming dialog state
  const [pendingNamingId, setPendingNamingId] = useState<string | null>(null);
  const [namingPosition, setNamingPosition] = useState({ x: 0, y: 0 });

  // Snap indicator state (shown while drawing lines)
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number } | null>(null);

  // Store pending bindings during line drawing
  const pendingStartBinding = useRef<Binding | undefined>(undefined);
  const pendingEndBinding = useRef<Binding | undefined>(undefined);

  const updateElement = useCallback(
    (id: string, updates: Partial<Element>) => {
      setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
    },
    [],
  );

  // ─── Mouse handlers ─────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pendingNamingId) return; // block drawing while naming dialog is open
    const { clientX, clientY } = e;

    if (tool === 'selection') {
      // Check if clicking a handle of the selected element
      if (selectedElementId) {
        const selectedEl = elements.find((e) => e.id === selectedElementId);
        if (selectedEl && isLineType(selectedEl.type)) {
          const handle = getLineHandleAtPosition(clientX, clientY, selectedEl);
          if (handle === 'start') {
            setAction('resizing-start');
            pendingStartBinding.current = undefined;
            return;
          } else if (handle === 'end') {
            setAction('resizing-end');
            pendingEndBinding.current = undefined;
            return;
          }
        }
      }

      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        setSelectedElementId(element.id);
        setAction('moving');
        setDragStartPos({ x: clientX, y: clientY });
      } else {
        setSelectedElementId(null);
      }
    } else {
      // Check for snap on start point (only for lines)
      let startX = clientX;
      let startY = clientY;
      pendingStartBinding.current = undefined;
      pendingEndBinding.current = undefined;

      if (isLineType(tool)) {
        const snap = findSnapTarget(clientX, clientY, elements);
        if (snap) {
          startX = snap.snappedPoint.x;
          startY = snap.snappedPoint.y;
          pendingStartBinding.current = snap.binding;
        }
      }

      const newElement: Element = {
        id: generateId(),
        type: tool as ElementType,
        x1: startX,
        y1: startY,
        x2: startX,
        y2: startY,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedElementId(newElement.id);
      setAction('drawing');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pendingNamingId) return;
    const { clientX, clientY } = e;

    // Change cursor based on hovering
    if (tool === 'selection' && action === 'none') {
      let newCursor = 'default';
      const el = getElementAtPosition(clientX, clientY, elements);
      
      if (selectedElementId) {
        const selectedEl = elements.find((e) => e.id === selectedElementId);
        if (selectedEl && isLineType(selectedEl.type)) {
          if (getLineHandleAtPosition(clientX, clientY, selectedEl)) {
            newCursor = 'pointer';
          }
        }
      }
      
      if (newCursor === 'default' && el) {
        newCursor = 'move';
      }
      (e.target as SVGElement).style.cursor = newCursor;
    }

    if (action === 'drawing') {
      const lastEl = elements[elements.length - 1];
      if (!lastEl) return;

      if (isLineType(lastEl.type)) {
        // Try to snap the end point
        const snap = findSnapTarget(clientX, clientY, elements, lastEl.id);
        if (snap) {
          updateElement(lastEl.id, { x2: snap.snappedPoint.x, y2: snap.snappedPoint.y });
          pendingEndBinding.current = snap.binding;
          setSnapIndicator({ x: snap.snappedPoint.x, y: snap.snappedPoint.y });
        } else {
          updateElement(lastEl.id, { x2: clientX, y2: clientY });
          pendingEndBinding.current = undefined;
          setSnapIndicator(null);
        }
      } else {
        updateElement(lastEl.id, { x2: clientX, y2: clientY });
      }
    } else if (action === 'moving' && selectedElementId) {
      const dx = clientX - dragStartPos.x;
      const dy = clientY - dragStartPos.y;

      setElements((prev) => {
        const movedEl = prev.find((el) => el.id === selectedElementId);
        if (!movedEl) return prev;

        // Move the element itself
        let newElements = prev.map((el) =>
          el.id === selectedElementId
            ? { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
            : el,
        );

        // If we moved a shape, update all lines bound to it
        if (isShapeType(movedEl.type)) {
          const updatedShape = newElements.find((el) => el.id === selectedElementId)!;
          newElements = newElements.map((el) => {
            if (!isLineType(el.type)) return el;
            let updated = { ...el };
            if (el.startBinding?.elementId === selectedElementId) {
              const pt = resolveBindingPoint(el.startBinding, updatedShape);
              updated = { ...updated, x1: pt.x, y1: pt.y };
            }
            if (el.endBinding?.elementId === selectedElementId) {
              const pt = resolveBindingPoint(el.endBinding, updatedShape);
              updated = { ...updated, x2: pt.x, y2: pt.y };
            }
            return updated;
          });
        }

        return newElements;
      });

      setDragStartPos({ x: clientX, y: clientY });
    } else if (action === 'resizing-start' && selectedElementId) {
      const snap = findSnapTarget(clientX, clientY, elements);
      if (snap) {
        updateElement(selectedElementId, { x1: snap.snappedPoint.x, y1: snap.snappedPoint.y });
        pendingStartBinding.current = snap.binding;
        setSnapIndicator({ x: snap.snappedPoint.x, y: snap.snappedPoint.y });
      } else {
        updateElement(selectedElementId, { x1: clientX, y1: clientY, startBinding: undefined });
        pendingStartBinding.current = undefined;
        setSnapIndicator(null);
      }
    } else if (action === 'resizing-end' && selectedElementId) {
      const snap = findSnapTarget(clientX, clientY, elements);
      if (snap) {
        updateElement(selectedElementId, { x2: snap.snappedPoint.x, y2: snap.snappedPoint.y });
        pendingEndBinding.current = snap.binding;
        setSnapIndicator({ x: snap.snappedPoint.x, y: snap.snappedPoint.y });
      } else {
        updateElement(selectedElementId, { x2: clientX, y2: clientY, endBinding: undefined });
        pendingEndBinding.current = undefined;
        setSnapIndicator(null);
      }
    }
  };

  const handleMouseUp = () => {
    if (action === 'drawing' && elements.length > 0) {
      const lastEl = elements[elements.length - 1];
      const { x1, y1, x2, y2 } = lastEl;

      if (isLineType(lastEl.type)) {
        // Finalize bindings on the line
        const finalUpdates: Partial<Element> = {};
        if (pendingStartBinding.current) {
          finalUpdates.startBinding = pendingStartBinding.current;
        }
        if (pendingEndBinding.current) {
          finalUpdates.endBinding = pendingEndBinding.current;
        }
        if (Object.keys(finalUpdates).length > 0) {
          updateElement(lastEl.id, finalUpdates);
        }
        pendingStartBinding.current = undefined;
        pendingEndBinding.current = undefined;
        setSnapIndicator(null);
      } else {
        // Give a default size if just clicked without dragging
        if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) {
          updateElement(lastEl.id, { x2: x1 + 120, y2: y1 + 100 });
        }

        // If we just drew a shape, prompt for a name
        if (SHAPE_TYPE_LIST.includes(lastEl.type)) {
          const finalX2 = Math.abs(x2 - x1) < 5 ? x1 + 120 : x2;
          const finalY2 = Math.abs(y2 - y1) < 5 ? y1 + 100 : y2;
          const cx = (x1 + finalX2) / 2;
          const cy = (y1 + finalY2) / 2;
          setPendingNamingId(lastEl.id);
          setNamingPosition({ x: cx, y: cy });
        }
      }
    } else if ((action === 'resizing-start' || action === 'resizing-end') && selectedElementId) {
      const finalUpdates: Partial<Element> = {};
      if (action === 'resizing-start') {
        finalUpdates.startBinding = pendingStartBinding.current;
      } else if (action === 'resizing-end') {
        finalUpdates.endBinding = pendingEndBinding.current;
      }
      updateElement(selectedElementId, finalUpdates);
      pendingStartBinding.current = undefined;
      pendingEndBinding.current = undefined;
      setSnapIndicator(null);
    }
    setAction('none');
  };

  // ─── Naming handlers ────────────────────────────────────────────────────

  const handleNamingConfirm = useCallback(
    (name: string) => {
      if (pendingNamingId) {
        updateElement(pendingNamingId, { label: name });
      }
      setPendingNamingId(null);
    },
    [pendingNamingId, updateElement],
  );

  const handleNamingCancel = useCallback(() => {
    if (pendingNamingId) {
      setElements((prev) => prev.filter((el) => el.id !== pendingNamingId));
      setSelectedElementId(null);
    }
    setPendingNamingId(null);
  }, [pendingNamingId]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setElements([]);
    setSelectedElementId(null);
  }, []);

  const handleExport = useCallback(() => {
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    const defs = svgClone.querySelector('defs');
    if (defs) {
      defs.querySelectorAll('pattern').forEach((p) => p.remove());
    }
    svgClone.querySelectorAll('rect[fill="url(#dotGrid)"]').forEach((r) => r.remove());
    // Remove snap indicators from export
    svgClone.querySelectorAll('.snap-indicator').forEach((s) => s.remove());
    svgClone.querySelectorAll('.anchor-point').forEach((s) => s.remove());

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ovm-diagram.svg';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('selection');
          break;
        case '1':
          setTool('mandatory-vp');
          break;
        case '2':
          setTool('optional-vp');
          break;
        case '3':
          setTool('variant');
          break;
        case '4':
          setTool('mandatory-line');
          break;
        case '5':
          setTool('optional-line');
          break;
        case '6':
          setTool('alternative-arc');
          break;
        case '7':
          setTool('requires-line');
          break;
        case '8':
          setTool('excludes-line');
          break;
        case 'delete':
        case 'backspace':
          if (selectedElementId) {
            setElements((prev) => {
              // Also clear bindings that reference the deleted element
              const filtered = prev.filter((el) => el.id !== selectedElementId);
              return filtered.map((el) => {
                let updated = el;
                if (el.startBinding?.elementId === selectedElementId) {
                  updated = { ...updated, startBinding: undefined };
                }
                if (el.endBinding?.elementId === selectedElementId) {
                  updated = { ...updated, endBinding: undefined };
                }
                return updated;
              });
            });
            setSelectedElementId(null);
          }
          break;
        case 'escape':
          setSelectedElementId(null);
          setTool('selection');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId]);

  // ─── Render helper: anchor points on shapes when drawing lines ──────────

  const isDrawingLine =
    (action === 'drawing' && elements.length > 0 && isLineType(elements[elements.length - 1].type)) ||
    action === 'resizing-start' ||
    action === 'resizing-end';

  const renderAnchorPoints = () => {
    if (!isDrawingLine) return null;
    const activeElId = action === 'drawing' ? elements[elements.length - 1].id : selectedElementId;

    return elements
      .filter((el) => isShapeType(el.type) && el.id !== activeElId)
      .flatMap((el) =>
        getShapeAnchors(el).map((anchor, i) => (
          <circle
            key={`${el.id}-anchor-${i}`}
            className="anchor-point"
            cx={anchor.point.x}
            cy={anchor.point.y}
            r={4}
            fill="white"
            stroke="var(--selection-color)"
            strokeWidth={1.5}
            opacity={0.6}
          />
        )),
      );
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden select-none"
      style={{ backgroundColor: 'var(--canvas-bg)' }}
    >
      <Toolbar
        currentTool={tool}
        setCurrentTool={setTool}
        onClear={handleClear}
        onExport={handleExport}
        elementCount={elements.length}
      />

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: tool === 'selection' ? 'default' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <defs>
          <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.8" fill="var(--dot-color)" />
          </pattern>

          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#1e1e2e" />
          </marker>
          <marker id="arrowhead-reverse" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
            <polygon points="10 0, 0 3.5, 10 7" fill="#1e1e2e" />
          </marker>
          <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--selection-color)" />
          </marker>
          <marker id="arrowhead-reverse-selected" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
            <polygon points="10 0, 0 3.5, 10 7" fill="var(--selection-color)" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#dotGrid)" />

        {elements.map((element) => (
          <ElementRenderer
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
          />
        ))}

        {/* Anchor points visible while drawing lines */}
        {renderAnchorPoints()}

        {/* Snap indicator */}
        {snapIndicator && (
          <g className="snap-indicator">
            <circle
              cx={snapIndicator.x}
              cy={snapIndicator.y}
              r={8}
              fill="none"
              stroke="var(--selection-color)"
              strokeWidth={2}
              opacity={0.8}
            >
              <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle
              cx={snapIndicator.x}
              cy={snapIndicator.y}
              r={3}
              fill="var(--selection-color)"
            />
          </g>
        )}
      </svg>

      {/* Naming dialog */}
      {pendingNamingId &&
        (() => {
          const el = elements.find((e) => e.id === pendingNamingId);
          if (!el) return null;
          return (
            <NamingDialog
              elementType={el.type}
              position={namingPosition}
              onConfirm={handleNamingConfirm}
              onCancel={handleNamingCancel}
            />
          );
        })()}
    </div>
  );
}
