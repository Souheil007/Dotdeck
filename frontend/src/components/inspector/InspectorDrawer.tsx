import { useState, useEffect } from 'react';
import { X, Brain, AlertCircle, Sparkles, Flame, Globe, Cpu, Clock, Zap, ShieldAlert, Bot } from 'lucide-react';
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
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    dotClass: 'bg-zinc-500',
    icon: Bot,
  },
  resting: {
    label: 'Resting',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-800',
    dotClass: 'bg-blue-400',
    icon: Clock,
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
    dotClass: 'bg-cyan-400',
    icon: Clock,
  },
  working: {
    label: 'Working',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-600',
    dotClass: 'bg-emerald-400 animate-pulse',
    icon: Zap,
  },
  blocked_on_user: {
    label: 'Needs Authority',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500',
    dotClass: 'bg-amber-400 animate-ping',
    icon: ShieldAlert,
  },
  failed: {
    label: 'Failed',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-700',
    dotClass: 'bg-rose-400',
    icon: AlertCircle,
  },
};

const providerConfig: Record<string, { label: string; icon: typeof Sparkles; colorClass: string }> = {
  openai_dot: {
    label: 'OpenAI Dot',
    icon: Sparkles,
    colorClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
  },
  grok_bot: {
    label: 'Grok Bot',
    icon: Flame,
    colorClass: 'text-orange-400 bg-orange-950/60 border-orange-800/80',
  },
  meta_muse: {
    label: 'Meta Muse',
    icon: Globe,
    colorClass: 'text-blue-400 bg-blue-950/60 border-blue-800/80',
  },
  claude: {
    label: 'Claude Agent',
    icon: Cpu,
    colorClass: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
  },
};

export function InspectorDrawer() {
  const { selectedAgentId, setSelectedAgentId, nodes, thoughts, approvals } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<'thoughts' | 'approvals'>('thoughts');

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
    colorClass: 'text-zinc-400 bg-zinc-900 border-zinc-800',
  };
  const ProviderIcon = providerInfo.icon;

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800/90 z-40 flex flex-col shadow-2xl transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-lg border flex items-center justify-center shrink-0 ${providerInfo.colorClass}`}
            >
              <ProviderIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 truncate">{agent.name}</h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5">{providerInfo.label}</p>
            </div>
          </div>

          <button
            onClick={() => setSelectedAgentId(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            title="Close Inspector (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {agent.goal && (
          <div className="mt-3 p-2 rounded-md bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300 line-clamp-2">
            <span className="text-zinc-500 font-mono text-[10px] uppercase block mb-0.5">Objective</span>
            {agent.goal}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/80 bg-zinc-900/30 text-xs font-medium">
        <button
          onClick={() => setActiveTab('thoughts')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'thoughts'
              ? 'border-indigo-500 text-indigo-300 bg-zinc-900/60 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Thought Stream</span>
          {agentThoughts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
              {agentThoughts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'approvals'
              ? 'border-amber-500 text-amber-300 bg-zinc-900/60 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Approvals</span>
          {pendingApprovals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 text-[10px] animate-pulse border border-amber-800">
              {pendingApprovals.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'thoughts' ? (
          <ThoughtStream thoughts={agentThoughts} />
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2 stroke-1 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-400">No Pending Approvals</p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-xs">
                  When this cloud agent hits an authority boundary, its question card will appear here for review.
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

      {/* Direct Steering Chat */}
      <ChatBox agentId={agent.id} agentName={agent.name} />
    </aside>
  );
}
