import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SDFNodeGraph } from './SDFNodeGraph';

interface SDFDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SDFDrawer({ open, onOpenChange }: SDFDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>SDF Node Graph Editor</SheetTitle>
        </SheetHeader>
        <SDFNodeGraph />
      </SheetContent>
    </Sheet>
  );
}
