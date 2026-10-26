import { useState } from 'react';
import { AlertCircle, Check, X, Send, Lock, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import type { ApprovalRequest } from '../../store/useWorkspaceStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface ApprovalBoxProps {
  approval: ApprovalRequest;
}

export function ApprovalBox({ approval }: ApprovalBoxProps) {
  const [customReply, setCustomReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      // Non-fatal if offline or network error
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

  return (
    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-600/40 text-xs shadow-md relative overflow-hidden">
      {/* Header Banner */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-semibold uppercase tracking-wider text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
          <span>Action Gated Behind Authority</span>
        </div>

        {/* Lock Badges */}
        {isLockedByOther && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{approval.lockedByName || 'Teammate'} is reviewing</span>
          </div>
        )}

        {isLockedByMe && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-indigo-950/80 text-[10px] text-blue-800 dark:text-indigo-300 border border-blue-300 dark:border-indigo-700">
            <UserCheck className="w-3 h-3 text-blue-600 dark:text-indigo-400" />
            <span>You hold review lock</span>
          </div>
        )}
      </div>

      {/* Question & Reasoning Body */}
      <div className="p-3 rounded-lg bg-white dark:bg-zinc-950/80 border border-amber-200 dark:border-zinc-800/80 mb-3 space-y-2">
        <p className="text-[#202124] dark:text-zinc-100 text-sm font-medium leading-relaxed">
          {approval.question}
        </p>
        {approval.reasoningTrace && (
          <p className="text-[#5f6368] dark:text-zinc-400 italic text-[11px] border-l-2 border-amber-500 pl-2 mt-1.5 leading-relaxed">
            &ldquo;{approval.reasoningTrace}&rdquo;
          </p>
        )}
      </div>

      {/* Suggested Quick-Choice Options */}
      {approval.options && approval.options.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block">
            Suggested Options
          </span>
          <div className="flex flex-wrap gap-1.5">
            {approval.options.map((option) => (
              <button
                key={option}
                disabled={!canOperate || isSubmitting}
                onClick={() => handleResolve(true, option)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-600 disabled:opacity-40 text-zinc-800 dark:text-zinc-200 font-medium text-xs transition-colors flex items-center gap-1 shadow-xs"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Answer Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={customReply}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(event) => setCustomReply(event.target.value)}
            disabled={!canOperate || isSubmitting}
            placeholder={
              userRole === 'read'
                ? 'Read-only observer mode'
                : isLockedByOther
                ? `${approval.lockedByName || 'Teammate'} is currently authoring a decision...`
                : 'Type guidance or modified instruction...'
            }
            className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
          {customReply.trim() && (
            <button
              disabled={!canOperate || isSubmitting}
              onClick={() => handleResolve(true, customReply.trim())}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1 transition-colors shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>Send</span>
            </button>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            disabled={!canOperate || isSubmitting}
            onClick={() => handleResolve(true, 'Approved by operator')}
            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Approve</span>
          </button>
          <button
            disabled={!canOperate || isSubmitting}
            onClick={() => handleResolve(false, 'Rejected by operator')}
            className="flex-1 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 text-zinc-700 dark:text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <X className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>Reject</span>
          </button>
        </div>

        {errorMessage && (
          <p className="text-[11px] text-rose-500 dark:text-rose-400 pt-1 text-center font-mono">{errorMessage}</p>
        )}

        {userRole === 'read' && (
          <p className="text-[10px] text-zinc-500 pt-1 text-center font-mono">
            Read-only observer mode (Operator role required to resolve approvals)
          </p>
        )}
      </div>
    </div>
  );
}
