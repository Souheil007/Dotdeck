import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

export const PulseEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const toolName = (data?.toolName as string) || 'handoff';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#6366f1',
          strokeWidth: 2,
          strokeDasharray: '6 4',
          animation: 'dash 1.5s linear infinite',
          ...style,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={() => {
              // Clickable handoff pill: inspect payload passed along edge
            }}
            className="px-2 py-0.5 rounded-full bg-zinc-900/90 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 hover:bg-zinc-800 transition-colors shadow-sm flex items-center gap-1 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>{toolName}</span>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

PulseEdge.displayName = 'PulseEdge';
