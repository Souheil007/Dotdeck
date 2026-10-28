import { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Sparkles,
  Flame,
  Globe,
  Cpu,
  Clock,
  Zap,
  ShieldAlert,
  Bot,
  Copy,
  Check,
  Activity,
  Trash2,
} from 'lucide-react';
import { useWorkspaceStore, type AgentStatus } from '../../store/useWorkspaceStore';
import { ThoughtStream } from './ThoughtStream';
import { ApprovalBox } from './ApprovalBox';
import { ChatBox } from './ChatBox';

const statusConfig: Record<
  AgentStatus,
  { label: string; badgeClass: string; dotClass: string; icon: typeof Bot }
> = {
  unpaired: {
    label: 'Unpaired',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
    dotClass: 'bg-zinc-400 dark:bg-zinc-500',
    icon: Bot,
  },
  resting: {
    label: 'Resting / Idle',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    dotClass: 'bg-blue-500 dark:bg-blue-400',
    icon: Clock,
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    dotClass: 'bg-cyan-500 dark:bg-cyan-400',
    icon: Clock,
  },
  working: {
    label: 'Executing Loop',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400 animate-pulse',
    icon: Zap,
  },
  blocked_on_user: {
    label: 'Human Gate Required',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500',
    dotClass: 'bg-amber-500 dark:bg-amber-400 animate-ping',
    icon: ShieldAlert,
  },
  failed: {
    label: 'Exception / Halted',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    dotClass: 'bg-rose-500 dark:bg-rose-400',
    icon: AlertCircle,
  },
};

const providerConfig: Record<string, { label: string; icon: typeof Sparkles; colorClass: string }> = {
  openai_dot: {
    label: 'OpenAI Dot',
    icon: Sparkles,
    colorClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80',
  },
  grok_bot: {
    label: 'xAI Grok Bot',
    icon: Flame,
    colorClass: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/80',
  },
  meta_muse: {
    label: 'Meta Muse',
    icon: Globe,
    colorClass: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/80',
  },
  claude: {
    label: 'Claude Cloud',
    icon: Cpu,
    colorClass: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80',
  },
};

export function InspectorDrawer() {
  const {
    selectedAgentId,
    setSelectedAgentId,
    nodes,
    edges,
    thoughts,
    approvals,
    openDecommissionModal,
    userRole,
    addThoughtStep,
  } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<'thoughts' | 'approvals'>('thoughts');
  const [copiedGoal, setCopiedGoal] = useState(false);

  // Synchronize historical thoughts from backend when agent is selected
  useEffect(() => {
    if (!selectedAgentId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    fetch(`${apiUrl}/api/v1/agents/${selectedAgentId}/thoughts`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ id: string; agent_id: string; step_index?: number; reasoning_trace: string; next_planned_step: string; created_at?: string }>) => {
        if (Array.isArray(data)) {
          data.forEach((item) => {
            addThoughtStep(selectedAgentId, {
              id: item.id,
              agentId: item.agent_id,
              stepIndex: item.step_index || 0,
              reasoningTrace: item.reasoning_trace,
              nextPlannedStep: item.next_planned_step,
              timestamp: item.created_at || new Date().toISOString(),
            });
          });
        }
      })
      .catch(() => {});
  }, [selectedAgentId, addThoughtStep]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedAgentId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedAgentId]);

  if (!selectedAgentId) return null;

  const agentNode = nodes.find((node) => node.id === selectedAgentId);
  if (!agentNode) return null;

  const agent = agentNode.data;
  const agentThoughts = thoughts[selectedAgentId] || [];
  const pendingApprovals = Object.values(approvals).filter(
    (approvalItem) => approvalItem.agentId === selectedAgentId
  );

  const statusInfo = statusConfig[agent.status] || statusConfig.resting;
  const providerInfo = providerConfig[agent.provider] || {
    label: agent.provider.replace('_', ' '),
    icon: Bot,
    colorClass: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
  };
  const ProviderIcon = providerInfo.icon;

  const copyGoalText = () => {
    if (!agent.goal) return;
    navigator.clipboard.writeText(agent.goal);
    setCopiedGoal(true);
    setTimeout(() => setCopiedGoal(false), 2000);
  };

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-white/95 dark:bg-[#07080b]/95 backdrop-blur-xl border-l border-zinc-200 dark:border-zinc-800/90 z-40 flex flex-col shadow-2xl transition-all duration-300 ease-in-out font-sans">
      {/* Cockpit Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#0c0d10]/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-lg border flex items-center justify-center shrink-0 ${providerInfo.colorClass}`}
            >
              <ProviderIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#202124] dark:text-zinc-100 truncate font-display">
                  {agent.name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${statusInfo.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>{providerInfo.label}</span>
                <span>•</span>
                <span className="text-[10px] text-zinc-400">ID: {agent.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {userRole !== 'read' && (
              <button
                onClick={() => {
                  const connectedWiresCount = edges.filter(
                    (edge) => edge.source === agent.id || edge.target === agent.id
                  ).length;
                  openDecommissionModal({
                    id: agent.id,
                    name: agent.name,
                    provider: agent.provider,
                    connectedWiresCount,
                  });
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Decommission & Destroy Agent"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setSelectedAgentId(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 font-mono text-[10px]"
              title="Close Inspector (Esc)"
            >
              <span>[ESC]</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Target Mission Objective Directive */}
        {agent.goal && (
          <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-[#121318] border border-zinc-200 dark:border-zinc-800 text-xs transition-all max-h-48 overflow-y-auto group relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                Mission Directive
              </span>
              <button
                onClick={copyGoalText}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                title="Copy goal"
              >
                {copiedGoal ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[#202124] dark:text-zinc-200 leading-relaxed break-words font-sans text-xs">
              {agent.goal}
            </p>
          </div>
        )}
      </div>

      {/* Cockpit Tab Navigation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-[#0c0d10]/40 text-xs font-mono">
        <button
          onClick={() => setActiveTab('thoughts')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'thoughts'
              ? 'border-blue-600 dark:border-cyan-400 text-blue-600 dark:text-cyan-300 bg-white dark:bg-[#07080b] font-bold shadow-xs'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Thought Stream</span>
          {agentThoughts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300 tabular-nums">
              {agentThoughts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'approvals'
              ? 'border-amber-500 dark:border-amber-400 text-amber-600 dark:text-amber-300 bg-white dark:bg-[#07080b] font-bold shadow-xs'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Approvals</span>
          {pendingApprovals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold animate-pulse border border-amber-300 dark:border-amber-700 tabular-nums">
              {pendingApprovals.length}
            </span>
          )}
        </button>
      </div>

      {/* Cockpit Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'thoughts' ? (
          <ThoughtStream thoughts={agentThoughts} />
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-2 text-zinc-300 dark:text-zinc-600">
                  <AlertCircle className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 font-mono uppercase tracking-wider">
                  No Pending Approvals
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed font-sans">
                  When this cloud agent encounters an authority boundary or mutative tool call, its review card will appear here.
                </p>
              </div>
            ) : (
              pendingApprovals.map((approvalItem) => (
                <ApprovalBox key={approvalItem.id} approval={approvalItem} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Operator Steering Directive Terminal */}
      <ChatBox agentId={agent.id} agentName={agent.name} />
    </aside>
  );
}
