import { useState } from 'react';
import { X, Copy, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function PairingWizard() {
  const { isPairingModalOpen, pairingAgent, closePairingModal } = useWorkspaceStore();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isPairingModalOpen || !pairingAgent) return null;

  const mcpUrl = `http://localhost:8080/mcp/ag_${pairingAgent.id.slice(0, 8)}`;
  const bootstrapPrompt = `### ROLE & IDENTITY: ${pairingAgent.name}
You are connected to the Dotdeck Collaborative Agent Switchboard via remote MCP.
Endpoint URL: ${mcpUrl}

### ONGOING GOAL:
${pairingAgent.goal}

### MANDATORY TELEMETRY & REPORTING RULES:
1. Every time you reach a reasoning milestone or plan an action, you MUST call report_thought_step(reasoning_trace, next_planned_step).
2. When requiring human confirmation or hitting authority boundaries, you MUST call ask_human_question(question, reasoning_trace) and wait for the response.
3. Use delegate_task_* tools to pass structured artifacts to your connected peers on the Dotdeck canvas.`;

  const copyToClipboard = (text: string, type: 'url' | 'prompt') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl">
        <button
          onClick={closePairingModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/50">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pair {pairingAgent.name}</h3>
            <p className="text-xs text-zinc-400">Bootstrap your closed cloud agent in 60 seconds</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-xs">
          {/* Step 1: Remote MCP URL */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-zinc-200">1. Unique MCP Endpoint URL</span>
              <button
                onClick={() => copyToClipboard(mcpUrl, 'url')}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <code className="block p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 break-all select-all">
              {mcpUrl}
            </code>
          </div>

          {/* Step 2: Bootstrap Instruction */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-zinc-200">2. Bootstrap Instruction Prompt</span>
              <button
                onClick={() => copyToClipboard(bootstrapPrompt, 'prompt')}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
              </button>
            </div>
            <p className="text-zinc-400 mb-2 leading-relaxed">
              Paste this block into your agent&apos;s system prompt or initial conversation turn in OpenAI / Grok / Meta.
            </p>
            <div className="max-h-32 overflow-y-auto p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap select-all">
              {bootstrapPrompt}
            </div>
          </div>

          {/* Step 3: Status Polling */}
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-medium">Listening for mcp.initialize() heartbeat...</span>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={closePairingModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
