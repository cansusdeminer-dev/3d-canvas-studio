import { useEditorStore } from '@/hooks/useEditorStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Box, Move, RotateCcw, Maximize2, Palette, ChevronDown, ChevronRight } from 'lucide-react';
import { MaterialEditor } from './MaterialEditor';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-border">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full panel-header flex items-center gap-2 hover:bg-hover transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Icon size={12} />
        <span>{title}</span>
      </button>
      <div className={cn("overflow-hidden transition-all", isOpen ? "max-h-[500px]" : "max-h-0")}>
        {children}
      </div>
    </div>
  );
}

function TransformSection() {
  const { selectedObjectId, objects, updateObject } = useEditorStore();
  const selectedObject = objects.find(obj => obj.id === selectedObjectId);
  
  const position = selectedObject?.position || [0, 0, 0];
  const rotation = selectedObject?.rotation || [0, 0, 0];
  const scale = selectedObject?.scale || [1, 1, 1];

  const handlePositionChange = (axis: number, value: string) => {
    if (!selectedObjectId) return;
    const newPos = [...position] as [number, number, number];
    newPos[axis] = parseFloat(value) || 0;
    updateObject(selectedObjectId, { position: newPos });
  };

  const handleRotationChange = (axis: number, value: string) => {
    if (!selectedObjectId) return;
    const newRot = [...rotation] as [number, number, number];
    newRot[axis] = parseFloat(value) || 0;
    updateObject(selectedObjectId, { rotation: newRot });
  };

  const handleScaleChange = (axis: number, value: string) => {
    if (!selectedObjectId) return;
    const newScale = [...scale] as [number, number, number];
    newScale[axis] = parseFloat(value) || 1;
    updateObject(selectedObjectId, { scale: newScale });
  };

  return (
    <div className="p-3 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Move size={12} />
          <span>Position</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['X', 'Y', 'Z'].map((axis, i) => (
            <div key={axis}>
              <Label className={`text-[10px] text-gizmo-${axis.toLowerCase()}`}>{axis}</Label>
              <Input 
                type="number" 
                value={position[i].toFixed(2)}
                onChange={(e) => handlePositionChange(i, e.target.value)}
                step={0.1}
                className="h-7 text-xs input-field"
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RotateCcw size={12} />
          <span>Rotation (deg)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['X', 'Y', 'Z'].map((axis, i) => (
            <div key={axis}>
              <Label className={`text-[10px] text-gizmo-${axis.toLowerCase()}`}>{axis}</Label>
              <Input 
                type="number" 
                value={(rotation[i] * (180 / Math.PI)).toFixed(1)}
                onChange={(e) => handleRotationChange(i, String((parseFloat(e.target.value) || 0) * (Math.PI / 180)))}
                step={5}
                className="h-7 text-xs input-field"
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Maximize2 size={12} />
          <span>Scale</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['X', 'Y', 'Z'].map((axis, i) => (
            <div key={axis}>
              <Label className={`text-[10px] text-gizmo-${axis.toLowerCase()}`}>{axis}</Label>
              <Input 
                type="number" 
                value={scale[i].toFixed(2)}
                onChange={(e) => handleScaleChange(i, e.target.value)}
                step={0.1}
                className="h-7 text-xs input-field"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { selectedObjectId, objects } = useEditorStore();
  const selectedObject = objects.find(obj => obj.id === selectedObjectId);

  return (
    <div className="panel w-72 flex flex-col h-full overflow-hidden">
      <div className="panel-header border-b border-border">
        Properties
      </div>
      
      {selectedObject ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="panel-header flex items-center gap-2 border-b border-border">
            <Box size={12} className="text-primary" />
            <span className="text-xs font-medium text-foreground">{selectedObject.name}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{selectedObject.geometryType}</span>
          </div>
          
          <CollapsibleSection title="Transform" icon={Move}>
            <TransformSection />
          </CollapsibleSection>
          
          <CollapsibleSection title="Material" icon={Palette}>
            <MaterialEditor />
          </CollapsibleSection>
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
