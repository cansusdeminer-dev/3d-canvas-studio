import { useRef, useEffect, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { usePaintLayerStore } from '@/hooks/usePaintLayerStore';
import { useEditorStore } from '@/hooks/useEditorStore';
import { getCachedSeamInfo, calculateSeamBlendWeight, SeamInfo } from '@/lib/seamDetection';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface PaintTarget {
  root: THREE.Object3D;
}

interface CloneStampPainterProps {
  paintTargets: PaintTarget[];
}

// Debug overlay state (module-level for persistence)
interface DebugInfo {
  hitPoint: THREE.Vector3;
  hitNormal: THREE.Vector3;
  tangent: THREE.Vector3;
  bitangent: THREE.Vector3;
  tangentDelta: { u: number; v: number };
  sourceCenter: { x: number; y: number };
  flipU: boolean;
  flipV: boolean;
  seamBlend: number;
}

let debugInfo: DebugInfo | null = null;

function isDescendant(root: THREE.Object3D, obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur === root) return true;
    cur = cur.parent;
  }
  return false;
}

// Compute tangent frame from triangle geometry (not UV-based, purely geometric)
function computeGeometricTangentFrame(mesh: THREE.Mesh, face: THREE.Face, worldNormal: THREE.Vector3) {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.attributes.position as THREE.BufferAttribute | undefined;
  
  if (!posAttr) {
    // Fallback: create frame from world up
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(worldNormal.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(up, worldNormal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();
    return { tangent, bitangent };
  }
  
  // Get world positions of triangle vertices
  const getPos = (i: number) => new THREE.Vector3(
    posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)
  ).applyMatrix4(mesh.matrixWorld);
  
  const p0 = getPos(face.a);
  const p1 = getPos(face.b);
  const p2 = getPos(face.c);
  
  // Edge vectors in world space
  const edge1 = p1.clone().sub(p0);
  const edge2 = p2.clone().sub(p0);
  
  // Project edge1 onto tangent plane (perpendicular to normal)
  const tangent = edge1.clone().sub(worldNormal.clone().multiplyScalar(edge1.dot(worldNormal))).normalize();
  
  // Bitangent is perpendicular to both normal and tangent
  const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();
  
  return { tangent, bitangent };
}

// Compute UV-derived tangent frame for proper texture mapping
function computeUVTangentFrame(mesh: THREE.Mesh, face: THREE.Face, worldNormal: THREE.Vector3) {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.attributes.position as THREE.BufferAttribute | undefined;
  const uvAttr = geom.attributes.uv as THREE.BufferAttribute | undefined;

  if (!posAttr || !uvAttr) {
    return computeGeometricTangentFrame(mesh, face, worldNormal);
  }

  const getPos = (i: number) =>
    new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(mesh.matrixWorld);

  const getUV = (i: number) => new THREE.Vector2(uvAttr.getX(i), uvAttr.getY(i));

  const p0 = getPos(face.a);
  const p1 = getPos(face.b);
  const p2 = getPos(face.c);

  const uv0 = getUV(face.a);
  const uv1 = getUV(face.b);
  const uv2 = getUV(face.c);

  const dp1 = p1.clone().sub(p0);
  const dp2 = p2.clone().sub(p0);
  const duv1 = uv1.clone().sub(uv0);
  const duv2 = uv2.clone().sub(uv0);

  const denom = duv1.x * duv2.y - duv1.y * duv2.x;
  if (Math.abs(denom) < 1e-8) {
    return computeGeometricTangentFrame(mesh, face, worldNormal);
  }

  const r = 1 / denom;

  // dP/du - tangent direction
  const tangent = dp1
    .clone()
    .multiplyScalar(duv2.y)
    .sub(dp2.clone().multiplyScalar(duv1.y))
    .multiplyScalar(r);
  tangent.sub(worldNormal.clone().multiplyScalar(worldNormal.dot(tangent))).normalize();

  // Use GEOMETRIC bitangent (cross product) - NOT UV-based
  // This gives consistent behavior: bitangent is always perpendicular to normal and tangent
  // The source mapping formula handles the Y-flip for image coordinates
  const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();

  return { tangent, bitangent };
}

export function CloneStampPainter({ paintTargets }: CloneStampPainterProps) {
  const { gl, camera } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  // Tangent-frame stroke state
  const anchorPointRef = useRef<THREE.Vector3 | null>(null);
  const anchorTangentRef = useRef<THREE.Vector3 | null>(null);
  const anchorBitangentRef = useRef<THREE.Vector3 | null>(null);
  const anchorNormalRef = useRef<THREE.Vector3 | null>(null);
  
  const activeStrokeRootRef = useRef<THREE.Object3D | null>(null);
  const lastDabWorldPosRef = useRef<THREE.Vector3 | null>(null);
  
  // Source image data
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sourceImageDataRef = useRef<ImageData | null>(null);
  
  // Seam info cache per mesh
  const seamInfoCacheRef = useRef<Map<string, SeamInfo>>(new Map());
  
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
    surfaceSettings,
    isStroking,
    lastDabPosition,
    setLastDabPosition,
    beginStroke,
    endStroke,
  } = useCloneStampStore();
  
  const { createLayer, getLayer, getFlipSettings, autoDetectFlip } = usePaintLayerStore();

  // Load source image
  useEffect(() => {
    if (!sourceImageUrl || !sourceImageSize) {
      sourceCanvasRef.current = null;
      sourceCtxRef.current = null;
      sourceImageDataRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sourceImageSize.width;
      canvas.height = sourceImageSize.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        sourceCanvasRef.current = canvas;
        sourceCtxRef.current = ctx;
        sourceImageDataRef.current = ctx.getImageData(0, 0, sourceImageSize.width, sourceImageSize.height);
        console.log('CloneStamp: Source image loaded', sourceImageSize.width, 'x', sourceImageSize.height);
      }
    };
    img.src = sourceImageUrl;

    return () => {
      sourceCanvasRef.current = null;
      sourceCtxRef.current = null;
      sourceImageDataRef.current = null;
    };
  }, [sourceImageUrl, sourceImageSize]);

  // Get or create paint layer for mesh
  const ensurePaintLayer = useCallback((mesh: THREE.Mesh) => {
    let layer = getLayer(mesh.uuid);
    if (!layer) {
      layer = createLayer(mesh);
    }
    return layer;
  }, [getLayer, createLayer]);

  // Bilinear sample from source
  const sampleSourceColor = useCallback(
    (x: number, y: number): [number, number, number, number] | null => {
      const sourceImageData = sourceImageDataRef.current;
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
          sourceImageData.data[idx],
          sourceImageData.data[idx + 1],
          sourceImageData.data[idx + 2],
          sourceImageData.data[idx + 3],
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

  // CORE: Paint a dab using TANGENT FRAME instead of UVs
  const paintDab = useCallback(
    (hit: THREE.Intersection<THREE.Object3D>) => {
      if (!sourceAnchor || !sourceImageDataRef.current || !sourceImageSize) return;
      if (!hit.uv || !hit.face) return;
      if (!anchorPointRef.current || !anchorTangentRef.current || !anchorBitangentRef.current) return;

      const mesh = hit.object as THREE.Mesh;
      if (!mesh?.isMesh) return;

      const geom = mesh.geometry as THREE.BufferGeometry;
      if (!geom?.attributes?.uv) return;

      const layer = ensurePaintLayer(mesh);
      const { canvas, ctx, texture } = layer;

      // Get flip settings for this mesh
      const flipSettings = getFlipSettings(mesh.uuid);
      
      // Get seam info for blending
      let seamInfo = seamInfoCacheRef.current.get(mesh.uuid);
      if (!seamInfo) {
        seamInfo = getCachedSeamInfo(geom);
        seamInfoCacheRef.current.set(mesh.uuid, seamInfo);
      }

      // ===== TANGENT-FRAME BASED SOURCE SAMPLING =====
      // Delta from stroke anchor in world space
      const delta = hit.point.clone().sub(anchorPointRef.current);
      
      // Project delta onto anchor's tangent plane
      let du = delta.dot(anchorTangentRef.current);
      let dv = delta.dot(anchorBitangentRef.current);
      
      // Apply flip settings
      if (flipSettings.flipU) du = -du;
      if (flipSettings.flipV) dv = -dv;

      // Apply rotation in tangent space: R(-θ)
      const cosA = Math.cos(-brushRotation);
      const sinA = Math.sin(-brushRotation);
      const duRot = cosA * du - sinA * dv;
      const dvRot = sinA * du + cosA * dv;

      // Convert world-space offset to source pixels
      // textureSettings.worldScale is world units per pixel
      const pixelsPerUnit = textureSettings.worldScale > 0 ? 1 / textureSettings.worldScale : 1000;
      
      // Image Y-axis is inverted (positive = down), so negate dv for correct mapping:
      // Moving "up" on mesh -> geometric bitangent gives positive dv -> need negative to sample up
      const sourceCenter = {
        x: sourceAnchor.x + (duRot * pixelsPerUnit) / brushScale,
        y: sourceAnchor.y - (dvRot * pixelsPerUnit) / brushScale,
      };

      // Map brush radius to target texture pixels
      const radiusPx = Math.max(1, brushRadius * brushScale * (canvas.width / sourceImageSize.width));

      // UV position for painting on canvas
      const cx = hit.uv.x * canvas.width;
      const cy = (1 - hit.uv.y) * canvas.height;

      const minX = Math.max(0, Math.floor(cx - radiusPx));
      const minY = Math.max(0, Math.floor(cy - radiusPx));
      const maxX = Math.min(canvas.width - 1, Math.ceil(cx + radiusPx));
      const maxY = Math.min(canvas.height - 1, Math.ceil(cy + radiusPx));

      const w = Math.max(1, maxX - minX + 1);
      const h = Math.max(1, maxY - minY + 1);

      // Calculate seam blend weight at this UV position
      const seamBlendWeight = calculateSeamBlendWeight(
        hit.uv,
        seamInfo,
        surfaceSettings.seamBlendRadius,
        canvas.width
      );

      // Update debug info
      debugInfo = {
        hitPoint: hit.point.clone(),
        hitNormal: anchorNormalRef.current?.clone() || new THREE.Vector3(0, 1, 0),
        tangent: anchorTangentRef.current.clone(),
        bitangent: anchorBitangentRef.current.clone(),
        tangentDelta: { u: du, v: dv },
        sourceCenter,
        flipU: flipSettings.flipU,
        flipV: flipSettings.flipV,
        seamBlend: seamBlendWeight,
      };

      const img = ctx.getImageData(minX, minY, w, h);
      const data = img.data;

      let paintedCount = 0;

      for (let yy = 0; yy < h; yy++) {
        const py = minY + yy + 0.5;
        const dyPx = py - cy;

        for (let xx = 0; xx < w; xx++) {
          const px = minX + xx + 0.5;
          const dxPx = px - cx;

          const dist = Math.sqrt(dxPx * dxPx + dyPx * dyPx) / radiusPx;
          if (dist > 1) continue;

          let mask = 1;
          if (dist > brushHardness) {
            mask = 1 - (dist - brushHardness) / Math.max(1e-6, 1 - brushHardness);
          }

          // Local offset in tangent space (convert canvas pixels to world units)
          // Negate dyPx: canvas Y grows down, V should grow up for consistent mapping
          const duLocal = (dxPx / canvas.width) * (sourceImageSize.width / pixelsPerUnit);
          const dvLocal = (-dyPx / canvas.height) * (sourceImageSize.height / pixelsPerUnit);

          // Apply flip to local offset too
          const duLocalFlipped = flipSettings.flipU ? -duLocal : duLocal;
          const dvLocalFlipped = flipSettings.flipV ? -dvLocal : dvLocal;

          // Apply brush rotation
          const duLocalRot = cosA * duLocalFlipped - sinA * dvLocalFlipped;
          const dvLocalRot = sinA * duLocalFlipped + cosA * dvLocalFlipped;

          // Convert to source pixels (negate V for image Y-axis)
          const srcX = sourceCenter.x + (duLocalRot * pixelsPerUnit) / brushScale;
          const srcY = sourceCenter.y - (dvLocalRot * pixelsPerUnit) / brushScale;

          const src = sampleSourceColor(srcX, srcY);
          if (!src) continue;

          // Apply seam blending - reduce opacity near seams for smoother transitions
          const seamMultiplier = seamBlendWeight > 0 ? (1 - seamBlendWeight * 0.5) : 1;
          const srcA = (src[3] / 255) * brushOpacity * mask * seamMultiplier;
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
      texture.needsUpdate = true;
    },
    [
      sourceAnchor,
      sourceImageSize,
      ensurePaintLayer,
      getFlipSettings,
      brushRadius,
      brushScale,
      brushRotation,
      brushHardness,
      brushOpacity,
      sampleSourceColor,
      textureSettings,
      surfaceSettings.seamBlendRadius,
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
      const rayDir = raycasterRef.current.ray.direction;
      const hit = hits.find((h) => {
        const obj = h.object as any;
        if (!obj?.isMesh || !h.uv || !h.face) return false;
        if (!(obj.geometry as THREE.BufferGeometry)?.attributes?.uv) return false;

        const mesh = obj as THREE.Mesh;
        const worldNormal = (h.face as any).normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        worldNormal.applyMatrix3(normalMatrix).normalize();
        return worldNormal.dot(rayDir) < 0;
      });

      if (!hit || !hit.uv || !hit.face) return;

      const mesh = hit.object as THREE.Mesh;

      // Lock stroke to the root that contains this mesh
      const containingRoot = paintableRoots.find((r) => isDescendant(r, mesh));
      activeStrokeRootRef.current = containingRoot ?? mesh;

      // Compute world normal
      const worldNormal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();

      // Compute tangent frame at stroke start - this becomes the reference for the entire stroke
      const { tangent, bitangent } = computeUVTangentFrame(mesh, hit.face, worldNormal);
      
      // Auto-detect flip on first contact with mesh
      autoDetectFlip(mesh.uuid, tangent, bitangent, worldNormal);

      // Store anchor for tangent-frame based painting
      anchorPointRef.current = hit.point.clone();
      anchorTangentRef.current = tangent.clone();
      anchorBitangentRef.current = bitangent.clone();
      anchorNormalRef.current = worldNormal.clone();

      beginStroke();
      paintDab(hit as any);
      setLastDabPosition(hit.point.clone());
      lastDabWorldPosRef.current = hit.point.clone();

      console.log('CloneStamp: Stroke start (tangent-frame mode)', mesh.name || mesh.uuid);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isStroking) return;

      const root = activeStrokeRootRef.current;
      if (!root) return;

      const hits = raycast(e, [root]);
      const rayDir = raycasterRef.current.ray.direction;
      const hit = hits.find((h) => {
        const obj = h.object as any;
        if (!obj?.isMesh || !h.uv || !h.face) return false;
        if (!(obj.geometry as THREE.BufferGeometry)?.attributes?.uv) return false;

        const mesh = obj as THREE.Mesh;
        const worldNormal = (h.face as any).normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        worldNormal.applyMatrix3(normalMatrix).normalize();
        return worldNormal.dot(rayDir) < 0;
      });

      if (!hit || !hit.uv || !hit.face) return;

      // Brush spacing in world units
      const brushRadiusWorld = brushRadius * textureSettings.worldScale * brushScale;
      const spacingDistance = Math.max(1e-6, brushRadiusWorld * (brushSpacing / 100));

      if (!lastDabWorldPosRef.current) {
        paintDab(hit as any);
        setLastDabPosition(hit.point.clone());
        lastDabWorldPosRef.current = hit.point.clone();
        return;
      }

      const dist = hit.point.distanceTo(lastDabWorldPosRef.current);
      if (dist < spacingDistance) return;

      // Interpolate dabs for smooth stroke
      const steps = Math.max(1, Math.floor(dist / spacingDistance));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const p = lastDabWorldPosRef.current.clone().lerp(hit.point, t);
        const uv = (lastDabPosition ? new THREE.Vector2(hit.uv.x, hit.uv.y) : hit.uv).clone();
        
        paintDab({ ...hit, point: p, uv } as any);
      }

      setLastDabPosition(hit.point.clone());
      lastDabWorldPosRef.current = hit.point.clone();
    };

    const handleMouseUp = () => {
      if (!isStroking) return;
      activeStrokeRootRef.current = null;
      anchorPointRef.current = null;
      anchorTangentRef.current = null;
      anchorBitangentRef.current = null;
      anchorNormalRef.current = null;
      lastDabWorldPosRef.current = null;
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
    lastDabPosition,
    raycast,
    beginStroke,
    endStroke,
    paintDab,
    setLastDabPosition,
    autoDetectFlip,
    brushRadius,
    brushSpacing,
    brushScale,
    textureSettings.worldScale,
    gl,
  ]);

  return null;
}

// Debug overlay component showing tangent-frame state
function CloneStampDebugOverlay() {
  const { isStroking, sourceAnchor, sourceImageSize } = useCloneStampStore();
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
      position={[displayInfo.hitPoint.x, displayInfo.hitPoint.y + 0.5, displayInfo.hitPoint.z]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="bg-background/90 text-foreground text-xs p-2 rounded border border-border font-mono whitespace-nowrap">
        <div className="text-green-400 font-bold mb-1">Tangent Frame Mode</div>
        <div>T: ({displayInfo.tangent.x.toFixed(2)}, {displayInfo.tangent.y.toFixed(2)}, {displayInfo.tangent.z.toFixed(2)})</div>
        <div>B: ({displayInfo.bitangent.x.toFixed(2)}, {displayInfo.bitangent.y.toFixed(2)}, {displayInfo.bitangent.z.toFixed(2)})</div>
        <div>Δtangent: ({displayInfo.tangentDelta.u.toFixed(3)}, {displayInfo.tangentDelta.v.toFixed(3)})</div>
        <div className="text-primary">srcCenter: ({displayInfo.sourceCenter.x.toFixed(1)}, {displayInfo.sourceCenter.y.toFixed(1)})</div>
        <div className="text-yellow-400">
          Flip: U={displayInfo.flipU ? 'Y' : 'N'} V={displayInfo.flipV ? 'Y' : 'N'}
        </div>
        {displayInfo.seamBlend > 0 && (
          <div className="text-blue-400">Seam blend: {(displayInfo.seamBlend * 100).toFixed(0)}%</div>
        )}
        {sourceAnchor && (
          <div className="text-muted-foreground">srcAnchor: ({sourceAnchor.x.toFixed(1)}, {sourceAnchor.y.toFixed(1)})</div>
        )}
        {sourceImageSize && <div className="text-muted-foreground">srcSize: {sourceImageSize.width}×{sourceImageSize.height}</div>}
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
