import { useEditorStore } from '@/hooks/useEditorStore';
import { useCursor3DStore } from '@/hooks/useCursor3DStore';
import { Box, Layers, Magnet, Grid3X3, Brush, ArrowUp, Crosshair, Target, Hand, Minus, Plus, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MagneticSettingsPanel } from './MagneticSettingsPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export function StatusBar() {
  const { objects, selectedObjectId, transformMode } = useEditorStore();
  const { 
    plane, cyclePlane, magneticMode, toggleMagneticMode,
    sculptMode, toggleSculptMode, sculptType, setSculptType,
    sculptStrength, setSculptStrength, sculptRadius, setSculptRadius,
    height, magneticAngle, visible, toggleVisible, isOnSurface, position
  } = useCursor3DStore();
  
  const selectedObject = objects.find(obj => obj.id === selectedObjectId);

  const planeIcon = {
    'XY': <Grid3X3 size={12} className="rotate-0" />,
    'XZ': <Grid3X3 size={12} className="rotate-90" />,
    'YZ': <Grid3X3 size={12} className="-rotate-45" />,
  };

  return (
    <footer className="h-10 bg-toolbar border-t border-border flex items-center justify-between px-2 text-[10px] text-muted-foreground">
      {/* Left section - Object info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Layers size={10} />
          <span>{objects.length} objs</span>
        </div>
        
        {selectedObject && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Box size={10} className="text-primary" />
              <span className="text-foreground truncate max-w-[80px]">{selectedObject.name}</span>
            </div>
          </>
        )}
      </div>

      {/* Center section - 3D Cursor Controls */}
      <div className="flex items-center gap-1">
        {/* Cursor visibility */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 text-[10px]", visible && "bg-accent")}
              onClick={toggleVisible}
            >
              <Crosshair size={12} className={cn(visible ? "text-primary" : "text-muted-foreground")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Toggle 3D Cursor
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Plane selector */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1"
              onClick={cyclePlane}
              disabled={magneticMode}
            >
              {planeIcon[plane]}
              <span className="font-mono">{plane}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Cursor Plane (Click to cycle)
          </TooltipContent>
        </Tooltip>

        {/* Height indicator */}
        <div className="flex items-center gap-1 px-2 text-[9px] font-mono bg-background/50 rounded h-6">
          <ArrowUp size={10} />
          <span>{height.toFixed(2)}</span>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Magnetic mode */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-[10px] gap-1",
                magneticMode && "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              )}
              onClick={toggleMagneticMode}
            >
              <Magnet size={12} />
              <span className="hidden sm:inline">Magnetic</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Magnetic Mode - Snap to surfaces
          </TooltipContent>
        </Tooltip>

        {magneticMode && (
          <>
            <div className="flex items-center gap-1 px-2 text-[9px] font-mono bg-background/50 rounded h-6">
              <RotateCcw size={10} />
              <span>{(magneticAngle * 180 / Math.PI).toFixed(0)}°</span>
              {isOnSurface && <Target size={10} className="text-green-400 ml-1" />}
            </div>
            
            {/* Magnetic Settings Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]">
                  <Settings2 size={12} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <MagneticSettingsPanel />
              </SheetContent>
            </Sheet>
          </>
        )}

        <div className="h-4 w-px bg-border mx-1" />

        {/* Sculpt mode */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-[10px] gap-1",
                    sculptMode && "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  )}
                >
                  <Brush size={12} />
                  <span className="hidden sm:inline">Sculpt</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Sculpt Tools
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuLabel className="text-xs">Sculpt Mode</DropdownMenuLabel>
            <DropdownMenuItem onClick={toggleSculptMode}>
              <div className="flex items-center justify-between w-full">
                <span>{sculptMode ? 'Disable' : 'Enable'} Sculpting</span>
                <span className={cn("text-xs", sculptMode ? "text-green-400" : "text-muted-foreground")}>
                  {sculptMode ? 'ON' : 'OFF'}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Brush Type</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSculptType('push')} className={cn(sculptType === 'push' && "bg-accent")}>
              <Minus size={14} className="mr-2" /> Push
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSculptType('pull')} className={cn(sculptType === 'pull' && "bg-accent")}>
              <Plus size={14} className="mr-2" /> Pull
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSculptType('smooth')} className={cn(sculptType === 'smooth' && "bg-accent")}>
              <Hand size={14} className="mr-2" /> Smooth
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSculptType('pinch')} className={cn(sculptType === 'pinch' && "bg-accent")}>
              <Target size={14} className="mr-2" /> Pinch
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Strength: {sculptStrength.toFixed(2)}</label>
                <Slider
                  value={[sculptStrength]}
                  onValueChange={([v]) => setSculptStrength(v)}
                  min={0.1}
                  max={1}
                  step={0.05}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Radius: {sculptRadius.toFixed(2)}</label>
                <Slider
                  value={[sculptRadius]}
                  onValueChange={([v]) => setSculptRadius(v)}
                  min={0.1}
                  max={2}
                  step={0.05}
                  className="mt-1"
                />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {sculptMode && (
          <div className="flex items-center gap-2 px-2 text-[9px] font-mono bg-background/50 rounded h-6">
            <span className="capitalize text-red-400">{sculptType}</span>
            <span>R:{sculptRadius.toFixed(1)}</span>
            <span>S:{sculptStrength.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Right section - Stats */}
      <div className="flex items-center gap-3 text-[9px]">
        <span className="font-mono text-muted-foreground">
          X:{position.x.toFixed(1)} Y:{position.y.toFixed(1)} Z:{position.z.toFixed(1)}
        </span>
        <div className="h-4 w-px bg-border" />
        <span>Mode: <span className="text-foreground capitalize">{transformMode}</span></span>
        <span className="text-green-400">60 FPS</span>
      </div>
    </footer>
  );
}
