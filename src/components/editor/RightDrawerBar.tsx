import { useState } from 'react';
import { 
  Layers, Box, Settings, Sliders, Workflow, Image as ImageIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { MagneticSettingsPanel } from './MagneticSettingsPanel';

type DrawerType = 'layers' | 'properties' | 'magnetic' | 'sdf' | 'source' | null;

interface RightDrawerBarProps {
  onOpenSDFGraph: () => void;
}

export function RightDrawerBar({ onOpenSDFGraph }: RightDrawerBarProps) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  const toggleDrawer = (drawer: DrawerType) => {
    setActiveDrawer(activeDrawer === drawer ? null : drawer);
  };

  const drawerButtons = [
    { id: 'layers' as const, icon: Layers, label: 'Scene Hierarchy', shortcut: 'L' },
    { id: 'properties' as const, icon: Box, label: 'Properties', shortcut: 'P' },
    { id: 'magnetic' as const, icon: Sliders, label: 'Cursor Settings', shortcut: 'M' },
    { id: 'source' as const, icon: ImageIcon, label: '2D Source', shortcut: 'I' },
  ];

  return (
    <div className="flex h-full">
      {/* Drawer Content */}
      <div 
        className={cn(
          "h-full bg-panel border-l border-border transition-all duration-200 overflow-hidden",
          activeDrawer ? "w-72" : "w-0"
        )}
      >
        {activeDrawer === 'layers' && <LayersPanel />}
        {activeDrawer === 'properties' && <PropertiesPanel />}
        {activeDrawer === 'magnetic' && (
          <div className="h-full flex flex-col">
            <div className="panel-header border-b border-border">Cursor Settings</div>
            <MagneticSettingsPanel />
          </div>
        )}
        {activeDrawer === 'source' && (
          <div className="h-full flex flex-col">
            <div className="panel-header border-b border-border">2D Source Panel</div>
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4">
              Use the split view controls in the viewport to show the 2D canvas
            </div>
          </div>
        )}
      </div>

      {/* Icon Bar */}
      <div className="w-10 bg-toolbar border-l border-border flex flex-col items-center py-2 gap-1">
        {/* Collapse/Expand indicator */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mb-2"
          onClick={() => setActiveDrawer(null)}
        >
          {activeDrawer ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>

        <div className="w-6 h-px bg-border" />

        {drawerButtons.map(({ id, icon: Icon, label, shortcut }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  activeDrawer === id && "bg-accent text-accent-foreground"
                )}
                onClick={() => toggleDrawer(id)}
              >
                <Icon size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <span>{label}</span>
              {shortcut && (
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
                  {shortcut}
                </kbd>
              )}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-6 h-px bg-border my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenSDFGraph}
            >
              <Workflow size={16} className="text-amber-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <span>SDF Node Graph</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">N</kbd>
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Settings</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
