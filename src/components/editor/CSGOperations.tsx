import { useState } from 'react';
import { Combine, Minus, Layers, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useEditorStore } from '@/hooks/useEditorStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type CSGOperation = 'union' | 'subtract' | 'intersect';

export function CSGOperations() {
  const { objects, selectedObjectId } = useEditorStore();
  const [showSettings, setShowSettings] = useState(false);
  const [smoothRadius, setSmoothRadius] = useState(0);
  const [secondObjectId, setSecondObjectId] = useState<string | null>(null);
  const [pendingOperation, setPendingOperation] = useState<CSGOperation | null>(null);

  const selectedObject = objects.find(o => o.id === selectedObjectId);
  const otherObjects = objects.filter(o => o.id !== selectedObjectId && o.geometryType !== 'imported');

  const handleOperation = (operation: CSGOperation) => {
    if (!selectedObjectId) {
      toast.error('Select an object first');
      return;
    }
    
    if (otherObjects.length === 0) {
      toast.error('Need at least two objects for CSG');
      return;
    }

    if (otherObjects.length === 1) {
      performCSG(operation, otherObjects[0].id);
    } else {
      setPendingOperation(operation);
    }
  };

  const performCSG = (operation: CSGOperation, targetId: string) => {
    const targetObject = objects.find(o => o.id === targetId);
    if (!targetObject) return;

    // In a real implementation, this would use three-bvh-csg
    // For now, we show how it would work
    toast.success(
      `${operation.charAt(0).toUpperCase() + operation.slice(1)} operation: ${selectedObject?.name} ${operation === 'subtract' ? '-' : operation === 'intersect' ? '∩' : '∪'} ${targetObject.name}`,
      { description: smoothRadius > 0 ? `Smooth radius: ${smoothRadius.toFixed(2)}` : 'Sharp edges' }
    );
    
    setPendingOperation(null);
    setSecondObjectId(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={!selectedObjectId}>
            <Combine size={14} />
            <span className="text-xs">CSG</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs">Boolean Operations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOperation('union')} className="gap-2">
            <Combine size={14} className="text-green-500" />
            <span>Union (A ∪ B)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOperation('subtract')} className="gap-2">
            <Minus size={14} className="text-red-500" />
            <span>Subtract (A - B)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOperation('intersect')} className="gap-2">
            <Layers size={14} className="text-blue-500" />
            <span>Intersect (A ∩ B)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowSettings(true)} className="gap-2">
            <Settings2 size={14} />
            <span>Smooth Settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Object Selection Dialog */}
      {pendingOperation && (
        <Dialog open={!!pendingOperation} onOpenChange={() => setPendingOperation(null)}>
          <DialogContent className="sm:max-w-[300px]">
            <DialogHeader>
              <DialogTitle className="text-sm">Select Second Object</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {otherObjects.map((obj) => (
                <Button
                  key={obj.id}
                  variant="outline"
                  className="w-full justify-start text-xs"
                  onClick={() => performCSG(pendingOperation, obj.id)}
                >
                  {obj.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Smooth Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle className="text-sm">CSG Smooth Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span>Smooth Radius</span>
                <span className="text-muted-foreground">{smoothRadius.toFixed(2)}</span>
              </div>
              <Slider
                value={[smoothRadius]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => setSmoothRadius(v)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                0 = sharp edges, higher = smoother blend
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
