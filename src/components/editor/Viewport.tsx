import { Suspense, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  GizmoHelper, 
  GizmoViewport,
  TransformControls,
  PerspectiveCamera,
  ContactShadows
} from '@react-three/drei';
import { useEditorStore } from '@/hooks/useEditorStore';
import { SceneObjects } from './SceneObjects';
import { SceneLights } from './SceneLights';
import * as THREE from 'three';

function Scene() {
  const { showGrid, transformMode, selectedObjectId, objects, setSelectedObjectId } = useEditorStore();
  const orbitRef = useRef<any>(null);
  
  const selectedObject = objects.find(obj => obj.id === selectedObjectId)?.object;

  const handleMissed = useCallback((e: any) => {
    e.stopPropagation();
    setSelectedObjectId(null);
  }, [setSelectedObjectId]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
      <OrbitControls 
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
      />
      
      <SceneLights />
      
      {showGrid && (
        <Grid 
          args={[20, 20]} 
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1a3a4a"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#2a5a6a"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
      )}
      
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={4}
      />
      
      <SceneObjects onMissed={handleMissed} />
      
      {selectedObject && transformMode !== 'select' && (
        <TransformControls
          object={selectedObject}
          mode={transformMode}
          onMouseDown={() => {
            if (orbitRef.current) orbitRef.current.enabled = false;
          }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
          }}
        />
      )}
      
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport 
          axisColors={['#ef4444', '#22c55e', '#3b82f6']} 
          labelColor="white"
        />
      </GizmoHelper>
      
      <Environment preset="city" background={false} />
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#1a3a4a" wireframe />
    </mesh>
  );
}

export function Viewport() {
  return (
    <div className="canvas-container absolute inset-0">
      <Canvas
        shadows
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0d1117');
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
