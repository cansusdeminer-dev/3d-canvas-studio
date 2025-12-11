import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Box, 
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';

function ObjectItem({ obj }: { obj: any }) {
  const { 
    selectedObjectId, 
    setSelectedObjectId, 
    toggleObjectVisibility, 
    toggleObjectLock,
    removeObject 
  } = useEditorStore();
  
  const isSelected = selectedObjectId === obj.id;

  return (
    <div
      className={cn('layer-item group', isSelected && 'selected')}
      onClick={() => setSelectedObjectId(obj.id)}
    >
      <Box size={14} className="text-primary shrink-0" />
      <span className="flex-1 text-sm truncate">{obj.name}</span>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleObjectVisibility(obj.id);
          }}
          className="p-1 hover:bg-hover rounded"
        >
          {obj.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-muted-foreground" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleObjectLock(obj.id);
          }}
          className="p-1 hover:bg-hover rounded"
        >
          {obj.locked ? <Lock size={12} className="text-destructive" /> : <Unlock size={12} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeObject(obj.id);
          }}
          className="p-1 hover:bg-hover rounded text-destructive"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function LightItem({ light }: { light: any }) {
  const { updateLight, removeLight } = useEditorStore();

  return (
    <div className="layer-item group">
      <Lightbulb size={14} className="text-yellow-400 shrink-0" />
      <span className="flex-1 text-sm truncate">{light.name}</span>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeLight(light.id);
          }}
          className="p-1 hover:bg-hover rounded text-destructive"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function Section({ 
  title, 
  children, 
  defaultOpen = true,
  count = 0,
  onAdd
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
  onAdd?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full panel-header flex items-center gap-2"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="flex-1 text-left">{title}</span>
        <span className="text-[10px] text-muted-foreground">{count}</span>
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="p-0.5 hover:bg-hover rounded"
          >
            <Plus size={12} />
          </button>
        )}
      </button>
      {isOpen && (
        <div className="py-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function LayersPanel() {
  const { objects, lights, addObject } = useEditorStore();

  const handleAddObject = () => {
    const id = `cube-${Date.now()}`;
    addObject({
      id,
      name: `Cube ${Date.now().toString().slice(-4)}`,
      type: 'mesh',
      geometryType: 'box',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#6b7280',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-panel">
      <div className="panel-header border-b border-border">
        Scene Hierarchy
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Section title="Objects" count={objects.length} onAdd={handleAddObject}>
          {objects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No objects in scene
            </p>
          ) : (
            objects.map((obj) => <ObjectItem key={obj.id} obj={obj} />)
          )}
        </Section>
        
        <Section title="Lights" count={lights.length}>
          {lights.map((light) => <LightItem key={light.id} light={light} />)}
        </Section>
      </div>
    </div>
  );
}
