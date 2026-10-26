import { useEffect, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function useMultiplayerWebSocket(websocketUrl: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const backoffDelayRef = useRef<number>(500);
  const lastCursorSendRef = useRef<number>(0);

  const {
    updateNodeStatus,
    updateNodeThought,
    addThoughtStep,
    addApproval,
    updateCursor,
    removeCursor,
    setQuestionLock,
    unlockQuestion,
  } = useWorkspaceStore();

  const connect = useCallback(() => {
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
        const nextDelay = Math.min(backoffDelayRef.current * 1.5, 10000);
        backoffDelayRef.current = nextDelay;
        reconnectTimeoutRef.current = window.setTimeout(connect, backoffDelayRef.current);
      };

      activeSocket.onerror = () => {
        activeSocket.close();
      };
    } catch {
      const nextDelay = Math.min(backoffDelayRef.current * 1.5, 10000);
      backoffDelayRef.current = nextDelay;
      reconnectTimeoutRef.current = window.setTimeout(connect, backoffDelayRef.current);
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
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
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
