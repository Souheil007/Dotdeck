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
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
    borderClass: 'border-dashed border-zinc-300 dark:border-zinc-600 bg-white/95 dark:bg-zinc-950/70 shadow-sm',
    icon: Bot,
    description: 'Awaiting remote MCP handshake',
  },
  resting: {
    label: 'Resting',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    borderClass: 'border-zinc-200 dark:border-blue-900/60 shadow-sm bg-white dark:bg-zinc-950/90',
    icon: Clock,
    description: 'Standby in vendor cloud',
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    borderClass: 'border-cyan-300 dark:border-cyan-800/80 shadow-[0_0_15px_rgba(6,182,212,0.1)] dark:shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-white dark:bg-zinc-950/90',
    icon: Clock,
    description: 'Waiting for cron trigger',
  },
  working: {
    label: 'Working',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600 animate-pulse',
    borderClass:
      'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] dark:shadow-[0_0_25px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/40 bg-white dark:bg-zinc-950/95',
    icon: Zap,
    description: 'Executing tool or reasoning loop',
  },
  blocked_on_user: {
    label: 'Needs Authority',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500 animate-bounce',
    borderClass:
      'border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.2)] dark:shadow-[0_0_30px_rgba(245,158,11,0.4)] ring-2 ring-amber-500 animate-pulse bg-white dark:bg-zinc-950/95',
    icon: ShieldAlert,
    description: 'Paused in 45s hold engine',
  },
  failed: {
    label: 'Error',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    borderClass: 'border-rose-500 shadow-md ring-1 ring-rose-500/40 bg-white dark:bg-rose-950/20',
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
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60',
    textColor: 'text-emerald-700 dark:text-emerald-400',
  },
  grok_bot: {
    label: 'Grok Bot',
    icon: Flame,
    badgeColor: 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/60',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
  meta_muse: {
    label: 'Meta Muse',
    icon: Globe,
    badgeColor: 'bg-blue-50 dark:bg-indigo-950/60 border-blue-200 dark:border-indigo-800/60',
    textColor: 'text-blue-700 dark:text-indigo-400',
  },
  claude: {
    label: 'Claude Cloud',
    icon: Sparkles,
    badgeColor: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
};

export const AgentNode = memo(({ id, data, selected }: AgentNodeProps) => {
  const { setSelectedAgentId, openPairingModal } = useWorkspaceStore();
  const config = statusConfig[data.status] || statusConfig.resting;
  const StatusIcon = config.icon;

  const providerMeta = providerMetadata[data.provider] || {
    label: data.provider,
    icon: Bot,
    badgeColor: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
    textColor: 'text-zinc-600 dark:text-zinc-400',
  };
  const ProviderIcon = providerMeta.icon;

  return (
    <div
      onClick={() => setSelectedAgentId(id)}
      className={`relative w-[370px] rounded-2xl p-5 transition-all duration-300 border backdrop-blur-md cursor-pointer select-none ${
        config.borderClass
      } ${selected ? 'ring-2 ring-blue-500 dark:ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 shadow-2xl' : 'shadow-sm hover:shadow-xl'}`}
    >
      {/* 4 Connection Handles with rock-solid positioning (no scaling transforms that disrupt mouse coordinates) */}
      <Handle
        type="target"
        position={Position.Top}
        id="handle-top"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3.5 !h-3.5 !rounded-full !bg-zinc-400 dark:!bg-zinc-500 hover:!bg-blue-600 dark:hover:!bg-cyan-400 !border-2 !border-white dark:!border-zinc-900 shadow-sm hover:!ring-4 hover:!ring-blue-500/30 dark:hover:!ring-cyan-500/30 !cursor-crosshair !z-30"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="handle-left"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3.5 !h-3.5 !rounded-full !bg-zinc-400 dark:!bg-zinc-500 hover:!bg-blue-600 dark:hover:!bg-cyan-400 !border-2 !border-white dark:!border-zinc-900 shadow-sm hover:!ring-4 hover:!ring-blue-500/30 dark:hover:!ring-cyan-500/30 !cursor-crosshair !z-30"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 pb-3.5 mb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${providerMeta.badgeColor}`}>
            <ProviderIcon className={`w-4.5 h-4.5 ${providerMeta.textColor}`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-[14px] font-bold text-[#202124] dark:text-zinc-100 truncate tracking-tight">
              {data.name}
            </h4>
            <span className={`text-[11px] font-medium block truncate ${providerMeta.textColor}`}>
              {providerMeta.label}
            </span>
          </div>
        </div>

        {/* State Badge */}
        <div className={`px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center gap-1.5 shrink-0 shadow-xs ${config.badgeClass}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Autonomous Objective Box */}
      <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold block mb-1">
          Autonomous Objective
        </span>
        <p className="text-[#202124] dark:text-zinc-300 leading-relaxed line-clamp-2 font-sans">
          {data.goal || 'No ongoing autonomous goal assigned.'}
        </p>
      </div>

      {/* Live Thought Ticker Hero Banner (Working State) */}
      {data.status === 'working' && data.currentThought && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/60 shadow-xs">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Live Thought Step</span>
            </div>
            {data.currentStep && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-300/80 truncate max-w-[130px] font-mono">
                {data.currentStep}
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-950 dark:text-emerald-100 font-mono line-clamp-2 leading-snug">{data.currentThought}</p>
        </div>
      )}

      {/* Blocked on User Urgent Authority Banner */}
      {data.status === 'blocked_on_user' && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-600/70 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Operator Decision Required</span>
          </div>
          <p className="text-xs text-amber-950 dark:text-amber-100/90 line-clamp-2">
            Cloud agent paused on high-stakes tool execution. Click to open review drawer.
          </p>
        </div>
      )}

      {/* Footer Info & Quick Actions */}
      <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/70 flex items-center justify-between text-[11px] text-[#5f6368] dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          {data.lastRunStatus === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
          <span>{data.lastRunTime ? `Ran ${data.lastRunTime}` : 'Ready'}</span>
        </div>

        {data.status === 'unpaired' ? (
          <button
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              openPairingModal(data);
            }}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors shadow-sm"
          >
            Pair Agent
          </button>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-mono text-[10px]">
            {data.scheduleCron ? `cron: ${data.scheduleCron}` : '24/7 Standby'}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="handle-bottom"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3.5 !h-3.5 !rounded-full !bg-blue-500 dark:!bg-indigo-500 hover:!bg-blue-600 dark:hover:!bg-cyan-400 !border-2 !border-white dark:!border-zinc-900 shadow-sm hover:!ring-4 hover:!ring-blue-500/30 dark:hover:!ring-cyan-500/30 !cursor-crosshair !z-30"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="handle-right"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3.5 !h-3.5 !rounded-full !bg-blue-500 dark:!bg-indigo-500 hover:!bg-blue-600 dark:hover:!bg-cyan-400 !border-2 !border-white dark:!border-zinc-900 shadow-sm hover:!ring-4 hover:!ring-blue-500/30 dark:hover:!ring-cyan-500/30 !cursor-crosshair !z-30"
      />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';
