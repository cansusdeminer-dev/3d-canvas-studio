import { create } from 'zustand';
import * as THREE from 'three';

// Paint layer system - non-destructive paint that can be toggled/cleared per object
export interface PaintLayer {
  id: string;
  meshUuid: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  visible: boolean;
  opacity: number;
  name: string;
  // Original material backup
  originalMaterial: THREE.Material | THREE.Material[];
  // Current paint material
  paintMaterial: THREE.MeshStandardMaterial;
}

export interface FlipSettings {
  flipU: boolean;
  flipV: boolean;
  autoDetect: boolean;
}

export interface MeshPaintConfig {
  meshUuid: string;
  flipSettings: FlipSettings;
  // Auto-detected tangent frame orientation
  detectedFlipU: boolean;
  detectedFlipV: boolean;
}

interface PaintLayerState {
  layers: Map<string, PaintLayer>;
  meshConfigs: Map<string, MeshPaintConfig>;
  resolution: number;
}

interface PaintLayerStore extends PaintLayerState {
  // Layer management
  createLayer: (mesh: THREE.Mesh, name?: string) => PaintLayer;
  getLayer: (meshUuid: string) => PaintLayer | undefined;
  setLayerVisibility: (meshUuid: string, visible: boolean) => void;
  setLayerOpacity: (meshUuid: string, opacity: number) => void;
  clearLayer: (meshUuid: string) => void;
  removeLayer: (meshUuid: string) => void;
  restoreOriginalMaterial: (meshUuid: string) => void;
  
  // Flip settings per mesh
  setFlipSettings: (meshUuid: string, settings: Partial<FlipSettings>) => void;
  getFlipSettings: (meshUuid: string) => FlipSettings;
  autoDetectFlip: (meshUuid: string, tangent: THREE.Vector3, bitangent: THREE.Vector3, normal: THREE.Vector3) => void;
  
  // Global
  setResolution: (res: number) => void;
}

const defaultFlipSettings: FlipSettings = {
  flipU: false,
  flipV: false,
  autoDetect: true,
};

