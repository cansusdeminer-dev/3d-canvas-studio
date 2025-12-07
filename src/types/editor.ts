import * as THREE from 'three';

export type TransformMode = 'translate' | 'rotate' | 'scale' | 'select';

export type GeometryType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'imported';

export interface Object3DData {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'group';
  geometryType: GeometryType;
  visible: boolean;
  locked: boolean;
  object?: THREE.Object3D;
  modelUrl?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
}

export interface LightData {
  id: string;
  name: string;
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: string;
  intensity: number;
  position?: [number, number, number];
  castShadow?: boolean;
}

export interface BrushSettings {
  size: number;
  color: string;
  opacity: number;
  hardness: number;
}

export interface EditorState {
  selectedObjectId: string | null;
  transformMode: TransformMode;
  objects: Object3DData[];
  lights: LightData[];
  showGrid: boolean;
  showStats: boolean;
  snapEnabled: boolean;
  snapValue: number;
  paintMode: boolean;
  brushSettings: BrushSettings;
  showUVEditor: boolean;
}

export interface ViewportSettings {
  fov: number;
  near: number;
  far: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export const defaultBrushSettings: BrushSettings = {
  size: 20,
  color: '#ff0000',
  opacity: 1,
  hardness: 0.8,
};

export const defaultEditorState: EditorState = {
  selectedObjectId: null,
  transformMode: 'translate',
  objects: [
    {
      id: 'default-sphere',
      name: 'Sphere',
      type: 'mesh',
      geometryType: 'sphere',
      visible: true,
      locked: false,
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#6366f1',
    },
    {
      id: 'default-box',
      name: 'Box',
      type: 'mesh',
      geometryType: 'box',
      visible: true,
      locked: false,
      position: [2, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#22c55e',
    },
    {
      id: 'default-torus',
      name: 'Torus',
      type: 'mesh',
      geometryType: 'torus',
      visible: true,
      locked: false,
      position: [-2, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#f59e0b',
    },
  ],
  lights: [
    {
      id: 'ambient-1',
      name: 'Ambient Light',
      type: 'ambient',
      color: '#ffffff',
      intensity: 0.4,
    },
    {
      id: 'directional-1',
      name: 'Main Light',
      type: 'directional',
      color: '#ffffff',
      intensity: 1.0,
      position: [5, 10, 5],
      castShadow: true,
    },
  ],
  showGrid: true,
  showStats: false,
  snapEnabled: false,
  snapValue: 1,
  paintMode: false,
  brushSettings: defaultBrushSettings,
  showUVEditor: false,
};

export const defaultViewportSettings: ViewportSettings = {
  fov: 50,
  near: 0.1,
  far: 1000,
  cameraPosition: [5, 5, 5],
  cameraTarget: [0, 0, 0],
};
