import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useEditorStore } from '@/hooks/useEditorStore';
import * as THREE from 'three';

interface SceneObjectsProps {
  onMissed: (e: any) => void;
}

function SelectableObject({ 
  objectData, 
  isSelected,
  onClick 
}: { 
  objectData: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { updateObject } = useEditorStore();

  useEffect(() => {
    if (meshRef.current) {
      updateObject(objectData.id, { object: meshRef.current });
    }
  }, [objectData.id, updateObject]);

  if (!objectData.visible) return null;

  return (
    <mesh
      ref={meshRef}
      onClick={(e) => {
        e.stopPropagation();
        if (!objectData.locked) onClick();
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={isSelected ? '#22d3ee' : '#6b7280'}
        emissive={isSelected ? '#22d3ee' : '#000000'}
        emissiveIntensity={isSelected ? 0.1 : 0}
        metalness={0.3}
        roughness={0.7}
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
