import { 
  MousePointer2, 
  Move3D, 
  RotateCcw, 
  Maximize2, 
  Grid3X3, 
  Lightbulb,
  Undo2,
  Redo2,
  Save,
  Download,
  Magnet,
  Paintbrush,
  Layout,
  Workflow
} from 'lucide-react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PrimitivesMenu } from './PrimitivesMenu';
import { CSGOperations } from './CSGOperations';
import { cn } from '@/lib/utils';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  shortcut?: string;
}

function ToolButton({ icon, label, active, onClick, shortcut }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'toolbar-button',
            active && 'active'
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <div className="w-full h-px bg-border my-1" />;
}

interface ToolbarProps {
  onOpenSDFGraph?: () => void;
}

export function Toolbar({ onOpenSDFGraph }: ToolbarProps) {
  const { 
    transformMode, 
    setTransformMode, 
    showGrid, 
    toggleGrid,
    snapEnabled,
    toggleSnap,
    paintMode,
    togglePaintMode,
    showUVEditor,
    toggleUVEditor
  } = useEditorStore();

  return (
    <div className="panel flex flex-col items-center py-2 px-1.5 gap-0.5 w-12">
      <ToolButton
        icon={<MousePointer2 size={18} />}
        label="Select"
        shortcut="V"
        active={transformMode === 'select'}
        onClick={() => setTransformMode('select')}
      />
      <ToolButton
        icon={<Move3D size={18} />}
        label="Move"
        shortcut="G"
        active={transformMode === 'translate'}
        onClick={() => setTransformMode('translate')}
      />
      <ToolButton
        icon={<RotateCcw size={18} />}
        label="Rotate"
        shortcut="R"
        active={transformMode === 'rotate'}
        onClick={() => setTransformMode('rotate')}
      />
      <ToolButton
        icon={<Maximize2 size={18} />}
        label="Scale"
        shortcut="S"
        active={transformMode === 'scale'}
        onClick={() => setTransformMode('scale')}
      />
      
      <Divider />
      
      <PrimitivesMenu />
      <ToolButton
        icon={<Lightbulb size={18} />}
        label="Add Light"
        onClick={() => {}}
      />
      
      <Divider />
      
      <CSGOperations />
      <ToolButton
        icon={<Workflow size={18} />}
        label="SDF Node Graph"
        shortcut="N"
        onClick={onOpenSDFGraph}
      />
      
      <Divider />
      
      <ToolButton
        icon={<Paintbrush size={18} />}
        label="Paint Mode"
        shortcut="P"
        active={paintMode}
        onClick={togglePaintMode}
      />
      <ToolButton
        icon={<Layout size={18} />}
        label="UV Editor"
        shortcut="U"
        active={showUVEditor}
        onClick={toggleUVEditor}
      />
      
      <Divider />
      
      <ToolButton
        icon={<Grid3X3 size={18} />}
        label="Toggle Grid"
        active={showGrid}
        onClick={toggleGrid}
      />
      <ToolButton
        icon={<Magnet size={18} />}
        label="Snap"
        active={snapEnabled}
        onClick={toggleSnap}
      />
      
      <Divider />
      
      <ToolButton
        icon={<Undo2 size={18} />}
        label="Undo"
        shortcut="Ctrl+Z"
        onClick={() => {}}
      />
      <ToolButton
        icon={<Redo2 size={18} />}
        label="Redo"
        shortcut="Ctrl+Y"
        onClick={() => {}}
      />
      
      <div className="flex-1" />
      
      <ToolButton
        icon={<Save size={18} />}
        label="Save"
        shortcut="Ctrl+S"
        onClick={() => {}}
      />
      <ToolButton
        icon={<Download size={18} />}
        label="Export"
        onClick={() => {}}
      />
    </div>
  );
}
