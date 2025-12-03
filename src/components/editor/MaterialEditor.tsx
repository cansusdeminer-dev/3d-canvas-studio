import { useEditorStore } from '@/hooks/useEditorStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Palette, 
  Sun, 
  Sparkles, 
  Droplets, 
  Eye,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface MaterialProperties {
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  wireframe: boolean;
}

const defaultMaterial: MaterialProperties = {
  color: '#6b7280',
  metalness: 0.3,
  roughness: 0.7,
  emissive: '#000000',
  emissiveIntensity: 0,
  opacity: 1,
  transparent: false,
  wireframe: false,
};

const presets: { name: string; props: Partial<MaterialProperties> }[] = [
  { name: 'Metal', props: { color: '#c0c0c0', metalness: 1, roughness: 0.2 } },
  { name: 'Plastic', props: { color: '#ff6b6b', metalness: 0, roughness: 0.4 } },
  { name: 'Glass', props: { color: '#88ccff', metalness: 0.1, roughness: 0.05, opacity: 0.3, transparent: true } },
  { name: 'Wood', props: { color: '#8b4513', metalness: 0, roughness: 0.8 } },
  { name: 'Rubber', props: { color: '#2d2d2d', metalness: 0, roughness: 0.95 } },
  { name: 'Gold', props: { color: '#ffd700', metalness: 1, roughness: 0.3 } },
  { name: 'Ceramic', props: { color: '#f5f5f5', metalness: 0.1, roughness: 0.3 } },
  { name: 'Neon', props: { color: '#00ff88', metalness: 0, roughness: 0.5, emissive: '#00ff88', emissiveIntensity: 1 } },
];

export function MaterialEditor() {
  const { selectedObjectId, objects, updateObject } = useEditorStore();
  const selectedObject = objects.find(obj => obj.id === selectedObjectId);
  
  const [material, setMaterial] = useState<MaterialProperties>(defaultMaterial);

  useEffect(() => {
    if (selectedObject?.color) {
      setMaterial(prev => ({ ...prev, color: selectedObject.color! }));
    }
  }, [selectedObject]);

  const updateMaterial = (updates: Partial<MaterialProperties>) => {
    const newMaterial = { ...material, ...updates };
    setMaterial(newMaterial);
    
    if (selectedObjectId) {
      updateObject(selectedObjectId, { color: newMaterial.color });
    }
  };

  const applyPreset = (preset: typeof presets[0]) => {
    updateMaterial(preset.props);
  };

  if (!selectedObject) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-muted-foreground">
          Select an object to edit material
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Sparkles size={12} />
          Presets
        </Label>
        <div className="grid grid-cols-4 gap-1">
          {presets.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              className="h-7 text-[10px] px-1"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Base Color */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Palette size={12} />
          Base Color
        </Label>
        <div className="flex gap-2">
          <input 
            type="color" 
            value={material.color}
            onChange={(e) => updateMaterial({ color: e.target.value })}
            className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
          />
          <Input 
            value={material.color}
            onChange={(e) => updateMaterial({ color: e.target.value })}
            className="h-10 text-xs input-field font-mono flex-1"
          />
        </div>
      </div>

      {/* Metalness */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs flex items-center gap-1.5">
            <Sun size={12} />
            Metalness
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground">
            {material.metalness.toFixed(2)}
          </span>
        </div>
        <Slider 
          value={[material.metalness]} 
          onValueChange={([v]) => updateMaterial({ metalness: v })}
          max={1} 
          step={0.01} 
          className="py-1" 
        />
      </div>

      {/* Roughness */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs flex items-center gap-1.5">
            <Droplets size={12} />
            Roughness
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground">
            {material.roughness.toFixed(2)}
          </span>
        </div>
        <Slider 
          value={[material.roughness]} 
          onValueChange={([v]) => updateMaterial({ roughness: v })}
          max={1} 
          step={0.01} 
          className="py-1" 
        />
      </div>

      {/* Emissive */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Sparkles size={12} />
          Emissive
        </Label>
        <div className="flex gap-2">
          <input 
            type="color" 
            value={material.emissive}
            onChange={(e) => updateMaterial({ emissive: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
          />
          <div className="flex-1">
            <Slider 
              value={[material.emissiveIntensity]} 
              onValueChange={([v]) => updateMaterial({ emissiveIntensity: v })}
              max={2} 
              step={0.1} 
              className="py-3" 
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs flex items-center gap-1.5">
            <Eye size={12} />
            Opacity
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground">
            {material.opacity.toFixed(2)}
          </span>
        </div>
        <Slider 
          value={[material.opacity]} 
          onValueChange={([v]) => updateMaterial({ opacity: v, transparent: v < 1 })}
          max={1} 
          step={0.01} 
          className="py-1" 
        />
      </div>

      {/* Toggles */}
      <div className="flex gap-2 pt-2">
        <Button
          variant={material.wireframe ? "default" : "outline"}
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => updateMaterial({ wireframe: !material.wireframe })}
        >
          Wireframe
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setMaterial(defaultMaterial)}
        >
          <RefreshCw size={14} />
        </Button>
      </div>
    </div>
  );
}
