import { useState } from 'react';
import { AlertCircle, Check, X, Send, Lock } from 'lucide-react';
import type { ApprovalRequest } from '../../store/useWorkspaceStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface ApprovalBoxProps {
  approval: ApprovalRequest;
}

export function ApprovalBox({ approval }: ApprovalBoxProps) {
  const [customReply, setCustomReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resolveApproval, userRole } = useWorkspaceStore();

  const handleResolve = async (approved: boolean, answer: string) => {
    setIsSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/v1/approvals/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: approval.id,
          approved,
          answer,
        }),
      });
      resolveApproval(approval.id, approved, answer);
    } catch {
      // In local demo or offline mode, still unblock locally
      resolveApproval(approval.id, approved, answer);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLockedByOther = Boolean(approval.lockedBy && approval.lockedBy !== 'current-user');
  const canOperate = userRole !== 'read' && !isLockedByOther;

  return (
    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/40 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold uppercase tracking-wider text-[11px]">
          <AlertCircle className="w-4 h-4" />
          <span>Action Gated Behind Human Authority</span>
        </div>

        {approval.lockedByName && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>{approval.lockedByName} is reviewing</span>
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 mb-3">
        <p className="text-zinc-100 text-sm font-medium leading-relaxed">{approval.question}</p>
        {approval.reasoningTrace && (
          <p className="text-zinc-400 mt-2 italic text-[11px]">
            &ldquo;{approval.reasoningTrace}&rdquo;
          </p>
        )}
      </div>

      {/* Suggested Options */}
      {approval.options && approval.options.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {approval.options.map((opt) => (
            <button
              key={opt}
              disabled={!canOperate || isSubmitting}
              onClick={() => handleResolve(true, opt)}
              className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-medium text-xs transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Custom Answer Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={customReply}
            onChange={(e) => setCustomReply(e.target.value)}
            disabled={!canOperate || isSubmitting}
            placeholder={
              userRole === 'read'
                ? 'Read-only observer mode'
                : 'Type guidance or modified instruction...'
            }
            className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
          {customReply.trim() && (
            <button
              disabled={!canOperate || isSubmitting}
              onClick={() => handleResolve(true, customReply.trim())}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>Send</span>
            </button>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            disabled={!canOperate || isSubmitting}
            onClick={() => handleResolve(true, 'Approved by operator')}
            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve</span>
          </button>
          <button
            disabled={!canOperate || isSubmitting}
            onClick={() => handleResolve(false, 'Rejected by operator')}
            className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  );
}
