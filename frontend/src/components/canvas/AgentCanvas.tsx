import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ControlButton,
  ConnectionMode,
  type Connection,
  type Node,
  type Edge,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNode } from './nodes/AgentNode';
import { PulseEdge } from './edges/PulseEdge';
import { useWorkspaceStore, type AgentData } from '../../store/useWorkspaceStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useMultiplayerWebSocket } from '../../hooks/useMultiplayerWebSocket';
import { LayoutGrid, Sparkles, X, Code2, Bot, Plus } from 'lucide-react';

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
        x: 100 + depth * 460,
        y: 100 + indexInLayer * 300,
      },
    };
  });
}

export function AgentCanvas() {
  const {
    workspaceId,
    currentUserId,
    currentUserName,
    userRole,
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    addEdgeToWorkspace,
    removeEdgeFromWorkspace,
    cursors,
    handoffPreview,
    setHandoffPreview,
    openCreateAgentModal,
  } = useWorkspaceStore();

  const { theme } = useThemeStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentData>>(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(storeEdges);

  // Synchronize state when store updates from multiplayer events
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const baseWsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
  const websocketUrl = `${baseWsUrl}?user_id=${encodeURIComponent(currentUserId)}&user_name=${encodeURIComponent(currentUserName)}&workspace_id=${encodeURIComponent(workspaceId)}&role=${userRole}`;
  const { sendCursor } = useMultiplayerWebSocket(websocketUrl);

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (userRole === 'read') return;
      onEdgesChange(changes);
      changes.forEach((change) => {
        if (change.type === 'remove') {
          removeEdgeFromWorkspace(change.id);
          const targetEdge = storeEdges.find((edgeItem) => edgeItem.id === change.id);
          if (targetEdge) {
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            fetch(`${backendUrl}/api/v1/agents/edges`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workspace_id: workspaceId,
                source_agent_id: targetEdge.source,
                target_agent_id: targetEdge.target,
              }),
            }).catch(() => {});
          }
        }
      });
    },
    [onEdgesChange, removeEdgeFromWorkspace, storeEdges, userRole, workspaceId]
  );

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return; // Prevent self-connection

      const targetNode = storeNodes.find((nodeItem) => nodeItem.id === params.target);
      const targetName = targetNode?.data?.name || 'peer';
      const targetGoal = targetNode?.data?.goal || '';
      const sanitizedName = targetName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const synthesizedToolName = `delegate_task_to_${sanitizedName}`;

      // Check if an edge already exists between these two agents in this direction
      const existingEdgeIndex = storeEdges.findIndex(
        (edgeItem) => edgeItem.source === params.source && edgeItem.target === params.target
      );

      if (existingEdgeIndex !== -1) {
        const existingEdge = storeEdges[existingEdgeIndex];
        // If connecting exact same handles, it is an exact duplicate -> safe no-op
        if (
          existingEdge.sourceHandle === params.sourceHandle &&
          existingEdge.targetHandle === params.targetHandle
        ) {
          return;
        }

        // Rewire the existing connection to the newly chosen handles!
        const rewiredEdge: Edge = {
          ...existingEdge,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
          data: {
            ...existingEdge.data,
            toolName: synthesizedToolName,
          },
        };

        const updatedEdges = storeEdges.map((edgeItem, index) =>
          index === existingEdgeIndex ? rewiredEdge : edgeItem
        );
        setEdges(updatedEdges);
        useWorkspaceStore.setState({ edges: updatedEdges });

        // Update backend with the connection
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
              target_goal: targetGoal,
            }),
          });
        } catch {
          // Fall back gracefully in offline or standalone demo mode
        }
        return;
      }

      const edgeId = `edge-${params.source}-${params.target}-${Date.now()}`;
      const newEdge: Edge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
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
            target_goal: targetGoal,
          }),
        });
      } catch {
        // Fall back gracefully in offline or standalone demo mode
      }
    },
    [storeNodes, storeEdges, setEdges, addEdgeToWorkspace, workspaceId]
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      // Disallow connecting to self
      return connection.source !== connection.target;
    },
    []
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
    <div className="relative w-full h-full bg-[#f8f9fa] dark:bg-[#07080b] overflow-hidden" onMouseMove={handleMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={userRole !== 'read' ? onNodesChange : undefined}
        onEdgesChange={handleEdgesChange}
        onConnect={userRole !== 'read' ? onConnect : undefined}
        isValidConnection={isValidConnection}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={32}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
        nodesDraggable={userRole !== 'read'}
        nodesConnectable={userRole !== 'read'}
        elementsSelectable={true}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.35, includeHiddenNodes: false }}
        defaultViewport={{ x: 80, y: 80, zoom: 0.85 }}
        className="bg-[#f8f9fa] dark:bg-[#07080b]"
      >
        <Background color={theme === 'dark' ? '#22262e' : '#dadce0'} gap={24} size={1} />
        <Controls className="!bg-white/95 dark:!bg-[#121318]/95 !border-zinc-200 dark:!border-zinc-800 !text-zinc-700 dark:!text-zinc-200 fill-zinc-700 dark:fill-zinc-200 shadow-xl backdrop-blur-md rounded-lg overflow-hidden">
          <ControlButton onClick={handleTidyLayout} title="Auto-Organize Switchboard">
            <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300" />
          </ControlButton>
        </Controls>
        <MiniMap
          nodeColor={theme === 'dark' ? '#2c313a' : '#cbd5e1'}
          maskColor={theme === 'dark' ? 'rgba(7, 8, 11, 0.85)' : 'rgba(240, 242, 245, 0.8)'}
          className="!bg-white/95 dark:!bg-[#0c0d10]/90 !border-zinc-250 dark:!border-zinc-800 rounded-lg overflow-hidden shadow-xl backdrop-blur-md"
        />
      </ReactFlow>

      {/* Empty Canvas Call to Action */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center p-8 max-w-sm rounded-xl bg-white/95 dark:bg-[#121318]/95 border border-dashed border-zinc-300 dark:border-zinc-750 pointer-events-auto shadow-2xl backdrop-blur-md font-sans">
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400 mx-auto mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
              Command Bus Empty
            </div>
            <h3 className="font-display font-bold text-sm text-[#202124] dark:text-white mb-1.5">Zero Agents Registered</h3>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400 mb-4 leading-relaxed">
              This switchboard workspace has no active agent nodes. Provision your first Tier 3 cloud agent to synthesize delegated tool pipelines.
            </p>
            <button
              onClick={openCreateAgentModal}
              disabled={userRole === 'read'}
              className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-black text-white font-mono font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Agent Node</span>
            </button>
          </div>
        </div>
      )}

      {/* Teammate Cursors Overlay */}
      {Object.values(cursors)
        .filter((cursor) => cursor.userId !== currentUserId)
        .map((cursor) => (
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
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 text-zinc-900 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-indigo-950/80 border border-blue-200 dark:border-indigo-800/60 text-blue-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-white tracking-tight">Synthesized MCP Delegation Tool</h3>
                  <p className="text-xs font-mono text-blue-600 dark:text-indigo-400">{handoffPreview.toolName}</p>
                </div>
              </div>
              <button
                onClick={() => setHandoffPreview(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                This dynamic tool was automatically compiled and mounted to the source agent's Model Context Protocol (MCP) tool schema when you wired the edge on the canvas.
              </p>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 pb-1 border-b border-zinc-200 dark:border-zinc-800/80">
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5" />
                    TOOL DEFINITION CONTRACT
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                </div>
                <pre className="overflow-x-auto text-blue-700 dark:text-indigo-300">{`{
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-md shadow-blue-600/20"
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
