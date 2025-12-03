export type SDFNodeType = 
  | 'primitive-sphere'
  | 'primitive-box'
  | 'primitive-cylinder'
  | 'primitive-torus'
  | 'primitive-cone'
  | 'op-union'
  | 'op-subtract'
  | 'op-intersect'
  | 'op-smooth-union'
  | 'op-smooth-subtract'
  | 'op-smooth-intersect'
  | 'output';

export interface SDFNodePosition {
  x: number;
  y: number;
}

export interface SDFNode {
  id: string;
  type: SDFNodeType;
  position: SDFNodePosition;
  params: Record<string, number>;
  inputs: string[]; // node IDs connected to inputs
}

export interface SDFConnection {
  id: string;
  fromNode: string;
  toNode: string;
  toInput: number; // which input slot (0 or 1 for binary ops)
}

export interface SDFGraph {
  nodes: SDFNode[];
  connections: SDFConnection[];
}

export const NODE_COLORS: Record<string, string> = {
  'primitive-sphere': 'hsl(200, 70%, 50%)',
  'primitive-box': 'hsl(280, 70%, 50%)',
  'primitive-cylinder': 'hsl(160, 70%, 45%)',
  'primitive-torus': 'hsl(340, 70%, 55%)',
  'primitive-cone': 'hsl(45, 90%, 55%)',
  'op-union': 'hsl(120, 60%, 45%)',
  'op-subtract': 'hsl(0, 70%, 55%)',
  'op-intersect': 'hsl(220, 70%, 55%)',
  'op-smooth-union': 'hsl(120, 70%, 55%)',
  'op-smooth-subtract': 'hsl(0, 80%, 60%)',
  'op-smooth-intersect': 'hsl(220, 80%, 60%)',
  'output': 'hsl(45, 100%, 50%)',
};

export const NODE_LABELS: Record<SDFNodeType, string> = {
  'primitive-sphere': 'Sphere',
  'primitive-box': 'Box',
  'primitive-cylinder': 'Cylinder',
  'primitive-torus': 'Torus',
  'primitive-cone': 'Cone',
  'op-union': 'Union',
  'op-subtract': 'Subtract',
  'op-intersect': 'Intersect',
  'op-smooth-union': 'Smooth Union',
  'op-smooth-subtract': 'Smooth Subtract',
  'op-smooth-intersect': 'Smooth Intersect',
  'output': 'Output',
};

export const DEFAULT_PARAMS: Record<SDFNodeType, Record<string, number>> = {
  'primitive-sphere': { radius: 0.5 },
  'primitive-box': { width: 1, height: 1, depth: 1 },
  'primitive-cylinder': { radius: 0.3, height: 1 },
  'primitive-torus': { radius: 0.5, tube: 0.15 },
  'primitive-cone': { radius: 0.5, height: 1 },
  'op-union': {},
  'op-subtract': {},
  'op-intersect': {},
  'op-smooth-union': { k: 0.3 },
  'op-smooth-subtract': { k: 0.3 },
  'op-smooth-intersect': { k: 0.3 },
  'output': {},
};

export function isPrimitiveNode(type: SDFNodeType): boolean {
  return type.startsWith('primitive-');
}

export function isOperationNode(type: SDFNodeType): boolean {
  return type.startsWith('op-');
}

export function getInputCount(type: SDFNodeType): number {
  if (isPrimitiveNode(type)) return 0;
  if (type === 'output') return 1;
  return 2; // operations have 2 inputs
}
