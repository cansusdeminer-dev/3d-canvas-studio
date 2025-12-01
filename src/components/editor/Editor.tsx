import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusBar } from './StatusBar';
import { DropZone } from './DropZone';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Editor() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <Toolbar />
          
          <div className="flex-1 flex overflow-hidden">
            <LayersPanel />
            
            <DropZone>
              <div className="flex-1 relative">
                <Viewport />
                
                {/* Viewport info overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span className="px-2 py-1 bg-panel/80 backdrop-blur-sm rounded border border-border">
                    Perspective
                  </span>
                </div>
                
                {/* Coordinates display */}
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
      </div>
    </TooltipProvider>
  );
}
