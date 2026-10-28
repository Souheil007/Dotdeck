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
  const setHandoffPreview = useWorkspaceStore((state) => state.setHandoffPreview);
  const removeEdgeFromWorkspace = useWorkspaceStore((state) => state.removeEdgeFromWorkspace);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const userRole = useWorkspaceStore((state) => state.userRole);

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
          stroke: isActive ? '#36b37e' : '#2684ff',
          strokeWidth: isActive ? 2.5 : 2,
          strokeDasharray: '6 4',
          animation: 'dash 1s linear infinite',
          filter: isActive
            ? 'drop-shadow(0 0 6px rgba(54,179,126,0.5))'
            : 'drop-shadow(0 0 4px rgba(38,132,255,0.35))',
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
            className="group px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-[#111317]/95 border border-[#dfe1e6] dark:border-[#22262e] hover:border-[#0052cc] dark:hover:border-[#2684ff] text-[11px] font-mono text-[#0052cc] dark:text-[#2684ff] hover:text-[#0747a6] dark:hover:text-white transition-all shadow-tactical-sm flex items-center gap-1.5 backdrop-blur-md cursor-pointer select-none"
            title="Inspect synthesized MCP cross-agent tool"
          >
            <Sparkles className="w-3 h-3 text-[#0052cc] dark:text-[#2684ff] transition-colors animate-pulse" />
            <span className="font-semibold">{toolName}</span>
            <ArrowRight className="w-3 h-3 text-[#5e6c84] dark:text-[#8c96a5] group-hover:translate-x-0.5 transition-transform" />
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
              className="p-1 rounded-full bg-white/95 dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#de350b] dark:hover:text-[#ff5630] hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs transition-all"
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
