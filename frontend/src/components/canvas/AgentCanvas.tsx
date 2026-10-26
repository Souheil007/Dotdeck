import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNode } from './nodes/AgentNode';
import { PulseEdge } from './edges/PulseEdge';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useMultiplayerWebSocket } from '../../hooks/useMultiplayerWebSocket';

const nodeTypes = {
  agentNode: AgentNode,
};

const edgeTypes = {
  pulseEdge: PulseEdge,
};

export function AgentCanvas() {
  const { nodes: initialNodes, edges: initialEdges, cursors } = useWorkspaceStore();
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const websocketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
  const { sendCursor } = useMultiplayerWebSocket(websocketUrl);

  const onConnect = useCallback(
    (params: Connection) => setEdges((currentEdges) => addEdge({ ...params, type: 'pulseEdge' }, currentEdges)),
    [setEdges]
  );

  const handleMouseMove = useCallback(
    (mouseEvent: React.MouseEvent<HTMLDivElement>) => {
      sendCursor(mouseEvent.clientX, mouseEvent.clientY);
    },
    [sendCursor]
  );

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden" onMouseMove={handleMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-zinc-950"
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls className="!bg-zinc-900 !border-zinc-800 !text-zinc-200 fill-zinc-200" />
        <MiniMap
          nodeColor="#3f3f46"
          maskColor="rgba(9, 9, 11, 0.7)"
          className="!bg-zinc-900/80 !border-zinc-800 rounded-lg overflow-hidden"
        />
      </ReactFlow>

      {/* Teammate Cursors Overlay */}
      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.userId}
          style={{
            position: 'absolute',
            left: cursor.positionX,
            top: cursor.positionY,
            pointerEvents: 'none',
            transform: 'translate(-2px, -2px)',
          }}
          className="z-50 flex items-center gap-1 transition-all duration-75"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill={cursor.color}>
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>
          <span
            style={{ backgroundColor: cursor.color }}
            className="px-1.5 py-0.5 rounded text-[10px] text-white font-medium shadow-sm"
          >
            {cursor.userName}
          </span>
        </div>
      ))}
    </div>
  );
}
