import { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Check,
  X,
  Send,
  Lock,
  Loader2,
  ShieldCheck,
  UserCheck,
  Terminal,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { ApprovalRequest } from '../../store/useWorkspaceStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface ApprovalBoxProps {
  approval: ApprovalRequest;
}

const TOTAL_TIMEOUT_SECONDS = 45;

export function ApprovalBox({ approval }: ApprovalBoxProps) {
  const [customReply, setCustomReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTAL_TIMEOUT_SECONDS);

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    workspaceId,
    currentUserId,
    currentUserName,
    userRole,
    resolveApproval,
    updateNodeStatus,
  } = useWorkspaceStore();

  const isLockedByOther = Boolean(
    approval.lockedBy && approval.lockedBy !== currentUserId
  );
  const isLockedByMe = Boolean(
    approval.lockedBy && approval.lockedBy === currentUserId
  );
  const canOperate = userRole !== 'read' && !isLockedByOther;

  // Real-time 45.0s countdown clock
  useEffect(() => {
    // If approval has a creation timestamp, calculate elapsed time
    const startTime = approval.createdAt ? new Date(approval.createdAt).getTime() : Date.now();
    const timerInterval = setInterval(() => {
      const elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
      const remaining = Math.max(0, TOTAL_TIMEOUT_SECONDS - elapsedSeconds);
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timerInterval);
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [approval.createdAt]);

  const handleFocus = async () => {
    if (!canOperate || isLockedByMe) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/v1/approvals/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
          'X-User-Name': currentUserName,
        },
        body: JSON.stringify({
          approval_id: approval.id,
          workspace_id: workspaceId || 'default-workspace',
        }),
      });
    } catch {
      // Non-fatal if offline
    }
  };

  const handleBlur = async () => {
    if (!isLockedByMe || customReply.trim()) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/v1/approvals/release-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
          'X-User-Name': currentUserName,
        },
        body: JSON.stringify({
          approval_id: approval.id,
          workspace_id: workspaceId || 'default-workspace',
        }),
      });
    } catch {
      // Non-fatal if offline
    }
  };

  const handleResolve = async (approved: boolean, answer: string) => {
    if (!canOperate || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/v1/approvals/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
          'X-User-Name': currentUserName,
        },
        body: JSON.stringify({
          approval_id: approval.id,
          approved,
          answer,
        }),
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      // Optimistically resolve in store and unblock node
      resolveApproval(approval.id, approved, answer);
      updateNodeStatus(approval.agentId, 'working');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve approval';
      // In standalone demo or offline mode, still unblock locally
      resolveApproval(approval.id, approved, answer);
      updateNodeStatus(approval.agentId, 'working');
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SVG circle calculation
  const circleRadius = 14;
  const circumference = 2 * Math.PI * circleRadius;
  const progressRatio = secondsRemaining / TOTAL_TIMEOUT_SECONDS;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const isLowTime = secondsRemaining <= 10;
  const timerColor = isLowTime
    ? '#ef4444' // Rose
    : secondsRemaining <= 20
    ? '#f59e0b' // Amber
    : '#10b981'; // Emerald

  return (
    <div className="relative rounded-xl border border-amber-500/40 dark:border-amber-500/30 bg-amber-50/40 dark:bg-[#14120c] p-4 text-xs shadow-lg backdrop-blur-md overflow-hidden transition-all duration-200">
      {/* Top telemetry status ribbon */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-350 dark:border-amber-500/20">
        <div className="flex items-center gap-2">
          {/* Animated circular countdown indicator */}
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 -rotate-90">
              <circle
                cx="16"
                cy="16"
                r={circleRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-amber-200 dark:text-zinc-800"
              />
              <circle
                cx="16"
                cy="16"
                r={circleRadius}
                fill="none"
                stroke={timerColor}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-100 ease-linear"
              />
            </svg>
            <Clock className={`w-3.5 h-3.5 absolute ${isLowTime ? 'text-rose-500 animate-pulse' : 'text-amber-600 dark:text-amber-400'}`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Operator Hold Intercept
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>
            <div className="font-mono text-[11px] tabular-nums font-semibold text-zinc-700 dark:text-zinc-300">
              {secondsRemaining.toFixed(1)}s remaining <span className="text-zinc-400 font-normal">/ 45.0s window</span>
            </div>
          </div>
        </div>

        {/* Lock or Status Badges */}
        {isLockedByOther ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 font-mono border border-zinc-300 dark:border-zinc-700">
            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{approval.lockedByName || 'Peer'} holds lock</span>
          </div>
        ) : isLockedByMe ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-100 dark:bg-cyan-950/80 text-[10px] text-cyan-800 dark:text-cyan-300 font-mono border border-cyan-300 dark:border-cyan-700">
            <UserCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>Review lock active</span>
          </div>
        ) : (
          <div className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60">
            Gated
          </div>
        )}
      </div>

      {/* Main Approval Body & Question */}
      <div className="mb-3 rounded-lg bg-white/90 dark:bg-[#0c0d10] border border-amber-200/80 dark:border-zinc-800/80 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Terminal className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-medium leading-relaxed text-[#202124] dark:text-zinc-100">
              {approval.question}
            </p>
          </div>
        </div>

        {approval.reasoningTrace && (
          <div className="mt-2 pt-2 border-t border-zinc-150 dark:border-zinc-800/70 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-md">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold mb-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Interrupted Agent Hypothesis:</span>
            </div>
            &ldquo;{approval.reasoningTrace}&rdquo;
          </div>
        )}
      </div>

      {/* Quick-choice predefined response pills */}
      {approval.options && approval.options.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Suggested Options (Quick-Action):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {approval.options.map((option, index) => (
              <button
                key={option}
                disabled={!canOperate || isSubmitting}
                onClick={() => handleResolve(true, option)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-750 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-zinc-800 disabled:opacity-40 text-zinc-800 dark:text-zinc-200 font-mono text-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">[{index + 1}]</span>
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Directive Input with chevron prompt */}
      <div className="space-y-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-amber-600 dark:text-amber-400 pointer-events-none select-none">
              &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              value={customReply}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={(event) => setCustomReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && customReply.trim() && canOperate && !isSubmitting) {
                  handleResolve(true, customReply.trim());
                }
              }}
              disabled={!canOperate || isSubmitting}
              placeholder={
                userRole === 'read'
                  ? 'Read-only observer mode'
                  : isLockedByOther
                  ? `${approval.lockedByName || 'Peer'} is authoring a response...`
                  : 'Inject steering parameter or custom answer...'
              }
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#0c0d10] border border-zinc-300 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>

          {customReply.trim() && (
            <button
              disabled={!canOperate || isSubmitting}
              onClick={() => handleResolve(true, customReply.trim())}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-black font-semibold text-white text-xs font-mono flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Dispatch</span>
            </button>
          )}
        </div>

        {/* Dual Primary Operator Decisions (Authorize vs Abort) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            disabled={!canOperate || isSubmitting}
            onClick={() => handleResolve(true, 'Authorized by operator')}
            className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-40"
            title="Approve and release held execution"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span className="font-semibold">Authorize &amp; Release</span>
          </button>

          <button
            disabled={!canOperate || isSubmitting}
            onClick={() => handleResolve(false, 'Halted & rejected by operator')}
            className="py-2 px-3 rounded-lg bg-white dark:bg-[#0c0d10] border border-zinc-300 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 text-zinc-700 dark:text-zinc-200 hover:text-rose-600 dark:hover:text-rose-400 font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
            title="Abort operation"
          >
            <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
            <span className="font-semibold">Reject &amp; Abort</span>
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-1.5 p-2 rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-mono text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {userRole === 'read' && (
          <p className="text-[10px] text-zinc-500 pt-0.5 text-center font-mono">
            Read-only observer mode (Write permissions required to authorize holds)
          </p>
        )}
      </div>
    </div>
  );
}
