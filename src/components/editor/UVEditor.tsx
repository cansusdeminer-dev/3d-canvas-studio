import { useRef, useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useEditorStore } from '@/hooks/useEditorStore';
import * as THREE from 'three';

export function UVEditor() {
  const { showUVEditor, toggleUVEditor, selectedObjectId, objects } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const selectedObject = objects.find(obj => obj.id === selectedObjectId);
  const mesh = selectedObject?.object as THREE.Mesh | undefined;

  useEffect(() => {
    if (!showUVEditor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    const gridSize = 32 * zoom;
    
    for (let x = pan.x % gridSize; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = pan.y % gridSize; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw UV bounds (0-1 square)
    ctx.strokeStyle = '#4a4a8a';
    ctx.lineWidth = 2;
    const size = 300 * zoom;
    const offsetX = pan.x + (canvas.width - size) / 2;
    const offsetY = pan.y + (canvas.height - size) / 2;
    ctx.strokeRect(offsetX, offsetY, size, size);

    // Draw UV wireframe if mesh has UV coordinates
    if (mesh && mesh.geometry) {
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const uvAttribute = geometry.getAttribute('uv');
      const indexAttribute = geometry.getIndex();

      if (uvAttribute) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1;

        if (indexAttribute) {
          // Indexed geometry
          for (let i = 0; i < indexAttribute.count; i += 3) {
            const indices = [
              indexAttribute.getX(i),
              indexAttribute.getX(i + 1),
              indexAttribute.getX(i + 2),
            ];

            ctx.beginPath();
            for (let j = 0; j < 3; j++) {
              const u = uvAttribute.getX(indices[j]);
              const v = uvAttribute.getY(indices[j]);
              const x = offsetX + u * size;
              const y = offsetY + (1 - v) * size;

              if (j === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.stroke();
          }
        } else {
          // Non-indexed geometry
          for (let i = 0; i < uvAttribute.count; i += 3) {
            ctx.beginPath();
            for (let j = 0; j < 3; j++) {
              const u = uvAttribute.getX(i + j);
              const v = uvAttribute.getY(i + j);
              const x = offsetX + u * size;
              const y = offsetY + (1 - v) * size;

              if (j === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.stroke();
          }
        }

        // Draw UV vertices
        ctx.fillStyle = '#22d3ee';
        for (let i = 0; i < uvAttribute.count; i++) {
          const u = uvAttribute.getX(i);
          const v = uvAttribute.getY(i);
          const x = offsetX + u * size;
          const y = offsetY + (1 - v) * size;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [showUVEditor, mesh, zoom, pan]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!showUVEditor) return null;

  return (
    <div className="absolute bottom-12 right-64 w-[400px] h-[400px] panel flex flex-col z-20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">UV Editor</span>
        <div className="flex items-center gap-1">
          <button 
            className="p-1 hover:bg-muted rounded"
            onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          >
            <ZoomIn size={14} />
          </button>
          <button 
            className="p-1 hover:bg-muted rounded"
            onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
          >
            <ZoomOut size={14} />
          </button>
          <button 
            className="p-1 hover:bg-muted rounded"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          >
            <Move size={14} />
          </button>
          <button 
            className="p-1 hover:bg-muted rounded ml-2"
            onClick={toggleUVEditor}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={350}
          className="w-full h-full cursor-crosshair"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {!selectedObject && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="text-sm text-muted-foreground">Select an object to view UVs</span>
          </div>
        )}
      </div>
    </div>
  );
}
