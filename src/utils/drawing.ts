import type { Element, Point, Binding } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

const LINE_TYPES = ['mandatory-line', 'optional-line', 'alternative-arc', 'requires-line', 'excludes-line'];
const SHAPE_TYPES = ['mandatory-vp', 'optional-vp', 'variant'];

export function isLineType(type: string): boolean {
  return LINE_TYPES.includes(type);
}

export function isShapeType(type: string): boolean {
  return SHAPE_TYPES.includes(type);
}

export function distance(a: Point, b: Point) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// Distance from point p to line segment vw
function distToSegment(p: Point, v: Point, w: Point) {
  const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  if (l2 === 0) return distance(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

export function positionWithinElement(x: number, y: number, element: Element) {
  const { type, x1, x2, y1, y2 } = element;
  if (isLineType(type)) {
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const p = { x, y };
    const isInside = distToSegment(p, a, b) < 10;
    return isInside ? 'inside' : null;
  } else {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return 'inside';
    }
  }
  return null;
}

export function getElementAtPosition(x: number, y: number, elements: Element[]) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    const pos = positionWithinElement(x, y, element);
    if (pos !== null) {
      return { ...element, position: pos };
    }
  }
  return undefined;
}

export function getLineHandleAtPosition(x: number, y: number, element: Element): 'start' | 'end' | null {
  if (!isLineType(element.type)) return null;
  const p = { x, y };
  if (distance(p, { x: element.x1, y: element.y1 }) < 10) return 'start';
  if (distance(p, { x: element.x2, y: element.y2 }) < 10) return 'end';
  return null;
}

// ─── Snapping / Anchor Points ───────────────────────────────────────────────

const SNAP_THRESHOLD = 24; // px distance to trigger snap

/**
 * Get the fixed anchor points on a shape's boundary.
 * Returns an array of { point, anchorX, anchorY } where anchor values are
 * 0-1 relative coordinates within the shape's bounding box.
 */
export function getShapeAnchors(el: Element): { point: Point; anchorX: number; anchorY: number }[] {
  const minX = Math.min(el.x1, el.x2);
  const maxX = Math.max(el.x1, el.x2);
  const minY = Math.min(el.y1, el.y2);
  const maxY = Math.max(el.y1, el.y2);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  if (el.type === 'mandatory-vp' || el.type === 'optional-vp') {
    // Triangle: tip at top-center, base at bottom
    return [
      { point: { x: midX, y: minY }, anchorX: 0.5, anchorY: 0 },         // top tip
      { point: { x: minX, y: maxY }, anchorX: 0, anchorY: 1 },           // bottom-left
      { point: { x: maxX, y: maxY }, anchorX: 1, anchorY: 1 },           // bottom-right
      { point: { x: midX, y: maxY }, anchorX: 0.5, anchorY: 1 },         // bottom-center
      { point: { x: (minX + midX) / 2, y: midY }, anchorX: 0.25, anchorY: 0.5 }, // left-mid
      { point: { x: (maxX + midX) / 2, y: midY }, anchorX: 0.75, anchorY: 0.5 }, // right-mid
    ];
  }

  if (el.type === 'variant') {
    // Rectangle: 4 edge midpoints + 4 corners
    return [
      { point: { x: midX, y: minY }, anchorX: 0.5, anchorY: 0 },   // top-center
      { point: { x: midX, y: maxY }, anchorX: 0.5, anchorY: 1 },   // bottom-center
      { point: { x: minX, y: midY }, anchorX: 0, anchorY: 0.5 },   // left-center
      { point: { x: maxX, y: midY }, anchorX: 1, anchorY: 0.5 },   // right-center
    ];
  }

  return [];
}

/**
 * Resolve a binding's anchor coordinates to an absolute point on the given shape.
 */
export function resolveBindingPoint(binding: Binding, targetEl: Element): Point {
  const minX = Math.min(targetEl.x1, targetEl.x2);
  const maxX = Math.max(targetEl.x1, targetEl.x2);
  const minY = Math.min(targetEl.y1, targetEl.y2);
  const maxY = Math.max(targetEl.y1, targetEl.y2);
  const w = maxX - minX;
  const h = maxY - minY;

  return {
    x: minX + binding.anchorX * w,
    y: minY + binding.anchorY * h,
  };
}

export interface SnapResult {
  snappedPoint: Point;
  binding: Binding;
  targetElement: Element;
}

/**
 * Find the nearest snap target for a cursor position among all shapes.
 * Returns null if no shape anchor is within SNAP_THRESHOLD.
 */
export function findSnapTarget(
  cursorX: number,
  cursorY: number,
  elements: Element[],
  excludeElementId?: string,
): SnapResult | null {
  const cursor: Point = { x: cursorX, y: cursorY };
  let best: SnapResult | null = null;
  let bestDist = SNAP_THRESHOLD;

  for (const el of elements) {
    if (!isShapeType(el.type)) continue;
    if (el.id === excludeElementId) continue;

    const anchors = getShapeAnchors(el);
    for (const anchor of anchors) {
      const d = distance(cursor, anchor.point);
      if (d < bestDist) {
        bestDist = d;
        best = {
          snappedPoint: anchor.point,
          binding: { elementId: el.id, anchorX: anchor.anchorX, anchorY: anchor.anchorY },
          targetElement: el,
        };
      }
    }
  }

  return best;
}

/**
 * Returns elements that are inside or intersecting a selection box.
 */
export function getElementsInBox(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  elements: Element[]
): Element[] {
  const minBoxX = Math.min(startX, endX);
  const maxBoxX = Math.max(startX, endX);
  const minBoxY = Math.min(startY, endY);
  const maxBoxY = Math.max(startY, endY);

  return elements.filter((el) => {
    const minElX = Math.min(el.x1, el.x2);
    const maxElX = Math.max(el.x1, el.x2);
    const minElY = Math.min(el.y1, el.y2);
    const maxElY = Math.max(el.y1, el.y2);

    // Simple AABB intersection check
    return (
      minElX <= maxBoxX &&
      maxElX >= minBoxX &&
      minElY <= maxBoxY &&
      maxElY >= minBoxY
    );
  });
}
