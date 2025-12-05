import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCursor3DStore } from '@/hooks/useCursor3DStore';

// Smoothing configuration
const POSITION_LERP = 0.15; // Position interpolation speed
const NORMAL_LERP = 0.1;    // Normal interpolation speed (slower for stability)
const MIN_SURFACE_TIME = 0.1; // Minimum time on surface before confirming

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
  
  // Smoothing state
  const smoothedPosition = useRef(new THREE.Vector3());
  const smoothedNormal = useRef(new THREE.Vector3(0, 1, 0));
  const smoothedQuaternion = useRef(new THREE.Quaternion());
  const targetQuaternion = useRef(new THREE.Quaternion());
  const surfaceTimer = useRef(0);
  const lastValidNormal = useRef(new THREE.Vector3(0, 1, 0));
  const lastValidPosition = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

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

  useFrame((_, delta) => {
    if (!groupRef.current || !visible) return;

    raycaster.setFromCamera(mouse.current, camera);

    let targetPosition = new THREE.Vector3();
    let targetNormal = new THREE.Vector3(0, 1, 0);
    let hitSurface = false;

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

        targetPosition.copy(hit.point);
        targetNormal.copy(worldNormal);
        hitSurface = true;
        
        // Track time on surface for stability
        surfaceTimer.current += delta;
        
        // Only update last valid if we've been on surface long enough
        if (surfaceTimer.current > MIN_SURFACE_TIME) {
          lastValidNormal.current.copy(worldNormal);
          lastValidPosition.current.copy(hit.point);
        }
      } else {
        // Lost surface - use last valid or fall back to plane
        surfaceTimer.current = 0;
        
        if (lastValidNormal.current.lengthSq() > 0) {
          // Keep last valid orientation but move along plane
          targetNormal.copy(lastValidNormal.current);
        }
        
        // Fall back to plane mode positioning
        planeHelper.current.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, height, 0));
        if (raycaster.ray.intersectPlane(planeHelper.current, intersectionPoint.current)) {
          targetPosition.copy(intersectionPoint.current);
        }
      }

      // Smooth interpolation for position
      if (!isInitialized.current) {
        smoothedPosition.current.copy(targetPosition);
        smoothedNormal.current.copy(targetNormal);
        isInitialized.current = true;
      } else {
        smoothedPosition.current.lerp(targetPosition, POSITION_LERP);
        smoothedNormal.current.lerp(targetNormal, NORMAL_LERP).normalize();
      }

      setPosition(smoothedPosition.current);
      setNormal(smoothedNormal.current);
      setIsOnSurface(hitSurface && surfaceTimer.current > MIN_SURFACE_TIME);

      // Calculate target quaternion
      const up = new THREE.Vector3(0, 1, 0);
      targetQuaternion.current.setFromUnitVectors(up, smoothedNormal.current);
      
      // Apply magnetic angle rotation around the normal
      const angleQuat = new THREE.Quaternion();
      angleQuat.setFromAxisAngle(smoothedNormal.current, magneticAngle);
      targetQuaternion.current.multiply(angleQuat);
      
      // Smooth quaternion interpolation
      smoothedQuaternion.current.slerp(targetQuaternion.current, NORMAL_LERP);
      
      groupRef.current.quaternion.copy(smoothedQuaternion.current);
      groupRef.current.position.copy(smoothedPosition.current);
      
      const euler = new THREE.Euler().setFromQuaternion(smoothedQuaternion.current);
      setRotation(euler);
    } else {
      // Plane-constrained mode
      setIsOnSurface(false);
      surfaceTimer.current = 0;
      
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
        targetPosition.copy(intersectionPoint.current);
        
        // Smooth position in plane mode too
        if (!isInitialized.current) {
          smoothedPosition.current.copy(targetPosition);
          isInitialized.current = true;
        } else {
          smoothedPosition.current.lerp(targetPosition, POSITION_LERP * 2); // Faster in plane mode
        }
        
        setPosition(smoothedPosition.current);
        groupRef.current.position.copy(smoothedPosition.current);
        groupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), planeNormal);
      }
    }

    // Static scale for ring (no breathing animation)
    if (ringRef.current) {
      ringRef.current.scale.setScalar(sculptMode ? sculptRadius * 2 : 1);
    }
  });

  if (!visible) return null;

  // Simplified color - single color for magnetic mode (cyan), stable
  const cursorColor = magneticMode ? '#06b6d4' : '#3b82f6';
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

      {/* Normal indicator (only in magnetic mode when on surface) */}
      {magneticMode && isOnSurface && (
        <Line
          points={[[0, 0, 0], [0, 0.5, 0]]}
          color="#06b6d4"
          lineWidth={2}
          transparent
          opacity={0.8}
          depthTest={false}
        />
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
