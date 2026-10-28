import { useEffect, useRef, useCallback } from 'react';
import { useWorkspaceStore, type AgentStatus } from '../store/useWorkspaceStore';

export function useMultiplayerWebSocket(websocketUrl: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const backoffDelayRef = useRef<number>(500);
  const lastCursorSendRef = useRef<number>(0);
  const isDisposedRef = useRef<boolean>(false);

  const {
    updateNodeStatus,
    updateNodeThought,
    updateNodeOutput,
    addThoughtStep,
    addApproval,
    updateCursor,
    removeCursor,
    setQuestionLock,
    unlockQuestion,
  } = useWorkspaceStore();

  const connect = useCallback(() => {
    if (isDisposedRef.current) return;

    // Teardown any prior socket cleanly without triggering ghost reconnects
    if (socketRef.current) {
      const priorSocket = socketRef.current;
      priorSocket.onopen = null;
      priorSocket.onmessage = null;
      priorSocket.onerror = null;
      priorSocket.onclose = null;
      priorSocket.close();
      socketRef.current = null;
    }

    try {
      const activeSocket = new WebSocket(websocketUrl);
      socketRef.current = activeSocket;

      activeSocket.onopen = () => {
        backoffDelayRef.current = 500;
      };

      activeSocket.onmessage = (messageEvent) => {
        try {
          const { type, payload } = JSON.parse(messageEvent.data);
          switch (type) {
            case 'AGENT_STATE_CHANGED':
              updateNodeStatus(payload.agent_id, payload.status);
              break;

            case 'AGENT_CREATED': {
              const agent = payload.agent || payload;
              if (agent && agent.id) {
                const lowerName = (agent.name || '').toLowerCase();
                if (lowerName.includes('connector') || lowerName.includes('validator') || lowerName.includes('inspector') || lowerName.includes('probe')) {
                  break;
                }
                const store = useWorkspaceStore.getState();
                const currentNodes = store.nodes;
                if (!currentNodes.some((node) => node.id === agent.id)) {
                  store.addAgentNode({
                    id: agent.id,
                    name: agent.name || 'Grok Agent',
                    provider: agent.provider || 'grok_bot',
                    goal: agent.goal || 'Autonomous cloud agent connected via Fleet Hub.',
                    status: (agent.status as AgentStatus) || 'resting',
                    scheduleCron: agent.schedule_cron,
                  }, {
                    x: agent.position_x || (140 + (currentNodes.length % 3) * 440),
                    y: agent.position_y || (140 + Math.floor(currentNodes.length / 3) * 320),
                  });
                }
              }
              break;
            }

            case 'TASK_COMPLETED':
              if (payload.agent_id && (payload.summary || payload.deliverable)) {
                updateNodeOutput(payload.agent_id, payload.summary || 'Task completed', payload.deliverable);
                addThoughtStep(payload.agent_id, {
                  id: payload.id || `task-completed-${Date.now()}`,
                  agentId: payload.agent_id,
                  stepIndex: 0,
                  reasoningTrace: `Task completed: ${payload.summary}`,
                  nextPlannedStep: 'Standby for downstream handoffs or next turn',
                  toolCalled: 'complete_task',
                  deliverable: payload.deliverable,
                  toolPayload: { deliverable: payload.deliverable, summary: payload.summary },
                  timestamp: payload.timestamp || new Date().toISOString(),
                });
              }
              break;

            case 'THOUGHT_STEP_EMITTED':
              updateNodeThought(payload.agent_id, payload.reasoning_trace, payload.next_planned_step);
              addThoughtStep(payload.agent_id, {
                id: payload.id || `${payload.agent_id}-${payload.step_index || 0}-${payload.reasoning_trace}`,
                agentId: payload.agent_id,
                stepIndex: payload.step_index || 0,
                reasoningTrace: payload.reasoning_trace,
                nextPlannedStep: payload.next_planned_step,
                timestamp: payload.timestamp || new Date().toISOString(),
              });
              break;

            case 'HANDOFF_EMITTED': {
              const sourceAgentId = payload.source_agent_id;
              const instructions = payload.instructions || '';
              const store = useWorkspaceStore.getState();
              const matchingEdge = store.edges.find((edge) => edge.source === sourceAgentId);
              if (matchingEdge) {
                store.setEdges(
                  store.edges.map((edge) =>
                    edge.id === matchingEdge.id
                      ? { ...edge, data: { ...edge.data, active: true } }
                      : edge
                  )
                );
                window.setTimeout(() => {
                  const currentStore = useWorkspaceStore.getState();
                  currentStore.setEdges(
                    currentStore.edges.map((edge) =>
                      edge.id === matchingEdge.id
                        ? { ...edge, data: { ...edge.data, active: false } }
                        : edge
                    )
                  );
                }, 4000);

                if (matchingEdge.target) {
                  addThoughtStep(matchingEdge.target, {
                    id: `handoff-rx-${Date.now()}`,
                    agentId: matchingEdge.target,
                    stepIndex: 0,
                    reasoningTrace: `Inbound task received from peer: ${instructions}`,
                    nextPlannedStep: 'Process delegated task payload',
                    timestamp: payload.timestamp || new Date().toISOString(),
                  });
                  updateNodeStatus(matchingEdge.target, 'working');
                }
              }
              break;
            }

            case 'APPROVAL_REQUESTED':
              addApproval({
                id: payload.approval_id,
                agentId: payload.agent_id,
                question: payload.question,
                options: payload.options || [],
                reasoningTrace: payload.reasoning_trace,
                status: 'pending',
                createdAt: new Date().toISOString(),
              });
              updateNodeStatus(payload.agent_id, 'blocked_on_user');
              break;

            case 'PRESENCE_SYNC':
              updateCursor({
                userId: payload.user_id,
                userName: payload.user_name,
                color: payload.color || '#3b82f6',
                positionX: payload.position_x ?? payload.x,
                positionY: payload.position_y ?? payload.y,
              });
              break;

            case 'PRESENCE_SNAPSHOT':
              if (Array.isArray(payload)) {
                payload.forEach((cursorItem) => {
                  updateCursor({
                    userId: cursorItem.user_id,
                    userName: cursorItem.user_name,
                    color: cursorItem.color || '#3b82f6',
                    positionX: cursorItem.position_x,
                    positionY: cursorItem.position_y,
                  });
                });
              }
              break;

            case 'PRESENCE_LEAVE':
              if (payload.user_id) {
                removeCursor(payload.user_id);
              }
              break;

            case 'QUESTION_LOCKED':
              setQuestionLock(payload.approval_id, payload.user_id, payload.user_name);
              break;

            case 'QUESTION_UNLOCKED':
              unlockQuestion(payload.approval_id);
              break;
          }
        } catch {
          // Ignore unparseable frames
        }
      };

      activeSocket.onclose = () => {
        if (isDisposedRef.current) return;
        const nextDelay = Math.min(backoffDelayRef.current * 1.5, 10000);
        backoffDelayRef.current = nextDelay;
        reconnectTimeoutRef.current = window.setTimeout(connect, backoffDelayRef.current);
      };

      activeSocket.onerror = () => {
        if (!isDisposedRef.current) {
          activeSocket.close();
        }
      };
    } catch {
      if (!isDisposedRef.current) {
        const nextDelay = Math.min(backoffDelayRef.current * 1.5, 10000);
        backoffDelayRef.current = nextDelay;
        reconnectTimeoutRef.current = window.setTimeout(connect, backoffDelayRef.current);
      }
    }
  }, [
    websocketUrl,
    updateNodeStatus,
    updateNodeThought,
    addThoughtStep,
    addApproval,
    updateCursor,
    removeCursor,
    setQuestionLock,
    unlockQuestion,
  ]);

  useEffect(() => {
    isDisposedRef.current = false;
    connect();
    return () => {
      isDisposedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        const staleSocket = socketRef.current;
        staleSocket.onopen = null;
        staleSocket.onmessage = null;
        staleSocket.onerror = null;
        staleSocket.onclose = null;
        staleSocket.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendCursor = useCallback((coordinateX: number, coordinateY: number) => {
    const nowTimestamp = Date.now();
    if (nowTimestamp - lastCursorSendRef.current < 100) {
      return; // 10 Hz throttle
    }
    lastCursorSendRef.current = nowTimestamp;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'CURSOR_MOVE',
          payload: { position_x: coordinateX, position_y: coordinateY },
        })
      );
    }
  }, []);

  const lockQuestion = useCallback((approvalId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'LOCK_QUESTION',
          payload: { approval_id: approvalId },
        })
      );
    }
  }, []);

  const unlockQuestionAction = useCallback((approvalId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'UNLOCK_QUESTION',
          payload: { approval_id: approvalId },
        })
      );
    }
  }, []);

  return { sendCursor, lockQuestion, unlockQuestion: unlockQuestionAction };
}
