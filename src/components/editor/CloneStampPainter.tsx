import { useRef, useEffect, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import * as THREE from 'three';

interface CloneStampPainterProps {
  targetMesh: THREE.Mesh;
}

// Shared source image data
let sourceCanvas: HTMLCanvasElement | null = null;
let sourceCtx: CanvasRenderingContext2D | null = null;
let sourceImageData: ImageData | null = null;

export function CloneStampPainter({ targetMesh }: CloneStampPainterProps) {
  const { gl, camera } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isMouseDown = useRef(false);
  
  const {
    isActive,
    mode,
    sourceImageUrl,
    sourceImageSize,
    sourceAnchor,
    targetAnchor3D,
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
    pushHistory
  } = useCloneStampStore();

  // Paint texture and canvas
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalMaterialRef = useRef<THREE.Material | null>(null);
  const paintMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

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

  // Initialize paint canvas and texture on target mesh
  useEffect(() => {
    if (!targetMesh) return;

    // Create paint canvas with higher resolution for quality
    const resolution = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, resolution, resolution);
    }
    paintCanvasRef.current = canvas;

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;
    textureRef.current = texture;

    // Store original material
    originalMaterialRef.current = targetMesh.material as THREE.Material;

    // Create new material with paint texture
    const originalMat = targetMesh.material as THREE.MeshStandardMaterial;
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: originalMat.color || new THREE.Color(0xffffff),
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: originalMat.roughness ?? 0.5,
      metalness: originalMat.metalness ?? 0,
    });
    paintMaterialRef.current = paintMaterial;
    targetMesh.material = paintMaterial;

    console.log('CloneStamp: Paint canvas initialized', resolution, 'x', resolution);

    return () => {
      texture.dispose();
      paintMaterial.dispose();
      if (originalMaterialRef.current) {
        targetMesh.material = originalMaterialRef.current;
      }
    };
  }, [targetMesh]);

  // Sample color from source image with bilinear interpolation
  const sampleSourceColor = useCallback((x: number, y: number): [number, number, number, number] | null => {
    if (!sourceImageData || !sourceImageSize) return null;

    const { tiling } = textureSettings;

    // Handle tiling
    let px = x;
    let py = y;
    
    if (tiling) {
      px = ((x % sourceImageSize.width) + sourceImageSize.width) % sourceImageSize.width;
      py = ((y % sourceImageSize.height) + sourceImageSize.height) % sourceImageSize.height;
    } else {
      // Clamp to bounds
      if (px < 0 || px >= sourceImageSize.width || py < 0 || py >= sourceImageSize.height) {
        return null;
      }
    }

    // Bilinear interpolation
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
        sourceImageData!.data[idx + 3]
      ];
    };

    const p00 = getPixel(x0, y0);
    const p10 = getPixel(x1, y0);
    const p01 = getPixel(x0, y1);
    const p11 = getPixel(x1, y1);

    // Interpolate
    const r = (p00[0] * (1 - fx) * (1 - fy) + p10[0] * fx * (1 - fy) + p01[0] * (1 - fx) * fy + p11[0] * fx * fy);
    const g = (p00[1] * (1 - fx) * (1 - fy) + p10[1] * fx * (1 - fy) + p01[1] * (1 - fx) * fy + p11[1] * fx * fy);
    const b = (p00[2] * (1 - fx) * (1 - fy) + p10[2] * fx * (1 - fy) + p01[2] * (1 - fx) * fy + p11[2] * fx * fy);
    const a = (p00[3] * (1 - fx) * (1 - fy) + p10[3] * fx * (1 - fy) + p01[3] * (1 - fx) * fy + p11[3] * fx * fy);

    return [r, g, b, a];
  }, [sourceImageSize, textureSettings]);

  // Compute tangent frame at a point
  const computeTangentFrame = useCallback((normal: THREE.Vector3): { tangent: THREE.Vector3; bitangent: THREE.Vector3 } => {
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(up)) > 0.9) {
      up = new THREE.Vector3(1, 0, 0);
    }
    const tangent = new THREE.Vector3().crossVectors(up, normal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    return { tangent, bitangent };
  }, []);

  // Paint a dab at a 3D hit point
  const paintDab = useCallback((hitPoint: THREE.Vector3, hitNormal: THREE.Vector3, uv: THREE.Vector2) => {
    if (!paintCanvasRef.current || !textureRef.current || !sourceAnchor || !targetAnchor3D || !sourceImageData) {
      return;
    }

    const canvas = paintCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get source sample position
    const sourcePos = getSourceSamplePosition3D(hitPoint, hitNormal, uv);
    if (!sourcePos) return;

    // Convert UV to canvas coords
    const cx = uv.x * canvas.width;
    const cy = (1 - uv.y) * canvas.height;

    // Calculate brush radius in texture space
    // brushRadius is in pixels, we need to scale to UV space
    const uvBrushRadius = (brushRadius * brushScale / textureSettings.worldScale) * (canvas.width / 1000);

    // Paint multiple samples within the brush
    const steps = Math.max(1, Math.ceil(uvBrushRadius / 2));
    
    for (let dx = -steps; dx <= steps; dx++) {
      for (let dy = -steps; dy <= steps; dy++) {
        const localX = dx / steps;
        const localY = dy / steps;
        const dist = Math.sqrt(localX * localX + localY * localY);
        
        if (dist > 1) continue;

        // Calculate falloff based on hardness
        let alpha = 1;
        if (dist > brushHardness) {
          alpha = 1 - ((dist - brushHardness) / (1 - brushHardness));
        }
        alpha *= brushOpacity;

        // Sample from source with offset
        const sourceX = sourcePos.x + dx * (brushRadius / steps);
        const sourceY = sourcePos.y + dy * (brushRadius / steps);
        const color = sampleSourceColor(sourceX, sourceY);
        if (!color) continue;

        // Calculate paint position
        const paintX = cx + localX * uvBrushRadius;
        const paintY = cy + localY * uvBrushRadius;

        // Apply blend mode
        const r = color[0];
        const g = color[1];
        const b = color[2];
        const a = (color[3] / 255) * alpha;

        ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
        ctx.fillRect(paintX - 1, paintY - 1, 2, 2);
      }
    }

    textureRef.current.needsUpdate = true;
  }, [sourceAnchor, targetAnchor3D, brushRadius, brushScale, brushOpacity, brushHardness, textureSettings, getSourceSamplePosition3D, sampleSourceColor]);

  // Handle painting stroke
  const handlePaintStroke = useCallback((e: MouseEvent) => {
    if (!isStroking || !targetMesh) return;

    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObject(targetMesh, true);

    if (intersects.length > 0 && intersects[0].uv && intersects[0].face) {
      const hit = intersects[0];
      
      // Get world normal
      const worldNormal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();

      // Check brush spacing
      const spacingDistance = brushRadius * (brushSpacing / 100) * brushScale;
      if (lastDabPosition) {
        const dist = hit.point.distanceTo(lastDabPosition);
        if (dist < spacingDistance) return;
      }

      paintDab(hit.point, worldNormal, hit.uv);
      setLastDabPosition(hit.point.clone());
    }
  }, [isStroking, targetMesh, camera, gl, brushRadius, brushSpacing, brushScale, lastDabPosition, paintDab, setLastDabPosition]);

  // Mouse event handlers
  useEffect(() => {
    if (!isActive || mode !== '2d-to-3d' || !targetMesh) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      if (e.altKey) return; // Alt+click sets anchor in 2D view

      if (!sourceAnchor) {
        console.log('CloneStamp: No source anchor set. Alt+click in 2D view first.');
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(targetMesh, true);

      if (intersects.length > 0 && intersects[0].face && intersects[0].uv) {
        const hit = intersects[0];
        isMouseDown.current = true;

        // Get world normal
        const worldNormal = hit.face.normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        worldNormal.applyMatrix3(normalMatrix).normalize();

        const { tangent, bitangent } = computeTangentFrame(worldNormal);

        // Set target anchor (P0) for this stroke
        setTargetAnchor3D({
          position: hit.point.clone(),
          normal: worldNormal,
          tangent,
          bitangent,
          uv: hit.uv.clone()
        });

        // Save current state for undo
        if (paintCanvasRef.current) {
          const ctx = paintCanvasRef.current.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, paintCanvasRef.current.width, paintCanvasRef.current.height);
            pushHistory(imageData);
          }
        }

        beginStroke();
        
        // Paint first dab
        paintDab(hit.point, worldNormal, hit.uv);
        setLastDabPosition(hit.point.clone());
      }
    };

    const handleMouseUp = () => {
      if (isMouseDown.current) {
        isMouseDown.current = false;
        endStroke();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDown.current) {
        handlePaintStroke(e);
      }
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActive, mode, targetMesh, sourceAnchor, camera, gl, computeTangentFrame, setTargetAnchor3D, beginStroke, endStroke, paintDab, handlePaintStroke, pushHistory, setLastDabPosition]);

  return null;
}

