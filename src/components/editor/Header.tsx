import { 
  Menu, 
  Settings, 
  HelpCircle, 
  Maximize,
  Play,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  onShowArchitecture?: () => void;
}

export function Header({ onShowArchitecture }: HeaderProps) {
  return (
    <header className="h-10 bg-toolbar border-b border-border flex items-center justify-between px-2">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Menu size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem>New Project</DropdownMenuItem>
            <DropdownMenuItem>Open Project...</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Import Model...</DropdownMenuItem>
            <DropdownMenuItem>Export Scene...</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onShowArchitecture}>
              <GitBranch size={14} className="mr-2" />
              View Architecture
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="h-4 w-px bg-border" />
        
        <span className="text-sm font-semibold text-primary">
          Canvas3D
        </span>
        <span className="text-xs text-muted-foreground">
          Editor
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs">
          <Play size={14} className="text-green-400" />
          Preview
        </Button>
        
        <div className="h-4 w-px bg-border mx-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onShowArchitecture}>
              <GitBranch size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>CSG-SDF Architecture</TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <HelpCircle size={14} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings size={14} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Maximize size={14} />
        </Button>
      </div>
    </header>
  );
}
