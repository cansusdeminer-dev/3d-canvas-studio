import { Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { SceneObjects } from './SceneObjects';
import { SceneLights } from './SceneLights';
import { Cursor3D } from './Cursor3D';
import { CursorControls } from './CursorControls';
import { SculptBrush } from './SculptBrush';
import { CloneStampPainterScene } from './CloneStampPainter';
import { CloneStampCursor } from './CloneStampCursor';
import { CloneStampPreviewDecal } from './CloneStampPreviewDecal';
import * as THREE from 'three';

function Scene() {
  const { showGrid, transformMode, selectedObjectId, objects, setSelectedObjectId, paintMode } = useEditorStore();
  const { isActive: cloneStampActive } = useCloneStampStore();
  const orbitRef = useRef<any>(null);
  
  const selectedObject = objects.find(obj => obj.id === selectedObjectId)?.object;
  
  // CRITICAL: Disable camera movement completely when clone stamp is active
  // This ensures precise painting without accidental camera rotation
  const disableCamera = paintMode || cloneStampActive;
  
  // Apply camera disable state
  useEffect(() => {
    if (orbitRef.current) {
      orbitRef.current.enabled = !disableCamera;
    }
  }, [disableCamera]);
  
  // Also block pointer events from affecting orbit controls when painting
  useEffect(() => {
    if (!orbitRef.current) return;
    
    const controls = orbitRef.current;
    if (disableCamera) {
      controls.enableRotate = false;
      controls.enablePan = false;
      controls.enableZoom = false;
    } else {
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.enableZoom = true;
    }
  }, [disableCamera]);

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
        enableZoom={false}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
      />
      <RightClickZoom orbitRef={orbitRef} />
      
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
      
      {/* 3D Cursor System */}
      <Cursor3D />
      <CursorControls />
      <SculptBrush />
      <CloneStampPainterScene />
      {cloneStampActive && <CloneStampCursor />}
      {cloneStampActive && <CloneStampPreviewDecal />}
      
      {selectedObject && transformMode !== 'select' && (
        <TransformControls
          object={selectedObject}
          mode={transformMode}
          onMouseDown={() => {
            if (orbitRef.current) orbitRef.current.enabled = false;
          }}
          onMouseUp={() => {
            // Don't accidentally re-enable camera while a painting tool is active
            if (orbitRef.current) orbitRef.current.enabled = !(paintMode || cloneStampActive);
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

// Right-click + scroll for zoom
function RightClickZoom({ orbitRef }: { orbitRef: React.RefObject<any> }) {
  const { gl, camera } = useThree();
  const isRightPressed = useRef(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) isRightPressed.current = true;
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) isRightPressed.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (isRightPressed.current) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const direction = camera.getWorldDirection(new THREE.Vector3());
        const distance = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        camera.position.addScaledVector(direction, distance * 5);
      }
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      gl.domElement.removeEventListener('wheel', handleWheel);
    };
  }, [gl, camera]);

  return null;
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
    <div className="canvas-container w-full h-full relative">
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
