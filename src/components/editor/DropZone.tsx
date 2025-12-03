import { useState, useCallback } from 'react';
import { FileBox } from 'lucide-react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { toast } from 'sonner';

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
      file.name.endsWith('.gltf')
    );

    if (modelFiles.length === 0) {
      toast.error('Please drop a valid 3D model file (.glb, .gltf)');
      return;
    }

    modelFiles.forEach(file => {
      const id = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const name = file.name.replace(/\.[^/.]+$/, '');
      
      const url = URL.createObjectURL(file);
      
      addObject({
        id,
        name,
        type: 'mesh',
        geometryType: 'imported',
        visible: true,
        locked: false,
        modelUrl: url,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      });
      
      toast.success(`Imported: ${name}`);
    });
  }, [addObject]);

  return (
    <div
      className="flex-1 relative min-h-0 h-full"
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
                Supports .glb, .gltf
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
