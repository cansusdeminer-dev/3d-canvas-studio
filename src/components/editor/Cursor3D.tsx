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
    setNormal, setIsOnSurface, setRotation, magneticSettings
  } = useCursor3DStore();
  
  const { camera, scene, gl } = useThree();
  const mouse = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const planeHelper = useRef(new THREE.Plane());
  const intersectionPoint = useRef(new THREE.Vector3());
  
  // Smoothing state
  const smoothedPosition = useRef(new THREE.Vector3());
  const smoothedNormal = useRef(new THREE.Vector3(0, 1, 0));
  const targetNormal = useRef(new THREE.Vector3(0, 1, 0));
  const committedNormal = useRef(new THREE.Vector3(0, 1, 0));
  const baseQuaternion = useRef(new THREE.Quaternion());
  const smoothedQuaternion = useRef(new THREE.Quaternion());
  
  // Velocity tracking
  const lastPosition = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());
  const velocityMagnitude = useRef(0);
  
  // Surface tracking
  const surfaceTimer = useRef(0);
  const offSurfaceTimer = useRef(0);
  const lastHitNormal = useRef(new THREE.Vector3(0, 1, 0));
  const lastHitPosition = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);
  const normalCommitTimer = useRef(0);

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

    const {
      positionLerpMin, positionLerpMax, velocityThreshold,
      normalLerpMin, normalLerpMax, normalCommitDelay,
      surfaceHoldTime, minSurfaceConfidence,
      maxNormalChangeRate
    } = magneticSettings;

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(mouse.current, camera);

    let rawTargetPosition = new THREE.Vector3();
    let rawTargetNormal = new THREE.Vector3(0, 1, 0);
    let hitSurface = false;

    if (magneticMode) {
      // Magnetic mode - snap to object surfaces
      // Collect all valid scene meshes for raycasting
      const meshes: THREE.Object3D[] = [];
      
      scene.traverse((obj) => {
        // Only include standard meshes with geometry
        if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
        
        // Skip invisible objects
        if (!obj.visible) return;
        
        // Check the entire parent chain for cursor group
        let parent: THREE.Object3D | null = obj;
        while (parent) {
          if (parent.name === 'cursor3d') return;
          parent = parent.parent;
        }
        
        // Skip helper types
        if (obj.type.includes('Helper')) return;
        if (obj.type === 'GridHelper') return;
        
        // Skip contact shadows, environment, etc
        if (obj.name.includes('shadow') || obj.name.includes('Shadow')) return;
        if (obj.material && (obj.material as THREE.Material).visible === false) return;
        
        meshes.push(obj);
      });

      const intersects = raycaster.intersectObjects(meshes, true);
      
      if (intersects.length > 0 && intersects[0].face) {
        const hit = intersects[0];
        const worldNormal = hit.face.normal.clone();
        
        // Transform normal to world space using the object's world matrix
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        worldNormal.applyMatrix3(normalMatrix).normalize();

        rawTargetPosition.copy(hit.point);
        rawTargetNormal.copy(worldNormal);
        hitSurface = true;
        
        surfaceTimer.current += delta;
        offSurfaceTimer.current = 0;
        
        // Store last hit for fallback
        lastHitNormal.current.copy(worldNormal);
        lastHitPosition.current.copy(hit.point);
      } else {
        // Lost surface
        surfaceTimer.current = 0;
        offSurfaceTimer.current += delta;
        
        // Use last hit data if within hold time
        if (offSurfaceTimer.current < surfaceHoldTime) {
          rawTargetNormal.copy(lastHitNormal.current);
        } else {
          rawTargetNormal.copy(committedNormal.current);
        }
        
        // Fall back to plane mode positioning
        planeHelper.current.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, height, 0));
        if (raycaster.ray.intersectPlane(planeHelper.current, intersectionPoint.current)) {
          rawTargetPosition.copy(intersectionPoint.current);
        }
      }

      // Calculate velocity
      velocity.current.subVectors(rawTargetPosition, lastPosition.current);
      velocityMagnitude.current = velocity.current.length();
      lastPosition.current.copy(rawTargetPosition);

      // Adaptive lerp based on velocity
      const velocityFactor = Math.min(velocityMagnitude.current / velocityThreshold, 1);
      const positionLerp = THREE.MathUtils.lerp(positionLerpMax, positionLerpMin, velocityFactor);
      const normalLerp = THREE.MathUtils.lerp(normalLerpMax, normalLerpMin, velocityFactor);

      // Initialize on first frame
      if (!isInitialized.current) {
        smoothedPosition.current.copy(rawTargetPosition);
        smoothedNormal.current.copy(rawTargetNormal);
        targetNormal.current.copy(rawTargetNormal);
        committedNormal.current.copy(rawTargetNormal);
        baseQuaternion.current.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rawTargetNormal);
        smoothedQuaternion.current.copy(baseQuaternion.current);
        isInitialized.current = true;
      }

      // Position interpolation
      smoothedPosition.current.lerp(rawTargetPosition, positionLerp);

      // Normal with rate limiting
      if (hitSurface && surfaceTimer.current > minSurfaceConfidence) {
        // Calculate angle difference
        const angleDiff = Math.acos(Math.min(1, targetNormal.current.dot(rawTargetNormal))) * (180 / Math.PI);
        const maxChange = maxNormalChangeRate * delta * 60; // Normalize to 60fps
        
        if (angleDiff <= maxChange) {
          targetNormal.current.copy(rawTargetNormal);
        } else {
          // Limit rate of normal change
          const t = maxChange / angleDiff;
          targetNormal.current.lerp(rawTargetNormal, t).normalize();
        }
        
        // Normal commit timer
        normalCommitTimer.current += delta;
        if (normalCommitTimer.current > normalCommitDelay) {
          committedNormal.current.copy(targetNormal.current);
        }
      } else if (!hitSurface) {
        normalCommitTimer.current = 0;
      }

      // Smooth normal interpolation
      smoothedNormal.current.lerp(targetNormal.current, normalLerp).normalize();

      setPosition(smoothedPosition.current);
      setNormal(smoothedNormal.current);
      setIsOnSurface(hitSurface && surfaceTimer.current > minSurfaceConfidence);

      // Calculate base quaternion from smoothed normal
      const up = new THREE.Vector3(0, 1, 0);
      const newBaseQuat = new THREE.Quaternion().setFromUnitVectors(up, smoothedNormal.current);
      
      // Apply magnetic angle rotation AROUND the current smoothed normal
      const angleQuat = new THREE.Quaternion();
      angleQuat.setFromAxisAngle(smoothedNormal.current, magneticAngle);
      
      // Combine: first align to normal, then rotate around it
      const targetQuat = newBaseQuat.clone().multiply(angleQuat);
      
      // Smooth quaternion interpolation
      smoothedQuaternion.current.slerp(targetQuat, normalLerp);
      
      groupRef.current.quaternion.copy(smoothedQuaternion.current);
      groupRef.current.position.copy(smoothedPosition.current);
      
      const euler = new THREE.Euler().setFromQuaternion(smoothedQuaternion.current);
      setRotation(euler);
    } else {
      // Plane-constrained mode
      setIsOnSurface(false);
      surfaceTimer.current = 0;
      offSurfaceTimer.current = 0;
      normalCommitTimer.current = 0;
      
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
        rawTargetPosition.copy(intersectionPoint.current);
        
        // Faster lerp in plane mode
        if (!isInitialized.current) {
          smoothedPosition.current.copy(rawTargetPosition);
          isInitialized.current = true;
        } else {
          smoothedPosition.current.lerp(rawTargetPosition, positionLerpMax);
        }
        
        setPosition(smoothedPosition.current);
        groupRef.current.position.copy(smoothedPosition.current);
        groupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), planeNormal);
      }
    }

    // Scale for sculpt mode
    if (ringRef.current) {
      ringRef.current.scale.setScalar(sculptMode ? sculptRadius * 2 : 1);
    }
  });

  if (!visible) return null;

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
