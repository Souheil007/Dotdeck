import { useState } from 'react';
import { Send, Loader2, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface ChatBoxProps {
  agentId: string;
  agentName: string;
}

const PRESET_DIRECTIVES = [
  'Pause and summarize current state',
  'Require human sign-off on next action',
  'Verify step output before continuing',
];

export function ChatBox({ agentId, agentName }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { currentUserId, currentUserName, userRole, updateNodeStatus } = useWorkspaceStore();

  const handleSendPrompt = async (promptToSend: string) => {
    const promptText = promptToSend.trim();
    if (!promptText || userRole === 'read' || isSending) return;

    setIsSending(true);
    setFeedback(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/v1/agents/${agentId}/steer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
          'X-User-Name': currentUserName,
        },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      setMessage('');
      updateNodeStatus(agentId, 'working');
      setFeedback({
        type: 'success',
        text: `Directive dispatched to ${agentName}`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to steer agent';
      setFeedback({ type: 'error', text: errorMsg });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsSending(false);
    }
  };

  const isReadOnly = userRole === 'read';

  return (
    <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-[#0c0d10] flex flex-col gap-2">
      {/* Preset Directives Strip */}
      {!isReadOnly && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500 shrink-0">
            Presets:
          </span>
          {PRESET_DIRECTIVES.map((directive) => (
            <button
              key={directive}
              type="button"
              disabled={isSending}
              onClick={() => handleSendPrompt(directive)}
              className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-750 hover:border-blue-400 dark:hover:border-cyan-500 hover:text-blue-600 dark:hover:text-cyan-400 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono whitespace-nowrap transition-colors shrink-0 shadow-xs"
            >
              + {directive}
            </button>
          ))}
        </div>
      )}

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="truncate">{feedback.text}</span>
        </div>
      )}

      {/* Steering Input Form */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSendPrompt(message);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400 dark:text-zinc-500 pointer-events-none select-none">
            <Terminal className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
            <span className="font-mono text-xs font-bold">&gt;</span>
          </div>
          <input
            type="text"
            value={message}
            onChange={(changeEvent) => setMessage(changeEvent.target.value)}
            disabled={isReadOnly || isSending}
            placeholder={
              isReadOnly
                ? 'Read-only observer mode (Steering disabled)'
                : `Inject steering instruction to ${agentName}...`
            }
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-[#121318] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-[#202124] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 disabled:opacity-50 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isReadOnly || isSending}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-black disabled:opacity-40 text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
          title="Send steering prompt [Enter]"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Steer</span>
        </button>
      </form>
    </div>
  );
}