export const usePaintLayerStore = create<PaintLayerStore>((set, get) => ({
  layers: new Map(),
  meshConfigs: new Map(),
  resolution: 2048,

  createLayer: (mesh: THREE.Mesh, name?: string) => {
    const { layers, resolution } = get();
    const existing = layers.get(mesh.uuid);
    if (existing) return existing;

    // Create paint canvas
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create 2D context for paint layer');

    // Start with transparent layer (overlay mode)
    ctx.clearRect(0, 0, resolution, resolution);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Store original material
    const originalMaterial = mesh.material as THREE.Material | THREE.Material[];
    const baseMat = Array.isArray(originalMaterial) ? originalMaterial[0] : originalMaterial;
    const baseColor = (baseMat as any)?.color?.clone?.() ?? new THREE.Color(0xffffff);

    // Create paint material that blends paint layer over base
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.FrontSide,
      roughness: (baseMat as any)?.roughness ?? 0.7,
      metalness: (baseMat as any)?.metalness ?? 0.3,
      alphaTest: 0.01,
    });

    // Apply paint material
    mesh.material = paintMaterial;

    const layer: PaintLayer = {
      id: mesh.uuid,
      meshUuid: mesh.uuid,
      canvas,
      ctx,
      texture,
      visible: true,
      opacity: 1,
      name: name || `Paint Layer - ${mesh.name || mesh.uuid.slice(0, 8)}`,
      originalMaterial,
      paintMaterial,
    };

    const newLayers = new Map(layers);
    newLayers.set(mesh.uuid, layer);
    set({ layers: newLayers });

    console.log('PaintLayer: Created for mesh', mesh.name || mesh.uuid);
    return layer;
  },

  getLayer: (meshUuid: string) => {
    return get().layers.get(meshUuid);
  },

  setLayerVisibility: (meshUuid: string, visible: boolean) => {
    const { layers } = get();
    const layer = layers.get(meshUuid);
    if (!layer) return;

    layer.visible = visible;
    layer.paintMaterial.visible = visible;
    
    const newLayers = new Map(layers);
    newLayers.set(meshUuid, { ...layer });
    set({ layers: newLayers });
  },

  setLayerOpacity: (meshUuid: string, opacity: number) => {
    const { layers } = get();
    const layer = layers.get(meshUuid);
    if (!layer) return;

    layer.opacity = opacity;
    layer.paintMaterial.opacity = opacity;
    
    const newLayers = new Map(layers);
    newLayers.set(meshUuid, { ...layer });
    set({ layers: newLayers });
  },

  clearLayer: (meshUuid: string) => {
    const { layers, resolution } = get();
    const layer = layers.get(meshUuid);
    if (!layer) return;

    // Clear to transparent
    layer.ctx.clearRect(0, 0, resolution, resolution);
    layer.texture.needsUpdate = true;
    
    console.log('PaintLayer: Cleared', meshUuid);
  },

  removeLayer: (meshUuid: string) => {
    const { layers } = get();
    const layer = layers.get(meshUuid);
    if (!layer) return;

    // Dispose texture
    layer.texture.dispose();
    layer.paintMaterial.dispose();

    const newLayers = new Map(layers);
    newLayers.delete(meshUuid);
    set({ layers: newLayers });
  },

  restoreOriginalMaterial: (meshUuid: string) => {
    const { layers } = get();
    const layer = layers.get(meshUuid);
    if (!layer) return;

    // Find mesh in scene and restore material
    // Note: Mesh reference not stored, caller must handle this
    console.log('PaintLayer: Original material should be restored for', meshUuid);
  },

  setFlipSettings: (meshUuid: string, settings: Partial<FlipSettings>) => {
    const { meshConfigs } = get();
    const existing = meshConfigs.get(meshUuid);
    const config: MeshPaintConfig = existing || {
      meshUuid,
      flipSettings: { ...defaultFlipSettings },
      detectedFlipU: false,
      detectedFlipV: false,
    };

    config.flipSettings = { ...config.flipSettings, ...settings };

    const newConfigs = new Map(meshConfigs);
    newConfigs.set(meshUuid, config);
    set({ meshConfigs: newConfigs });
  },

  getFlipSettings: (meshUuid: string) => {
    const { meshConfigs } = get();
    const config = meshConfigs.get(meshUuid);
    if (!config) return { ...defaultFlipSettings };
    
    // If auto-detect is on, use detected values
    if (config.flipSettings.autoDetect) {
      return {
        flipU: config.detectedFlipU,
        flipV: config.detectedFlipV,
        autoDetect: true,
      };
    }
    return config.flipSettings;
  },

  autoDetectFlip: (meshUuid: string, tangent: THREE.Vector3, bitangent: THREE.Vector3, normal: THREE.Vector3) => {
    const { meshConfigs } = get();
    
    // Heuristic: check if tangent frame is left-handed or right-handed
    // If the cross product of tangent × bitangent doesn't align with normal, flip is needed
    const cross = new THREE.Vector3().crossVectors(tangent, bitangent);
    const dotNormal = cross.dot(normal);
    
    // Also check if tangent/bitangent are roughly axis-aligned
    // If tangent.x is negative (pointing left), we may need to flip U
    // If bitangent.y is negative (pointing down), we may need to flip V
    
    const detectedFlipU = tangent.x < -0.5; // Tangent pointing in -X direction
    const detectedFlipV = dotNormal < 0; // Tangent frame is left-handed
    
    const config: MeshPaintConfig = meshConfigs.get(meshUuid) || {
      meshUuid,
      flipSettings: { ...defaultFlipSettings },
      detectedFlipU: false,
      detectedFlipV: false,
    };
    
    config.detectedFlipU = detectedFlipU;
    config.detectedFlipV = detectedFlipV;
    
    const newConfigs = new Map(meshConfigs);
    newConfigs.set(meshUuid, config);
    set({ meshConfigs: newConfigs });
    
    console.log('PaintLayer: Auto-detected flip for', meshUuid, '- flipU:', detectedFlipU, 'flipV:', detectedFlipV);
  },

  setResolution: (res: number) => {
    set({ resolution: res });
  },
}));
