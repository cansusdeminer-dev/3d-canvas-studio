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
  uv: THREE.Vector2;
}

// Projection modes for mapping 2D texture to 3D surfaces
export type ProjectionMode = 'planar' | 'cylindrical' | 'spherical' | 'uv-based';

// How to handle curvature when painting
export type CurvatureMode = 'ignore' | 'adapt' | 'stretch';

export interface TextureSettings {
  /** World units per 1 source-image pixel (smaller = “bigger stamp” on the mesh). */
  worldScale: number;
  /** UV-space scale multiplier when using 'uv-based' projection. */
  uvScale: { u: number; v: number };
  /** Offset in UV space (used by 'uv-based' projection). */
  uvOffset: { u: number; v: number };
  /** Whether to tile the source texture */
  tiling: boolean;
  /** Blend mode for painting */
  blendMode: 'normal' | 'multiply' | 'overlay' | 'soft-light';
}

export interface SurfaceSettings {
  /** How to project the texture onto surfaces */
  projectionMode: ProjectionMode;
  /** How to handle surface curvature */
  curvatureMode: CurvatureMode;
  /** Whether to follow surface normals */
  followNormals: boolean;
  /** Curvature threshold for adaptive mode (0-1) */
  curvatureThreshold: number;
  /** Seam blending radius in pixels */
  seamBlendRadius: number;
}

export interface CloneStampState {
  // Tool state
  isActive: boolean;
  mode: '2d-to-2d' | '2d-to-3d';

  // Source image
  sourceImageUrl: string | null;
  sourceImageSize: { width: number; height: number } | null;

  // Anchors
  sourceAnchor: CloneAnchor2D | null; // S0 - where user alt-clicked in source
  targetAnchor2D: CloneAnchor2D | null; // T0 for 2D mode
  targetAnchor3D: CloneAnchor3D | null; // P0 for 3D mode

  // Brush settings
  /** Brush radius in SOURCE PIXELS (shared mental model for 2D + 3D). */
  brushRadius: number;
  /** θ in radians */
  brushRotation: number;
  /** scaling factor (2.0 means “stamp twice as big”, source motion halves) */
  brushScale: number;
  brushOpacity: number;
  /** falloff 0-1 */
  brushHardness: number;
  /** percentage of brush size between dabs */
  brushSpacing: number;

  // Texture settings
  textureSettings: TextureSettings;

  // Surface settings
  surfaceSettings: SurfaceSettings;

  // Stroke state
  isStroking: boolean;
  strokeId: number; // increments each new stroke
  lastDabPosition: THREE.Vector3 | null;

  // View settings
  splitMode: 'horizontal' | 'vertical' | 'overlay' | 'tabs';
  splitRatio: number; // 0-1 for split position
  overlayOpacity: number; // for overlay mode
  canvas2DVisible: boolean;
  canvas3DVisible: boolean;

  // Paint history for undo
  paintHistory: ImageData[];
  historyIndex: number;
}

interface CloneStampStore extends CloneStampState {
  // Tool control
  setActive: (active: boolean) => void;
  setMode: (mode: '2d-to-2d' | '2d-to-3d') => void;

  // Source image
  setSourceImage: (url: string, size: { width: number; height: number }) => void;
  clearSourceImage: () => void;

  // Anchors
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
  setBrushSpacing: (spacing: number) => void;

  // Texture settings
  setTextureSettings: (settings: Partial<TextureSettings>) => void;

  // Surface settings
  setSurfaceSettings: (settings: Partial<SurfaceSettings>) => void;

  // Stroke control
  beginStroke: () => void;
  endStroke: () => void;
  setLastDabPosition: (pos: THREE.Vector3 | null) => void;

  // View settings
  setSplitMode: (mode: 'horizontal' | 'vertical' | 'overlay' | 'tabs') => void;
  setSplitRatio: (ratio: number) => void;
  setOverlayOpacity: (opacity: number) => void;
  toggleCanvas2D: () => void;
  toggleCanvas3D: () => void;

