import { useEffect, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function useMultiplayerWS(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const {
    updateNodeStatus,
    updateNodeThought,
    addThoughtStep,
    addApproval,
    updateCursor,
    setQuestionLock,
    unlockQuestion,
  } = useWorkspaceStore();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          switch (type) {
            case 'AGENT_STATE_CHANGED':
              updateNodeStatus(payload.agent_id, payload.status);
              break;

            case 'THOUGHT_STEP_EMITTED':
              updateNodeThought(payload.agent_id, payload.reasoning_trace, payload.next_planned_step);
              addThoughtStep(payload.agent_id, {
                id: Math.random().toString(),
                agentId: payload.agent_id,
                stepIndex: payload.step_index || 0,
                reasoningTrace: payload.reasoning_trace,
                nextPlannedStep: payload.next_planned_step,
                timestamp: payload.timestamp || new Date().toISOString(),
              });
              break;

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

      ws.onclose = () => {
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
      };
    } catch {
      reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
    }
  }, [url, updateNodeStatus, updateNodeThought, addThoughtStep, addApproval, updateCursor, setQuestionLock, unlockQuestion]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendCursor = useCallback((coordX: number, coordY: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CURSOR_MOVE',
          payload: { position_x: coordX, position_y: coordY },
        })
      );
    }
  }, []);

  const lockQuestion = useCallback((approvalId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'LOCK_QUESTION',
          payload: { approval_id: approvalId },
        })
      );
    }
  }, []);

  const unlockQuestionAction = useCallback((approvalId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UNLOCK_QUESTION',
          payload: { approval_id: approvalId },
        })
      );
    }
  }, []);

  return { sendCursor, lockQuestion, unlockQuestion: unlockQuestionAction };
}
