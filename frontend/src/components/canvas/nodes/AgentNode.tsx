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
    badgeClass: 'bg-[#f4f5f7] dark:bg-[#171a21] text-[#5e6c84] dark:text-[#8c96a5] border-[#dfe1e6] dark:border-[#22262e]',
    borderClass: 'border-dashed border-[#dfe1e6] dark:border-[#22262e] bg-[#ffffff] dark:bg-[#111317]',
    icon: Bot,
    description: 'Awaiting remote MCP handshake',
  },
  resting: {
    label: 'Resting',
    badgeClass: 'bg-[#f4f5f7] dark:bg-[#171a21] text-[#5e6c84] dark:text-[#8c96a5] border-[#dfe1e6] dark:border-[#22262e]',
    borderClass: 'border-[#dfe1e6] dark:border-[#22262e] bg-[#ffffff] dark:bg-[#111317]',
    icon: Clock,
    description: 'Standby in vendor cloud',
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-[#0052cc] dark:text-[#2684ff] border-blue-200 dark:border-blue-900/60',
    borderClass: 'border-blue-300 dark:border-blue-900/60 bg-[#ffffff] dark:bg-[#111317]',
    icon: Clock,
    description: 'Waiting for cron trigger',
  },
  working: {
    label: 'Working',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/80 text-[#00875a] dark:text-[#36b37e] border-emerald-200 dark:border-emerald-800',
    borderClass: 'border-[#00875a] dark:border-[#36b37e] shadow-glow-working ring-1 ring-[#00875a]/30 dark:ring-[#36b37e]/30 bg-[#ffffff] dark:bg-[#111317]',
    icon: Zap,
    description: 'Executing tool or reasoning loop',
  },
  blocked_on_user: {
    label: 'Needs Authority',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/80 text-[#ff8b00] dark:text-[#ffab00] border-amber-200 dark:border-amber-800',
    borderClass: 'border-[#ff8b00] dark:border-[#ffab00] shadow-glow-hold ring-1 ring-[#ff8b00]/40 dark:ring-[#ffab00]/40 bg-[#ffffff] dark:bg-[#111317]',
    icon: ShieldAlert,
    description: 'Paused in 45s hold engine',
  },
  failed: {
    label: 'Terminated',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/80 text-[#de350b] dark:text-[#ff5630] border-rose-200 dark:border-rose-800',
    borderClass: 'border-[#de350b] dark:border-[#ff5630] bg-[#ffffff] dark:bg-[#111317]',
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
    label: 'xAI Grok Bot',
    icon: Flame,
    badgeColor: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/60',
    textColor: 'text-sky-700 dark:text-sky-400',
  },
  meta_muse: {
    label: 'Meta Muse',
    icon: Globe,
    badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/60',
    textColor: 'text-indigo-700 dark:text-indigo-400',
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
      className={`relative w-[360px] rounded-xl p-4.5 transition-all duration-200 border cursor-pointer select-none ${
        config.borderClass
      } ${
        selected
          ? 'ring-2 ring-[#0052cc] dark:ring-[#2684ff] ring-offset-2 ring-offset-white dark:ring-offset-[#07080b] shadow-tactical-md'
          : 'shadow-tactical-sm hover:shadow-tactical-md'
      }`}
    >
      {/* 4 Connection Handles with hardware port styling and expanded hit-zones */}
      <Handle
        type="target"
        position={Position.Top}
        id="handle-top"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3 !h-3 !rounded-full !bg-[#5e6c84] dark:!bg-[#8c96a5] hover:!bg-[#0052cc] dark:hover:!bg-[#2684ff] !border-2 !border-white dark:!border-[#111317] shadow-xs !cursor-crosshair !z-30 before:content-[''] before:absolute before:-inset-2 before:rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="handle-left"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3 !h-3 !rounded-full !bg-[#5e6c84] dark:!bg-[#8c96a5] hover:!bg-[#0052cc] dark:hover:!bg-[#2684ff] !border-2 !border-white dark:!border-[#111317] shadow-xs !cursor-crosshair !z-30 before:content-[''] before:absolute before:-inset-2 before:rounded-full"
      />

      {/* Header Row: Provider Badge + Agent Title + Status Pill */}
      <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-[#dfe1e6] dark:border-[#22262e]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-xs ${providerMeta.badgeColor}`}>
            <ProviderIcon className={`w-4 h-4 ${providerMeta.textColor}`} />
          </div>
          <div className="min-w-0">
            <h4 className="font-display text-[13px] font-bold text-[#121417] dark:text-[#f0f2f5] truncate tracking-tight">
              {data.name}
            </h4>
            <span className={`text-[10px] font-mono font-medium block truncate ${providerMeta.textColor}`}>
              {providerMeta.label}
            </span>
          </div>
        </div>

        {/* State Phosphor Badge */}
        <div className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold flex items-center gap-1.5 shrink-0 ${config.badgeClass}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Target Mission Section */}
      <div className="p-3 rounded-lg bg-[#f4f5f7] dark:bg-[#07080b] border border-[#dfe1e6] dark:border-[#22262e] text-xs">
        <span className="text-[9px] font-mono uppercase tracking-wider text-[#5e6c84] dark:text-[#8c96a5] font-bold block mb-1">
          Target Mission
        </span>
        <p className="text-[#121417] dark:text-[#f0f2f5] leading-relaxed line-clamp-2 text-[11px]">
          {data.goal || 'No ongoing autonomous mission assigned.'}
        </p>
      </div>

      {/* Live Thought Ticker Box (Working State) */}
      {data.status === 'working' && data.currentThought && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-xs font-mono text-[11px]">
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875a] dark:bg-[#36b37e] animate-ping" />
              <span>Inner Reasoning Loop</span>
            </div>
            {data.currentStep && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-300 truncate max-w-[130px]">
                {data.currentStep}
              </span>
            )}
          </div>
          <p className="text-emerald-950 dark:text-emerald-100 line-clamp-2 leading-snug">
            &gt; {data.currentThought}
          </p>
        </div>
      )}

      {/* Blocked on Human Authority Banner */}
      {data.status === 'blocked_on_user' && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1 text-amber-900 dark:text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-[#ff8b00] dark:text-[#ffab00] animate-bounce" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Operator Sign-off Required (45s Channel)
            </span>
          </div>
          <p className="text-[11px] text-amber-950 dark:text-amber-100 line-clamp-2">
            Cloud agent paused on high-stakes tool execution. Click to open review drawer.
          </p>
        </div>
      )}

      {/* Footer Info & Telemetry Actions */}
      <div className="mt-3 pt-2.5 border-t border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-between text-[11px] font-mono text-[#5e6c84] dark:text-[#8c96a5]">
        <div className="flex items-center gap-1.5">
          {data.lastRunStatus === 'success' && (
            <CheckCircle className="w-3 h-3 text-[#00875a] dark:text-[#36b37e]" />
          )}
          <span>{data.lastRunTime ? `Ran ${data.lastRunTime}` : 'Ready'}</span>
        </div>

        {data.status === 'unpaired' ? (
          <button
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              openPairingModal(data);
            }}
            className="px-2.5 py-0.5 rounded bg-[#0052cc] hover:bg-[#0747a6] dark:bg-[#2684ff] text-white font-medium text-[11px] transition-colors shadow-xs"
          >
            Pair Agent
          </button>
        ) : (
          <span className="px-1.5 py-0.2 rounded bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] text-[10px]">
            {data.scheduleCron ? `cron: ${data.scheduleCron}` : '24/7 Standby'}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="handle-bottom"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3 !h-3 !rounded-full !bg-[#0052cc] dark:!bg-[#2684ff] hover:!bg-[#0747a6] !border-2 !border-white dark:!border-[#111317] shadow-xs !cursor-crosshair !z-30 before:content-[''] before:absolute before:-inset-2 before:rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="handle-right"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="!w-3 !h-3 !rounded-full !bg-[#0052cc] dark:!bg-[#2684ff] hover:!bg-[#0747a6] !border-2 !border-white dark:!border-[#111317] shadow-xs !cursor-crosshair !z-30 before:content-[''] before:absolute before:-inset-2 before:rounded-full"
      />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';
