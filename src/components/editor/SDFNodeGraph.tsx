import { useRef, useState, useCallback, useEffect } from 'react';
import { useSDFStore } from '@/hooks/useSDFStore';
import { 
  SDFNodeType, 
  NODE_COLORS, 
  NODE_LABELS, 
  isPrimitiveNode, 
  isOperationNode,
  getInputCount 
} from '@/types/sdf-nodes';
import { 
  Circle, 
  Square, 
  Cylinder, 
  Triangle, 
  Donut, 
  Plus, 
  Minus, 
  X as XIcon,
  Blend,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NODE_WIDTH = 140;
const NODE_HEIGHT_BASE = 50;

interface NodeProps {
  node: ReturnType<typeof useSDFStore.getState>['graph']['nodes'][0];
  isSelected: boolean;
  connections: ReturnType<typeof useSDFStore.getState>['graph']['connections'];
  onStartConnection: (nodeId: string) => void;
  onCompleteConnection: (nodeId: string, inputIndex: number) => void;
}

function SDFNode({ node, isSelected, connections, onStartConnection, onCompleteConnection }: NodeProps) {
  const { updateNodePosition, selectNode, removeNode, updateNodeParams } = useSDFStore();
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });

  const inputCount = getInputCount(node.type);
  const hasOutput = node.type !== 'output';
  const nodeHeight = NODE_HEIGHT_BASE + (inputCount > 0 ? 20 : 0) + Object.keys(node.params).length * 24;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-socket') || (e.target as HTMLElement).closest('.node-param')) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, nodeX: node.position.x, nodeY: node.position.y };
    selectNode(node.id);
  };

  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      updateNodePosition(node.id, {
        x: dragStart.current.nodeX + dx,
        y: dragStart.current.nodeY + dy,
      });
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, node.id, updateNodePosition]);

  const getIcon = () => {
    if (node.type === 'primitive-sphere') return <Circle size={14} />;
    if (node.type === 'primitive-box') return <Square size={14} />;
    if (node.type === 'primitive-cylinder') return <Cylinder size={14} />;
    if (node.type === 'primitive-cone') return <Triangle size={14} />;
    if (node.type === 'primitive-torus') return <Donut size={14} />;
    if (node.type.includes('union')) return <Plus size={14} />;
    if (node.type.includes('subtract')) return <Minus size={14} />;
    if (node.type.includes('intersect')) return <XIcon size={14} />;
    if (node.type.includes('smooth')) return <Blend size={14} />;
    return <Square size={14} />;
  };

  const connectedInputs = connections
    .filter(c => c.toNode === node.id)
    .map(c => c.toInput);

  return (
    <div
      className={cn(
        'absolute rounded-lg border-2 shadow-lg cursor-move select-none',
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
        minHeight: nodeHeight,
        backgroundColor: 'hsl(var(--card))',
        borderColor: NODE_COLORS[node.type] || 'hsl(var(--border))',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div 
        className="px-2 py-1.5 rounded-t-md flex items-center gap-2 text-xs font-medium text-white"
        style={{ backgroundColor: NODE_COLORS[node.type] || 'hsl(var(--muted))' }}
      >
        {getIcon()}
        <span className="flex-1 truncate">{NODE_LABELS[node.type]}</span>
        {node.type !== 'output' && (
          <button 
            className="opacity-60 hover:opacity-100 node-param"
            onClick={() => removeNode(node.id)}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Inputs */}
      {inputCount > 0 && (
        <div className="px-2 py-1 border-b border-border/50">
          {Array.from({ length: inputCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <div
                className={cn(
                  'node-socket w-3 h-3 rounded-full border-2 cursor-pointer transition-colors',
                  connectedInputs.includes(i) 
                    ? 'bg-primary border-primary' 
                    : 'bg-background border-muted-foreground hover:border-primary'
                )}
                onClick={() => onCompleteConnection(node.id, i)}
              />
              <span className="text-[10px] text-muted-foreground">
                Input {inputCount > 1 ? (i === 0 ? 'A' : 'B') : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Parameters */}
      {Object.entries(node.params).length > 0 && (
        <div className="px-2 py-1.5 space-y-1">
          {Object.entries(node.params).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1 node-param">
              <span className="text-[10px] text-muted-foreground capitalize w-12 truncate">{key}</span>
              <input
                type="number"
                value={value}
                step={0.1}
                className="flex-1 bg-background/50 border border-border rounded px-1 py-0.5 text-[10px] w-16"
                onChange={(e) => updateNodeParams(node.id, { [key]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>
      )}

      {/* Output socket */}
      {hasOutput && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
          <div
            className="node-socket w-3.5 h-3.5 rounded-full bg-primary border-2 border-primary-foreground cursor-pointer hover:scale-125 transition-transform"
            onClick={() => onStartConnection(node.id)}
          />
        </div>
      )}
    </div>
  );
}

function ConnectionLines() {
  const { graph, connectingFrom } = useSDFStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!connectingFrom) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('sdf-node-canvas');
      if (container) {
        const rect = container.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [connectingFrom]);

  const getNodeCenter = (nodeId: string, isOutput: boolean) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: isOutput ? node.position.x + NODE_WIDTH : node.position.x,
      y: node.position.y + NODE_HEIGHT_BASE / 2 + 10,
    };
  };

  const getInputPosition = (nodeId: string, inputIndex: number) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const baseY = node.position.y + 35 + inputIndex * 18;
    return { x: node.position.x, y: baseY };
  };

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      
      {graph.connections.map((conn) => {
        const from = getNodeCenter(conn.fromNode, true);
        const to = getInputPosition(conn.toNode, conn.toInput);
        const midX = (from.x + to.x) / 2;
        
        return (
          <path
            key={conn.id}
            d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
            fill="none"
            stroke="url(#connection-gradient)"
            strokeWidth="2"
          />
        );
      })}

      {connectingFrom && (
        <path
          d={`M ${getNodeCenter(connectingFrom, true).x} ${getNodeCenter(connectingFrom, true).y} 
              C ${mousePos.x} ${getNodeCenter(connectingFrom, true).y}, 
                ${getNodeCenter(connectingFrom, true).x} ${mousePos.y}, 
                ${mousePos.x} ${mousePos.y}`}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      )}
    </svg>
  );
}

interface NodePaletteProps {
  onAddNode: (type: SDFNodeType) => void;
}

function NodePalette({ onAddNode }: NodePaletteProps) {
  const primitives: SDFNodeType[] = ['primitive-sphere', 'primitive-box', 'primitive-cylinder', 'primitive-cone', 'primitive-torus'];
  const operations: SDFNodeType[] = ['op-union', 'op-subtract', 'op-intersect', 'op-smooth-union', 'op-smooth-subtract', 'op-smooth-intersect'];

  return (
    <div className="absolute left-3 top-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 space-y-2 z-10">
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Primitives</div>
        <div className="flex flex-wrap gap-1">
          {primitives.map((type) => (
            <button
              key={type}
              className="px-2 py-1 text-[10px] rounded border border-border hover:bg-accent transition-colors"
              style={{ borderColor: NODE_COLORS[type] }}
              onClick={() => onAddNode(type)}
            >
              {NODE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Operations</div>
        <div className="flex flex-wrap gap-1">
          {operations.map((type) => (
            <button
              key={type}
              className="px-2 py-1 text-[10px] rounded border border-border hover:bg-accent transition-colors"
              style={{ borderColor: NODE_COLORS[type] }}
              onClick={() => onAddNode(type)}
            >
              {NODE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SDFNodeGraph() {
  const { graph, selectedNodeId, connectingFrom, startConnection, completeConnection, cancelConnection, addNode, clearGraph, loadPreset } = useSDFStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleAddNode = useCallback((type: SDFNodeType) => {
    addNode(type, { x: 150 + Math.random() * 100, y: 100 + Math.random() * 200 });
  }, [addNode]);

  const handleCanvasClick = () => {
    if (connectingFrom) cancelConnection();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="text-sm font-semibold">SDF Node Graph</div>
        <div className="flex items-center gap-1">
          <button 
            className="px-2 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded"
            onClick={() => loadPreset('simple')}
          >
            Simple
          </button>
          <button 
            className="px-2 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded"
            onClick={() => loadPreset('blend')}
          >
            Blend
          </button>
          <button 
            className="px-2 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded"
            onClick={() => loadPreset('complex')}
          >
            Complex
          </button>
          <button 
            className="px-2 py-1 text-[10px] bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded"
            onClick={clearGraph}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        id="sdf-node-canvas"
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{ 
          backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        onClick={handleCanvasClick}
      >
        <NodePalette onAddNode={handleAddNode} />
        
        <ConnectionLines />
        
        {graph.nodes.map((node) => (
          <SDFNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            connections={graph.connections}
            onStartConnection={startConnection}
            onCompleteConnection={completeConnection}
          />
        ))}

        {/* Help text */}
        <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded">
          Click output socket → input socket to connect • Drag nodes to arrange
        </div>
      </div>
    </div>
  );
}
