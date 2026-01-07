import { useRef, useEffect, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { useEditorStore } from '@/hooks/useEditorStore';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

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

// Debug overlay state (module-level for persistence)
interface DebugInfo {
  hitUV: THREE.Vector2;
  sourceCenter: { x: number; y: number };
  targetAnchorUV: THREE.Vector2;
  uvDelta: { u: number; v: number };
  worldPos: THREE.Vector3;
}
let debugInfo: DebugInfo | null = null;

type MeshPaintState = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  paintMaterials: THREE.MeshStandardMaterial[];
  originalMaterial: THREE.Material | THREE.Material[];
};

function isDescendant(root: THREE.Object3D, obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur === root) return true;
    cur = cur.parent;
  }
  return false;
}

function computeTriangleTangentFrame(mesh: THREE.Mesh, face: THREE.Face, worldNormal: THREE.Vector3) {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.attributes.position as THREE.BufferAttribute | undefined;
  const uvAttr = geom.attributes.uv as THREE.BufferAttribute | undefined;
  if (!posAttr || !uvAttr) {
    // fallback
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(worldNormal.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(up, worldNormal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();
    return { tangent, bitangent };
  }

  const getPos = (i: number) => new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(mesh.matrixWorld);
  const getUV = (i: number) => new THREE.Vector2(uvAttr.getX(i), uvAttr.getY(i));

  const i0 = face.a;
  const i1 = face.b;
  const i2 = face.c;

  const p0 = getPos(i0);
  const p1 = getPos(i1);
  const p2 = getPos(i2);

  const uv0 = getUV(i0);
  const uv1 = getUV(i1);
  const uv2 = getUV(i2);

  const dp1 = p1.clone().sub(p0);
  const dp2 = p2.clone().sub(p0);
  const duv1 = uv1.clone().sub(uv0);
  const duv2 = uv2.clone().sub(uv0);

  const denom = duv1.x * duv2.y - duv1.y * duv2.x;
  if (Math.abs(denom) < 1e-8) {
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(worldNormal.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(up, worldNormal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();
    return { tangent, bitangent };
  }

  const r = 1 / denom;

  const tangent = dp1.clone().multiplyScalar(duv2.y).sub(dp2.clone().multiplyScalar(duv1.y)).multiplyScalar(r);
  // Orthonormalize tangent
  tangent.sub(worldNormal.clone().multiplyScalar(worldNormal.dot(tangent))).normalize();

  const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();

  return { tangent, bitangent };
}

export function CloneStampPainter({ paintTargets }: CloneStampPainterProps) {
  const { gl, camera } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const activeStrokeRootRef = useRef<THREE.Object3D | null>(null);
  const meshPaintMapRef = useRef<Map<string, MeshPaintState>>(new Map());

  const {
    isActive,
    mode,
    sourceImageUrl,
    sourceImageSize,
    sourceAnchor,
    brushRadius,
    brushRotation,
    brushOpacity,
    brushHardness,
    brushSpacing,
    brushScale,
    textureSettings,
    isStroking,
    lastDabPosition,
    targetAnchor3D,
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
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const originalMaterial = mesh.material as THREE.Material | THREE.Material[];

    const toPaintMaterial = (baseMat: any) => {
      const baseColor = baseMat?.color ? baseMat.color : new THREE.Color(0xffffff);
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: baseMat?.roughness ?? 0.7,
        metalness: baseMat?.metalness ?? 0.3,
      });
    };

    const paintMaterials: THREE.MeshStandardMaterial[] = Array.isArray(originalMaterial)
      ? originalMaterial.map((m) => toPaintMaterial(m))
      : [toPaintMaterial(originalMaterial)];

    mesh.material = Array.isArray(originalMaterial) ? paintMaterials : paintMaterials[0];

    const state: MeshPaintState = { canvas, ctx, texture, paintMaterials, originalMaterial };
    meshPaintMapRef.current.set(key, state);

    console.log('CloneStamp: Paint texture attached to mesh', mesh.name || mesh.uuid);

    return state;
  }, []);

  // Bilinear sample from source
  const sampleSourceColor = useCallback(
    (x: number, y: number): [number, number, number, number] | null => {
      if (!sourceImageData || !sourceImageSize) return null;

      const { tiling } = textureSettings;

      let px = x;
      let py = y;

      if (tiling) {
        px = ((x % sourceImageSize.width) + sourceImageSize.width) % sourceImageSize.width;
        py = ((y % sourceImageSize.height) + sourceImageSize.height) % sourceImageSize.height;
      } else {
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
    },
    [sourceImageSize, textureSettings]
  );

  const paintDab = useCallback(
    (hit: THREE.Intersection<THREE.Object3D>, targetAnchor3D: { uv: THREE.Vector2 } | null) => {
      if (!sourceAnchor || !sourceImageData || !sourceImageSize) return;
      if (!hit.uv || !hit.face) return;
      if (!targetAnchor3D) return;

      const mesh = hit.object as THREE.Mesh;
      if (!mesh?.isMesh) return;

      const geom = mesh.geometry as THREE.BufferGeometry;
      if (!geom?.attributes?.uv) return;

      const paintState = ensureMeshPaintState(mesh);
      const { canvas, ctx } = paintState;

      // ===== UV-BASED SOURCE SAMPLING (THE KEY FIX) =====
      // UV delta from stroke start to current hit
      const duUV = hit.uv.x - targetAnchor3D.uv.x;
      const dvUV = hit.uv.y - targetAnchor3D.uv.y;

      // Apply rotation in UV space: R(-θ)
      const cosA = Math.cos(-brushRotation);
      const sinA = Math.sin(-brushRotation);
      const duRot = cosA * duUV - sinA * dvUV;
      const dvRot = sinA * duUV + cosA * dvUV;

      // Scale UV delta by source image size and inverse of brush scale
      // This maps: moving 1 UV unit on target -> moving sourceImageSize pixels on source (adjusted by scale)
      const sourceOffsetX = (duRot * sourceImageSize.width) / brushScale;
      const sourceOffsetY = (dvRot * sourceImageSize.height) / brushScale;

      const sourceCenter = {
        x: sourceAnchor.x + sourceOffsetX,
        y: sourceAnchor.y + sourceOffsetY,
      };

      // Update debug info
      debugInfo = {
        hitUV: hit.uv.clone(),
        sourceCenter,
        targetAnchorUV: targetAnchor3D.uv.clone(),
        uvDelta: { u: duUV, v: dvUV },
        worldPos: hit.point.clone(),
      };

      // Map source-pixel brush radius to target texture pixels
      const radiusPx = Math.max(1, brushRadius * brushScale * (canvas.width / sourceImageSize.width));

      const cx = hit.uv.x * canvas.width;
      const cy = (1 - hit.uv.y) * canvas.height;

      const minX = Math.max(0, Math.floor(cx - radiusPx));
      const minY = Math.max(0, Math.floor(cy - radiusPx));
      const maxX = Math.min(canvas.width - 1, Math.ceil(cx + radiusPx));
      const maxY = Math.min(canvas.height - 1, Math.ceil(cy + radiusPx));

      const w = Math.max(1, maxX - minX + 1);
      const h = Math.max(1, maxY - minY + 1);

      const img = ctx.getImageData(minX, minY, w, h);
      const data = img.data;

      // Convert target texture pixels back to source pixels
      const targetPxToSourcePxX = sourceImageSize.width / canvas.width;
      const targetPxToSourcePxY = sourceImageSize.height / canvas.height;

      let paintedCount = 0;

      for (let yy = 0; yy < h; yy++) {
        const py = minY + yy + 0.5;
        const dy = py - cy;

        for (let xx = 0; xx < w; xx++) {
          const px = minX + xx + 0.5;
          const dx = px - cx;

          const dist = Math.sqrt(dx * dx + dy * dy) / radiusPx;
          if (dist > 1) continue;

          let mask = 1;
          if (dist > brushHardness) {
            mask = 1 - (dist - brushHardness) / Math.max(1e-6, 1 - brushHardness);
          }

          const srcX = sourceCenter.x + dx * targetPxToSourcePxX;
          const srcY = sourceCenter.y + dy * targetPxToSourcePxY;
          const src = sampleSourceColor(srcX, srcY);
          if (!src) continue;

          const srcA = (src[3] / 255) * brushOpacity * mask;
          if (srcA <= 0) continue;

          const idx = (yy * w + xx) * 4;
          const dstR = data[idx];
          const dstG = data[idx + 1];
          const dstB = data[idx + 2];
          const dstA = data[idx + 3] / 255;

          // Normal alpha compositing
          const outA = srcA + dstA * (1 - srcA);
          const outR = (src[0] * srcA + dstR * dstA * (1 - srcA)) / Math.max(1e-6, outA);
          const outG = (src[1] * srcA + dstG * dstA * (1 - srcA)) / Math.max(1e-6, outA);
          const outB = (src[2] * srcA + dstB * dstA * (1 - srcA)) / Math.max(1e-6, outA);

          data[idx] = Math.round(outR);
          data[idx + 1] = Math.round(outG);
          data[idx + 2] = Math.round(outB);
          data[idx + 3] = Math.round(outA * 255);
          paintedCount++;
        }
      }

      ctx.putImageData(img, minX, minY);
      paintState.texture.needsUpdate = true;

      console.log('CloneStamp: Dab painted', paintedCount, 'pixels, UV:', hit.uv.x.toFixed(3), hit.uv.y.toFixed(3), 'sourceCenter:', sourceCenter.x.toFixed(1), sourceCenter.y.toFixed(1));
    },
    [
      sourceAnchor,
      sourceImageSize,
      ensureMeshPaintState,
      brushRadius,
      brushScale,
      brushRotation,
      brushHardness,
      brushOpacity,
      sampleSourceColor,
    ]
  );

  const raycast = useCallback(
    (e: MouseEvent, roots: THREE.Object3D[]) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      return raycasterRef.current.intersectObjects(roots, true);
    },
    [camera, gl]
  );

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
      const hit = hits.find((h) => {
        const obj = h.object as any;
        return obj?.isMesh && !!h.uv && !!h.face && (obj.geometry as THREE.BufferGeometry)?.attributes?.uv;
      });

      if (!hit || !hit.uv || !hit.face) return;

      const mesh = hit.object as THREE.Mesh;

      // Lock stroke to the root that contains this mesh, so it can paint across submeshes/faces
      const containingRoot = paintableRoots.find((r) => isDescendant(r, mesh));
      activeStrokeRootRef.current = containingRoot ?? mesh;

      // World normal
      const worldNormal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();

      // Tangent frame derived from triangle UVs (stable per-face orientation)
      const { tangent, bitangent } = computeTriangleTangentFrame(mesh, hit.face, worldNormal);

      const newAnchor = {
        position: hit.point.clone(),
        normal: worldNormal,
        tangent,
        bitangent,
        uv: hit.uv.clone(),
      };

      setTargetAnchor3D(newAnchor);

      beginStroke();
      // Pass the anchor directly since store may not have updated yet
      paintDab(hit as any, newAnchor);
      setLastDabPosition(hit.point.clone());

      console.log('CloneStamp: Stroke start', mesh.name || mesh.uuid);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isStroking) return;

      const root = activeStrokeRootRef.current;
      if (!root) return;

      const hits = raycast(e, [root]);
      const hit = hits.find((h) => {
        const obj = h.object as any;
        return obj?.isMesh && !!h.uv && !!h.face && (obj.geometry as THREE.BufferGeometry)?.attributes?.uv;
      });

      if (!hit || !hit.uv || !hit.face) return;

      // Convert brush pixel radius -> world radius for spacing
      const brushRadiusWorld = brushRadius * textureSettings.worldScale * brushScale;
      const spacingDistance = Math.max(1e-6, brushRadiusWorld * (brushSpacing / 100));
      if (lastDabPosition && hit.point.distanceTo(lastDabPosition) < spacingDistance) return;

      paintDab(hit as any, targetAnchor3D);
      setLastDabPosition(hit.point.clone());
    };

    const handleMouseUp = () => {
      if (!isStroking) return;
      activeStrokeRootRef.current = null;
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
    beginStroke,
    endStroke,
    setTargetAnchor3D,
    paintDab,
    setLastDabPosition,
    lastDabPosition,
    brushRadius,
    brushSpacing,
    brushScale,
    textureSettings.worldScale,
    gl,
  ]);

  return null;
}

