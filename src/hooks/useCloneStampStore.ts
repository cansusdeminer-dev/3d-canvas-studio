import { create } from 'zustand';
import * as THREE from 'three';

export interface CloneAnchor2D {
  x: number;
  y: number;
}

export interface CloneAnchor3D {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  tangent: THREE.Vector3;
  bitangent: THREE.Vector3;
}

export interface CloneStampState {
  // Tool state
  isActive: boolean;
  mode: '2d-to-2d' | '2d-to-3d';
  
  // Source image
  sourceImageUrl: string | null;
  sourceImageSize: { width: number; height: number } | null;
  
  // Anchors
  sourceAnchor: CloneAnchor2D | null;  // S0 - where user alt-clicked in source
  targetAnchor2D: CloneAnchor2D | null;  // T0 for 2D mode
  targetAnchor3D: CloneAnchor3D | null;  // P0 for 3D mode
  
  // Brush settings
  brushRadius: number;  // in pixels for 2D, world units for 3D
  brushRotation: number;  // θ in radians
  brushScale: number;  // scaling factor
  brushOpacity: number;
  brushHardness: number;  // falloff 0-1
  
  // Stroke state
  isStroking: boolean;
  strokeId: number;  // increments each new stroke
  
  // View settings
  splitMode: 'horizontal' | 'vertical' | 'overlay' | 'tabs';
  splitRatio: number;  // 0-1 for split position
  overlayOpacity: number;  // for overlay mode
  canvas2DVisible: boolean;
  canvas3DVisible: boolean;
}

interface CloneStampStore extends CloneStampState {
  // Tool control
  setActive: (active: boolean) => void;
  setMode: (mode: '2d-to-2d' | '2d-to-3d') => void;
  
  // Source image
  setSourceImage: (url: string, size: { width: number; height: number }) => void;
  clearSourceImage: () => void;
  
  // Anchors - CRITICAL: these are set once per stroke and NEVER modified during stroke
  setSourceAnchor: (anchor: CloneAnchor2D) => void;
  setTargetAnchor2D: (anchor: CloneAnchor2D) => void;
  setTargetAnchor3D: (anchor: CloneAnchor3D) => void;
  clearAnchors: () => void;
  
  // Brush settings
  setBrushRadius: (radius: number) => void;
  setBrushRotation: (rotation: number) => void;
  setBrushScale: (scale: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrushHardness: (hardness: number) => void;
  
  // Stroke control
  beginStroke: () => void;
  endStroke: () => void;
  
  // View settings
  setSplitMode: (mode: 'horizontal' | 'vertical' | 'overlay' | 'tabs') => void;
  setSplitRatio: (ratio: number) => void;
  setOverlayOpacity: (opacity: number) => void;
  toggleCanvas2D: () => void;
  toggleCanvas3D: () => void;
  
  // Clone math utilities
  getSourceSamplePosition2D: (targetX: number, targetY: number) => CloneAnchor2D | null;
  getSourceSamplePosition3D: (hitPoint: THREE.Vector3) => CloneAnchor2D | null;
}

export const useCloneStampStore = create<CloneStampStore>((set, get) => ({
  // Initial state
  isActive: false,
  mode: '2d-to-3d',
  
  sourceImageUrl: null,
  sourceImageSize: null,
  
  sourceAnchor: null,
  targetAnchor2D: null,
  targetAnchor3D: null,
  
  brushRadius: 50,
  brushRotation: 0,
  brushScale: 1,
  brushOpacity: 1,
  brushHardness: 0.8,
  
  isStroking: false,
  strokeId: 0,
  
  splitMode: 'horizontal',
  splitRatio: 0.4,
  overlayOpacity: 0.5,
  canvas2DVisible: true,
  canvas3DVisible: true,
  
  // Actions
  setActive: (active) => set({ isActive: active }),
  setMode: (mode) => set({ mode }),
  
  setSourceImage: (url, size) => set({ sourceImageUrl: url, sourceImageSize: size }),
  clearSourceImage: () => set({ sourceImageUrl: null, sourceImageSize: null, sourceAnchor: null }),
  
  setSourceAnchor: (anchor) => set({ sourceAnchor: anchor }),
  setTargetAnchor2D: (anchor) => set({ targetAnchor2D: anchor }),
  setTargetAnchor3D: (anchor) => set({ 
    targetAnchor3D: {
      position: anchor.position.clone(),
      normal: anchor.normal.clone(),
      tangent: anchor.tangent.clone(),
      bitangent: anchor.bitangent.clone()
    }
  }),
  clearAnchors: () => set({ sourceAnchor: null, targetAnchor2D: null, targetAnchor3D: null }),
  
  setBrushRadius: (radius) => set({ brushRadius: radius }),
  setBrushRotation: (rotation) => set({ brushRotation: rotation }),
  setBrushScale: (scale) => set({ brushScale: scale }),
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),
  setBrushHardness: (hardness) => set({ brushHardness: hardness }),
  
  beginStroke: () => set((s) => ({ isStroking: true, strokeId: s.strokeId + 1 })),
  endStroke: () => set({ isStroking: false }),
  
  setSplitMode: (mode) => set({ splitMode: mode }),
  setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.1, Math.min(0.9, ratio)) }),
  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
  toggleCanvas2D: () => set((s) => ({ canvas2DVisible: !s.canvas2DVisible })),
  toggleCanvas3D: () => set((s) => ({ canvas3DVisible: !s.canvas3DVisible })),
  
  // CRITICAL: Clone math - rotation affects offset mapping, NOT anchors
  getSourceSamplePosition2D: (targetX, targetY) => {
    const { sourceAnchor, targetAnchor2D, brushRotation, brushScale } = get();
    if (!sourceAnchor || !targetAnchor2D) return null;
    
    // ΔT = T - T0
    const dx = targetX - targetAnchor2D.x;
    const dy = targetY - targetAnchor2D.y;
    
    // Rotate offset back into source space: ΔS = R(-θ) * ΔT
    const cosA = Math.cos(-brushRotation);
    const sinA = Math.sin(-brushRotation);
    const sxOff = cosA * dx - sinA * dy;
    const syOff = sinA * dx + cosA * dy;
    
    // S = S0 + ΔS / scale
    return {
      x: sourceAnchor.x + sxOff / brushScale,
      y: sourceAnchor.y + syOff / brushScale
    };
  },
  
  getSourceSamplePosition3D: (hitPoint) => {
    const { sourceAnchor, targetAnchor3D, brushRotation, brushScale } = get();
    if (!sourceAnchor || !targetAnchor3D) return null;
    
    // Δ = P - P0
    const delta = hitPoint.clone().sub(targetAnchor3D.position);
    
    // Project into tangent plane: (u, v)
    const u = delta.dot(targetAnchor3D.tangent);
    const v = delta.dot(targetAnchor3D.bitangent);
    
    // Same 2D clone math in tangent space
    const cosA = Math.cos(-brushRotation);
    const sinA = Math.sin(-brushRotation);
    const sxOff = cosA * u - sinA * v;
    const syOff = sinA * u + cosA * v;
    
    // Convert world units to pixels (brushScale = world units per pixel)
    return {
      x: sourceAnchor.x + sxOff / brushScale,
      y: sourceAnchor.y + syOff / brushScale
    };
  }
}));
