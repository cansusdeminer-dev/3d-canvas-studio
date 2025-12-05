import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCursor3DStore } from '@/hooks/useCursor3DStore';

export function Cursor3D() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const {
    position, normal, plane, height, magneticMode, magneticAngle,
    isOnSurface, visible, sculptMode, sculptRadius, setPosition,
    setNormal, setIsOnSurface, setRotation
  } = useCursor3DStore();
  
  const { camera, raycaster, scene, gl } = useThree();
  const mouse = useRef(new THREE.Vector2());
  const planeHelper = useRef(new THREE.Plane());
  const intersectionPoint = useRef(new THREE.Vector3());

  // Get plane normal based on current plane setting
  const planeNormal = useMemo(() => {
    switch (plane) {
      case 'XY': return new THREE.Vector3(0, 0, 1);
      case 'XZ': return new THREE.Vector3(0, 1, 0);
      case 'YZ': return new THREE.Vector3(1, 0, 0);
    }
  }, [plane]);

  // Ring geometry for cursor
  const ringGeometry = useMemo(() => {
    return new THREE.RingGeometry(0.45, 0.5, 64);
  }, []);

  const innerGeometry = useMemo(() => {
    return new THREE.CircleGeometry(0.05, 32);
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
    if (!groupRef.current || !visible) return;

    raycaster.setFromCamera(mouse.current, camera);

    if (magneticMode) {
      // Magnetic mode - snap to object surfaces
      const meshes: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name !== 'cursor3d') {
          meshes.push(obj);
        }
      });

      const intersects = raycaster.intersectObjects(meshes, true);
      
      if (intersects.length > 0 && intersects[0].face) {
        const hit = intersects[0];
        const worldNormal = hit.face.normal.clone();
        
        // Transform normal to world space
        if (hit.object instanceof THREE.Mesh) {
          worldNormal.transformDirection(hit.object.matrixWorld);
        }

        setPosition(hit.point);
        setNormal(worldNormal);
        setIsOnSurface(true);

        // Align cursor to surface normal with magnetic angle rotation
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(up, worldNormal);
        
        // Apply magnetic angle rotation around the normal
        const angleQuat = new THREE.Quaternion();
        angleQuat.setFromAxisAngle(worldNormal, magneticAngle);
        quaternion.multiply(angleQuat);
        
        groupRef.current.quaternion.copy(quaternion);
        groupRef.current.position.copy(hit.point);
        
        const euler = new THREE.Euler().setFromQuaternion(quaternion);
        setRotation(euler);
      } else {
        setIsOnSurface(false);
        // Fall back to plane mode
        planeHelper.current.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, height, 0));
        if (raycaster.ray.intersectPlane(planeHelper.current, intersectionPoint.current)) {
          setPosition(intersectionPoint.current);
          groupRef.current.position.copy(intersectionPoint.current);
          groupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), planeNormal);
        }
      }
    } else {
      // Plane-constrained mode
      setIsOnSurface(false);
      const planePoint = new THREE.Vector3();
      
      switch (plane) {
        case 'XY':
          planePoint.set(0, 0, height);
          break;
        case 'XZ':
          planePoint.set(0, height, 0);
          break;
        case 'YZ':
          planePoint.set(height, 0, 0);
          break;
      }
      
      planeHelper.current.setFromNormalAndCoplanarPoint(planeNormal, planePoint);
      
      if (raycaster.ray.intersectPlane(planeHelper.current, intersectionPoint.current)) {
        setPosition(intersectionPoint.current);
        groupRef.current.position.copy(intersectionPoint.current);
        groupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), planeNormal);
      }
    }

    // Pulse animation for ring
    if (ringRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
      ringRef.current.scale.setScalar(sculptMode ? sculptRadius * 2 : scale);
    }
  });

  if (!visible) return null;

  const cursorColor = magneticMode 
    ? (isOnSurface ? '#22c55e' : '#eab308') 
    : '#3b82f6';
  
  const sculptColor = sculptMode ? '#ef4444' : cursorColor;

  return (
    <group ref={groupRef} name="cursor3d">
      {/* Main ring */}
      <mesh ref={ringRef} geometry={ringGeometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial 
          color={sculptColor} 
          transparent 
          opacity={0.8} 
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>

      {/* Center dot */}
      <mesh geometry={innerGeometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial 
          color={sculptColor} 
          transparent 
          opacity={1}
          depthTest={false}
        />
      </mesh>

      {/* Axis lines */}
      <Line 
        points={[[-0.4, 0, 0], [0.4, 0, 0]]} 
        color="#ef4444" 
        lineWidth={1}
        transparent
        opacity={0.6}
        depthTest={false}
      />
      <Line 
        points={[[0, 0, -0.4], [0, 0, 0.4]]} 
        color="#3b82f6" 
        lineWidth={1}
        transparent
        opacity={0.6}
        depthTest={false}
      />

      {/* Normal indicator (only in magnetic mode) */}
      {magneticMode && isOnSurface && (
        <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.5, 0x22c55e, 0.1, 0.05]} />
      )}

      {/* Sculpt radius preview */}
      {sculptMode && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[sculptRadius - 0.02, sculptRadius, 64]} />
          <meshBasicMaterial 
            color="#ef4444" 
            transparent 
            opacity={0.3}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Plane indicator grid */}
      {!magneticMode && (
        <gridHelper 
          args={[2, 10, '#ffffff20', '#ffffff10']} 
          rotation={plane === 'XY' ? [Math.PI / 2, 0, 0] : plane === 'YZ' ? [0, 0, Math.PI / 2] : [0, 0, 0]}
        />
      )}
    </group>
  );
}
