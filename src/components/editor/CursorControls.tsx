import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useCursor3DStore } from '@/hooks/useCursor3DStore';

export function CursorControls() {
  const { gl } = useThree();
  const { 
    magneticMode, height, setHeight, magneticAngle, setMagneticAngle,
    sculptMode, sculptRadius, setSculptRadius
  } = useCursor3DStore();
  
  // Track right mouse button state
  const isRightClickHeld = useRef(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightClickHeld.current = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightClickHeld.current = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Right-click + scroll = zoom (let OrbitControls handle it, don't adjust cursor)
      if (isRightClickHeld.current) {
        // Don't preventDefault - let the zoom happen via OrbitControls
        // But also don't do any cursor adjustments
        return;
      }
      
      // Normal scroll (no right-click) - adjust cursor properties
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
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseup', handleMouseUp); // Catch mouse up outside canvas
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
    gl.domElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseup', handleMouseUp);
      gl.domElement.removeEventListener('wheel', handleWheel);
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl, magneticMode, height, setHeight, magneticAngle, setMagneticAngle, sculptMode, sculptRadius, setSculptRadius]);

  return null;
}
