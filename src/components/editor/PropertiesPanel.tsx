import { useEditorStore } from '@/hooks/useEditorStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Box, Move, RotateCcw, Maximize2 } from 'lucide-react';

function TransformSection() {
  return (
    <div className="p-3 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Move size={12} />
          <span>Position</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-gizmo-x">X</Label>
            <Input 
              type="number" 
              defaultValue="0" 
              className="h-7 text-xs input-field"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gizmo-y">Y</Label>
            <Input 
              type="number" 
              defaultValue="0" 
              className="h-7 text-xs input-field"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gizmo-z">Z</Label>
            <Input 
              type="number" 
              defaultValue="0" 
              className="h-7 text-xs input-field"
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RotateCcw size={12} />
          <span>Rotation</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-gizmo-x">X</Label>
            <Input 
              type="number" 
              defaultValue="0" 
              className="h-7 text-xs input-field"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gizmo-y">Y</Label>
            <Input 
              type="number" 
              defaultValue="0" 
              className="h-7 text-xs input-field"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gizmo-z">Z</Label>
            <Input 
              type="number" 
              defaultValue="0" 
              className="h-7 text-xs input-field"
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Maximize2 size={12} />
          <span>Scale</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-gizmo-x">X</Label>
            <Input 
              type="number" 
              defaultValue="1" 
              className="h-7 text-xs input-field"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gizmo-y">Y</Label>
            <Input 
              type="number" 
              defaultValue="1" 
              className="h-7 text-xs input-field"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gizmo-z">Z</Label>
            <Input 
              type="number" 
              defaultValue="1" 
              className="h-7 text-xs input-field"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MaterialSection() {
  return (
    <div className="p-3 space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2">
          <input 
            type="color" 
            defaultValue="#6b7280" 
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input 
            defaultValue="#6b7280" 
            className="h-8 text-xs input-field font-mono"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs">Metalness</Label>
        <Slider defaultValue={[0.3]} max={1} step={0.01} className="py-2" />
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs">Roughness</Label>
        <Slider defaultValue={[0.7]} max={1} step={0.01} className="py-2" />
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { selectedObjectId, objects } = useEditorStore();
  const selectedObject = objects.find(obj => obj.id === selectedObjectId);

  return (
    <div className="panel w-64 flex flex-col h-full overflow-hidden">
      <div className="panel-header border-b border-border">
        Properties
      </div>
      
      {selectedObject ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="panel-header flex items-center gap-2 border-b border-border">
            <Box size={12} className="text-primary" />
            <span className="text-xs font-medium text-foreground">{selectedObject.name}</span>
          </div>
          
          <div className="border-b border-border">
            <div className="panel-header">Transform</div>
            <TransformSection />
          </div>
          
          <div className="border-b border-border">
            <div className="panel-header">Material</div>
            <MaterialSection />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            Select an object to view properties
          </p>
        </div>
      )}
    </div>
  );
}
