import { useState } from 'react';
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface ChatBoxProps {
  agentId: string;
  agentName: string;
}

export function ChatBox({ agentId, agentName }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { currentUserId, currentUserName, userRole, updateNodeStatus } = useWorkspaceStore();

  const handleSend = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const promptText = message.trim();
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
        text: `Steering directive dispatched to ${agentName}`,
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
    <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 flex flex-col gap-2">
      {feedback && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/70 border border-rose-800/80 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span className="truncate">{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(changeEvent) => setMessage(changeEvent.target.value)}
          disabled={isReadOnly || isSending}
          placeholder={
            isReadOnly
              ? 'Read-only observer mode (Chat disabled)'
              : `Wake or redirect ${agentName}...`
          }
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        />

        <button
          type="submit"
          disabled={!message.trim() || isReadOnly || isSending}
          className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex items-center justify-center shrink-0 shadow-sm"
          title="Send steering prompt"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 fill-white" />
          )}
        </button>
      </form>
    </div>
  );
}
