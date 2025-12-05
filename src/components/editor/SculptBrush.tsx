import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCursor3DStore } from '@/hooks/useCursor3DStore';
import { useEditorStore } from '@/hooks/useEditorStore';

export function SculptBrush() {
  const { gl, camera, raycaster, scene } = useThree();
  const { 
    sculptMode, sculptStrength, sculptRadius, sculptType, 
    magneticMode, position: cursorPos, normal: cursorNormal 
  } = useCursor3DStore();
  const { selectedObjectId, objects } = useEditorStore();
  
  const isPressed = useRef(false);
  const mouse = useRef(new THREE.Vector2());

  const applySculpt = useCallback((mesh: THREE.Mesh, point: THREE.Vector3, normal: THREE.Vector3) => {
    if (!mesh.geometry.attributes.position) return;
    
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const posArray = positions.array as Float32Array;
    
    // Get world matrix inverse to transform to local space
    const worldMatrixInverse = mesh.matrixWorld.clone().invert();
    const localPoint = point.clone().applyMatrix4(worldMatrixInverse);
    const localNormal = normal.clone().transformDirection(worldMatrixInverse).normalize();
    
    const vertex = new THREE.Vector3();
    const direction = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      const distance = vertex.distanceTo(localPoint);
      
      if (distance < sculptRadius) {
        // Falloff based on distance
        const falloff = 1 - (distance / sculptRadius);
        const smoothFalloff = falloff * falloff * (3 - 2 * falloff); // Smoothstep
        const strength = sculptStrength * smoothFalloff * 0.01;
        
        switch (sculptType) {
          case 'push':
            direction.copy(localNormal).multiplyScalar(-strength);
            break;
          case 'pull':
            direction.copy(localNormal).multiplyScalar(strength);
            break;
          case 'smooth':
            // Move vertex toward local average (simplified)
            direction.copy(localPoint).sub(vertex).multiplyScalar(strength * 0.5);
            break;
          case 'pinch':
            // Move vertex toward brush center
            direction.copy(localPoint).sub(vertex).normalize().multiplyScalar(strength);
            break;
        }
        
        posArray[i * 3] += direction.x;
        posArray[i * 3 + 1] += direction.y;
        posArray[i * 3 + 2] += direction.z;
      }
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }, [sculptRadius, sculptStrength, sculptType]);

  useEffect(() => {
    if (!sculptMode) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        isPressed.current = true;
      }
    };

    const handleMouseUp = () => {
      isPressed.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!isPressed.current || !sculptMode) return;

      raycaster.setFromCamera(mouse.current, camera);
      
      const meshes: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name !== 'cursor3d' && obj.geometry) {
          meshes.push(obj);
        }
      });

      const intersects = raycaster.intersectObjects(meshes, false);
      
      if (intersects.length > 0 && intersects[0].face) {
        const hit = intersects[0];
        const mesh = hit.object as THREE.Mesh;
        
        if (mesh.geometry.attributes.position) {
          const worldNormal = hit.face.normal.clone();
          worldNormal.transformDirection(mesh.matrixWorld);
          
          applySculpt(mesh, hit.point, worldNormal);
        }
      }
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('mouseleave', handleMouseUp);

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [sculptMode, applySculpt, gl, camera, raycaster, scene]);

  return null;
}
