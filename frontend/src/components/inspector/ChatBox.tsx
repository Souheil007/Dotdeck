import { useState } from 'react';
import { Send, Zap } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface ChatBoxProps {
  agentName: string;
}

export function ChatBox({ agentName }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { userRole } = useWorkspaceStore();

  const handleSend = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!message.trim() || userRole === 'read') return;

    setIsSending(true);
    try {
      // Dispatched via wake-up bridge or held poll channel
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-950/80">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(changeEvent) => setMessage(changeEvent.target.value)}
          disabled={userRole === 'read' || isSending}
          placeholder={
            userRole === 'read'
              ? 'Read-only observer mode'
              : `Send instruction to wake or redirect ${agentName}...`
          }
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!message.trim() || userRole === 'read' || isSending}
          className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
        >
          <Zap className="w-4 h-4 fill-white" />
        </button>
      </div>
    </form>
  );
}
