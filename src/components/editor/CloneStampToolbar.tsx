import { useCloneStampStore } from '@/hooks/useCloneStampStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Stamp, Settings, RotateCw, Maximize2, 
  Circle, Droplets, Crosshair, Trash2 
} from 'lucide-react';

export function CloneStampToolbar() {
  const {
    isActive,
    mode,
    brushRadius,
    brushRotation,
    brushScale,
    brushOpacity,
    brushHardness,
    sourceAnchor,
    setActive,
    setMode,
    setBrushRadius,
    setBrushRotation,
    setBrushScale,
    setBrushOpacity,
    setBrushHardness,
    clearAnchors,
  } = useCloneStampStore();

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-panel border-t border-border">
      {/* Tool toggle */}
      <Button
        variant={isActive ? 'default' : 'ghost'}
        size="sm"
        className="h-7 gap-1.5"
        onClick={() => setActive(!isActive)}
      >
        <Stamp className="h-3.5 w-3.5" />
        <span className="text-xs">Clone Stamp</span>
      </Button>
      
      <div className="h-4 w-px bg-border" />
      
      {/* Mode selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Mode:</Label>
        <Button
          variant={mode === '2d-to-3d' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => setMode('2d-to-3d')}
        >
          2D → 3D
        </Button>
        <Button
          variant={mode === '2d-to-2d' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => setMode('2d-to-2d')}
        >
          2D → 2D
        </Button>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      {/* Brush settings */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span className="text-xs">Brush</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Circle className="h-3 w-3" /> Radius
                </Label>
                <span className="text-xs text-muted-foreground">{brushRadius}px</span>
              </div>
              <Slider
                value={[brushRadius]}
                onValueChange={([v]) => setBrushRadius(v)}
                min={5}
                max={200}
                step={1}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <RotateCw className="h-3 w-3" /> Rotation
                </Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(brushRotation * 180 / Math.PI)}°
                </span>
              </div>
              <Slider
                value={[brushRotation]}
                onValueChange={([v]) => setBrushRotation(v)}
                min={0}
                max={Math.PI * 2}
                step={0.01}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Maximize2 className="h-3 w-3" /> Scale
                </Label>
                <span className="text-xs text-muted-foreground">{brushScale.toFixed(2)}x</span>
              </div>
              <Slider
                value={[brushScale]}
                onValueChange={([v]) => setBrushScale(v)}
                min={0.1}
                max={5}
                step={0.05}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Droplets className="h-3 w-3" /> Opacity
                </Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(brushOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[brushOpacity]}
                onValueChange={([v]) => setBrushOpacity(v)}
                min={0.05}
                max={1}
                step={0.05}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Hardness</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(brushHardness * 100)}%
                </span>
              </div>
              <Slider
                value={[brushHardness]}
                onValueChange={([v]) => setBrushHardness(v)}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <div className="h-4 w-px bg-border" />
      
      {/* Anchor status */}
      <div className="flex items-center gap-2">
        <Crosshair className={`h-3.5 w-3.5 ${sourceAnchor ? 'text-green-500' : 'text-muted-foreground'}`} />
        <span className="text-xs text-muted-foreground">
          {sourceAnchor 
            ? `(${Math.round(sourceAnchor.x)}, ${Math.round(sourceAnchor.y)})` 
            : 'Alt+Click to set anchor'
          }
        </span>
        {sourceAnchor && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={clearAnchors}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
