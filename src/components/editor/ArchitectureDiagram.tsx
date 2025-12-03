import { useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArchitectureDiagramProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchitectureDiagram({ isOpen, onClose }: ArchitectureDiagramProps) {
  const [zoom, setZoom] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">Universal CSG-SDF Modeling System Architecture</h2>
          <p className="text-xs text-muted-foreground">Quaternion Integration & Real-Time Rendering Pipeline (2025)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
            <ZoomOut size={16} />
          </Button>
          <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
            <ZoomIn size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
            <Maximize2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-auto p-8">
        <div 
          className="min-w-max transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <svg viewBox="0 0 1400 900" className="w-[1400px] h-[900px]">
            <defs>
              {/* Gradients */}
              <linearGradient id="gradUser" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(175, 80%, 50%)" />
                <stop offset="100%" stopColor="hsl(190, 80%, 45%)" />
              </linearGradient>
              <linearGradient id="gradCSG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(280, 70%, 50%)" />
                <stop offset="100%" stopColor="hsl(260, 70%, 45%)" />
              </linearGradient>
              <linearGradient id="gradSDF" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(340, 70%, 55%)" />
                <stop offset="100%" stopColor="hsl(320, 70%, 45%)" />
              </linearGradient>
              <linearGradient id="gradQuat" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(45, 90%, 55%)" />
                <stop offset="100%" stopColor="hsl(30, 90%, 50%)" />
              </linearGradient>
              <linearGradient id="gradCFD" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(200, 80%, 55%)" />
                <stop offset="100%" stopColor="hsl(220, 80%, 45%)" />
              </linearGradient>
              <linearGradient id="gradRender" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(120, 70%, 45%)" />
                <stop offset="100%" stopColor="hsl(140, 70%, 40%)" />
              </linearGradient>
              <linearGradient id="gradMath" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(220, 15%, 18%)" />
                <stop offset="100%" stopColor="hsl(220, 15%, 12%)" />
              </linearGradient>
              
              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              
              {/* Arrow markers */}
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(175, 50%, 40%)" />
              </marker>
              <marker id="arrowheadDashed" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(215, 20%, 40%)" />
              </marker>
            </defs>

            {/* Background */}
            <rect width="100%" height="100%" fill="hsl(220, 20%, 10%)" />
            
            {/* Math Core Background */}
            <rect x="850" y="120" width="520" height="660" rx="12" fill="url(#gradMath)" stroke="hsl(220, 15%, 30%)" strokeWidth="2" opacity="0.8" />
            <text x="870" y="155" fill="hsl(210, 20%, 60%)" fontSize="14" fontWeight="600">MATHEMATICAL FOUNDATIONS (2025)</text>

            {/* Main Flow Arrows */}
            <path d="M200 180 L200 260" stroke="hsl(175, 50%, 40%)" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <path d="M200 360 L200 440" stroke="hsl(175, 50%, 40%)" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <path d="M200 540 L200 620" stroke="hsl(175, 50%, 40%)" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <path d="M200 720 L200 780" stroke="hsl(175, 50%, 40%)" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <path d="M350 850 L550 850 L700 180" stroke="hsl(175, 50%, 40%)" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="8,4" />

            {/* Math connections (dashed) */}
            <path d="M350 310 L860 210" stroke="hsl(215, 20%, 35%)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowheadDashed)" />
            <path d="M350 490 L860 340" stroke="hsl(215, 20%, 35%)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowheadDashed)" />
            <path d="M350 670 L860 490" stroke="hsl(215, 20%, 35%)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowheadDashed)" />
            <path d="M350 850 L860 640" stroke="hsl(215, 20%, 35%)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowheadDashed)" />

            {/* User Input Node */}
            <g filter="url(#glow)">
              <rect x="50" y="100" width="300" height="80" rx="10" fill="url(#gradUser)" />
            </g>
            <text x="200" y="135" fill="hsl(220, 20%, 10%)" fontSize="16" fontWeight="700" textAnchor="middle">USER INPUT</text>
            <text x="200" y="158" fill="hsl(220, 20%, 20%)" fontSize="11" textAnchor="middle">GUI: Primitives, Booleans, Quat Axis/Angle</text>

            {/* CSG Tree Node */}
            <g filter="url(#glow)">
              <rect x="50" y="270" width="300" height="80" rx="10" fill="url(#gradCSG)" />
            </g>
            <text x="200" y="305" fill="white" fontSize="16" fontWeight="700" textAnchor="middle">CSG TREE</text>
            <text x="200" y="328" fill="hsl(280, 50%, 90%)" fontSize="11" textAnchor="middle">three-bvh-csg Eval (Smooth Mode)</text>

            {/* SDF Hybrid Node */}
            <g filter="url(#glow)">
              <rect x="50" y="450" width="300" height="80" rx="10" fill="url(#gradSDF)" />
            </g>
            <text x="200" y="485" fill="white" fontSize="16" fontWeight="700" textAnchor="middle">SDF HYBRID</text>
            <text x="200" y="508" fill="hsl(340, 50%, 90%)" fontSize="11" textAnchor="middle">Voxelize + Distance Transform (Maurer)</text>

            {/* Quaternion Chain Node */}
            <g filter="url(#glow)">
              <rect x="50" y="630" width="300" height="80" rx="10" fill="url(#gradQuat)" />
            </g>
            <text x="200" y="665" fill="hsl(220, 20%, 15%)" fontSize="16" fontWeight="700" textAnchor="middle">QUATERNION CHAIN</text>
            <text x="200" y="688" fill="hsl(45, 50%, 25%)" fontSize="11" textAnchor="middle">fromAxisAngle + SLERP for Animation</text>

            {/* CFD Layer Node */}
            <g filter="url(#glow)">
              <rect x="50" y="790" width="300" height="80" rx="10" fill="url(#gradCFD)" />
            </g>
            <text x="200" y="825" fill="white" fontSize="16" fontWeight="700" textAnchor="middle">CFD DYNAMICS</text>
            <text x="200" y="848" fill="hsl(200, 50%, 90%)" fontSize="11" textAnchor="middle">Particles Advect + SDF Project (∇d Normals)</text>

            {/* Render Node */}
            <g filter="url(#glow)">
              <rect x="450" y="100" width="350" height="80" rx="10" fill="url(#gradRender)" />
            </g>
            <text x="625" y="135" fill="white" fontSize="16" fontWeight="700" textAnchor="middle">REAL-TIME RENDER</text>
            <text x="625" y="158" fill="hsl(120, 50%, 90%)" fontSize="11" textAnchor="middle">Raymarch SDF (64 Steps) + Instanced Particles</text>

            {/* Math formulas */}
            <g className="font-mono">
              {/* CSG Boolean Math */}
              <rect x="870" y="180" width="480" height="100" rx="8" fill="hsl(220, 18%, 14%)" stroke="hsl(280, 50%, 40%)" strokeWidth="1.5" />
              <text x="890" y="205" fill="hsl(280, 70%, 65%)" fontSize="12" fontWeight="600">CSG BOOLEAN OPERATIONS</text>
              <text x="890" y="230" fill="hsl(210, 20%, 75%)" fontSize="11">union(d₁,d₂) = min(d₁, d₂)</text>
              <text x="890" y="250" fill="hsl(210, 20%, 75%)" fontSize="11">subtract(d₁,d₂) = max(d₁, -d₂)</text>
              <text x="890" y="270" fill="hsl(210, 20%, 75%)" fontSize="11">intersect(d₁,d₂) = max(d₁, d₂)</text>

              {/* SDF Smooth Min */}
              <rect x="870" y="300" width="480" height="120" rx="8" fill="hsl(220, 18%, 14%)" stroke="hsl(340, 50%, 45%)" strokeWidth="1.5" />
              <text x="890" y="325" fill="hsl(340, 70%, 65%)" fontSize="12" fontWeight="600">SDF SMOOTH MIN (QUILEZ)</text>
              <text x="890" y="350" fill="hsl(210, 20%, 75%)" fontSize="11">h = max(k - |a-b|, 0) / k</text>
              <text x="890" y="375" fill="hsl(210, 20%, 75%)" fontSize="11">smin(a,b,k) = min(a,b) - h² · k/4</text>
              <text x="890" y="400" fill="hsl(210, 20%, 55%)" fontSize="10">C¹ continuity at boundaries (Lipschitz preserved)</text>

              {/* Quaternion */}
              <rect x="870" y="440" width="480" height="140" rx="8" fill="hsl(220, 18%, 14%)" stroke="hsl(45, 70%, 50%)" strokeWidth="1.5" />
              <text x="890" y="465" fill="hsl(45, 90%, 65%)" fontSize="12" fontWeight="600">QUATERNION ROTATION (SHOEMAKE '85)</text>
              <text x="890" y="490" fill="hsl(210, 20%, 75%)" fontSize="11">q = [cos(θ/2), sin(θ/2)·u_x, sin(θ/2)·u_y, sin(θ/2)·u_z]</text>
              <text x="890" y="515" fill="hsl(210, 20%, 75%)" fontSize="11">v' = q · v · q⁻¹  (conjugate rotation)</text>
              <text x="890" y="540" fill="hsl(210, 20%, 75%)" fontSize="11">SLERP: Ω = acos(q₁·q₂), shortest great-circle path</text>
              <text x="890" y="565" fill="hsl(210, 20%, 55%)" fontSize="10">Rodrigues: v' = v·cosθ + (u×v)sinθ + u(u·v)(1-cosθ)</text>

              {/* CFD Projection */}
              <rect x="870" y="600" width="480" height="100" rx="8" fill="hsl(220, 18%, 14%)" stroke="hsl(200, 60%, 50%)" strokeWidth="1.5" />
              <text x="890" y="625" fill="hsl(200, 80%, 65%)" fontSize="12" fontWeight="600">CFD BOUNDARY PROJECTION</text>
              <text x="890" y="650" fill="hsl(210, 20%, 75%)" fontSize="11">n = ∇d / |∇d|  (surface normal from SDF gradient)</text>
              <text x="890" y="675" fill="hsl(210, 20%, 75%)" fontSize="11">v' = v - 2(v·n)n  (reflection)</text>
              <text x="890" y="695" fill="hsl(210, 20%, 55%)" fontSize="10">p' = p - d·n  (project out when d &lt; 0)</text>
            </g>

            {/* Legend */}
            <rect x="450" y="800" width="350" height="70" rx="8" fill="hsl(220, 18%, 12%)" stroke="hsl(220, 15%, 25%)" />
            <text x="470" y="822" fill="hsl(210, 20%, 60%)" fontSize="11" fontWeight="600">PIPELINE LEGEND</text>
            <line x1="470" y1="840" x2="510" y2="840" stroke="hsl(175, 50%, 40%)" strokeWidth="3" />
            <text x="520" y="844" fill="hsl(210, 20%, 70%)" fontSize="10">Data Flow</text>
            <line x1="600" y1="840" x2="640" y2="840" stroke="hsl(215, 20%, 35%)" strokeWidth="1.5" strokeDasharray="5,3" />
            <text x="650" y="844" fill="hsl(210, 20%, 70%)" fontSize="10">Math Reference</text>
            <line x1="470" y1="858" x2="510" y2="858" stroke="hsl(175, 50%, 40%)" strokeWidth="2" strokeDasharray="8,4" />
            <text x="520" y="862" fill="hsl(210, 20%, 70%)" fontSize="10">Feedback Loop</text>

            {/* Version info */}
            <text x="1350" y="880" fill="hsl(210, 20%, 40%)" fontSize="9" textAnchor="end">UIME Architecture v2025</text>
            <text x="1350" y="893" fill="hsl(210, 20%, 35%)" fontSize="8" textAnchor="end">WebGPU + Three.js r172 + three-bvh-csg v0.0.23</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
