import { usePaintLayerStore, PaintLayer, FlipSettings } from '@/hooks/usePaintLayerStore';
import { useEditorStore } from '@/hooks/useEditorStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Layers, Eye, EyeOff, Trash2, 
  FlipHorizontal, FlipVertical, Wand2,
  Paintbrush, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayerItemProps {
  layer: PaintLayer;
  isSelected: boolean;
  onSelect: () => void;
}

function LayerItem({ layer, isSelected, onSelect }: LayerItemProps) {
  const { setLayerVisibility, setLayerOpacity, clearLayer, removeLayer, meshConfigs, setFlipSettings, getFlipSettings } = usePaintLayerStore();
  
  const flipSettings = getFlipSettings(layer.meshUuid);
  const config = meshConfigs.get(layer.meshUuid);

  return (
    <div 
      className={cn(
        "p-2 rounded-md border transition-colors cursor-pointer",
        isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Paintbrush className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate">{layer.name}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setLayerVisibility(layer.meshUuid, !layer.visible);
            }}
          >
            {layer.visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              clearLayer(layer.meshUuid);
            }}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              removeLayer(layer.meshUuid);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-3 space-y-3 pt-3 border-t border-border">
          {/* Opacity slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Opacity</Label>
              <span className="text-xs text-muted-foreground">{Math.round(layer.opacity * 100)}%</span>
            </div>
            <Slider
              value={[layer.opacity]}
              onValueChange={([v]) => setLayerOpacity(layer.meshUuid, v)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>
          
          {/* Flip controls */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Direction Flip</Label>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch
                  id={`flip-u-${layer.meshUuid}`}
                  checked={flipSettings.flipU}
                  disabled={flipSettings.autoDetect}
                  onCheckedChange={(checked) => 
                    setFlipSettings(layer.meshUuid, { flipU: checked })
                  }
                  className="scale-75"
                />
                <Label htmlFor={`flip-u-${layer.meshUuid}`} className="text-xs flex items-center gap-1">
                  <FlipHorizontal className="h-3 w-3" /> U
                </Label>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Switch
                  id={`flip-v-${layer.meshUuid}`}
                  checked={flipSettings.flipV}
                  disabled={flipSettings.autoDetect}
                  onCheckedChange={(checked) => 
                    setFlipSettings(layer.meshUuid, { flipV: checked })
                  }
                  className="scale-75"
                />
                <Label htmlFor={`flip-v-${layer.meshUuid}`} className="text-xs flex items-center gap-1">
                  <FlipVertical className="h-3 w-3" /> V
                </Label>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Switch
                id={`auto-detect-${layer.meshUuid}`}
                checked={flipSettings.autoDetect}
                onCheckedChange={(checked) => 
                  setFlipSettings(layer.meshUuid, { autoDetect: checked })
                }
                className="scale-75"
              />
              <Label htmlFor={`auto-detect-${layer.meshUuid}`} className="text-xs flex items-center gap-1">
                <Wand2 className="h-3 w-3" /> Auto-detect
              </Label>
            </div>
            
            {config && flipSettings.autoDetect && (
              <p className="text-[10px] text-muted-foreground">
                Detected: U={config.detectedFlipU ? 'flipped' : 'normal'}, V={config.detectedFlipV ? 'flipped' : 'normal'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PaintLayerPanel() {
  const { layers } = usePaintLayerStore();
  const { selectedObjectId } = useEditorStore();
  
  const layerArray = Array.from(layers.values());
  const selectedMeshUuid = selectedObjectId;

  if (layerArray.length === 0) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span className="text-xs">Layers</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Layers className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              No paint layers yet.
              <br />
              Start painting on a mesh to create layers.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          <span className="text-xs">Layers ({layerArray.length})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Paint Layers</h4>
            <span className="text-xs text-muted-foreground">{layerArray.length} layer(s)</span>
          </div>
          
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-2">
              {layerArray.map((layer) => (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  isSelected={layer.meshUuid === selectedMeshUuid}
                  onSelect={() => {
                    // Could trigger mesh selection here if needed
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
