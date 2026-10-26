import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Sparkles, Clock, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import type { AgentData } from '../../../store/useWorkspaceStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';

export interface AgentNodeProps {
  id: string;
  data: AgentData;
  selected?: boolean;
}

const statusConfig: Record<string, { label: string; badgeClass: string; borderClass: string; icon: typeof Bot }> = {
  unpaired: {
    label: 'Unpaired',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    borderClass: 'border-dashed border-zinc-600',
    icon: Bot,
  },
  resting: {
    label: 'Resting',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-800',
    borderClass: 'border-blue-900/50 shadow-sm',
    icon: Clock,
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
    borderClass: 'border-cyan-800/60 shadow-sm',
    icon: Clock,
  },
  working: {
    label: 'Working',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-700 animate-pulse',
    borderClass: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50',
    icon: Zap,
  },
  blocked_on_user: {
    label: 'Needs Input',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-600 animate-bounce',
    borderClass: 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-500',
    icon: AlertCircle,
  },
  failed: {
    label: 'Error',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-700',
    borderClass: 'border-rose-600 shadow-md',
    icon: AlertCircle,
  },
};

const providerLabels: Record<string, string> = {
  openai_dot: 'OpenAI Dot',
  grok_bot: 'Grok Bot',
  meta_muse: 'Meta Muse',
  claude: 'Claude Cloud',
};

export const AgentNode = memo(({ id, data, selected }: AgentNodeProps) => {
  const { setSelectedAgentId, openPairingModal } = useWorkspaceStore();
  const conf = statusConfig[data.status] || statusConfig.resting;
  const StatusIcon = conf.icon;

  return (
    <div
      onClick={() => setSelectedAgentId(id)}
      className={`relative w-80 rounded-xl bg-zinc-950/90 backdrop-blur-md p-4 transition-all duration-200 border cursor-pointer select-none ${
        conf.borderClass
      } ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-zinc-950' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-zinc-500 !border-2 !border-zinc-950" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 truncate max-w-[140px]">{data.name}</h4>
            <p className="text-[11px] text-zinc-400">{providerLabels[data.provider] || data.provider}</p>
          </div>
        </div>

        <div className={`px-2 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1 ${conf.badgeClass}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{conf.label}</span>
        </div>
      </div>

      {/* Goal Summary */}
      <div className="py-2.5">
        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{data.goal || 'No ongoing goal assigned.'}</p>
      </div>

      {/* Live Thought Ticker (Hero element for working agents) */}
      {data.status === 'working' && data.currentThought && (
        <div className="mt-1 p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/50">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Thinking</span>
          </div>
          <p className="text-xs text-emerald-200 font-mono line-clamp-2">{data.currentThought}</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-1">
          {data.lastRunStatus === 'success' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
          <span>{data.lastRunTime ? `Ran ${data.lastRunTime}` : 'Ready'}</span>
        </div>

        {data.status === 'unpaired' ? (
          <button
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              openPairingModal(data);
            }}
            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors"
          >
            Pair Agent
          </button>
        ) : (
          <span className="text-zinc-500">{data.nextScheduledTime || '24/7 Standby'}</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-zinc-500 !border-2 !border-zinc-950" />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';
