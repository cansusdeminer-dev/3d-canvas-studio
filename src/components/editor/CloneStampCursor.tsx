import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import * as THREE from 'three';

// Create a texture from the source image centered on the anchor
function useSourcePreviewTexture() {
  const { sourceImageUrl, sourceAnchor, brushRadius, brushScale, textureSettings } = useCloneStampStore();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Load image once
  useEffect(() => {
    if (!sourceImageUrl) {
      setTexture(null);
      imageRef.current = null;
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      // Trigger texture update
      updateTexture(img);
    };
    img.src = sourceImageUrl;
    
    return () => {
      imageRef.current = null;
    };
  }, [sourceImageUrl]);
  
  const updateTexture = (img: HTMLImageElement) => {
    if (!sourceAnchor) {
      setTexture(null);
      return;
    }
    
    const size = 256;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvasRef.current = canvas;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, size, size);
    
    // Create circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Calculate sample region based on brush settings
    const sampleRadius = brushRadius / textureSettings.worldScale;
    const sx = sourceAnchor.x - sampleRadius;
    const sy = sourceAnchor.y - sampleRadius;
    const sw = sampleRadius * 2;
    const sh = sampleRadius * 2;
    
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
    ctx.restore();
    
    // Create or update texture
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    setTexture(tex);
  };
  
  // Update when anchor or brush settings change
  useEffect(() => {
    if (imageRef.current && sourceAnchor) {
      updateTexture(imageRef.current);
    } else {
      setTexture(null);
    }
  }, [sourceAnchor, brushRadius, brushScale, textureSettings.worldScale]);
  
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
    brushScale,
    textureSettings,
    surfaceSettings
  } = useCloneStampStore();
  
  const previewTexture = useSourcePreviewTexture();
  
  // Smoothed position/normal
  const smoothedPosition = useRef(new THREE.Vector3());
  const smoothedNormal = useRef(new THREE.Vector3(0, 1, 0));
  const isInitialized = useRef(false);
  
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
      
      // Skip UI elements
      const skipNames = ['clonestamp-cursor', 'cursor3d', 'shadow', 'Shadow', 'grid', 'Grid', 'Helper'];
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
      
      // Position slightly above surface
      const offset = smoothedNormal.current.clone().multiplyScalar(0.01);
      groupRef.current.position.copy(smoothedPosition.current).add(offset);
      
      // Orient to face along normal
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
  
  // Calculate world radius based on brush settings
  const worldRadius = (brushRadius * brushScale * textureSettings.worldScale) / 100;
  
  return (
    <group ref={groupRef} name="clonestamp-cursor">
      {/* Outer ring - green when anchor set, red when not */}
      <mesh>
        <ringGeometry args={[worldRadius * 0.95, worldRadius, 64]} />
        <meshBasicMaterial 
          color={sourceAnchor ? "#22c55e" : "#ef4444"}
          transparent 
          opacity={0.9}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Inner fill with projection mode indicator */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[worldRadius * 0.9, 64]} />
        <meshBasicMaterial 
          color={sourceAnchor ? "#22c55e" : "#ef4444"}
          transparent 
          opacity={0.1}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Source preview inside the circle */}
      {previewTexture && sourceAnchor && (
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[worldRadius * 0.85, 64]} />
          <meshBasicMaterial 
            map={previewTexture}
            transparent 
            opacity={0.5}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Center crosshair */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[worldRadius * 0.15, worldRadius * 0.02]} />
        <meshBasicMaterial 
          color={sourceAnchor ? "#22c55e" : "#ef4444"} 
          transparent 
          opacity={1} 
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[worldRadius * 0.02, worldRadius * 0.15]} />
        <meshBasicMaterial 
          color={sourceAnchor ? "#22c55e" : "#ef4444"} 
          transparent 
          opacity={1} 
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Projection mode indicator */}
      {surfaceSettings.projectionMode === 'spherical' && (
        <mesh position={[0, 0, 0.004]}>
          <ringGeometry args={[worldRadius * 0.3, worldRadius * 0.35, 32]} />
          <meshBasicMaterial 
            color="#3b82f6" 
            transparent 
            opacity={0.5}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {surfaceSettings.projectionMode === 'cylindrical' && (
        <>
          <mesh position={[-worldRadius * 0.4, 0, 0.004]}>
            <planeGeometry args={[worldRadius * 0.02, worldRadius * 0.6]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh position={[worldRadius * 0.4, 0, 0.004]}>
            <planeGeometry args={[worldRadius * 0.02, worldRadius * 0.6]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} depthTest={false} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
