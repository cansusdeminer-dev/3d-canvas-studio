import { useRef, useEffect, useCallback, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { useEditorStore } from '@/hooks/useEditorStore';
import * as THREE from 'three';

interface PaintTarget {
  root: THREE.Object3D;
}

interface CloneStampPainterProps {
  paintTargets: PaintTarget[];
}

// Shared source image data
let sourceCanvas: HTMLCanvasElement | null = null;
let sourceCtx: CanvasRenderingContext2D | null = null;
let sourceImageData: ImageData | null = null;

type MeshPaintState = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
  originalMaterial: THREE.Material | THREE.Material[];
};

export function CloneStampPainter({ paintTargets }: CloneStampPainterProps) {
  const { gl, camera } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const activeStrokeMeshRef = useRef<THREE.Mesh | null>(null);
  const meshPaintMapRef = useRef<Map<string, MeshPaintState>>(new Map());

  const {
    isActive,
    mode,
    sourceImageUrl,
    sourceImageSize,
    sourceAnchor,
    brushRadius,
    brushOpacity,
    brushHardness,
    brushSpacing,
    brushScale,
    textureSettings,
    surfaceSettings,
    isStroking,
    lastDabPosition,
    getSourceSamplePosition3D,
    setTargetAnchor3D,
    setLastDabPosition,
    beginStroke,
    endStroke,
  } = useCloneStampStore();

  // Load source image
  useEffect(() => {
    if (!sourceImageUrl || !sourceImageSize) {
      sourceCanvas = null;
      sourceCtx = null;
      sourceImageData = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = sourceImageSize.width;
      sourceCanvas.height = sourceImageSize.height;
      sourceCtx = sourceCanvas.getContext('2d');
      if (sourceCtx) {
        sourceCtx.drawImage(img, 0, 0);
        sourceImageData = sourceCtx.getImageData(0, 0, sourceImageSize.width, sourceImageSize.height);
        console.log('CloneStamp: Source image loaded', sourceImageSize.width, 'x', sourceImageSize.height);
      }
    };
    img.onerror = () => {
      console.error('CloneStamp: Failed to load source image');
    };
    img.src = sourceImageUrl;

    return () => {
      sourceCanvas = null;
      sourceCtx = null;
      sourceImageData = null;
    };
  }, [sourceImageUrl, sourceImageSize]);

  const ensureMeshPaintState = useCallback((mesh: THREE.Mesh) => {
    const key = mesh.uuid;
    const existing = meshPaintMapRef.current.get(key);
    if (existing) return existing;

    const resolution = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CloneStamp: Failed to create 2D ctx');
    ctx.clearRect(0, 0, resolution, resolution);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;

    const originalMaterial = mesh.material as any;

    // If material is not MeshStandardMaterial, still replace with one for predictable map rendering
    const baseMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as any;
    const baseColor = baseMat?.color ? baseMat.color : new THREE.Color(0xffffff);

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: baseMat?.roughness ?? 0.7,
      metalness: baseMat?.metalness ?? 0.3,
    });

    mesh.material = material;

    const state: MeshPaintState = { canvas, ctx, texture, material, originalMaterial };
    meshPaintMapRef.current.set(key, state);

    console.log('CloneStamp: Paint texture attached to mesh', mesh.name || mesh.uuid);

    return state;
  }, []);

  // Bilinear sample from source
  const sampleSourceColor = useCallback((x: number, y: number): [number, number, number, number] | null => {
    if (!sourceImageData || !sourceImageSize) return null;

    const { tiling } = textureSettings;

    let px = x;
    let py = y;

    if (tiling) {
      px = ((x % sourceImageSize.width) + sourceImageSize.width) % sourceImageSize.width;
      py = ((y % sourceImageSize.height) + sourceImageSize.height) % sourceImageSize.height;
    } else {
      // Clamp so we always paint even near the edges
      px = Math.max(0, Math.min(sourceImageSize.width - 1, px));
      py = Math.max(0, Math.min(sourceImageSize.height - 1, py));
    }

    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, sourceImageSize.width - 1);
    const y1 = Math.min(y0 + 1, sourceImageSize.height - 1);
    const fx = px - x0;
    const fy = py - y0;

    const getPixel = (ix: number, iy: number): [number, number, number, number] => {
      const idx = (iy * sourceImageSize.width + ix) * 4;
      return [
        sourceImageData!.data[idx],
        sourceImageData!.data[idx + 1],
        sourceImageData!.data[idx + 2],
        sourceImageData!.data[idx + 3],
      ];
    };

    const p00 = getPixel(x0, y0);
    const p10 = getPixel(x1, y0);
    const p01 = getPixel(x0, y1);
    const p11 = getPixel(x1, y1);

    const r = p00[0] * (1 - fx) * (1 - fy) + p10[0] * fx * (1 - fy) + p01[0] * (1 - fx) * fy + p11[0] * fx * fy;
    const g = p00[1] * (1 - fx) * (1 - fy) + p10[1] * fx * (1 - fy) + p01[1] * (1 - fx) * fy + p11[1] * fx * fy;
    const b = p00[2] * (1 - fx) * (1 - fy) + p10[2] * fx * (1 - fy) + p01[2] * (1 - fx) * fy + p11[2] * fx * fy;
    const a = p00[3] * (1 - fx) * (1 - fy) + p10[3] * fx * (1 - fy) + p01[3] * (1 - fx) * fy + p11[3] * fx * fy;

    return [r, g, b, a];
  }, [sourceImageSize, textureSettings]);

  const computeTangentFrame = useCallback((normal: THREE.Vector3): { tangent: THREE.Vector3; bitangent: THREE.Vector3 } => {
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(up, normal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    return { tangent, bitangent };
  }, []);

  const paintDabOnMesh = useCallback((mesh: THREE.Mesh, hitPoint: THREE.Vector3, hitNormal: THREE.Vector3, uv: THREE.Vector2) => {
    if (!sourceAnchor || !sourceImageData) return;

    const paintState = ensureMeshPaintState(mesh);

    // Get source sample pos
    const sourcePos = getSourceSamplePosition3D(hitPoint, hitNormal, uv);
    if (!sourcePos) return;

    const canvas = paintState.canvas;

    // Convert UV -> texture pixel coords
    const cx = uv.x * canvas.width;
    const cy = (1 - uv.y) * canvas.height;

    // Map brush radius to texture pixels (simple but predictable)
    const radiusPx = Math.max(1, (brushRadius * brushScale) * (canvas.width / 1024));

    // Dab spacing grid
    const steps = Math.max(1, Math.ceil(radiusPx / 2));

    for (let dx = -steps; dx <= steps; dx++) {
      for (let dy = -steps; dy <= steps; dy++) {
        const nx = dx / steps;
        const ny = dy / steps;
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist > 1) continue;

        let alpha = 1;
        if (dist > brushHardness) {
          alpha = 1 - (dist - brushHardness) / (1 - brushHardness);
        }
        alpha *= brushOpacity;

        const sourceX = sourcePos.x + dx * (brushRadius / steps);
        const sourceY = sourcePos.y + dy * (brushRadius / steps);
        const color = sampleSourceColor(sourceX, sourceY);
        if (!color) continue;

        const paintX = cx + nx * radiusPx;
        const paintY = cy + ny * radiusPx;

        const r = Math.round(color[0]);
        const g = Math.round(color[1]);
        const b = Math.round(color[2]);
        const a = (color[3] / 255) * alpha;

        paintState.ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        paintState.ctx.fillRect(paintX - 1, paintY - 1, 2, 2);
      }
    }

    paintState.texture.needsUpdate = true;
  }, [sourceAnchor, ensureMeshPaintState, getSourceSamplePosition3D, brushRadius, brushScale, brushHardness, brushOpacity, sampleSourceColor]);

  const raycast = useCallback((e: MouseEvent, meshes: THREE.Object3D[]) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    return raycasterRef.current.intersectObjects(meshes, true);
  }, [camera, gl]);

  useEffect(() => {
    if (!isActive || mode !== '2d-to-3d') return;
    if (paintTargets.length === 0) return;

    const paintableRoots = paintTargets.map((t) => t.root);

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (e.altKey) return;

      if (!sourceAnchor) {
        console.log('CloneStamp: No source anchor set. Alt+click in 2D view first.');
        return;
      }

      const hits = raycast(e, paintableRoots);
      const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh && !!h.uv && !!h.face);
      if (!hit || !hit.uv || !hit.face) return;

      const mesh = hit.object as THREE.Mesh;
      console.log('CloneStamp: Stroke start on mesh', mesh.name || mesh.uuid);
      activeStrokeMeshRef.current = mesh;

      // Compute world normal
      const worldNormal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();

      const { tangent, bitangent } = computeTangentFrame(worldNormal);

      setTargetAnchor3D({
        position: hit.point.clone(),
        normal: worldNormal,
        tangent,
        bitangent,
        uv: hit.uv.clone(),
      });

      beginStroke();
      paintDabOnMesh(mesh, hit.point, worldNormal, hit.uv);
      setLastDabPosition(hit.point.clone());
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isStroking) return;
      const mesh = activeStrokeMeshRef.current;
      if (!mesh) return;

      const hits = raycast(e, [mesh]);
      const hit = hits.find((h) => !!h.uv && !!h.face);
      if (!hit || !hit.uv || !hit.face) return;

      const worldNormal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix((hit.object as THREE.Mesh).matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();

      const spacingDistance = brushRadius * (brushSpacing / 100) * brushScale;
      if (lastDabPosition && hit.point.distanceTo(lastDabPosition) < spacingDistance) return;

      paintDabOnMesh(mesh, hit.point, worldNormal, hit.uv);
      setLastDabPosition(hit.point.clone());
    };

    const handleMouseUp = () => {
      if (!isStroking) return;
      activeStrokeMeshRef.current = null;
      endStroke();
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isActive,
    mode,
    paintTargets,
    sourceAnchor,
    isStroking,
    raycast,
    computeTangentFrame,
    beginStroke,
    endStroke,
    setTargetAnchor3D,
    paintDabOnMesh,
    setLastDabPosition,
    lastDabPosition,
    brushRadius,
    brushSpacing,
    brushScale,
    gl,
  ]);

  return null;
}

export function CloneStampPainterScene() {
  const { isActive, mode } = useCloneStampStore();
  const { objects } = useEditorStore();
  const [paintTargets, setPaintTargets] = useState<PaintTarget[]>([]);

  useEffect(() => {
    if (!isActive || mode !== '2d-to-3d') {
      setPaintTargets([]);
      return;
    }

    const roots: THREE.Object3D[] = [];

    for (const obj of objects) {
      const root = obj.object as THREE.Object3D | undefined;
      if (!root) continue;

      // Only keep roots that have at least one UV-capable mesh
      let hasUV = false;
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (!child.geometry?.attributes?.uv) return;
        hasUV = true;
      });

      if (hasUV) roots.push(root);
    }

    const uniqueRoots = Array.from(new Set(roots));
    console.log('CloneStamp: Found', uniqueRoots.length, 'paintable objects');
    setPaintTargets(uniqueRoots.map((root) => ({ root })));
  }, [isActive, mode, objects]);

  if (!isActive || mode !== '2d-to-3d') return null;
  if (paintTargets.length === 0) return null;

  return <CloneStampPainter paintTargets={paintTargets} />;
}
