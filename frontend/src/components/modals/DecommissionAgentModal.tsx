import { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Cable, ShieldOff, ZapOff } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function DecommissionAgentModal() {
  const {
    decommissionTarget,
    closeDecommissionModal,
    deleteAgentNode,
  } = useWorkspaceStore();

  // Handle keyboard shortcuts (Escape = Discard, Enter = Confirm)
  useEffect(() => {
    if (!decommissionTarget) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDecommissionModal();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        deleteAgentNode(decommissionTarget.id);
        closeDecommissionModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [decommissionTarget, closeDecommissionModal, deleteAgentNode]);

  if (!decommissionTarget) return null;

  const handleConfirm = () => {
    deleteAgentNode(decommissionTarget.id);
    closeDecommissionModal();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#ffffff] dark:bg-[#0e1014] border-2 border-rose-500/50 dark:border-rose-600/60 shadow-2xl shadow-rose-950/40 overflow-hidden">
        {/* Top Emergency Status Bar */}
        <div className="bg-rose-500/10 dark:bg-rose-950/40 border-b border-rose-500/30 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <AlertTriangle className="w-4 h-4 animate-pulse stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Destructive Action Warning
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              </div>
              <p className="font-display font-bold text-sm text-[#121417] dark:text-[#f0f2f5] leading-none mt-0.5">
                Decommission Agent Node
              </p>
            </div>
          </div>

          <button
            onClick={closeDecommissionModal}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-mono text-[10px]"
            title="Discard & Close [Esc]"
          >
            <span>[ESC]</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Target Agent Pill */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#16181e] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold block mb-0.5">
                Target Node For Decommission
              </span>
              <h4 className="font-display font-bold text-base text-[#121417] dark:text-white">
                {decommissionTarget.name}
              </h4>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] font-semibold border border-zinc-300 dark:border-zinc-700">
                {decommissionTarget.provider ? decommissionTarget.provider.replace('_', ' ') : 'Cloud Agent'}
              </span>
            </div>
          </div>

          {/* Impact Warning Checklist */}
          <div className="space-y-2.5 font-sans">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold block">
              Cascading System Impact:
            </span>

            <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs space-y-2">
              <div className="flex items-start gap-2.5 text-zinc-700 dark:text-zinc-300">
                <Cable className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-rose-700 dark:text-rose-400 font-semibold font-mono">
                    {decommissionTarget.connectedWiresCount} Handoff Wires Severed:
                  </strong>{' '}
                  All dynamic delegation tools connected to this agent will be erased from downstream peer toolbelts.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-zinc-700 dark:text-zinc-300">
                <ShieldOff className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-rose-700 dark:text-rose-400 font-semibold font-mono">
                    MCP Token Revocation:
                  </strong>{' '}
                  The cloud computer's access credentials to Dotdeck's JSON-RPC endpoint will be invalidated.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-zinc-700 dark:text-zinc-300">
                <ZapOff className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-rose-700 dark:text-rose-400 font-semibold font-mono">
                    Telemetry Purge:
                  </strong>{' '}
                  Live reasoning streams and pending human approval holds assigned to this agent will be dropped.
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-mono">
            Are you sure you want to proceed? Fleet counts and canvas topology will update immediately to reflect this change.
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-zinc-50/80 dark:bg-[#121418] border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeDecommissionModal}
            className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Discard</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">[ESC]</span>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Destroy &amp; Decommission</span>
            <span className="text-[10px] bg-rose-700/80 dark:bg-rose-700/80 px-1.5 py-0.2 rounded font-bold">
              [↵]
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
