import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Sparkles, Clock, AlertCircle, CheckCircle, Zap, ShieldAlert, Cpu, Flame, Globe } from 'lucide-react';
import type { AgentData } from '../../../store/useWorkspaceStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';

export interface AgentNodeProps {
  id: string;
  data: AgentData;
  selected?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; badgeClass: string; borderClass: string; icon: typeof Bot; description: string }
> = {
  unpaired: {
    label: 'Unpaired',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    borderClass: 'border-dashed border-zinc-600 bg-zinc-950/70',
    icon: Bot,
    description: 'Awaiting remote MCP handshake',
  },
  resting: {
    label: 'Resting',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-800',
    borderClass: 'border-blue-900/60 shadow-sm bg-zinc-950/90',
    icon: Clock,
    description: 'Standby in vendor cloud',
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
    borderClass: 'border-cyan-800/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-zinc-950/90',
    icon: Clock,
    description: 'Waiting for cron trigger',
  },
  working: {
    label: 'Working',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-600 animate-pulse',
    borderClass:
      'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/50 bg-zinc-950/95',
    icon: Zap,
    description: 'Executing tool or reasoning loop',
  },
  blocked_on_user: {
    label: 'Needs Authority',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500 animate-bounce',
    borderClass:
      'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] ring-2 ring-amber-500 animate-pulse bg-zinc-950/95',
    icon: ShieldAlert,
    description: 'Paused in 45s hold engine',
  },
  failed: {
    label: 'Error',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-700',
    borderClass: 'border-rose-600 shadow-md ring-1 ring-rose-500/50 bg-rose-950/20',
    icon: AlertCircle,
    description: 'Execution run failed',
  },
};

const providerMetadata: Record<
  string,
  { label: string; icon: typeof Bot; badgeColor: string; textColor: string }
> = {
  openai_dot: {
    label: 'OpenAI Dot',
    icon: Cpu,
    badgeColor: 'bg-emerald-950/60 border-emerald-800/60',
    textColor: 'text-emerald-400',
  },
  grok_bot: {
    label: 'Grok Bot',
    icon: Flame,
    badgeColor: 'bg-orange-950/60 border-orange-800/60',
    textColor: 'text-orange-400',
  },
  meta_muse: {
    label: 'Meta Muse',
    icon: Globe,
    badgeColor: 'bg-indigo-950/60 border-indigo-800/60',
    textColor: 'text-indigo-400',
  },
  claude: {
    label: 'Claude Cloud',
    icon: Sparkles,
    badgeColor: 'bg-amber-950/60 border-amber-800/60',
    textColor: 'text-amber-400',
  },
};

export const AgentNode = memo(({ id, data, selected }: AgentNodeProps) => {
  const { setSelectedAgentId, openPairingModal } = useWorkspaceStore();
  const config = statusConfig[data.status] || statusConfig.resting;
  const StatusIcon = config.icon;

  const providerMeta = providerMetadata[data.provider] || {
    label: data.provider,
    icon: Bot,
    badgeColor: 'bg-zinc-900 border-zinc-800',
    textColor: 'text-zinc-400',
  };
  const ProviderIcon = providerMeta.icon;

  return (
    <div
      onClick={() => setSelectedAgentId(id)}
      className={`relative w-84 rounded-2xl p-4.5 transition-all duration-300 border backdrop-blur-md cursor-pointer select-none ${
        config.borderClass
      } ${selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 shadow-2xl' : ''}`}
    >
      {/* 4 Connection Handles with snap-to-grid alignment */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !rounded-full !bg-zinc-600 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="handle-left"
        className="!w-3 !h-3 !rounded-full !bg-zinc-600 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${providerMeta.badgeColor}`}>
            <ProviderIcon className={`w-4 h-4 ${providerMeta.textColor}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 truncate max-w-[145px] tracking-tight">{data.name}</h4>
            <span className={`text-[11px] font-medium ${providerMeta.textColor}`}>{providerMeta.label}</span>
          </div>
        </div>

        {/* State Badge */}
        <div className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1.5 shadow-sm ${config.badgeClass}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Ongoing Goal Summary */}
      <div className="py-2.5">
        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
          {data.goal || 'No ongoing autonomous goal assigned.'}
        </p>
      </div>

      {/* Live Thought Ticker Hero Banner (Working State) */}
      {data.status === 'working' && data.currentThought && (
        <div className="mt-1.5 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/60 shadow-inner">
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live Thought Step</span>
            </div>
            {data.currentStep && (
              <span className="text-[10px] text-emerald-300/80 truncate max-w-[120px] font-mono">
                {data.currentStep}
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-100 font-mono line-clamp-2 leading-snug">{data.currentThought}</p>
        </div>
      )}

      {/* Blocked on User Urgent Authority Banner */}
      {data.status === 'blocked_on_user' && (
        <div className="mt-1.5 p-2.5 rounded-xl bg-amber-950/50 border border-amber-600/70 shadow-inner">
          <div className="flex items-center gap-1.5 mb-1 text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Operator Decision Required</span>
          </div>
          <p className="text-xs text-amber-100/90 line-clamp-2">
            Cloud agent paused on high-stakes tool execution. Click to open review drawer.
          </p>
        </div>
      )}

      {/* Footer Info & Quick Actions */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/70 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          {data.lastRunStatus === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{data.lastRunTime ? `Ran ${data.lastRunTime}` : 'Ready'}</span>
        </div>

        {data.status === 'unpaired' ? (
          <button
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              openPairingModal(data);
            }}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors shadow-md shadow-indigo-600/20"
          >
            Pair Agent
          </button>
        ) : (
          <span className="text-zinc-500 font-mono text-[10px]">
            {data.scheduleCron ? `cron: ${data.scheduleCron}` : '24/7 Standby'}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !rounded-full !bg-zinc-600 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="handle-right"
        className="!w-3 !h-3 !rounded-full !bg-zinc-600 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';
