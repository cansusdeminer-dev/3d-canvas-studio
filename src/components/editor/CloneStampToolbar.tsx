import { useCloneStampStore, ProjectionMode, CurvatureMode } from '@/hooks/useCloneStampStore';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Stamp, Settings, RotateCw, Maximize2, 
  Circle, Droplets, Crosshair, Trash2,
  Layers, Globe, Box, Grid3X3,
  Move, Blend, Undo2, Redo2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CloneStampToolbar() {
  const {
    isActive,
    mode,
    brushRadius,
    brushRotation,
    brushScale,
    brushOpacity,
    brushHardness,
    brushSpacing,
    sourceAnchor,
    textureSettings,
    surfaceSettings,
    setActive,
    setMode,
    setBrushRadius,
    setBrushRotation,
    setBrushScale,
    setBrushOpacity,
    setBrushHardness,
    setBrushSpacing,
    setTextureSettings,
    setSurfaceSettings,
    clearAnchors,
    undo,
    redo,
  } = useCloneStampStore();

  if (!isActive) return null;

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
            <Circle className="h-3.5 w-3.5" />
            <span className="text-xs">Brush</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
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
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Spacing</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(brushSpacing)}%
                </span>
              </div>
              <Slider
                value={[brushSpacing]}
                onValueChange={([v]) => setBrushSpacing(v)}
                min={5}
                max={100}
                step={5}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Advanced Settings */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span className="text-xs">Advanced</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <Tabs defaultValue="texture" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="texture" className="flex-1 text-xs">Texture</TabsTrigger>
              <TabsTrigger value="surface" className="flex-1 text-xs">Surface</TabsTrigger>
            </TabsList>
            
            <TabsContent value="texture" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Maximize2 className="h-3 w-3" /> World Scale
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {textureSettings.worldScale.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[textureSettings.worldScale]}
                  onValueChange={([v]) => setTextureSettings({ worldScale: v })}
                  min={0.01}
                  max={10}
                  step={0.01}
                />
                <p className="text-xs text-muted-foreground">
                  How many world units per source pixel
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">UV Scale U</Label>
                  <Slider
                    value={[textureSettings.uvScale.u]}
                    onValueChange={([v]) => setTextureSettings({ uvScale: { ...textureSettings.uvScale, u: v } })}
                    min={0.1}
                    max={5}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">UV Scale V</Label>
                  <Slider
                    value={[textureSettings.uvScale.v]}
                    onValueChange={([v]) => setTextureSettings({ uvScale: { ...textureSettings.uvScale, v: v } })}
                    min={0.1}
                    max={5}
                    step={0.1}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Grid3X3 className="h-3 w-3" /> Tiling
                </Label>
                <Switch
                  checked={textureSettings.tiling}
                  onCheckedChange={(checked) => setTextureSettings({ tiling: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Blend className="h-3 w-3" /> Blend Mode
                </Label>
                <Select
                  value={textureSettings.blendMode}
                  onValueChange={(v) => setTextureSettings({ blendMode: v as any })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="multiply">Multiply</SelectItem>
                    <SelectItem value="overlay">Overlay</SelectItem>
                    <SelectItem value="soft-light">Soft Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="surface" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Projection Mode
                </Label>
                <Select
                  value={surfaceSettings.projectionMode}
                  onValueChange={(v) => setSurfaceSettings({ projectionMode: v as ProjectionMode })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planar">
                      <div className="flex items-center gap-2">
                        <Box className="h-3 w-3" /> Planar
                      </div>
                    </SelectItem>
                    <SelectItem value="cylindrical">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3 w-3" /> Cylindrical
                      </div>
                    </SelectItem>
                    <SelectItem value="spherical">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" /> Spherical
                      </div>
                    </SelectItem>
                    <SelectItem value="uv-based">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-3 w-3" /> UV-Based
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {surfaceSettings.projectionMode === 'planar' && 'Best for flat or slightly curved surfaces'}
                  {surfaceSettings.projectionMode === 'cylindrical' && 'Best for tube-like shapes'}
                  {surfaceSettings.projectionMode === 'spherical' && 'Best for round objects like spheres'}
                  {surfaceSettings.projectionMode === 'uv-based' && 'Uses mesh UV coordinates directly'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Curvature Handling</Label>
                <Select
                  value={surfaceSettings.curvatureMode}
                  onValueChange={(v) => setSurfaceSettings({ curvatureMode: v as CurvatureMode })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">Ignore (fastest)</SelectItem>
                    <SelectItem value="adapt">Adapt to surface</SelectItem>
                    <SelectItem value="stretch">Allow stretching</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Move className="h-3 w-3" /> Follow Normals
                </Label>
                <Switch
                  checked={surfaceSettings.followNormals}
                  onCheckedChange={(checked) => setSurfaceSettings({ followNormals: checked })}
                />
              </div>
              
              {surfaceSettings.curvatureMode === 'adapt' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Curvature Threshold</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(surfaceSettings.curvatureThreshold * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[surfaceSettings.curvatureThreshold]}
                    onValueChange={([v]) => setSurfaceSettings({ curvatureThreshold: v })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Seam Blend Radius</Label>
                  <span className="text-xs text-muted-foreground">
                    {surfaceSettings.seamBlendRadius}px
                  </span>
                </div>
                <Slider
                  value={[surfaceSettings.seamBlendRadius]}
                  onValueChange={([v]) => setSurfaceSettings({ seamBlendRadius: v })}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
      
      <div className="h-4 w-px bg-border" />
      
      {/* Undo/Redo */}
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => undo()}>
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => redo()}>
        <Redo2 className="h-3.5 w-3.5" />
      </Button>
      
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
