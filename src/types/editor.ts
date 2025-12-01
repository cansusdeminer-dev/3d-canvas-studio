import * as THREE from 'three';

export type TransformMode = 'translate' | 'rotate' | 'scale' | 'select';

export interface Object3DData {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'group';
  visible: boolean;
  locked: boolean;
  object?: THREE.Object3D;
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

export interface EditorState {
  selectedObjectId: string | null;
  transformMode: TransformMode;
  objects: Object3DData[];
  lights: LightData[];
  showGrid: boolean;
  showStats: boolean;
  snapEnabled: boolean;
  snapValue: number;
}

export interface ViewportSettings {
  fov: number;
  near: number;
  far: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export const defaultEditorState: EditorState = {
  selectedObjectId: null,
  transformMode: 'translate',
  objects: [],
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
};

export const defaultViewportSettings: ViewportSettings = {
  fov: 50,
  near: 0.1,
  far: 1000,
  cameraPosition: [5, 5, 5],
  cameraTarget: [0, 0, 0],
};
