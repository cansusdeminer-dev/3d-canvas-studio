import { useRef, useEffect, useCallback, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import * as THREE from 'three';

interface CloneStampPainterProps {
  // The mesh to paint on
  targetMesh: THREE.Mesh | null;
}

// Shared canvas for sampling source image
let sourceCanvas: HTMLCanvasElement | null = null;
let sourceCtx: CanvasRenderingContext2D | null = null;
let sourceImageData: ImageData | null = null;

export function CloneStampPainter({ targetMesh }: CloneStampPainterProps) {
  const { gl, camera } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
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
    isStroking,
    getSourceSamplePosition3D,
    setTargetAnchor3D,
    beginStroke,
    endStroke
  } = useCloneStampStore();

  // Paint texture reference
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load source image into canvas for sampling
  useEffect(() => {
    if (!sourceImageUrl || !sourceImageSize) return;

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
      }
    };
    img.src = sourceImageUrl;

    return () => {
      sourceCanvas = null;
      sourceCtx = null;
      sourceImageData = null;
    };
  }, [sourceImageUrl, sourceImageSize]);

  // Initialize paint canvas on target mesh
  useEffect(() => {
    if (!targetMesh) return;

    // Create paint canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Start with transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    paintCanvasRef.current = canvas;

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    textureRef.current = texture;

    // Apply as overlay map
    if (targetMesh.material instanceof THREE.MeshStandardMaterial) {
      // Store original map if any
      const originalMap = targetMesh.material.map;
      targetMesh.material.map = texture;
      targetMesh.material.transparent = true;
      targetMesh.material.needsUpdate = true;
    }

    return () => {
      texture.dispose();
    };
  }, [targetMesh]);

  // Sample color from source image at given pixel coords
  const sampleSourceColor = useCallback((x: number, y: number): [number, number, number, number] | null => {
    if (!sourceImageData || !sourceImageSize) return null;

    // Clamp to image bounds
    const px = Math.floor(Math.max(0, Math.min(sourceImageSize.width - 1, x)));
    const py = Math.floor(Math.max(0, Math.min(sourceImageSize.height - 1, y)));

    const idx = (py * sourceImageSize.width + px) * 4;
    return [
      sourceImageData.data[idx],
      sourceImageData.data[idx + 1],
      sourceImageData.data[idx + 2],
      sourceImageData.data[idx + 3]
    ];
  }, [sourceImageSize]);

  // Paint at a 3D hit point
  const paintAt3D = useCallback((hitPoint: THREE.Vector3, uv: THREE.Vector2) => {
    if (!paintCanvasRef.current || !textureRef.current || !sourceAnchor || !targetAnchor3D) {
      return;
    }

    const canvas = paintCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get source sample position using tangent-space mapping
    const sourcePos = getSourceSamplePosition3D(hitPoint);
    if (!sourcePos) return;

    // Sample color from source
    const color = sampleSourceColor(sourcePos.x, sourcePos.y);
    if (!color) return;

    // Convert UV to canvas coords
    const cx = uv.x * canvas.width;
    const cy = (1 - uv.y) * canvas.height;

    // Brush radius in UV/texture space (scale brush radius relative to canvas size)
    const uvRadius = (brushRadius / 100) * canvas.width * 0.1;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, uvRadius);
    
    const r = color[0];
    const g = color[1];
    const b = color[2];
    const a = (color[3] / 255) * brushOpacity;

    gradient.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    gradient.addColorStop(brushHardness, `rgba(${r},${g},${b},${a * 0.5})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, uvRadius, 0, Math.PI * 2);
    ctx.fill();

    textureRef.current.needsUpdate = true;
  }, [sourceAnchor, targetAnchor3D, brushRadius, brushOpacity, brushHardness, getSourceSamplePosition3D, sampleSourceColor]);

  // Compute tangent frame at hit point
  const computeTangentFrame = useCallback((normal: THREE.Vector3): { tangent: THREE.Vector3; bitangent: THREE.Vector3 } => {
    // Pick an up vector that's not parallel to normal
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(up)) > 0.9) {
      up = new THREE.Vector3(1, 0, 0);
    }

    const tangent = new THREE.Vector3().crossVectors(up, normal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    return { tangent, bitangent };
  }, []);

  // Handle mouse events for painting
  useEffect(() => {
    if (!isActive || mode !== '2d-to-3d' || !targetMesh) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || e.altKey) return; // Only left click, not alt-click
      if (!sourceAnchor) return; // Need source anchor

      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(targetMesh, true);

      if (intersects.length > 0 && intersects[0].face) {
        const hit = intersects[0];
        
        // Compute tangent frame at hit point
        const worldNormal = hit.face.normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        worldNormal.applyMatrix3(normalMatrix).normalize();
        
        const { tangent, bitangent } = computeTangentFrame(worldNormal);

        // Set target anchor (P0) for this stroke
        setTargetAnchor3D({
          position: hit.point.clone(),
          normal: worldNormal,
          tangent,
          bitangent
        });

        beginStroke();
      }
    };

    const handleMouseUp = () => {
      if (isStroking) {
        endStroke();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isStroking) return;

      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(targetMesh, true);

      if (intersects.length > 0 && intersects[0].uv) {
        const hit = intersects[0];
        paintAt3D(hit.point, hit.uv);
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
  }, [isActive, mode, targetMesh, sourceAnchor, isStroking, camera, gl, beginStroke, endStroke, setTargetAnchor3D, paintAt3D, computeTangentFrame]);

  return null;
}

// Export a scene component version
export function CloneStampPainterScene() {
  const { scene } = useThree();
  const { isActive, mode } = useCloneStampStore();
  const [targetMesh, setTargetMesh] = useState<THREE.Mesh | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Find first valid mesh in scene to paint on
  useEffect(() => {
    if (!isActive || mode !== '2d-to-3d') {
      setTargetMesh(null);
      return;
    }

    // Delay to ensure scene is populated
    const findMesh = () => {
      let foundMesh: THREE.Mesh | null = null;
      sceneRef.current.traverse((obj) => {
        if (foundMesh) return;
        if (!(obj instanceof THREE.Mesh)) return;
        if (!obj.geometry) return;
        if (!obj.geometry.attributes.uv) return;
        if (obj.name === 'cursor3d' || obj.name.includes('shadow') || obj.name === 'clonestamp-cursor') return;
        if (obj.type.includes('Helper')) return;
        
        // Check it's a scene object, not a UI element
        let parent: THREE.Object3D | null = obj.parent;
        while (parent) {
          if (parent.name === 'clonestamp-cursor' || parent.name === 'cursor3d') return;
          parent = parent.parent;
        }
        
        foundMesh = obj;
      });
      
      if (foundMesh) {
        console.log('CloneStampPainter: Found target mesh', foundMesh.name || foundMesh.uuid);
        setTargetMesh(foundMesh);
      }
    };
    
    // Try immediately and after a short delay
    findMesh();
    const timer = setTimeout(findMesh, 100);
    return () => clearTimeout(timer);
  }, [isActive, mode]);

  if (!isActive || mode !== '2d-to-3d' || !targetMesh) return null;

  return <CloneStampPainter targetMesh={targetMesh} />;
}