// Scene wrapper that finds target meshes
export function CloneStampPainterScene() {
  const { scene } = useThree();
  const { isActive, mode } = useCloneStampStore();
  const [targetMeshes, setTargetMeshes] = useState<THREE.Mesh[]>([]);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Find valid meshes in scene
  useEffect(() => {
    if (!isActive || mode !== '2d-to-3d') {
      setTargetMeshes([]);
      return;
    }

    const findMeshes = () => {
      const meshes: THREE.Mesh[] = [];
      
      sceneRef.current.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        if (!obj.geometry) return;
        if (!obj.geometry.attributes.uv) return;
        if (!obj.visible) return;
        
        // Skip UI elements
        const skipNames = ['cursor3d', 'clonestamp-cursor', 'shadow', 'Shadow', 'grid', 'Grid'];
        if (skipNames.some(n => obj.name.includes(n))) return;
        if (obj.type.includes('Helper')) return;
        
        // Check parent hierarchy
        let parent: THREE.Object3D | null = obj.parent;
        let skip = false;
        while (parent) {
          if (skipNames.some(n => parent!.name.includes(n))) {
            skip = true;
            break;
          }
          parent = parent.parent;
        }
        if (skip) return;
        
        meshes.push(obj);
      });

      if (meshes.length > 0) {
        console.log('CloneStamp: Found', meshes.length, 'paintable meshes');
        setTargetMeshes(meshes);
      }
    };

    findMeshes();
    const timer = setTimeout(findMeshes, 200);
    return () => clearTimeout(timer);
  }, [isActive, mode]);

  if (!isActive || mode !== '2d-to-3d' || targetMeshes.length === 0) return null;

  // Paint on first mesh for now (could extend to allow mesh selection)
  return <CloneStampPainter targetMesh={targetMeshes[0]} />;
}
