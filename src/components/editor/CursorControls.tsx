import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useCursor3DStore } from '@/hooks/useCursor3DStore';

export function CursorControls() {
  const { gl, camera } = useThree();
  const { 
    magneticMode, height, setHeight, magneticAngle, setMagneticAngle,
    sculptMode, sculptRadius, setSculptRadius
  } = useCursor3DStore();
  
  const orbitControlsRef = useRef<any>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Normal scroll - adjust cursor height/angle/radius
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        
        if (sculptMode) {
          // Adjust sculpt radius
          const delta = e.deltaY > 0 ? -0.05 : 0.05;
          setSculptRadius(Math.max(0.1, Math.min(2, sculptRadius + delta)));
        } else if (magneticMode) {
          // Adjust magnetic angle
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          setMagneticAngle(magneticAngle + delta);
        } else {
          // Adjust cursor height
          const delta = e.deltaY > 0 ? -0.2 : 0.2;
          setHeight(height + delta);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
    gl.domElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      gl.domElement.removeEventListener('wheel', handleWheel);
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl, magneticMode, height, setHeight, magneticAngle, setMagneticAngle, sculptMode, sculptRadius, setSculptRadius]);

  return null;
}
