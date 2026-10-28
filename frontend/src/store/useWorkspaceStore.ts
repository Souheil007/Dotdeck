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
  latestOutput?: string;
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

export interface WorkspaceItem {
  id: string;
  name: string;
  description: string;
  providers: ('openai_dot' | 'grok_bot' | 'meta_muse' | 'claude')[];
  agentCount: number;
  activeApprovalsCount: number;
  membersCount: number;
  lastActive: string;
  role: 'admin' | 'write' | 'read';
}

export interface HandoffPreview {
  edgeId: string;
  toolName: string;
  sourceAgentName?: string;
  targetAgentName?: string;
  payload?: unknown;
}

export interface DecommissionTarget {
  id: string;
  name: string;
  provider?: string;
  connectedWiresCount: number;
}

export const DEFAULT_WORKSPACE_NODES: Record<string, Node<AgentData>[]> = {
  'ws-prod-sales': [
    {
      id: 'agent-1',
      type: 'agentNode',
      position: { x: 100, y: 150 },
      data: {
        id: 'agent-1',
        name: 'Sales Research Dot',
        provider: 'openai_dot',
        goal: 'Scrape high-intent SaaS leads and extract corporate tech stacks.',
        status: 'working',
        currentThought: 'Analyzing Stripe documentation page for webhook signature format',
        currentStep: 'Drafting outbound brief for Grok Copywriter',
        lastRunStatus: 'success',
        lastRunTime: '4m ago',
      },
    },
    {
      id: 'agent-2',
      type: 'agentNode',
      position: { x: 550, y: 80 },
      data: {
        id: 'agent-2',
        name: 'Grok Copywriter',
        provider: 'grok_bot',
        goal: 'Draft tailored outreach sequences based on incoming technical dossiers.',
        status: 'blocked_on_user',
        currentThought: 'Generated 3 email variants; awaiting sign-off on pricing mention.',
        lastRunStatus: 'success',
        lastRunTime: '12m ago',
      },
    },
    {
      id: 'agent-3',
      type: 'agentNode',
      position: { x: 550, y: 320 },
      data: {
        id: 'agent-3',
        name: 'Claude Compliance',
        provider: 'claude',
        goal: 'Verify outbound emails adhere to GDPR and company privacy policies.',
        status: 'resting',
        latestOutput: 'Verified outbound email templates: 100% GDPR and corporate privacy compliant.',
        lastRunStatus: 'success',
        lastRunTime: '1h ago',
        nextScheduledTime: 'Tomorrow 9:00 AM',
      },
    },
  ],
  'ws-secops': [
    {
      id: 'sec-1',
      type: 'agentNode',
      position: { x: 120, y: 180 },
      data: {
        id: 'sec-1',
        name: 'Meta Muse Recon',
        provider: 'meta_muse',
        goal: 'Port scan perimeter infrastructure and flag open ingress points.',
        status: 'working',
        currentThought: 'Running syn scan against public cloud CIDR blocks',
        currentStep: 'Summarizing CVE vulnerabilities',
        lastRunStatus: 'success',
        lastRunTime: '18m ago',
      },
    },
    {
      id: 'sec-2',
      type: 'agentNode',
      position: { x: 580, y: 180 },
      data: {
        id: 'sec-2',
        name: 'Claude Auditor',
        provider: 'claude',
        goal: 'Audit security logs and enforce CIS benchmark compliance.',
        status: 'resting',
        latestOutput: 'CIS cloud benchmark audit completed. All perimeter security rules passed.',
        lastRunStatus: 'success',
        lastRunTime: '30m ago',
      },
    },
  ],
  'ws-support': [
    {
      id: 'supp-1',
      type: 'agentNode',
      position: { x: 120, y: 180 },
      data: {
        id: 'supp-1',
        name: 'Triage OpenAI Dot',
        provider: 'openai_dot',
        goal: 'Classify incoming customer dispute tickets, compute SLA uptime breaches, and draft refund authorizations.',
        status: 'working',
        currentThought: 'Evaluating SLA outage dispute for Acme Corp (#8921); requesting $1,250 refund.',
        currentStep: 'Forwarding SLA breach analysis to Claude Escalation Specialist',
        lastRunStatus: 'success',
        lastRunTime: '3m ago',
      },
    },
    {
      id: 'supp-2',
      type: 'agentNode',
      position: { x: 580, y: 180 },
      data: {
        id: 'supp-2',
        name: 'Claude Escalation Specialist',
        provider: 'claude',
        goal: 'Audit refund payouts against corporate policy and gate payouts behind human operator approval.',
        status: 'blocked_on_user',
        currentThought: 'Payout exceeds $500 threshold ($1,250). Initiating 45s operator hold.',
        lastRunStatus: 'success',
        lastRunTime: '1m ago',
      },
    },
  ],
};

