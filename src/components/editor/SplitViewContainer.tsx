import { useRef, useCallback, useState, useEffect } from 'react';
import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { Canvas2D } from './Canvas2D';
import { Viewport } from './Viewport';
import { 
  Columns, Rows, Layers, Square, 
  Eye, EyeOff, GripVertical, GripHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SplitViewContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const {
    splitMode,
    splitRatio,
    overlayOpacity,
    canvas2DVisible,
    canvas3DVisible,
    setSplitMode,
    setSplitRatio,
    setOverlayOpacity,
    toggleCanvas2D,
    toggleCanvas3D,
  } = useCloneStampStore();
  
  // Force both canvases visible on mount
  useEffect(() => {
    // Ensure split view shows both by default
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    if (splitMode === 'horizontal') {
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(ratio);
    } else if (splitMode === 'vertical') {
      const ratio = (e.clientY - rect.top) / rect.height;
      setSplitRatio(ratio);
    }
  }, [isDragging, splitMode, setSplitRatio]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  const renderModeSelector = () => (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-panel/90 backdrop-blur-sm rounded border border-border p-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            {splitMode === 'horizontal' && <Columns className="h-3.5 w-3.5" />}
            {splitMode === 'vertical' && <Rows className="h-3.5 w-3.5" />}
            {splitMode === 'overlay' && <Layers className="h-3.5 w-3.5" />}
            {splitMode === 'tabs' && <Square className="h-3.5 w-3.5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSplitMode('horizontal')}>
            <Columns className="h-4 w-4 mr-2" /> Horizontal Split
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSplitMode('vertical')}>
            <Rows className="h-4 w-4 mr-2" /> Vertical Split
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSplitMode('overlay')}>
            <Layers className="h-4 w-4 mr-2" /> Overlay
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSplitMode('tabs')}>
            <Square className="h-4 w-4 mr-2" /> Tabs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {splitMode === 'overlay' && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">Opacity</span>
          <Slider
            value={[overlayOpacity]}
            onValueChange={([v]) => setOverlayOpacity(v)}
            min={0}
            max={1}
            step={0.05}
            className="w-20"
          />
        </div>
      )}
      
      <div className="h-4 w-px bg-border" />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 px-2"
        onClick={toggleCanvas2D}
      >
        {canvas2DVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        <span className="text-xs ml-1">2D</span>
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 px-2"
        onClick={toggleCanvas3D}
      >
        {canvas3DVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        <span className="text-xs ml-1">3D</span>
      </Button>
    </div>
  );

  if (splitMode === 'tabs') {
    return (
      <div ref={containerRef} className="flex-1 h-full relative">
        {renderModeSelector()}
        <Tabs defaultValue="3d" className="h-full flex flex-col">
          <TabsList className="mx-2 mt-10 w-fit">
            <TabsTrigger value="2d">2D Source</TabsTrigger>
            <TabsTrigger value="3d">3D Viewport</TabsTrigger>
          </TabsList>
          <TabsContent value="2d" className="flex-1 m-0">
            <Canvas2D className="h-full" />
          </TabsContent>
          <TabsContent value="3d" className="flex-1 m-0">
            <Viewport />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (splitMode === 'overlay') {
    return (
      <div ref={containerRef} className="flex-1 h-full relative">
        {renderModeSelector()}
        
        {/* 3D viewport as base layer */}
        {canvas3DVisible && (
          <div className="absolute inset-0">
            <Viewport />
          </div>
        )}
        
        {/* 2D canvas as overlay */}
        {canvas2DVisible && (
          <div 
            className="absolute inset-0 pointer-events-auto"
            style={{ opacity: overlayOpacity }}
          >
            <Canvas2D className="h-full" />
          </div>
        )}
      </div>
    );
  }

  // Horizontal or vertical split
  const isHorizontal = splitMode === 'horizontal';
  
  return (
    <div 
      ref={containerRef}
      className={`flex-1 h-full relative flex ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      {renderModeSelector()}
      
      {/* 2D Canvas */}
      {canvas2DVisible && (
        <div 
          className="overflow-hidden bg-panel min-w-[200px]"
          style={{
            [isHorizontal ? 'width' : 'height']: `${splitRatio * 100}%`,
            minWidth: isHorizontal ? '200px' : undefined,
            minHeight: !isHorizontal ? '150px' : undefined,
          }}
        >
          <Canvas2D className="h-full w-full" />
        </div>
      )}
      
      {/* Resize handle */}
      {canvas2DVisible && canvas3DVisible && (
        <div
          className={`
            flex items-center justify-center bg-border hover:bg-primary/50 transition-colors cursor-${isHorizontal ? 'col' : 'row'}-resize
            ${isHorizontal ? 'w-1 h-full' : 'w-full h-1'}
          `}
          onMouseDown={handleDragStart}
        >
          {isHorizontal ? (
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          ) : (
            <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}
      
      {/* 3D Viewport */}
      {canvas3DVisible && (
        <div className="flex-1 overflow-hidden">
          <Viewport />
        </div>
      )}
    </div>
  );
}
