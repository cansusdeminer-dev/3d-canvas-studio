import { create } from 'zustand';
import { EditorState, TransformMode, Object3DData, LightData, defaultEditorState } from '@/types/editor';

interface EditorStore extends EditorState {
  setSelectedObjectId: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  addObject: (object: Object3DData) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<Object3DData>) => void;
  toggleObjectVisibility: (id: string) => void;
  toggleObjectLock: (id: string) => void;
  addLight: (light: LightData) => void;
  updateLight: (id: string, updates: Partial<LightData>) => void;
  removeLight: (id: string) => void;
  toggleGrid: () => void;
  toggleStats: () => void;
  toggleSnap: () => void;
  setSnapValue: (value: number) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...defaultEditorState,

  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  
  setTransformMode: (mode) => set({ transformMode: mode }),
  
  addObject: (object) => set((state) => ({ 
    objects: [...state.objects, object] 
  })),
  
  removeObject: (id) => set((state) => ({
    objects: state.objects.filter((obj) => obj.id !== id),
    selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
  })),
  
  updateObject: (id, updates) => set((state) => ({
    objects: state.objects.map((obj) =>
      obj.id === id ? { ...obj, ...updates } : obj
    ),
  })),
  
  toggleObjectVisibility: (id) => set((state) => ({
    objects: state.objects.map((obj) =>
      obj.id === id ? { ...obj, visible: !obj.visible } : obj
    ),
  })),
  
  toggleObjectLock: (id) => set((state) => ({
    objects: state.objects.map((obj) =>
      obj.id === id ? { ...obj, locked: !obj.locked } : obj
    ),
  })),
  
  addLight: (light) => set((state) => ({
    lights: [...state.lights, light],
  })),
  
  updateLight: (id, updates) => set((state) => ({
    lights: state.lights.map((light) =>
      light.id === id ? { ...light, ...updates } : light
    ),
  })),
  
  removeLight: (id) => set((state) => ({
    lights: state.lights.filter((light) => light.id !== id),
  })),
  
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  
  toggleStats: () => set((state) => ({ showStats: !state.showStats })),
  
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  
  setSnapValue: (value) => set({ snapValue: value }),
  
  reset: () => set(defaultEditorState),
}));