export const DEFAULT_WORKSPACE_EDGES: Record<string, Edge[]> = {
  'ws-prod-sales': [
    {
      id: 'edge-1-2',
      source: 'agent-1',
      target: 'agent-2',
      sourceHandle: 'handle-right',
      targetHandle: 'handle-left',
      type: 'pulseEdge',
      data: { toolName: 'delegate_task_to_grok_copywriter' },
    },
    {
      id: 'edge-2-3',
      source: 'agent-2',
      target: 'agent-3',
      sourceHandle: 'handle-bottom',
      targetHandle: 'handle-top',
      type: 'pulseEdge',
      data: { toolName: 'delegate_task_to_claude_compliance' },
    },
  ],
  'ws-secops': [
    {
      id: 'edge-sec-1-2',
      source: 'sec-1',
      target: 'sec-2',
      sourceHandle: 'handle-right',
      targetHandle: 'handle-left',
      type: 'pulseEdge',
      data: { toolName: 'delegate_task_to_claude_auditor' },
    },
  ],
  'ws-support': [
    {
      id: 'edge-supp-1-2',
      source: 'supp-1',
      target: 'supp-2',
      sourceHandle: 'handle-right',
      targetHandle: 'handle-left',
      type: 'pulseEdge',
      data: { toolName: 'delegate_task_to_claude_escalation_specialist' },
    },
  ],
};

function getOrCreateSessionUser() {
  if (typeof window === 'undefined') {
    return { userId: 'operator-1', userName: 'Operator' };
  }
  let sessionUserId = sessionStorage.getItem('dotdeck-user-id');
  let sessionUserName = sessionStorage.getItem('dotdeck-user-name');
  if (!sessionUserId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    sessionUserId = `operator-${randomSuffix}`;
    sessionUserName = `Operator ${randomSuffix}`;
    sessionStorage.setItem('dotdeck-user-id', sessionUserId);
    sessionStorage.setItem('dotdeck-user-name', sessionUserName);
  }
  return { userId: sessionUserId, userName: sessionUserName || 'Operator' };
}

interface WorkspaceState {
  currentUserId: string;
  currentUserName: string;
  workspaceId: string;
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
  activeWorkspaceName: string;
  userRole: 'admin' | 'write' | 'read';
  workspaceNodes: Record<string, Node<AgentData>[]>;
  workspaceEdges: Record<string, Edge[]>;
  nodes: Node<AgentData>[];
  edges: Edge[];
  selectedAgentId: string | null;
  focusAgentId: string | null;
  thoughts: Record<string, ThoughtStep[]>;
  approvals: Record<string, ApprovalRequest>;
  cursors: Record<string, TeammateCursor>;
  isPairingModalOpen: boolean;
  pairingAgent: AgentData | null;
  pairingSession: { agent: AgentData; mcpUrl: string; bootstrapPrompt: string } | null;
  isCreateAgentModalOpen: boolean;
  isShareModalOpen: boolean;
  handoffPreview: HandoffPreview | null;

