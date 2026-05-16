export type Tool = 
  | 'selection' 
  | 'mandatory-vp' 
  | 'optional-vp' 
  | 'variant' 
  | 'mandatory-line' 
  | 'optional-line' 
  | 'alternative-arc' 
  | 'requires-line' 
  | 'excludes-line';

export type ElementType = Exclude<Tool, 'selection'>;

export interface Binding {
  elementId: string;
  anchorX: number; // 0-1 relative position on shape width
  anchorY: number; // 0-1 relative position on shape height
}

export interface Element {
  id: string;
  type: ElementType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  startBinding?: Binding;
  endBinding?: Binding;
}

export type Action = 'drawing' | 'moving' | 'resizing' | 'resizing-start' | 'resizing-end' | 'none';

export interface Point {
  x: number;
  y: number;
}
