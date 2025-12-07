import { useCursor3DStore, MagneticSettings } from '@/hooks/useCursor3DStore';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}

function SettingSlider({ label, description, value, onChange, min, max, step }: SettingSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-[10px] font-mono text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="h-4"
      />
      <p className="text-[9px] text-muted-foreground">{description}</p>
    </div>
  );
}

export function MagneticSettingsPanel() {
  const { magneticSettings, updateMagneticSetting, resetMagneticSettings } = useCursor3DStore();

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Magnetic Cursor Settings
          </h4>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={resetMagneticSettings}>
            <RotateCcw size={10} className="mr-1" />
            Reset
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 p-2 bg-background/50 rounded-lg">
            <h5 className="text-[10px] font-medium uppercase text-primary">Position Smoothing</h5>
            
            <SettingSlider
              label="Fast Movement Lerp"
              description="Position interpolation when moving quickly (lower = more lag)"
              value={magneticSettings.positionLerpMin}
              onChange={(v) => updateMagneticSetting('positionLerpMin', v)}
              min={0.05}
              max={0.8}
              step={0.01}
            />
            
            <SettingSlider
              label="Slow Movement Lerp"
              description="Position interpolation when slow/stationary (higher = snappier)"
              value={magneticSettings.positionLerpMax}
              onChange={(v) => updateMagneticSetting('positionLerpMax', v)}
              min={0.1}
              max={1}
              step={0.01}
            />
            
            <SettingSlider
              label="Velocity Threshold"
              description="Movement speed that triggers fast vs slow behavior"
              value={magneticSettings.velocityThreshold}
              onChange={(v) => updateMagneticSetting('velocityThreshold', v)}
              min={0.005}
              max={0.1}
              step={0.001}
            />
          </div>

          <div className="space-y-3 p-2 bg-background/50 rounded-lg">
            <h5 className="text-[10px] font-medium uppercase text-primary">Normal/Orientation</h5>
            
            <SettingSlider
              label="Fast Normal Lerp"
              description="How quickly orientation updates during fast movement"
              value={magneticSettings.normalLerpMin}
              onChange={(v) => updateMagneticSetting('normalLerpMin', v)}
              min={0.05}
              max={0.8}
              step={0.01}
            />
            
            <SettingSlider
              label="Slow Normal Lerp"
              description="Orientation update speed when slow/stationary"
              value={magneticSettings.normalLerpMax}
              onChange={(v) => updateMagneticSetting('normalLerpMax', v)}
              min={0.1}
              max={1}
              step={0.01}
            />
            
            <SettingSlider
              label="Normal Commit Delay"
              description="Seconds before fully committing to new surface orientation"
              value={magneticSettings.normalCommitDelay}
              onChange={(v) => updateMagneticSetting('normalCommitDelay', v)}
              min={0}
              max={0.5}
              step={0.01}
            />
            
            <SettingSlider
              label="Max Normal Change Rate"
              description="Maximum degrees the normal can change per frame (edge handling)"
              value={magneticSettings.maxNormalChangeRate}
              onChange={(v) => updateMagneticSetting('maxNormalChangeRate', v)}
              min={5}
              max={180}
              step={1}
            />
          </div>

          <div className="space-y-3 p-2 bg-background/50 rounded-lg">
            <h5 className="text-[10px] font-medium uppercase text-primary">Surface Detection</h5>
            
            <SettingSlider
              label="Surface Hold Time"
              description="How long to maintain last surface after losing contact"
              value={magneticSettings.surfaceHoldTime}
              onChange={(v) => updateMagneticSetting('surfaceHoldTime', v)}
              min={0}
              max={0.5}
              step={0.01}
            />
            
            <SettingSlider
              label="Surface Confidence Time"
              description="Minimum time on surface before confirming contact"
              value={magneticSettings.minSurfaceConfidence}
              onChange={(v) => updateMagneticSetting('minSurfaceConfidence', v)}
              min={0}
              max={0.2}
              step={0.005}
            />
          </div>

          <div className="space-y-3 p-2 bg-background/50 rounded-lg">
            <h5 className="text-[10px] font-medium uppercase text-primary">Advanced</h5>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Prediction</Label>
                <p className="text-[9px] text-muted-foreground">Enable trajectory prediction</p>
              </div>
              <Switch
                checked={magneticSettings.predictionEnabled}
                onCheckedChange={(v) => updateMagneticSetting('predictionEnabled', v)}
              />
            </div>
            
            {magneticSettings.predictionEnabled && (
              <SettingSlider
                label="Prediction Strength"
                description="How much to favor predicted trajectory direction"
                value={magneticSettings.predictionStrength}
                onChange={(v) => updateMagneticSetting('predictionStrength', v)}
                min={0}
                max={1}
                step={0.05}
              />
            )}
            
            <SettingSlider
              label="Edge Softening"
              description="How much to soften transitions over mesh edges"
              value={magneticSettings.edgeSoftening}
              onChange={(v) => updateMagneticSetting('edgeSoftening', v)}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
