import { useEditorStore } from '@/hooks/useEditorStore';
import { Box, Triangle, Layers } from 'lucide-react';

export function StatusBar() {
  const { objects, selectedObjectId, transformMode } = useEditorStore();
  const selectedObject = objects.find(obj => obj.id === selectedObjectId);

  return (
    <footer className="h-6 bg-toolbar border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Layers size={10} />
          <span>{objects.length} objects</span>
        </div>
        
        {selectedObject && (
          <>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Box size={10} className="text-primary" />
              <span className="text-foreground">{selectedObject.name}</span>
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <span>Mode: <span className="text-foreground capitalize">{transformMode}</span></span>
        <span>Renderer: WebGL2</span>
        <span>60 FPS</span>
      </div>
    </footer>
  );
}
