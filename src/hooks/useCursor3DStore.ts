import { create } from 'zustand';
import * as THREE from 'three';

export type CursorPlane = 'XY' | 'XZ' | 'YZ';

export interface MagneticSettings {
  // Position smoothing
  positionLerpMin: number;      // Lerp speed when moving fast (0.05-0.5)
  positionLerpMax: number;      // Lerp speed when moving slow (0.1-1.0)
  velocityThreshold: number;    // Velocity threshold to switch lerp speeds
  
  // Normal/orientation smoothing
  normalLerpMin: number;        // Normal lerp when moving fast
  normalLerpMax: number;        // Normal lerp when slow/stationary
  normalCommitDelay: number;    // Seconds before fully committing to new normal
  
  // Surface detection
  surfaceHoldTime: number;      // How long to maintain last surface after losing it
  minSurfaceConfidence: number; // Minimum time on surface to be confident
  
  // Movement prediction
  predictionEnabled: boolean;   // Enable trajectory prediction
  predictionStrength: number;   // How much to favor predicted direction
  
  // Edge handling
  edgeSoftening: number;        // How much to soften transitions over edges (0-1)
  maxNormalChangeRate: number;  // Maximum degrees per frame normal can change
}

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
  
  // Magnetic settings
  magneticSettings: MagneticSettings;
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
  updateMagneticSetting: <K extends keyof MagneticSettings>(key: K, value: MagneticSettings[K]) => void;
  resetMagneticSettings: () => void;
}

const defaultMagneticSettings: MagneticSettings = {
  // Position smoothing - faster defaults
  positionLerpMin: 0.3,       // Fast movement lerp
  positionLerpMax: 0.8,       // Slow/stationary lerp
  velocityThreshold: 0.02,    // Threshold between fast/slow
  
  // Normal smoothing - faster normal updates
  normalLerpMin: 0.2,         // Fast movement normal lerp  
  normalLerpMax: 0.6,         // Slow movement normal lerp
  normalCommitDelay: 0.05,    // Quick commit
  
  // Surface detection
  surfaceHoldTime: 0.15,      // Hold last surface briefly
  minSurfaceConfidence: 0.03, // Quick confidence
  
  // Movement prediction
  predictionEnabled: true,
  predictionStrength: 0.3,
  
  // Edge handling
  edgeSoftening: 0.5,
  maxNormalChangeRate: 45,    // Max 45 degrees per frame
};

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
  magneticSettings: { ...defaultMagneticSettings },

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
  updateMagneticSetting: (key, value) => set((s) => ({
    magneticSettings: { ...s.magneticSettings, [key]: value }
  })),
  resetMagneticSettings: () => set({ magneticSettings: { ...defaultMagneticSettings } }),
}));
