import { useState } from 'react';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { DropZone } from './DropZone';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TexturePainterOverlay } from './TexturePainter';
import { UVEditor } from './UVEditor';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { SDFDrawer } from './SDFDrawer';
import { SplitViewContainer } from './SplitViewContainer';
import { CloneStampToolbar } from './CloneStampToolbar';
import { RightDrawerBar } from './RightDrawerBar';

export function Editor() {
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [showSDFGraph, setShowSDFGraph] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <Header 
          onShowArchitecture={() => setShowArchitecture(true)} 
          onShowSDFGraph={() => setShowSDFGraph(true)}
        />
        
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Tools */}
          <Toolbar onOpenSDFGraph={() => setShowSDFGraph(true)} />
          
          {/* Center: Viewport */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <DropZone>
              <div className="flex-1 h-full relative min-h-0">
                <SplitViewContainer />
                <TexturePainterOverlay />
                <UVEditor />
              </div>
            </DropZone>
            
            <CloneStampToolbar />
          </div>
          
          {/* Right: Drawer Bar + Drawers */}
          <RightDrawerBar onOpenSDFGraph={() => setShowSDFGraph(true)} />
        </div>
        
        <StatusBar />
        
        <ArchitectureDiagram 
          isOpen={showArchitecture} 
          onClose={() => setShowArchitecture(false)} 
        />
        
        <SDFDrawer 
          open={showSDFGraph} 
          onOpenChange={setShowSDFGraph} 
        />
      </div>
    </TooltipProvider>
  );
}
