import { useRef, useEffect, Suspense } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Object3DData } from '@/types/editor';

interface SceneObjectsProps {
  onMissed: (e: any) => void;
}

function GeometryMesh({ geometryType, color, isSelected }: { 
  geometryType: string; 
  color: string;
  isSelected: boolean;
}) {
  const geometry = (() => {
    switch (geometryType) {
      case 'sphere':
        return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'cone':
        return <coneGeometry args={[0.5, 1, 32]} />;
      case 'torus':
        return <torusGeometry args={[0.4, 0.15, 16, 48]} />;
      case 'plane':
        return <planeGeometry args={[1, 1]} />;
      case 'box':
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  })();

  return (
    <>
      {geometry}
      <meshStandardMaterial 
        color={isSelected ? '#22d3ee' : color}
        emissive={isSelected ? '#22d3ee' : '#000000'}
        emissiveIntensity={isSelected ? 0.1 : 0}
        metalness={0.3}
        roughness={0.7}
        side={geometryType === 'plane' ? THREE.DoubleSide : THREE.FrontSide}
      />
    </>
  );
}

function ImportedModel({ url, isSelected }: { url: string; isSelected: boolean }) {
  const { scene } = useGLTF(url);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (isSelected && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissive = new THREE.Color('#22d3ee');
            mat.emissiveIntensity = 0.1;
          }
        }
      }
    });
  }, [scene, isSelected]);

  return <primitive object={scene.clone()} />;
}

function SelectableObject({ 
  objectData, 
  isSelected,
  onClick 
}: { 
  objectData: Object3DData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh | THREE.Group>(null);
  const { updateObject } = useEditorStore();

  useEffect(() => {
    if (meshRef.current) {
      updateObject(objectData.id, { object: meshRef.current });
    }
  }, [objectData.id, updateObject]);

  useEffect(() => {
    if (meshRef.current && objectData.position) {
      meshRef.current.position.set(...objectData.position);
    }
    if (meshRef.current && objectData.rotation) {
      meshRef.current.rotation.set(...objectData.rotation);
    }
    if (meshRef.current && objectData.scale) {
      meshRef.current.scale.set(...objectData.scale);
    }
  }, [objectData.position, objectData.rotation, objectData.scale]);

  if (!objectData.visible) return null;

  if (objectData.geometryType === 'imported' && objectData.modelUrl) {
    return (
      <group
        ref={meshRef as any}
        onClick={(e) => {
          e.stopPropagation();
          if (!objectData.locked) onClick();
        }}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#1a3a4a" wireframe />
          </mesh>
        }>
          <ImportedModel url={objectData.modelUrl} isSelected={isSelected} />
        </Suspense>
      </group>
    );
  }

  return (
    <mesh
      ref={meshRef as any}
      onClick={(e) => {
        e.stopPropagation();
        if (!objectData.locked) onClick();
      }}
      castShadow
      receiveShadow
    >
      <GeometryMesh 
        geometryType={objectData.geometryType} 
        color={objectData.color || '#6b7280'}
        isSelected={isSelected}
      />
    </mesh>
  );
}

export function SceneObjects({ onMissed }: SceneObjectsProps) {
  const { objects, selectedObjectId, setSelectedObjectId } = useEditorStore();

  return (
    <group onClick={onMissed}>
      {objects.map((obj) => (
        <SelectableObject
          key={obj.id}
          objectData={obj}
          isSelected={selectedObjectId === obj.id}
          onClick={() => setSelectedObjectId(obj.id)}
        />
      ))}
    </group>
  );
}
