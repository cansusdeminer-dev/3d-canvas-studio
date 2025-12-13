import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import * as THREE from 'three';

// Create a texture from the source image centered on the anchor
function useSourcePreviewTexture() {
  const { sourceImageUrl, sourceAnchor, brushRadius } = useCloneStampStore();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  useEffect(() => {
    if (!sourceImageUrl || !sourceAnchor) {
      setTexture(null);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Create canvas for the circular preview
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvasRef.current = canvas;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear with transparency
      ctx.clearRect(0, 0, size, size);
      
      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Calculate source region to sample
      const sampleRadius = brushRadius;
      const sx = sourceAnchor.x - sampleRadius;
      const sy = sourceAnchor.y - sampleRadius;
      const sw = sampleRadius * 2;
      const sh = sampleRadius * 2;
      
      // Draw the source image region
      ctx.drawImage(
        img,
        sx, sy, sw, sh,
        0, 0, size, size
      );
      
      // Create texture
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      setTexture(tex);
    };
    img.src = sourceImageUrl;
    
    return () => {
      if (texture) texture.dispose();
    };
  }, [sourceImageUrl, sourceAnchor, brushRadius]);
  
  // Update texture when anchor moves during preview
  useEffect(() => {
    if (!canvasRef.current || !sourceAnchor || !sourceImageUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      const sampleRadius = brushRadius;
      const sx = sourceAnchor.x - sampleRadius;
      const sy = sourceAnchor.y - sampleRadius;
      const sw = sampleRadius * 2;
      const sh = sampleRadius * 2;
      
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      ctx.restore();
      
      if (texture) {
        texture.needsUpdate = true;
      }
    };
    img.src = sourceImageUrl;
  }, [sourceAnchor, brushRadius, sourceImageUrl, texture]);
  
  return texture;
}

export function CloneStampCursor() {
  const groupRef = useRef<THREE.Group>(null);
  const { gl, camera, scene } = useThree();
  const mouse = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());
  
  const {
    isActive,
    sourceAnchor,
    brushRadius,
    brushScale
  } = useCloneStampStore();
  
  const previewTexture = useSourcePreviewTexture();
  
  // Smoothed position/normal
  const smoothedPosition = useRef(new THREE.Vector3());
  const smoothedNormal = useRef(new THREE.Vector3(0, 1, 0));
  const isInitialized = useRef(false);
  
  // Ring geometry
  const ringGeometry = useMemo(() => {
    return new THREE.RingGeometry(0.45, 0.5, 64);
  }, []);
  
  // Circle geometry for preview
  const circleGeometry = useMemo(() => {
    return new THREE.CircleGeometry(0.5, 64);
  }, []);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    return () => gl.domElement.removeEventListener('mousemove', handleMouseMove);
  }, [gl]);
  
  useFrame(() => {
    if (!groupRef.current || !isActive) return;
    
    raycaster.current.setFromCamera(mouse.current, camera);
    
    // Find meshes to raycast against
    const meshes: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
      if (!obj.visible) return;
      
      let parent: THREE.Object3D | null = obj;
      while (parent) {
        if (parent.name === 'clonestamp-cursor' || parent.name === 'cursor3d') return;
        parent = parent.parent;
      }
      
      if (obj.type.includes('Helper')) return;
      if (obj.name.includes('shadow') || obj.name.includes('Shadow')) return;
      
      meshes.push(obj);
    });
    
    const intersects = raycaster.current.intersectObjects(meshes, true);
    
    if (intersects.length > 0 && intersects[0].face) {
      const hit = intersects[0];
      const worldNormal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();
      
      if (!isInitialized.current) {
        smoothedPosition.current.copy(hit.point);
        smoothedNormal.current.copy(worldNormal);
        isInitialized.current = true;
      } else {
        smoothedPosition.current.lerp(hit.point, 0.3);
        smoothedNormal.current.lerp(worldNormal, 0.2).normalize();
      }
      
      groupRef.current.position.copy(smoothedPosition.current);
      groupRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        smoothedNormal.current
      );
      groupRef.current.visible = true;
    } else {
      groupRef.current.visible = false;
    }
  });
  
  if (!isActive) return null;
  
  const worldRadius = brushRadius * brushScale * 0.01; // Convert to world units
  
  return (
    <group ref={groupRef} name="clonestamp-cursor">
      {/* Outer ring */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[worldRadius * 0.95, worldRadius, 64]} />
        <meshBasicMaterial 
          color="#22c55e" 
          transparent 
          opacity={0.8}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
      
      {/* Source preview inside the circle */}
      {previewTexture && sourceAnchor && (
        <mesh rotation={[0, 0, 0]} position={[0, 0, 0.001]}>
          <circleGeometry args={[worldRadius * 0.9, 64]} />
          <meshBasicMaterial 
            map={previewTexture}
            transparent 
            opacity={0.5}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}
      
      {/* Center crosshair */}
      {sourceAnchor && (
        <>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[worldRadius * 0.1, worldRadius * 0.02]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={1} depthTest={false} />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[worldRadius * 0.02, worldRadius * 0.1]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={1} depthTest={false} />
          </mesh>
        </>
      )}
      
      {/* No anchor indicator */}
      {!sourceAnchor && (
        <mesh position={[0, 0, 0.002]}>
          <ringGeometry args={[worldRadius * 0.15, worldRadius * 0.2, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.8} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}