// Debug overlay component showing clone stamp state
function CloneStampDebugOverlay() {
  const { isStroking, sourceAnchor, targetAnchor3D, sourceImageSize } = useCloneStampStore();
  const [displayInfo, setDisplayInfo] = useState<DebugInfo | null>(null);

  useFrame(() => {
    if (debugInfo && isStroking) {
      setDisplayInfo({ ...debugInfo });
    } else if (!isStroking) {
      setDisplayInfo(null);
    }
  });

  if (!displayInfo || !isStroking) return null;

  return (
    <Html
      position={[displayInfo.worldPos.x, displayInfo.worldPos.y + 0.5, displayInfo.worldPos.z]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="bg-black/80 text-white text-xs p-2 rounded font-mono whitespace-nowrap">
        <div>hit.uv: ({displayInfo.hitUV.x.toFixed(3)}, {displayInfo.hitUV.y.toFixed(3)})</div>
        <div>anchor.uv: ({displayInfo.targetAnchorUV.x.toFixed(3)}, {displayInfo.targetAnchorUV.y.toFixed(3)})</div>
        <div>Δuv: ({displayInfo.uvDelta.u.toFixed(3)}, {displayInfo.uvDelta.v.toFixed(3)})</div>
        <div className="text-green-400">srcCenter: ({displayInfo.sourceCenter.x.toFixed(1)}, {displayInfo.sourceCenter.y.toFixed(1)})</div>
        {sourceAnchor && <div className="text-yellow-400">srcAnchor: ({sourceAnchor.x.toFixed(1)}, {sourceAnchor.y.toFixed(1)})</div>}
        {sourceImageSize && <div className="text-blue-400">srcSize: {sourceImageSize.width}×{sourceImageSize.height}</div>}
      </div>
    </Html>
  );
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

  return (
    <>
      <CloneStampPainter paintTargets={paintTargets} />
      <CloneStampDebugOverlay />
    </>
  );
}
