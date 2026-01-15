import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { usePaintLayerStore } from '@/hooks/usePaintLayerStore';
import * as THREE from 'three';

// Live decal preview that shows exactly what will be stamped on the mesh
export function CloneStampPreviewDecal() {
  const groupRef = useRef<THREE.Group>(null);
  const previewMeshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const { gl, camera, scene } = useThree();
  const mouse = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());
  
  const {
    isActive,
    sourceImageUrl,
    sourceImageSize,
    sourceAnchor,
    brushRadius,
    brushScale,
    brushRotation,
    brushOpacity,
    textureSettings,
  } = useCloneStampStore();
  
  const { getFlipSettings } = usePaintLayerStore();
  
  // Smoothed state
  const smoothedPosition = useRef(new THREE.Vector3());
  const smoothedNormal = useRef(new THREE.Vector3(0, 1, 0));
  const smoothedTangent = useRef(new THREE.Vector3(1, 0, 0));
  const smoothedBitangent = useRef(new THREE.Vector3(0, 0, 1));
  const isInitialized = useRef(false);
  const lastMeshUuid = useRef<string>('');
  
  // Load source image
  useEffect(() => {
    if (!sourceImageUrl) {
      imageRef.current = null;
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
    };
    img.src = sourceImageUrl;
    
    return () => {
      imageRef.current = null;
    };
  }, [sourceImageUrl]);
  
  // Create preview texture
  useEffect(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvasRef.current = canvas;
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    textureRef.current = texture;
    
    return () => {
      texture.dispose();
    };
  }, []);
  
  // Update preview texture based on source anchor
  const updatePreviewTexture = () => {
    if (!canvasRef.current || !imageRef.current || !sourceAnchor || !sourceImageSize) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    
    // Create circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Apply rotation
    ctx.translate(size / 2, size / 2);
    ctx.rotate(brushRotation);
    ctx.translate(-size / 2, -size / 2);
    
    // Calculate sample region from source image
    const sampleRadius = brushRadius / brushScale;
    const sx = sourceAnchor.x - sampleRadius;
    const sy = sourceAnchor.y - sampleRadius;
    const sw = sampleRadius * 2;
    const sh = sampleRadius * 2;
    
    ctx.globalAlpha = brushOpacity;
    ctx.drawImage(imageRef.current, sx, sy, sw, sh, 0, 0, size, size);
    ctx.restore();
    
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };
  
  // Track mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    return () => gl.domElement.removeEventListener('mousemove', handleMouseMove);
  }, [gl]);
  
  // Compute tangent frame from triangle
  const computeTangentFrame = (mesh: THREE.Mesh, face: THREE.Face, worldNormal: THREE.Vector3) => {
    const geom = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geom.attributes.position as THREE.BufferAttribute | undefined;
    const uvAttr = geom.attributes.uv as THREE.BufferAttribute | undefined;
    
    if (!posAttr || !uvAttr) {
      // Fallback
      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(worldNormal.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
      const tangent = new THREE.Vector3().crossVectors(up, worldNormal).normalize();
      const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();
      return { tangent, bitangent };
    }
    
    const getPos = (i: number) => new THREE.Vector3(
      posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)
    ).applyMatrix4(mesh.matrixWorld);
    
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
      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(worldNormal.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
      const tangent = new THREE.Vector3().crossVectors(up, worldNormal).normalize();
      const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();
      return { tangent, bitangent };
    }
    
    const r = 1 / denom;
    const tangent = dp1.clone().multiplyScalar(duv2.y).sub(dp2.clone().multiplyScalar(duv1.y)).multiplyScalar(r);
    tangent.sub(worldNormal.clone().multiplyScalar(worldNormal.dot(tangent))).normalize();
    const bitangent = new THREE.Vector3().crossVectors(worldNormal, tangent).normalize();
    
    return { tangent, bitangent };
  };
  
  useFrame(() => {
    if (!groupRef.current || !isActive || !sourceAnchor) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    
    raycaster.current.setFromCamera(mouse.current, camera);
    
    // Find meshes to raycast
    const meshes: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
      if (!obj.visible) return;
      
      const skipNames = ['clonestamp', 'cursor3d', 'shadow', 'Shadow', 'grid', 'Grid', 'Helper', 'preview-decal'];
      let skip = false;
      let current: THREE.Object3D | null = obj;
      while (current) {
        if (skipNames.some(n => current!.name.includes(n) || current!.type.includes(n))) {
          skip = true;
          break;
        }
        current = current.parent;
      }
      if (skip) return;
      
      meshes.push(obj);
    });
    
    const intersects = raycaster.current.intersectObjects(meshes, true);
    const rayDir = raycaster.current.ray.direction;
    
    // Find front-facing hit
    const hit = intersects.find(h => {
      if (!h.face) return false;
      const mesh = h.object as THREE.Mesh;
      const worldNormal = h.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();
      return worldNormal.dot(rayDir) < 0;
    });
    
    if (!hit || !hit.face) {
      groupRef.current.visible = false;
      return;
    }
    
    const mesh = hit.object as THREE.Mesh;
    const worldNormal = hit.face.normal.clone();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    worldNormal.applyMatrix3(normalMatrix).normalize();
    
    // Get tangent frame
    const { tangent, bitangent } = computeTangentFrame(mesh, hit.face, worldNormal);
    
    // Auto-detect flip settings when mesh changes
    if (mesh.uuid !== lastMeshUuid.current) {
      lastMeshUuid.current = mesh.uuid;
      // Trigger auto-detect on first contact with this mesh
      const { autoDetectFlip } = usePaintLayerStore.getState();
      autoDetectFlip(mesh.uuid, tangent, bitangent, worldNormal);
    }
    
    // Get flip settings for this mesh
    const flipSettings = getFlipSettings(mesh.uuid);
    
    // Apply flip
    const finalTangent = flipSettings.flipU ? tangent.clone().negate() : tangent.clone();
    const finalBitangent = flipSettings.flipV ? bitangent.clone().negate() : bitangent.clone();
    
    // Initialize or smooth
    if (!isInitialized.current) {
      smoothedPosition.current.copy(hit.point);
      smoothedNormal.current.copy(worldNormal);
      smoothedTangent.current.copy(finalTangent);
      smoothedBitangent.current.copy(finalBitangent);
      isInitialized.current = true;
    } else {
      smoothedPosition.current.lerp(hit.point, 0.3);
      smoothedNormal.current.lerp(worldNormal, 0.2).normalize();
      smoothedTangent.current.lerp(finalTangent, 0.2).normalize();
      smoothedBitangent.current.lerp(finalBitangent, 0.2).normalize();
    }
    
    // Position decal slightly above surface
    const offset = smoothedNormal.current.clone().multiplyScalar(0.005);
    groupRef.current.position.copy(smoothedPosition.current).add(offset);
    
    // Orient decal using tangent frame (T = right, B = up, N = forward)
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(smoothedTangent.current, smoothedBitangent.current, smoothedNormal.current);
    groupRef.current.quaternion.setFromRotationMatrix(matrix);
    
    // Apply brush rotation around normal
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(smoothedNormal.current, brushRotation);
    groupRef.current.quaternion.premultiply(rotQuat);
    
    groupRef.current.visible = true;
    
    // Update preview texture
    updatePreviewTexture();
  });
  
  if (!isActive || !sourceAnchor) return null;
  
  // World radius based on brush settings
  const worldRadius = (brushRadius * brushScale * textureSettings.worldScale) / 100;
  
  return (
    <group ref={groupRef} name="preview-decal">
      {/* Decal preview showing exact source patch */}
      {textureRef.current && (
        <mesh ref={previewMeshRef}>
          <planeGeometry args={[worldRadius * 2, worldRadius * 2]} />
          <meshBasicMaterial
            map={textureRef.current}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Outline ring */}
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[worldRadius * 0.95, worldRadius, 64]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Tangent direction indicator (shows brush orientation) */}
      <mesh position={[worldRadius * 0.7, 0, 0.002]}>
        <circleGeometry args={[worldRadius * 0.05, 16]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Bitangent direction indicator */}
      <mesh position={[0, worldRadius * 0.7, 0.002]}>
        <circleGeometry args={[worldRadius * 0.05, 16]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
