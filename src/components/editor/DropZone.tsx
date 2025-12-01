import { useState, useCallback } from 'react';
import { Upload, FileBox } from 'lucide-react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  children: React.ReactNode;
}

export function DropZone({ children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { addObject } = useEditorStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const modelFiles = files.filter(file => 
      file.name.endsWith('.glb') || 
      file.name.endsWith('.gltf') ||
      file.name.endsWith('.obj') ||
      file.name.endsWith('.fbx')
    );

    if (modelFiles.length === 0) {
      toast.error('Please drop a valid 3D model file (.glb, .gltf, .obj, .fbx)');
      return;
    }

    modelFiles.forEach(file => {
      const id = `model-${Date.now()}`;
      const name = file.name.replace(/\.[^/.]+$/, '');
      
      addObject({
        id,
        name,
        type: 'mesh',
        visible: true,
        locked: false,
      });
      
      toast.success(`Imported: ${name}`);
    });
  }, [addObject]);

  return (
    <div
      className="relative w-full h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      
      {isDragging && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-dashed border-primary bg-card/50">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
              <FileBox size={32} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Drop 3D Model</p>
              <p className="text-sm text-muted-foreground">
                Supports .glb, .gltf, .obj, .fbx
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
