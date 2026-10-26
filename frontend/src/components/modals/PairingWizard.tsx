import { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles, ShieldCheck, CheckCircle2, Radio, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const providerGuidance: Record<string, { targetName: string; locationText: string }> = {
  openai_dot: {
    targetName: 'OpenAI Dot / Custom GPT',
    locationText: "Paste into the 'Instructions' configuration field of your OpenAI Dot.",
  },
  grok_bot: {
    targetName: 'xAI Grok Bot',
    locationText: "Paste into your Grok Cloud Computer system directive panel.",
  },
  meta_muse: {
    targetName: 'Meta Muse Agent',
    locationText: "Paste into your Meta Muse Secure VM agent prompt configuration.",
  },
  claude: {
    targetName: 'Claude Cloud Agent',
    locationText: "Paste into your Claude Project or custom agent system prompt.",
  },
};

export function PairingWizard() {
  const { isPairingModalOpen, pairingAgent, pairingSession, closePairingModal, nodes } = useWorkspaceStore();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [justPaired, setJustPaired] = useState(false);

  // Monitor live node status to detect immediate heartbeat transition
  const liveAgentNode = nodes.find((node) => node.id === pairingAgent?.id);
  const currentStatus = liveAgentNode ? liveAgentNode.data.status : pairingAgent?.status || 'unpaired';
  const isPaired = currentStatus !== 'unpaired';

  useEffect(() => {
    if (isPaired && !justPaired) {
      setJustPaired(true);
    }
  }, [isPaired, justPaired]);

  if (!isPairingModalOpen || !pairingAgent) return null;

  const mcpUrl =
    pairingSession?.mcpUrl ||
    `http://localhost:8080/mcp/ag_${pairingAgent.id.replace(/-/g, '').slice(0, 16)}`;

  const bootstrapPrompt =
    pairingSession?.bootstrapPrompt ||
    `### ROLE & IDENTITY: ${pairingAgent.name}
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

  const guidance = providerGuidance[pairingAgent.provider] || {
    targetName: 'Cloud Provider',
    locationText: "Paste into your agent's system prompt or configuration screen.",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl my-8 text-[#202124] dark:text-zinc-100">
        <button
          onClick={closePairingModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Wizard Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-indigo-950/80 border border-blue-200 dark:border-indigo-700/50">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#202124] dark:text-white flex items-center gap-2">
              <span>Pair {pairingAgent.name}</span>
              {isPaired && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono">
                  ONLINE
                </span>
              )}
            </h3>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400">
              60-Second Onboarding Wizard for {guidance.targetName}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          {/* Step 1: Remote MCP URL */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[#202124] dark:text-zinc-200">1. Unique Remote MCP Switchboard Endpoint</span>
              <button
                onClick={() => copyToClipboard(mcpUrl, 'url')}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied URL' : 'Copy URL'}</span>
              </button>
            </div>
            <code className="block p-2 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-[#202124] dark:text-zinc-300 break-all select-all">
              {mcpUrl}
            </code>
          </div>

          {/* Step 2: Vendor Bootstrap Instruction */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[#202124] dark:text-zinc-200">2. Tailored Bootstrap Instruction Prompt</span>
              <button
                onClick={() => copyToClipboard(bootstrapPrompt, 'prompt')}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copied Prompt' : 'Copy Prompt'}</span>
              </button>
            </div>
            <p className="text-[#5f6368] dark:text-zinc-400 mb-2 leading-relaxed text-[11px]">
              {guidance.locationText}
            </p>
            <div className="max-h-40 overflow-y-auto p-2.5 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-[#202124] dark:text-zinc-300 whitespace-pre-wrap select-all leading-relaxed">
              {bootstrapPrompt}
            </div>
          </div>

          {/* Step 3: Live Heartbeat Listener */}
          <div
            className={`p-4 rounded-xl border transition-all duration-300 ${
              isPaired
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600/70 shadow-sm dark:shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800'
            }`}
          >
            {isPaired ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                      Heartbeat Handshake Confirmed!
                    </h4>
                    <p className="text-[11px] text-[#5f6368] dark:text-zinc-400 mt-0.5">
                      Cloud agent called <code className="text-[#202124] dark:text-zinc-300 font-mono">initialize()</code>. Node is now live on canvas.
                    </p>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center p-2">
                    <Radio className="w-4 h-4 text-blue-600 dark:text-indigo-400" />
                    <span className="absolute w-6 h-6 rounded-full bg-blue-500/20 dark:bg-indigo-500/20 animate-ping" />
                  </div>
                  <div>
                    <span className="font-medium text-[#202124] dark:text-zinc-200 block">
                      3. Awaiting Vendor Handshake...
                    </span>
                    <span className="text-[11px] text-[#5f6368] dark:text-zinc-500">
                      Listening for incoming <code className="text-zinc-700 dark:text-zinc-400 font-mono">mcp.initialize()</code> from cloud VM...
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 border border-zinc-300 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                  AUTO-DETECT
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Wizard Footer */}
        <div className="mt-6 flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
          <div className="text-[11px] text-[#5f6368] dark:text-zinc-500">
            {isPaired ? 'Agent is ready to receive tasks & handoffs.' : 'Paste prompt into your vendor console to connect.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closePairingModal}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isPaired
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
              }`}
            >
              <span>{isPaired ? 'View on Canvas' : 'Close & Wait in Background'}</span>
              {isPaired && <ExternalLink className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
