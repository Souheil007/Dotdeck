import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';

export type AgentStatus = 'unpaired' | 'resting' | 'scheduled' | 'working' | 'blocked_on_user' | 'failed';

export interface AgentData extends Record<string, unknown> {
  id: string;
  name: string;
  provider: 'openai_dot' | 'grok_bot' | 'meta_muse' | 'claude';
  goal: string;
  scheduleCron?: string;
  status: AgentStatus;
  currentThought?: string;
  currentStep?: string;
  lastRunStatus?: 'success' | 'failed';
  lastRunTime?: string;
  nextScheduledTime?: string;
}

export interface ThoughtStep {
  id: string;
  agentId: string;
  stepIndex: number;
  reasoningTrace: string;
  nextPlannedStep: string;
  timestamp: string;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  question: string;
  options: string[];
  reasoningTrace: string;
  status: 'pending' | 'approved' | 'rejected';
  lockedBy?: string;
  lockedByName?: string;
  createdAt: string;
}

export interface TeammateCursor {
  userId: string;
  userName: string;
  color: string;
  positionX: number;
  positionY: number;
}

export interface HandoffPreview {
  edgeId: string;
  toolName: string;
  sourceAgentName?: string;
  targetAgentName?: string;
  payload?: unknown;
}

interface WorkspaceState {
  workspaceId: string;
  userRole: 'admin' | 'write' | 'read';
  nodes: Node<AgentData>[];
  edges: Edge[];
  selectedAgentId: string | null;
  thoughts: Record<string, ThoughtStep[]>;
  approvals: Record<string, ApprovalRequest>;
  cursors: Record<string, TeammateCursor>;
  isPairingModalOpen: boolean;
  pairingAgent: AgentData | null;
  isShareModalOpen: boolean;
  handoffPreview: HandoffPreview | null;

  setNodes: (nodes: Node<AgentData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addEdgeToWorkspace: (edge: Edge) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeStatus: (agentId: string, status: AgentStatus) => void;
  updateNodeThought: (agentId: string, thought: string, nextStep: string) => void;
  setSelectedAgentId: (agentId: string | null) => void;
  addThoughtStep: (agentId: string, step: ThoughtStep) => void;
  addApproval: (approval: ApprovalRequest) => void;
  resolveApproval: (approvalId: string, approved: boolean, answer: string) => void;
  updateCursor: (cursor: TeammateCursor) => void;
  removeCursor: (userId: string) => void;
  setQuestionLock: (approvalId: string, userId: string, userName: string) => void;
  unlockQuestion: (approvalId: string) => void;
  openPairingModal: (agent: AgentData) => void;
  closePairingModal: () => void;
  setShareModalOpen: (open: boolean) => void;
  setHandoffPreview: (preview: HandoffPreview | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaceId: 'default-workspace',
      userRole: 'write',
      nodes: [],
      edges: [],
      selectedAgentId: null,
      thoughts: {},
      approvals: {},
      cursors: {},
      isPairingModalOpen: false,
      pairingAgent: null,
      isShareModalOpen: false,
      handoffPreview: null,

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      addEdgeToWorkspace: (edge) =>
        set((state) => ({
          edges: [...state.edges.filter((existingEdge) => existingEdge.id !== edge.id), edge],
        })),
      updateNodePosition: (nodeId, position) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId ? { ...node, position } : node
          ),
        })),
      updateNodeStatus: (agentId, status) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === agentId ? { ...node, data: { ...node.data, status } } : node
          ),
        })),
      updateNodeThought: (agentId, currentThought, currentStep) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === agentId
              ? { ...node, data: { ...node.data, currentThought, currentStep, status: 'working' } }
              : node
          ),
        })),
      setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
      addThoughtStep: (agentId, step) =>
        set((state) => ({
          thoughts: {
            ...state.thoughts,
            [agentId]: [step, ...(state.thoughts[agentId] || [])],
          },
        })),
      addApproval: (approval) =>
        set((state) => ({
          approvals: { ...state.approvals, [approval.id]: approval },
        })),
      resolveApproval: (approvalId) =>
        set((state) => {
          const nextApprovals = { ...state.approvals };
          delete nextApprovals[approvalId];
          return { approvals: nextApprovals };
        }),
      updateCursor: (cursor) =>
        set((state) => ({
          cursors: { ...state.cursors, [cursor.userId]: cursor },
        })),
      removeCursor: (userId) =>
        set((state) => {
          const nextCursors = { ...state.cursors };
          delete nextCursors[userId];
          return { cursors: nextCursors };
        }),
      setQuestionLock: (approvalId, lockedBy, lockedByName) =>
        set((state) => {
          const existing = state.approvals[approvalId];
          if (!existing) return state;
          return {
            approvals: {
              ...state.approvals,
              [approvalId]: { ...existing, lockedBy, lockedByName },
            },
          };
        }),
      unlockQuestion: (approvalId) =>
        set((state) => {
          const existing = state.approvals[approvalId];
          if (!existing) return state;
          return {
            approvals: {
              ...state.approvals,
              [approvalId]: { ...existing, lockedBy: undefined, lockedByName: undefined },
            },
          };
        }),
      openPairingModal: (pairingAgent) => set({ isPairingModalOpen: true, pairingAgent }),
      closePairingModal: () => set({ isPairingModalOpen: false, pairingAgent: null }),
      setShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),
      setHandoffPreview: (handoffPreview) => set({ handoffPreview }),
    }),
    {
      name: 'dotdeck-canvas-state',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
    }
  )
);
