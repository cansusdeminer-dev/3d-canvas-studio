import { useState } from 'react';
import { Box, Circle, Cylinder, Triangle, Donut, Square } from 'lucide-react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { GeometryType } from '@/types/editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PrimitiveOption {
  type: GeometryType;
  name: string;
  icon: React.ReactNode;
}

const primitives: PrimitiveOption[] = [
  { type: 'box', name: 'Cube', icon: <Box size={16} /> },
  { type: 'sphere', name: 'Sphere', icon: <Circle size={16} /> },
  { type: 'cylinder', name: 'Cylinder', icon: <Cylinder size={16} /> },
  { type: 'cone', name: 'Cone', icon: <Triangle size={16} /> },
  { type: 'torus', name: 'Torus', icon: <Donut size={16} /> },
  { type: 'plane', name: 'Plane', icon: <Square size={16} /> },
];

export function PrimitivesMenu() {
  const { addObject } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleAddPrimitive = (type: GeometryType, name: string) => {
    const id = `${type}-${Date.now()}`;
    addObject({
      id,
      name: `${name} ${Date.now().toString().slice(-4)}`,
      type: 'mesh',
      geometryType: type,
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#6b7280',
    });
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button className={cn('toolbar-button', isOpen && 'active')}>
              <Box size={18} />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span>Add Primitive</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
            Shift+A
          </kbd>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" className="min-w-[160px]">
        {primitives.map((primitive) => (
          <DropdownMenuItem
            key={primitive.type}
            onClick={() => handleAddPrimitive(primitive.type, primitive.name)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {primitive.icon}
            <span>{primitive.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
