import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ControlButton,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNode } from './nodes/AgentNode';
import { PulseEdge } from './edges/PulseEdge';
import { useWorkspaceStore, type AgentData } from '../../store/useWorkspaceStore';
import { useMultiplayerWebSocket } from '../../hooks/useMultiplayerWebSocket';
import { LayoutGrid, Sparkles, X, Code2 } from 'lucide-react';

const nodeTypes = {
  agentNode: AgentNode,
};

const edgeTypes = {
  pulseEdge: PulseEdge,
};

// Topological auto-layout engine distributing nodes into clean directed ranks
function calculateAutoLayout(nodes: Node<AgentData>[], edges: { source: string; target: string }[]): Node<AgentData>[] {
  const inDegreeMap = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();

  nodes.forEach((nodeItem) => {
    inDegreeMap.set(nodeItem.id, 0);
    adjacencyList.set(nodeItem.id, []);
  });

  edges.forEach((edgeItem) => {
    if (inDegreeMap.has(edgeItem.target)) {
      inDegreeMap.set(edgeItem.target, (inDegreeMap.get(edgeItem.target) || 0) + 1);
    }
    if (adjacencyList.has(edgeItem.source)) {
      adjacencyList.get(edgeItem.source)?.push(edgeItem.target);
    }
  });

  // Assign layers based on graph depth
  const depthMap = new Map<string, number>();
  const queue: { id: string; depth: number }[] = [];

  nodes.forEach((nodeItem) => {
    if ((inDegreeMap.get(nodeItem.id) || 0) === 0) {
      queue.push({ id: nodeItem.id, depth: 0 });
      depthMap.set(nodeItem.id, 0);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyList.get(current.id) || [];
    for (const neighborId of neighbors) {
      const nextDepth = current.depth + 1;
      if (!depthMap.has(neighborId) || nextDepth > (depthMap.get(neighborId) || 0)) {
        depthMap.set(neighborId, nextDepth);
        queue.push({ id: neighborId, depth: nextDepth });
      }
    }
  }

  // Count items per rank for vertical spacing
  const layerCountMap = new Map<number, number>();
  nodes.forEach((nodeItem) => {
    const depth = depthMap.get(nodeItem.id) || 0;
    layerCountMap.set(depth, 0);
  });

  return nodes.map((nodeItem) => {
    const depth = depthMap.get(nodeItem.id) || 0;
    const indexInLayer = layerCountMap.get(depth) || 0;
    layerCountMap.set(depth, indexInLayer + 1);

    return {
      ...nodeItem,
      position: {
        x: 80 + depth * 420,
        y: 80 + indexInLayer * 240,
      },
    };
  });
}

export function AgentCanvas() {
  const {
    workspaceId,
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    addEdgeToWorkspace,
    cursors,
    handoffPreview,
    setHandoffPreview,
  } = useWorkspaceStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentData>>(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(storeEdges);

  // Synchronize state when store updates from multiplayer events
  useMemo(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useMemo(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const websocketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
  const { sendCursor } = useMultiplayerWebSocket(websocketUrl);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;

      const targetNode = storeNodes.find((nodeItem) => nodeItem.id === params.target);
      const targetName = targetNode?.data?.name || 'peer';
      const sanitizedName = targetName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const synthesizedToolName = `delegate_task_to_${sanitizedName}`;

      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: 'pulseEdge',
        data: { toolName: synthesizedToolName },
      };

      // Optimistically update canvas and store
      setEdges((currentEdges) => addEdge(newEdge, currentEdges));
      addEdgeToWorkspace(newEdge);

      // Persist synthesized edge to backend
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      try {
        await fetch(`${backendUrl}/api/v1/agents/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            source_agent_id: params.source,
            target_agent_id: params.target,
            target_name: targetName,
          }),
        });
      } catch {
        // Fall back gracefully in offline or standalone demo mode
      }
    },
    [storeNodes, setEdges, addEdgeToWorkspace, workspaceId]
  );

  const handleTidyLayout = useCallback(() => {
    const organizedNodes = calculateAutoLayout(nodes, edges);
    setNodes(organizedNodes);
    setStoreNodes(organizedNodes);
  }, [nodes, edges, setNodes, setStoreNodes]);

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
        <Background color="#27272a" gap={22} size={1} />
        <Controls className="!bg-zinc-900/90 !border-zinc-800 !text-zinc-200 fill-zinc-200 shadow-xl backdrop-blur-md">
          <ControlButton onClick={handleTidyLayout} title="Tidy Canvas (Auto Layout)">
            <LayoutGrid className="w-4 h-4 text-indigo-400 hover:text-indigo-300" />
          </ControlButton>
        </Controls>
        <MiniMap
          nodeColor="#3f3f46"
          maskColor="rgba(9, 9, 11, 0.75)"
          className="!bg-zinc-900/80 !border-zinc-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md"
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
          className="z-50 flex items-center gap-1.5 transition-all duration-75"
        >
          <svg className="w-4 h-4 filter drop-shadow-md" viewBox="0 0 24 24" fill={cursor.color}>
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>
          <span
            style={{ backgroundColor: cursor.color }}
            className="px-2 py-0.5 rounded-md text-[10px] text-white font-semibold shadow-md whitespace-nowrap"
          >
            {cursor.userName}
          </span>
        </div>
      ))}

      {/* Cross-Agent Synthesized Tool Handoff Preview Modal */}
      {handoffPreview && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Synthesized MCP Delegation Tool</h3>
                  <p className="text-xs font-mono text-indigo-400">{handoffPreview.toolName}</p>
                </div>
              </div>
              <button
                onClick={() => setHandoffPreview(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-zinc-300 leading-relaxed">
                This dynamic tool was automatically compiled and mounted to the source agent's Model Context Protocol (MCP) tool schema when you wired the edge on the canvas.
              </p>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-2">
                <div className="flex items-center justify-between text-zinc-500 pb-1 border-b border-zinc-800/80">
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5" />
                    TOOL DEFINITION CONTRACT
                  </span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </div>
                <pre className="overflow-x-auto text-indigo-300">{`{
  "name": "${handoffPreview.toolName}",
  "description": "Delegates execution to connected peer with mandatory thought telemetry",
  "inputSchema": {
    "type": "object",
    "properties": {
      "instructions": { "type": "string" },
      "payload": { "type": "object" },
      "current_reasoning_trace": { "type": "string" }
    },
    "required": ["instructions"]
  }
}`}</pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setHandoffPreview(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-lg shadow-indigo-600/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
