import { create } from 'zustand';
import * as THREE from 'three';

export type CursorPlane = 'XY' | 'XZ' | 'YZ';

export interface Cursor3DState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  normal: THREE.Vector3;
  plane: CursorPlane;
  height: number;
  magneticMode: boolean;
  magneticAngle: number;
  isOnSurface: boolean;
  visible: boolean;
  sculptMode: boolean;
  sculptStrength: number;
  sculptRadius: number;
  sculptType: 'push' | 'pull' | 'smooth' | 'pinch';
}

interface Cursor3DStore extends Cursor3DState {
  setPosition: (pos: THREE.Vector3) => void;
  setRotation: (rot: THREE.Euler) => void;
  setNormal: (normal: THREE.Vector3) => void;
  setPlane: (plane: CursorPlane) => void;
  setHeight: (height: number) => void;
  toggleMagneticMode: () => void;
  setMagneticAngle: (angle: number) => void;
  setIsOnSurface: (isOn: boolean) => void;
  toggleVisible: () => void;
  toggleSculptMode: () => void;
  setSculptStrength: (strength: number) => void;
  setSculptRadius: (radius: number) => void;
  setSculptType: (type: 'push' | 'pull' | 'smooth' | 'pinch') => void;
  cyclePlane: () => void;
}

export const useCursor3DStore = create<Cursor3DStore>((set, get) => ({
  position: new THREE.Vector3(0, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  normal: new THREE.Vector3(0, 1, 0),
  plane: 'XZ',
  height: 0,
  magneticMode: false,
  magneticAngle: 0,
  isOnSurface: false,
  visible: true,
  sculptMode: false,
  sculptStrength: 0.5,
  sculptRadius: 0.5,
  sculptType: 'push',

  setPosition: (pos) => set({ position: pos.clone() }),
  setRotation: (rot) => set({ rotation: rot.clone() }),
  setNormal: (normal) => set({ normal: normal.clone() }),
  setPlane: (plane) => set({ plane }),
  setHeight: (height) => set({ height }),
  toggleMagneticMode: () => set((s) => ({ magneticMode: !s.magneticMode })),
  setMagneticAngle: (angle) => set({ magneticAngle: angle }),
  setIsOnSurface: (isOn) => set({ isOnSurface: isOn }),
  toggleVisible: () => set((s) => ({ visible: !s.visible })),
  toggleSculptMode: () => set((s) => ({ sculptMode: !s.sculptMode })),
  setSculptStrength: (strength) => set({ sculptStrength: strength }),
  setSculptRadius: (radius) => set({ sculptRadius: radius }),
  setSculptType: (type) => set({ sculptType: type }),
  cyclePlane: () => set((s) => {
    const planes: CursorPlane[] = ['XY', 'XZ', 'YZ'];
    const idx = planes.indexOf(s.plane);
    return { plane: planes[(idx + 1) % 3] };
  }),
}));