  // Clone math utilities
  getSourceSamplePosition2D: (targetX: number, targetY: number) => CloneAnchor2D | null;
  getSourceSamplePosition3D: (
    hitPoint: THREE.Vector3,
    hitNormal: THREE.Vector3,
    hitUV: THREE.Vector2
  ) => CloneAnchor2D | null;

  // History
  pushHistory: (imageData: ImageData) => void;
  undo: () => ImageData | null;
  redo: () => ImageData | null;
}

const defaultTextureSettings: TextureSettings = {
  // IMPORTANT: this must be small for a typical ~1-unit mesh (e.g. a cube)
  // otherwise a “50px brush” becomes 50 world units.
  worldScale: 0.001,
  uvScale: { u: 1, v: 1 },
  uvOffset: { u: 0, v: 0 },
  tiling: false,
  blendMode: 'normal',
};

const defaultSurfaceSettings: SurfaceSettings = {
  projectionMode: 'planar',
  curvatureMode: 'adapt',
  followNormals: true,
  curvatureThreshold: 0.5,
  seamBlendRadius: 10,
};

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
  brushSpacing: 25,

  textureSettings: defaultTextureSettings,
  surfaceSettings: defaultSurfaceSettings,

  isStroking: false,
  strokeId: 0,
  lastDabPosition: null,

  splitMode: 'horizontal',
  splitRatio: 0.35,
  overlayOpacity: 0.5,
  canvas2DVisible: true,
  canvas3DVisible: true,

  paintHistory: [],
  historyIndex: -1,

  // Actions
  setActive: (active) => set({ isActive: active }),
  setMode: (mode) => set({ mode }),

  setSourceImage: (url, size) => set({ sourceImageUrl: url, sourceImageSize: size }),
  clearSourceImage: () => set({ sourceImageUrl: null, sourceImageSize: null, sourceAnchor: null }),

  setSourceAnchor: (anchor) => set({ sourceAnchor: anchor }),
  setTargetAnchor2D: (anchor) => set({ targetAnchor2D: anchor }),
  setTargetAnchor3D: (anchor) =>
    set({
      targetAnchor3D: {
        position: anchor.position.clone(),
        normal: anchor.normal.clone(),
        tangent: anchor.tangent.clone(),
        bitangent: anchor.bitangent.clone(),
        uv: anchor.uv.clone(),
      },
    }),
  clearAnchors: () => set({ sourceAnchor: null, targetAnchor2D: null, targetAnchor3D: null }),

  setBrushRadius: (radius) => set({ brushRadius: radius }),
  setBrushRotation: (rotation) => set({ brushRotation: rotation }),
  setBrushScale: (scale) => set({ brushScale: scale }),
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),
  setBrushHardness: (hardness) => set({ brushHardness: hardness }),
  setBrushSpacing: (spacing) => set({ brushSpacing: spacing }),

  setTextureSettings: (settings) =>
    set((state) => ({
      textureSettings: { ...state.textureSettings, ...settings },
    })),

  setSurfaceSettings: (settings) =>
    set((state) => ({
      surfaceSettings: { ...state.surfaceSettings, ...settings },
    })),

  beginStroke: () => set((s) => ({ isStroking: true, strokeId: s.strokeId + 1, lastDabPosition: null })),
  endStroke: () => set({ isStroking: false, lastDabPosition: null }),
  setLastDabPosition: (pos) => set({ lastDabPosition: pos }),

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
      y: sourceAnchor.y + syOff / brushScale,
    };
  },

  // 3D clone mapping: same invariant, just in surface/tangent terms
  getSourceSamplePosition3D: (hitPoint, hitNormal, hitUV) => {
    const {
      sourceAnchor,
      targetAnchor3D,
      brushRotation,
      brushScale,
      textureSettings,
      surfaceSettings,
      sourceImageSize,
    } = get();
    if (!sourceAnchor || !targetAnchor3D) return null;

    const { projectionMode, curvatureMode, followNormals, curvatureThreshold } = surfaceSettings;
    const { worldScale, uvScale, uvOffset } = textureSettings;

    // UV-based is the most “texture correct” because it follows the mesh's unwrap.
    if (projectionMode === 'uv-based') {
      if (!sourceImageSize) return null;

      const du = (hitUV.x + uvOffset.u - targetAnchor3D.uv.x) * uvScale.u;
      const dv = (hitUV.y + uvOffset.v - targetAnchor3D.uv.y) * uvScale.v;

      const cosA = Math.cos(-brushRotation);
      const sinA = Math.sin(-brushRotation);
      const uRot = cosA * du - sinA * dv;
      const vRot = sinA * du + cosA * dv;

      // Map UV delta to source pixels (scaled + rotation-aware)
      return {
        x: sourceAnchor.x + (uRot * sourceImageSize.width) / brushScale,
        y: sourceAnchor.y + (vRot * sourceImageSize.height) / brushScale,
      };
    }

    // Δ = P - P0
    const delta = hitPoint.clone().sub(targetAnchor3D.position);

    // Curvature handling: optionally re-frame tangent/bitangent when normals diverge
    let adaptedTangent = targetAnchor3D.tangent.clone();
    let adaptedBitangent = targetAnchor3D.bitangent.clone();

    if (followNormals && curvatureMode === 'adapt') {
      const normalDot = hitNormal.dot(targetAnchor3D.normal);
      if (normalDot < 1 - curvatureThreshold) {
        const up = Math.abs(hitNormal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        adaptedTangent = new THREE.Vector3().crossVectors(up, hitNormal).normalize();
        adaptedBitangent = new THREE.Vector3().crossVectors(hitNormal, adaptedTangent).normalize();
      }
    }

    let u = 0;
    let v = 0;

    if (projectionMode === 'planar') {
      u = delta.dot(adaptedTangent);
      v = delta.dot(adaptedBitangent);
    } else if (projectionMode === 'cylindrical') {
      const projXZ = new THREE.Vector2(delta.x, delta.z);
      const angle = Math.atan2(projXZ.y, projXZ.x);
      const radius = projXZ.length();
      u = angle * radius;
      v = delta.y;
    } else if (projectionMode === 'spherical') {
      const r = delta.length();
      if (r > 0.001) {
        const theta = Math.atan2(delta.x, delta.z);
        const phi = Math.acos(Math.max(-1, Math.min(1, delta.y / r)));
        u = theta * r;
        v = phi * r;
      }
    } else {
      u = delta.dot(adaptedTangent);
      v = delta.dot(adaptedBitangent);
    }

    // Apply rotation in tangent space
    const cosA = Math.cos(-brushRotation);
    const sinA = Math.sin(-brushRotation);
    const sxOffWorld = cosA * u - sinA * v;
    const syOffWorld = sinA * u + cosA * v;

    // Convert world units -> source pixels
    // worldScale is worldUnitsPerPixel, so pixelsPerWorldUnit = 1/worldScale
    const pixelsPerWorldUnit = worldScale > 0 ? 1 / worldScale : 0;

    return {
      x: sourceAnchor.x + (sxOffWorld * pixelsPerWorldUnit) / brushScale,
      y: sourceAnchor.y + (syOffWorld * pixelsPerWorldUnit) / brushScale,
    };
  },

  pushHistory: (imageData) =>
    set((state) => {
      const newHistory = state.paintHistory.slice(0, state.historyIndex + 1);
      newHistory.push(imageData);
      // Limit history to 20 entries
      if (newHistory.length > 20) newHistory.shift();
      return { paintHistory: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      set({ historyIndex: state.historyIndex - 1 });
      return state.paintHistory[state.historyIndex - 1];
    }
    return null;
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.paintHistory.length - 1) {
      set({ historyIndex: state.historyIndex + 1 });
      return state.paintHistory[state.historyIndex + 1];
    }
    return null;
  },
}));
