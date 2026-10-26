import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { ArrowRight, Sparkles, Trash2 } from 'lucide-react';

export const PulseEdge = memo(({
  id,
  source,
  target,
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
  const { setHandoffPreview, removeEdgeFromWorkspace, workspaceId, userRole } = useWorkspaceStore();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const toolName = (data?.toolName as string) || 'delegate_task';
  const isActive = Boolean(data?.active);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isActive ? '#10b981' : '#6366f1',
          strokeWidth: isActive ? 2.5 : 2,
          strokeDasharray: '6 4',
          animation: 'dash 1.2s linear infinite',
          filter: isActive ? 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' : 'drop-shadow(0 0 4px rgba(99,102,241,0.3))',
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
          className="nodrag nopan flex items-center gap-1 group/pill"
        >
          {/* Main Inspection Button */}
          <button
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              setHandoffPreview({
                edgeId: id,
                toolName,
                payload: data?.payload,
              });
            }}
            className="group px-3 py-1 rounded-full bg-white/95 dark:bg-zinc-950/90 border border-indigo-200 dark:border-indigo-500/40 hover:border-indigo-500 dark:hover:border-indigo-400 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50/50 dark:hover:bg-zinc-900 transition-all shadow-md flex items-center gap-1.5 backdrop-blur-md cursor-pointer select-none ring-1 ring-black/5 dark:ring-white/5"
            title="Inspect synthesized MCP cross-agent tool"
          >
            <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors animate-pulse" />
            <span className="font-semibold">{toolName}</span>
            <ArrowRight className="w-3 h-3 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Delete Link Button */}
          {userRole !== 'read' && (
            <button
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                removeEdgeFromWorkspace(id);
                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                fetch(`${backendUrl}/api/v1/agents/edges`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    workspace_id: workspaceId,
                    source_agent_id: source,
                    target_agent_id: target,
                  }),
                }).catch(() => {});
              }}
              className="p-1 rounded-full bg-white/95 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800 shadow-sm transition-all"
              title="Delete connection link"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

PulseEdge.displayName = 'PulseEdge';