  setNodes: (nodes: Node<AgentData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addEdgeToWorkspace: (edge: Edge) => void;
  removeEdgeFromWorkspace: (edgeId: string) => void;
  addAgentNode: (agent: AgentData, position?: { x: number; y: number }) => void;
  deleteAgentNode: (agentId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeStatus: (agentId: string, status: AgentStatus) => void;
  updateNodeThought: (agentId: string, thought: string, nextStep: string) => void;
  updateNodeOutput: (agentId: string, output: string) => void;
  setSelectedAgentId: (agentId: string | null) => void;
  setFocusAgentId: (agentId: string | null) => void;
  addThoughtStep: (agentId: string, step: ThoughtStep) => void;
  addApproval: (approval: ApprovalRequest) => void;
  resolveApproval: (approvalId: string, approved: boolean, answer: string) => void;
  updateCursor: (cursor: TeammateCursor) => void;
  removeCursor: (userId: string) => void;
  setQuestionLock: (approvalId: string, userId: string, userName: string) => void;
  unlockQuestion: (approvalId: string) => void;
  openPairingModal: (agent: AgentData, mcpUrl?: string, bootstrapPrompt?: string) => void;
  closePairingModal: () => void;
  openCreateAgentModal: () => void;
  closeCreateAgentModal: () => void;
  setUserRole: (role: 'admin' | 'write' | 'read') => void;
  setShareModalOpen: (open: boolean) => void;
  setHandoffPreview: (preview: HandoffPreview | null) => void;
  decommissionTarget: DecommissionTarget | null;
  openDecommissionModal: (target: DecommissionTarget) => void;
  closeDecommissionModal: () => void;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, description: string) => WorkspaceItem;
  deleteWorkspace: (workspaceId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => {
      const initialUser = getOrCreateSessionUser();
      const defaultWorkspaces: WorkspaceItem[] = [
        {
          id: 'ws-prod-sales',
          name: 'Enterprise Outbound Swarm',
          description: 'Orchestrates OpenAI web research to Grok bespoke email copy with Claude compliance guardrails.',
          providers: ['openai_dot', 'grok_bot', 'claude'],
          agentCount: 3,
          activeApprovalsCount: 0,
          membersCount: 4,
          lastActive: '2m ago',
          role: 'admin',
        },
        {
          id: 'ws-secops',
          name: 'SecOps Vulnerability Fleet',
          description: 'Automated infrastructure reconnaissance via Meta Muse VM checking with Claude auditing.',
          providers: ['meta_muse', 'claude'],
          agentCount: 2,
          activeApprovalsCount: 0,
          membersCount: 2,
          lastActive: '45m ago',
          role: 'admin',
        },
        {
          id: 'ws-support',
          name: 'Customer Support Tier 3',
          description: 'High-touch ticket triage with 45s human authorization hold on financial refunds.',
          providers: ['openai_dot', 'claude'],
          agentCount: 2,
          activeApprovalsCount: 1,
          membersCount: 3,
          lastActive: '2h ago',
          role: 'write',
        },
      ];

      return {
        currentUserId: initialUser.userId,
        currentUserName: initialUser.userName,
        workspaceId: 'ws-prod-sales',
        workspaces: defaultWorkspaces,
        activeWorkspaceId: 'ws-prod-sales',
        activeWorkspaceName: 'Enterprise Outbound Swarm',
        userRole: 'admin',
        workspaceNodes: DEFAULT_WORKSPACE_NODES,
        workspaceEdges: DEFAULT_WORKSPACE_EDGES,
        nodes: DEFAULT_WORKSPACE_NODES['ws-prod-sales'] || [],
        edges: DEFAULT_WORKSPACE_EDGES['ws-prod-sales'] || [],
        selectedAgentId: null,
        focusAgentId: null,
        thoughts: {},
        approvals: {},
        cursors: {},
        isPairingModalOpen: false,
        pairingAgent: null,
        pairingSession: null,
        isCreateAgentModalOpen: false,
        isShareModalOpen: false,
        handoffPreview: null,
        decommissionTarget: null,

        setNodes: (nodes) =>
          set((state) => ({
            nodes,
            workspaceNodes: {
              ...state.workspaceNodes,
              [state.activeWorkspaceId]: nodes,
            },
          })),

        setEdges: (edges) =>
          set((state) => ({
            edges,
            workspaceEdges: {
              ...state.workspaceEdges,
              [state.activeWorkspaceId]: edges,
            },
          })),

        addEdgeToWorkspace: (edge) =>
          set((state) => {
            const updatedEdges = [
              ...state.edges.filter((existingEdge) => existingEdge.id !== edge.id),
              edge,
            ];
            return {
              edges: updatedEdges,
              workspaceEdges: {
                ...state.workspaceEdges,
                [state.activeWorkspaceId]: updatedEdges,
              },
            };
          }),

        removeEdgeFromWorkspace: (edgeId) =>
          set((state) => {
            const updatedEdges = state.edges.filter((existingEdge) => existingEdge.id !== edgeId);
            return {
              edges: updatedEdges,
              workspaceEdges: {
                ...state.workspaceEdges,
                [state.activeWorkspaceId]: updatedEdges,
              },
            };
          }),

        addAgentNode: (agent, position) =>
          set((state) => {
            const updatedNodes = [
              ...state.nodes.filter((node) => node.id !== agent.id),
              {
                id: agent.id,
                type: 'agentNode',
                position: position || {
                  x: 120 + (state.nodes.length % 3) * 440,
                  y: 120 + Math.floor(state.nodes.length / 3) * 320,
                },
                data: agent,
              },
            ];
            const updatedWorkspaceNodes = {
              ...state.workspaceNodes,
              [state.activeWorkspaceId]: updatedNodes,
            };
            const updatedWorkspaces = state.workspaces.map((w) =>
              w.id === state.activeWorkspaceId ? { ...w, agentCount: updatedNodes.length } : w
            );
            return {
              nodes: updatedNodes,
              workspaceNodes: updatedWorkspaceNodes,
              workspaces: updatedWorkspaces,
              focusAgentId: agent.id,
            };
          }),

        deleteAgentNode: (agentId) =>
          set((state) => {
            const updatedNodes = state.nodes.filter((node) => node.id !== agentId);
            const updatedEdges = state.edges.filter(
              (edge) => edge.source !== agentId && edge.target !== agentId
            );
            const updatedWorkspaceNodes = {
              ...state.workspaceNodes,
              [state.activeWorkspaceId]: updatedNodes,
            };
            const updatedWorkspaceEdges = {
              ...state.workspaceEdges,
              [state.activeWorkspaceId]: updatedEdges,
            };
            const updatedWorkspaces = state.workspaces.map((ws) =>
              ws.id === state.activeWorkspaceId
                ? { ...ws, agentCount: updatedNodes.length }
                : ws
            );
            const nextThoughts = { ...state.thoughts };
            delete nextThoughts[agentId];

            const nextApprovals = { ...state.approvals };
            Object.keys(nextApprovals).forEach((key) => {
              if (nextApprovals[key].agentId === agentId) {
                delete nextApprovals[key];
              }
            });

            // Dispatch async DELETE to backend
            try {
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
              fetch(`${apiUrl}/api/v1/agents/${agentId}`, {
                method: 'DELETE',
                headers: {
                  'X-User-ID': state.currentUserId,
                  'X-User-Name': state.currentUserName,
                },
              }).catch(() => {});
            } catch {
              // Non-fatal if offline
            }

            return {
              nodes: updatedNodes,
              edges: updatedEdges,
              workspaceNodes: updatedWorkspaceNodes,
              workspaceEdges: updatedWorkspaceEdges,
              workspaces: updatedWorkspaces,
              selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
              thoughts: nextThoughts,
              approvals: nextApprovals,
            };
          }),

        updateNodePosition: (nodeId, position) =>
          set((state) => {
            const updatedNodes = state.nodes.map((node) =>
              node.id === nodeId ? { ...node, position } : node
            );
            return {
              nodes: updatedNodes,
              workspaceNodes: {
                ...state.workspaceNodes,
                [state.activeWorkspaceId]: updatedNodes,
              },
            };
          }),

        updateNodeStatus: (agentId, status) =>
          set((state) => {
            const updatedNodes = state.nodes.map((node) =>
              node.id === agentId ? { ...node, data: { ...node.data, status } } : node
            );
            return {
              nodes: updatedNodes,
              workspaceNodes: {
                ...state.workspaceNodes,
                [state.activeWorkspaceId]: updatedNodes,
              },
            };
          }),

        updateNodeThought: (agentId, currentThought, currentStep) =>
          set((state) => {
            const updatedNodes: Node<AgentData>[] = state.nodes.map((node) =>
              node.id === agentId
                ? { ...node, data: { ...node.data, currentThought, currentStep, status: 'working' as const } }
                : node
            );
            return {
              nodes: updatedNodes,
              workspaceNodes: {
                ...state.workspaceNodes,
                [state.activeWorkspaceId]: updatedNodes,
              },
            };
          }),

        updateNodeOutput: (agentId, output) =>
          set((state) => {
            const updatedNodes: Node<AgentData>[] = state.nodes.map((node) =>
              node.id === agentId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      latestOutput: output,
                      status: 'resting' as const,
                      lastRunStatus: 'success' as const,
                      lastRunTime: 'Just now',
                    },
                  }
                : node
            );
            return {
              nodes: updatedNodes,
              workspaceNodes: {
                ...state.workspaceNodes,
                [state.activeWorkspaceId]: updatedNodes,
              },
            };
          }),

        setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
        setFocusAgentId: (focusAgentId) => set({ focusAgentId }),
        addThoughtStep: (agentId, step) =>
          set((state) => {
            const existingSteps = state.thoughts[agentId] || [];
            // Deduplicate: ignore if an entry with the exact same ID or matching trace within 4 seconds already exists
            const isDuplicate = existingSteps.some(
              (existing) =>
                existing.id === step.id ||
                (existing.reasoningTrace === step.reasoningTrace &&
                  existing.nextPlannedStep === step.nextPlannedStep &&
                  Math.abs(new Date(existing.timestamp).getTime() - new Date(step.timestamp).getTime()) < 4000)
            );
            if (isDuplicate) {
              return state;
            }
            return {
              thoughts: {
                ...state.thoughts,
                [agentId]: [step, ...existingSteps],
              },
            };
          }),

        addApproval: (approval) =>
          set((state) => {
            const nextApprovals = { ...state.approvals, [approval.id]: approval };
            const updatedWorkspaces = state.workspaces.map((ws) => {
              const nodesInWs = state.workspaceNodes[ws.id] || [];
              const agentIds = new Set(nodesInWs.map((n) => n.id));
              const count = Object.values(nextApprovals).filter(
                (app) => app.status === 'pending' && agentIds.has(app.agentId)
              ).length;
              return { ...ws, activeApprovalsCount: count };
            });
            return {
              approvals: nextApprovals,
              workspaces: updatedWorkspaces,
            };
          }),

        resolveApproval: (approvalId) =>
          set((state) => {
            const nextApprovals = { ...state.approvals };
            delete nextApprovals[approvalId];
            const updatedWorkspaces = state.workspaces.map((ws) => {
              const nodesInWs = state.workspaceNodes[ws.id] || [];
              const agentIds = new Set(nodesInWs.map((n) => n.id));
              const count = Object.values(nextApprovals).filter(
                (app) => app.status === 'pending' && agentIds.has(app.agentId)
              ).length;
              return { ...ws, activeApprovalsCount: count };
            });
            return {
              approvals: nextApprovals,
              workspaces: updatedWorkspaces,
            };
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

        openPairingModal: (pairingAgent, mcpUrl, bootstrapPrompt) =>
          set({
            isPairingModalOpen: true,
            pairingAgent,
            pairingSession: mcpUrl
              ? { agent: pairingAgent, mcpUrl, bootstrapPrompt: bootstrapPrompt || '' }
              : null,
          }),

        closePairingModal: () =>
          set({ isPairingModalOpen: false, pairingAgent: null, pairingSession: null }),

        openCreateAgentModal: () => set({ isCreateAgentModalOpen: true }),
        closeCreateAgentModal: () => set({ isCreateAgentModalOpen: false }),
        openDecommissionModal: (decommissionTarget) => set({ decommissionTarget }),
        closeDecommissionModal: () => set({ decommissionTarget: null }),
        setUserRole: (userRole) => set({ userRole }),
        setShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),
        setHandoffPreview: (handoffPreview) => set({ handoffPreview }),

        switchWorkspace: (workspaceId) =>
          set((state) => {
            const target = state.workspaces.find((w) => w.id === workspaceId);
            if (!target) return state;

            // Snapshot current active workspace's nodes and edges
            const currentWorkspaceNodes = {
              ...state.workspaceNodes,
              [state.activeWorkspaceId]: state.nodes,
            };
            const currentWorkspaceEdges = {
              ...state.workspaceEdges,
              [state.activeWorkspaceId]: state.edges,
            };

            // Use saved nodes if previously stored, otherwise fall back to defaults
            const targetNodes =
              currentWorkspaceNodes[workspaceId] !== undefined
                ? currentWorkspaceNodes[workspaceId]
                : (DEFAULT_WORKSPACE_NODES[workspaceId] ?? []);

            const targetEdges =
              currentWorkspaceEdges[workspaceId] !== undefined
                ? currentWorkspaceEdges[workspaceId]
                : (DEFAULT_WORKSPACE_EDGES[workspaceId] ?? []);

            // Keep all workspace agent counts strictly synchronized
            const updatedWorkspaces = state.workspaces.map((ws) => {
              if (ws.id === workspaceId) {
                return { ...ws, agentCount: targetNodes.length };
              }
              if (ws.id === state.activeWorkspaceId) {
                return { ...ws, agentCount: state.nodes.length };
              }
              const savedCount = currentWorkspaceNodes[ws.id]?.length;
              return savedCount !== undefined ? { ...ws, agentCount: savedCount } : ws;
            });

            const targetApprovals = { ...state.approvals };
            if (workspaceId === 'ws-support' && !targetApprovals['app-supp-1']) {
              if (targetNodes.some((node) => node.id === 'supp-2')) {
                targetApprovals['app-supp-1'] = {
                  id: 'app-supp-1',
                  agentId: 'supp-2',
                  question: 'Refund payout of $1,250 requested for Acme Corp (Dispute #8921). Authorize refund release?',
                  options: ['Approve $1,250 Payout', 'Reject SLA Claim', 'Issue $625 Partial Credit'],
                  reasoningTrace: 'Customer experienced 4.2-hour outage exceeding SLA Section 4.3 uptime guarantee.',
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                };
              }
            }

            return {
              workspaceId: target.id,
              activeWorkspaceId: target.id,
              activeWorkspaceName: target.name,
              userRole: target.role,
              nodes: targetNodes,
              edges: targetEdges,
              workspaceNodes: {
                ...currentWorkspaceNodes,
                [workspaceId]: targetNodes,
              },
              workspaceEdges: {
                ...currentWorkspaceEdges,
                [workspaceId]: targetEdges,
              },
              workspaces: updatedWorkspaces,
              approvals: targetApprovals,
              selectedAgentId: null,
            };
          }),

        createWorkspace: (name, description) => {
          const newId = `ws-${Date.now()}`;
          const newWorkspace: WorkspaceItem = {
            id: newId,
            name,
            description: description || 'Clean autonomous agent workspace.',
            providers: [],
            agentCount: 0,
            activeApprovalsCount: 0,
            membersCount: 1,
            lastActive: 'Just now',
            role: 'admin',
          };

          set((state) => {
            const updatedWorkspaceNodes = {
              ...state.workspaceNodes,
              [state.activeWorkspaceId]: state.nodes,
              [newId]: [],
            };
            const updatedWorkspaceEdges = {
              ...state.workspaceEdges,
              [state.activeWorkspaceId]: state.edges,
              [newId]: [],
            };

            return {
              workspaces: [newWorkspace, ...state.workspaces],
              workspaceId: newId,
              activeWorkspaceId: newId,
              activeWorkspaceName: name,
              userRole: 'admin',
              nodes: [],
              edges: [],
              workspaceNodes: updatedWorkspaceNodes,
              workspaceEdges: updatedWorkspaceEdges,
              selectedAgentId: null,
            };
          });

          return newWorkspace;
        },

        deleteWorkspace: (workspaceId) =>
          set((state) => {
            const nextWorkspaces = state.workspaces.filter((w) => w.id !== workspaceId);
            const nextWorkspaceNodes = { ...state.workspaceNodes };
            const nextWorkspaceEdges = { ...state.workspaceEdges };
            delete nextWorkspaceNodes[workspaceId];
            delete nextWorkspaceEdges[workspaceId];

            let nextActiveId = state.activeWorkspaceId;
            let nextActiveName = state.activeWorkspaceName;
            let nextNodes = state.nodes;
            let nextEdges = state.edges;
            let nextRole = state.userRole;

            if (state.activeWorkspaceId === workspaceId) {
              const fallback = nextWorkspaces[0];
              if (fallback) {
                nextActiveId = fallback.id;
                nextActiveName = fallback.name;
                nextNodes = nextWorkspaceNodes[fallback.id] ?? DEFAULT_WORKSPACE_NODES[fallback.id] ?? [];
                nextEdges = nextWorkspaceEdges[fallback.id] ?? DEFAULT_WORKSPACE_EDGES[fallback.id] ?? [];
                nextRole = fallback.role;
              } else {
                nextActiveId = 'ws-default';
                nextActiveName = 'Default Workspace';
                nextNodes = [];
                nextEdges = [];
              }
            }

            return {
              workspaces: nextWorkspaces,
              workspaceId: nextActiveId,
              activeWorkspaceId: nextActiveId,
              activeWorkspaceName: nextActiveName,
              userRole: nextRole,
              nodes: nextNodes,
              edges: nextEdges,
              workspaceNodes: nextWorkspaceNodes,
              workspaceEdges: nextWorkspaceEdges,
              selectedAgentId: null,
            };
          }),
      };
    },
    {
      name: 'dotdeck-workspaces-store',
      partialize: (state) => ({
        workspaces: state.workspaces,
        workspaceId: state.workspaceId,
        activeWorkspaceId: state.activeWorkspaceId,
        activeWorkspaceName: state.activeWorkspaceName,
        workspaceNodes: state.workspaceNodes,
        workspaceEdges: state.workspaceEdges,
        nodes: state.nodes,
        edges: state.edges,
        thoughts: state.thoughts,
        approvals: state.approvals,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.workspaceNodes || Object.keys(state.workspaceNodes).length === 0) {
          state.workspaceNodes = { ...DEFAULT_WORKSPACE_NODES };
        }
        if (!state.workspaceEdges || Object.keys(state.workspaceEdges).length === 0) {
          state.workspaceEdges = { ...DEFAULT_WORKSPACE_EDGES };
        }
        for (const key of Object.keys(DEFAULT_WORKSPACE_NODES)) {
          if (!state.workspaceNodes[key]) {
            state.workspaceNodes[key] = DEFAULT_WORKSPACE_NODES[key];
          }
          if (!state.workspaceEdges[key]) {
            state.workspaceEdges[key] = DEFAULT_WORKSPACE_EDGES[key];
          }
        }
        const currentActiveId = state.activeWorkspaceId || state.workspaceId || 'ws-prod-sales';
        state.activeWorkspaceId = currentActiveId;
        state.workspaceId = currentActiveId;

        if (!state.nodes || state.nodes.length === 0) {
          state.nodes = state.workspaceNodes[currentActiveId] ?? DEFAULT_WORKSPACE_NODES[currentActiveId] ?? [];
        }
        if (!state.edges || state.edges.length === 0) {
          state.edges = state.workspaceEdges[currentActiveId] ?? DEFAULT_WORKSPACE_EDGES[currentActiveId] ?? [];
        }
        if (!state.thoughts) {
          state.thoughts = {};
        }
        if (!state.approvals) {
          state.approvals = {};
        }
        if (state.workspaces && state.workspaces.length > 0) {
          state.workspaces = state.workspaces.map((ws) => {
            const savedNodes = state.workspaceNodes?.[ws.id] || [];
            const agentIds = new Set(savedNodes.map((n) => n.id));
            const pendingApprovalsCount = Object.values(state.approvals || {}).filter(
              (app) => app.status === 'pending' && agentIds.has(app.agentId)
            ).length;
            return {
              ...ws,
              agentCount: savedNodes.length,
              activeApprovalsCount: pendingApprovalsCount,
            };
          });
        }
      },
    }
  )
);
