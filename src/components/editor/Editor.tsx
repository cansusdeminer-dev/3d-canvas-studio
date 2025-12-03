import { useState } from 'react';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusBar } from './StatusBar';
import { DropZone } from './DropZone';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TexturePainterOverlay } from './TexturePainter';
import { UVEditor } from './UVEditor';
import { ArchitectureDiagram } from './ArchitectureDiagram';

export function Editor() {
  const [showArchitecture, setShowArchitecture] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <Header onShowArchitecture={() => setShowArchitecture(true)} />
        
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <Toolbar />
          
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <LayersPanel />
            
            <DropZone>
              <div className="flex-1 h-full relative min-h-0">
                <Viewport />
                <TexturePainterOverlay />
                <UVEditor />
                
                <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span className="px-2 py-1 bg-panel/80 backdrop-blur-sm rounded border border-border">
                    Perspective
                  </span>
                </div>
                
                <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[10px] font-mono">
                  <span className="px-2 py-1 bg-panel/80 backdrop-blur-sm rounded border border-border">
                    <span className="text-gizmo-x">X: 0.00</span>
                  </span>
                  <span className="px-2 py-1 bg-panel/80 backdrop-blur-sm rounded border border-border">
                    <span className="text-gizmo-y">Y: 0.00</span>
                  </span>
                  <span className="px-2 py-1 bg-panel/80 backdrop-blur-sm rounded border border-border">
                    <span className="text-gizmo-z">Z: 0.00</span>
                  </span>
                </div>
              </div>
            </DropZone>
            
            <PropertiesPanel />
          </div>
        </div>
        
        <StatusBar />
        
        <ArchitectureDiagram 
          isOpen={showArchitecture} 
          onClose={() => setShowArchitecture(false)} 
        />
      </div>
    </TooltipProvider>
  );
}
