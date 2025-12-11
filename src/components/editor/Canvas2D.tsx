import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, Point, Circle, Line, Group } from 'fabric';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { ZoomIn, ZoomOut, RotateCcw, Upload, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Canvas2DProps {
  className?: string;
}

export function Canvas2D({ className = '' }: Canvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  
  const {
    sourceImageUrl,
    sourceAnchor,
    isActive,
    brushRadius,
    setSourceImage,
    setSourceAnchor
  } = useCloneStampStore();

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Use default dimensions if container hasn't rendered yet
    const width = rect.width || 400;
    const height = rect.height || 400;
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#1a1a1a',
      selection: false,
    });
    
    setFabricCanvas(canvas);
    
    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.setDimensions({ width, height });
        canvas.renderAll();
      }
    });
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
    };
  }, []);

  // Load source image when URL changes
  useEffect(() => {
    if (!fabricCanvas || !sourceImageUrl) return;
    
    FabricImage.fromURL(sourceImageUrl).then((img) => {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#1a1a1a';
      
      // Center and fit image
      const canvasWidth = fabricCanvas.getWidth();
      const canvasHeight = fabricCanvas.getHeight();
      const scale = Math.min(
        canvasWidth / (img.width || 1),
        canvasHeight / (img.height || 1)
      ) * 0.9;
      
      img.scale(scale);
      img.set({
        left: (canvasWidth - (img.width || 0) * scale) / 2,
        top: (canvasHeight - (img.height || 0) * scale) / 2,
        selectable: false,
        evented: false,
      });
      
      fabricCanvas.add(img);
      fabricCanvas.renderAll();
    }).catch(() => {
      toast.error('Failed to load image');
    });
  }, [fabricCanvas, sourceImageUrl]);

  // Handle Alt+Click to set source anchor
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const handleMouseDown = (e: MouseEvent) => {
      if (!isActive) return;
      
      if (e.altKey) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Get click position in canvas space
        const pointer = fabricCanvas.getPointer(e);
        
        // Find the image to get actual pixel coordinates
        const objects = fabricCanvas.getObjects();
        const img = objects.find(obj => obj instanceof FabricImage) as FabricImage | undefined;
        
        if (img) {
          // Transform canvas coords to image pixel coords
          const imgLeft = img.left || 0;
          const imgTop = img.top || 0;
          const imgScale = img.scaleX || 1;
          
          const pixelX = (pointer.x - imgLeft) / imgScale;
          const pixelY = (pointer.y - imgTop) / imgScale;
          
          setSourceAnchor({ x: pixelX, y: pixelY });
          toast.success(`Source anchor set at (${Math.round(pixelX)}, ${Math.round(pixelY)})`);
        }
        
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const canvasEl = canvasRef.current?.parentElement;
    canvasEl?.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      canvasEl?.removeEventListener('mousedown', handleMouseDown);
    };
  }, [fabricCanvas, isActive, setSourceAnchor]);

  // Draw source anchor indicator
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // Remove old anchor indicator
    const oldIndicator = fabricCanvas.getObjects().find(obj => (obj as any).isAnchorIndicator);
    if (oldIndicator) fabricCanvas.remove(oldIndicator);
    
    if (sourceAnchor) {
      const objects = fabricCanvas.getObjects();
      const img = objects.find(obj => obj instanceof FabricImage) as FabricImage | undefined;
      
      if (img) {
        const imgLeft = img.left || 0;
        const imgTop = img.top || 0;
        const imgScale = img.scaleX || 1;
        
        // Convert anchor to canvas coords
        const canvasX = imgLeft + sourceAnchor.x * imgScale;
        const canvasY = imgTop + sourceAnchor.y * imgScale;
        
        // Draw crosshair using imported classes
        const circle = new Circle({
          radius: brushRadius * imgScale,
          fill: 'transparent',
          stroke: '#00ff00',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        });
        const lineH = new Line([-10, 0, 10, 0], {
          stroke: '#00ff00',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        });
        const lineV = new Line([0, -10, 0, 10], {
          stroke: '#00ff00',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        });
        
        const group = new Group([circle, lineH, lineV], {
          left: canvasX,
          top: canvasY,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        (group as any).isAnchorIndicator = true;
        
        fabricCanvas.add(group);
        fabricCanvas.renderAll();
      }
    }
  }, [fabricCanvas, sourceAnchor, brushRadius]);

  // Pan handling
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true);
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      
      const vpt = fabricCanvas.viewportTransform;
      if (vpt) {
        vpt[4] += dx;
        vpt[5] += dy;
        fabricCanvas.setViewportTransform(vpt);
      }
      
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
      setIsPanning(false);
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, zoom * delta));
      
      const pointer = fabricCanvas.getPointer(e);
      fabricCanvas.zoomToPoint(new Point(pointer.x, pointer.y), newZoom);
      setZoom(newZoom);
    };
    
    const canvasEl = canvasRef.current?.parentElement;
    canvasEl?.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvasEl?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvasEl?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasEl?.removeEventListener('wheel', handleWheel);
    };
  }, [fabricCanvas, isPanning, zoom]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setSourceImage(url, { width: img.width, height: img.height });
        toast.success('Image loaded');
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }, [setSourceImage]);

  const resetView = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
  }, [fabricCanvas]);

  return (
    <div className={`relative flex flex-col bg-panel ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-panel">
        <span className="text-xs font-medium text-muted-foreground px-2">2D Source</span>
        
        <div className="h-4 w-px bg-border" />
        
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
            <span><Upload className="h-3.5 w-3.5" /></span>
          </Button>
        </label>
        
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={resetView}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        
        <div className="flex items-center gap-1 ml-auto">
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
      
      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} />
        
        {!sourceImageUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Drop image or click to upload
                </span>
              </div>
            </label>
          </div>
        )}
        
        {isActive && sourceAnchor && (
          <div className="absolute bottom-2 left-2 text-xs bg-panel/90 px-2 py-1 rounded border border-border">
            <Crosshair className="h-3 w-3 inline mr-1 text-green-500" />
            Anchor: ({Math.round(sourceAnchor.x)}, {Math.round(sourceAnchor.y)})
          </div>
        )}
      </div>
    </div>
  );
}
