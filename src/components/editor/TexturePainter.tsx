import { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useEditorStore } from '@/hooks/useEditorStore';
import * as THREE from 'three';

interface PaintableTextureProps {
  object: THREE.Mesh;
}

export function PaintableTexture({ object }: PaintableTextureProps) {
  const { brushSettings } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const { raycaster, camera, gl } = useThree();

  useEffect(() => {
    // Create canvas for texture painting
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    canvasRef.current = canvas;

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    textureRef.current = texture;

    // Apply texture to material
    if (object.material instanceof THREE.MeshStandardMaterial) {
      object.material.map = texture;
      object.material.needsUpdate = true;
    }

    return () => {
      texture.dispose();
    };
  }, [object]);

  const paintAtUV = useCallback((uv: THREE.Vector2) => {
    const canvas = canvasRef.current;
    const texture = textureRef.current;
    if (!canvas || !texture) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = uv.x * canvas.width;
    const y = (1 - uv.y) * canvas.height;

    // Create radial gradient for brush
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSettings.size);
    const color = brushSettings.color;
    const opacity = brushSettings.opacity;
    
    gradient.addColorStop(0, `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(brushSettings.hardness, `${color}${Math.round(opacity * 0.5 * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${color}00`);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, brushSettings.size, 0, Math.PI * 2);
    ctx.fill();

    texture.needsUpdate = true;
  }, [brushSettings]);

  useFrame(() => {
    if (!isPainting) return;

    const intersects = raycaster.intersectObject(object);
    if (intersects.length > 0 && intersects[0].uv) {
      paintAtUV(intersects[0].uv);
    }
  });

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        setIsPainting(true);
      }
    };

    const handlePointerUp = () => {
      setIsPainting(false);
    };

    const domElement = gl.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointerleave', handlePointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [gl]);

  return null;
}

export function TexturePainterOverlay() {
  const { paintMode, selectedObjectId, objects, brushSettings, updateBrushSettings } = useEditorStore();
  
  if (!paintMode) return null;

  const selectedObject = objects.find(obj => obj.id === selectedObjectId);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 panel px-4 py-2 flex items-center gap-4">
      <span className="text-sm font-medium text-primary">Paint Mode</span>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Size</label>
        <input
          type="range"
          min="5"
          max="100"
          value={brushSettings.size}
          onChange={(e) => updateBrushSettings({ size: Number(e.target.value) })}
          className="w-20 h-1 accent-primary"
        />
        <span className="text-xs w-6">{brushSettings.size}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Color</label>
        <input
          type="color"
          value={brushSettings.color}
          onChange={(e) => updateBrushSettings({ color: e.target.value })}
          className="w-6 h-6 rounded border border-border cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Opacity</label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={brushSettings.opacity}
          onChange={(e) => updateBrushSettings({ opacity: Number(e.target.value) })}
          className="w-16 h-1 accent-primary"
        />
      </div>
      {!selectedObject && (
        <span className="text-xs text-yellow-500">Select an object to paint</span>
      )}
    </div>
  );
}
