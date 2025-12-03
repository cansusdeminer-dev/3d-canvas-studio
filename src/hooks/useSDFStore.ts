import { create } from 'zustand';
import { SDFNode, SDFConnection, SDFGraph, SDFNodeType, DEFAULT_PARAMS } from '@/types/sdf-nodes';

interface SDFStore {
  graph: SDFGraph;
  selectedNodeId: string | null;
  connectingFrom: string | null;
  
  addNode: (type: SDFNodeType, position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeParams: (id: string, params: Record<string, number>) => void;
  selectNode: (id: string | null) => void;
  
  startConnection: (fromNodeId: string) => void;
  completeConnection: (toNodeId: string, inputIndex: number) => void;
  cancelConnection: () => void;
  removeConnection: (id: string) => void;
  
  clearGraph: () => void;
  loadPreset: (preset: 'simple' | 'blend' | 'complex') => void;
}

let nodeCounter = 0;
let connectionCounter = 0;

const createInitialGraph = (): SDFGraph => ({
  nodes: [
    {
      id: 'output-1',
      type: 'output',
      position: { x: 500, y: 200 },
      params: {},
      inputs: [],
    },
  ],
  connections: [],
});

export const useSDFStore = create<SDFStore>((set, get) => ({
  graph: createInitialGraph(),
  selectedNodeId: null,
  connectingFrom: null,

  addNode: (type, position) => {
    const id = `node-${++nodeCounter}`;
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: [
          ...state.graph.nodes,
          {
            id,
            type,
            position,
            params: { ...DEFAULT_PARAMS[type] },
            inputs: [],
          },
        ],
      },
    }));
    return id;
  },

  removeNode: (id) => {
    if (id === 'output-1') return; // Can't remove output node
    set((state) => ({
      graph: {
        nodes: state.graph.nodes.filter((n) => n.id !== id),
        connections: state.graph.connections.filter(
          (c) => c.fromNode !== id && c.toNode !== id
        ),
      },
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((n) =>
          n.id === id ? { ...n, position } : n
        ),
      },
    }));
  },

  updateNodeParams: (id, params) => {
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((n) =>
          n.id === id ? { ...n, params: { ...n.params, ...params } } : n
        ),
      },
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  startConnection: (fromNodeId) => set({ connectingFrom: fromNodeId }),

  completeConnection: (toNodeId, inputIndex) => {
    const { connectingFrom, graph } = get();
    if (!connectingFrom || connectingFrom === toNodeId) {
      set({ connectingFrom: null });
      return;
    }

    // Check if connection already exists
    const exists = graph.connections.some(
      (c) => c.fromNode === connectingFrom && c.toNode === toNodeId && c.toInput === inputIndex
    );
    if (exists) {
      set({ connectingFrom: null });
      return;
    }

    // Remove existing connection to this input
    const filtered = graph.connections.filter(
      (c) => !(c.toNode === toNodeId && c.toInput === inputIndex)
    );

    set({
      graph: {
        ...graph,
        connections: [
          ...filtered,
          {
            id: `conn-${++connectionCounter}`,
            fromNode: connectingFrom,
            toNode: toNodeId,
            toInput: inputIndex,
          },
        ],
      },
      connectingFrom: null,
    });
  },

  cancelConnection: () => set({ connectingFrom: null }),

  removeConnection: (id) => {
    set((state) => ({
      graph: {
        ...state.graph,
        connections: state.graph.connections.filter((c) => c.id !== id),
      },
    }));
  },

  clearGraph: () => set({ graph: createInitialGraph(), selectedNodeId: null }),

  loadPreset: (preset) => {
    nodeCounter = 10;
    connectionCounter = 10;
    
    if (preset === 'simple') {
      set({
        graph: {
          nodes: [
            { id: 'node-11', type: 'primitive-sphere', position: { x: 100, y: 150 }, params: { radius: 0.5 }, inputs: [] },
            { id: 'node-12', type: 'primitive-box', position: { x: 100, y: 280 }, params: { width: 0.8, height: 0.8, depth: 0.8 }, inputs: [] },
            { id: 'node-13', type: 'op-union', position: { x: 300, y: 200 }, params: {}, inputs: [] },
            { id: 'output-1', type: 'output', position: { x: 500, y: 200 }, params: {}, inputs: [] },
          ],
          connections: [
            { id: 'conn-11', fromNode: 'node-11', toNode: 'node-13', toInput: 0 },
            { id: 'conn-12', fromNode: 'node-12', toNode: 'node-13', toInput: 1 },
            { id: 'conn-13', fromNode: 'node-13', toNode: 'output-1', toInput: 0 },
          ],
        },
        selectedNodeId: null,
      });
    } else if (preset === 'blend') {
      set({
        graph: {
          nodes: [
            { id: 'node-11', type: 'primitive-sphere', position: { x: 100, y: 150 }, params: { radius: 0.6 }, inputs: [] },
            { id: 'node-12', type: 'primitive-cylinder', position: { x: 100, y: 280 }, params: { radius: 0.25, height: 1.5 }, inputs: [] },
            { id: 'node-13', type: 'op-smooth-union', position: { x: 300, y: 200 }, params: { k: 0.4 }, inputs: [] },
            { id: 'output-1', type: 'output', position: { x: 500, y: 200 }, params: {}, inputs: [] },
          ],
          connections: [
            { id: 'conn-11', fromNode: 'node-11', toNode: 'node-13', toInput: 0 },
            { id: 'conn-12', fromNode: 'node-12', toNode: 'node-13', toInput: 1 },
            { id: 'conn-13', fromNode: 'node-13', toNode: 'output-1', toInput: 0 },
          ],
        },
        selectedNodeId: null,
      });
    } else if (preset === 'complex') {
      set({
        graph: {
          nodes: [
            { id: 'node-11', type: 'primitive-sphere', position: { x: 80, y: 100 }, params: { radius: 0.7 }, inputs: [] },
            { id: 'node-12', type: 'primitive-box', position: { x: 80, y: 230 }, params: { width: 0.5, height: 0.5, depth: 2 }, inputs: [] },
            { id: 'node-13', type: 'primitive-box', position: { x: 80, y: 360 }, params: { width: 2, height: 0.5, depth: 0.5 }, inputs: [] },
            { id: 'node-14', type: 'op-smooth-union', position: { x: 260, y: 150 }, params: { k: 0.2 }, inputs: [] },
            { id: 'node-15', type: 'op-smooth-union', position: { x: 260, y: 300 }, params: { k: 0.2 }, inputs: [] },
            { id: 'node-16', type: 'op-smooth-union', position: { x: 440, y: 220 }, params: { k: 0.15 }, inputs: [] },
            { id: 'output-1', type: 'output', position: { x: 620, y: 220 }, params: {}, inputs: [] },
          ],
          connections: [
            { id: 'conn-11', fromNode: 'node-11', toNode: 'node-14', toInput: 0 },
            { id: 'conn-12', fromNode: 'node-12', toNode: 'node-14', toInput: 1 },
            { id: 'conn-13', fromNode: 'node-11', toNode: 'node-15', toInput: 0 },
            { id: 'conn-14', fromNode: 'node-13', toNode: 'node-15', toInput: 1 },
            { id: 'conn-15', fromNode: 'node-14', toNode: 'node-16', toInput: 0 },
            { id: 'conn-16', fromNode: 'node-15', toNode: 'node-16', toInput: 1 },
            { id: 'conn-17', fromNode: 'node-16', toNode: 'output-1', toInput: 0 },
          ],
        },
        selectedNodeId: null,
      });
    }
  },
}));
