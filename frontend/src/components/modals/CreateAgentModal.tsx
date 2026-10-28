import { useState } from 'react';
import { X, Sparkles, ShieldAlert, Clock, Plus, Trash2, Loader2, Bot, Copy, Check, Radio } from 'lucide-react';
import { useWorkspaceStore, type AgentData } from '../../store/useWorkspaceStore';
import { OpenAILogo, GrokLogo, MetaMuseLogo, ClaudeLogo } from '../common/ProviderLogos';

const providerOptions = [
  {
    id: 'openai_dot',
    name: 'OpenAI Dot',
    description: 'Tier 3 OpenAI cloud computer with autonomous tool execution.',
    icon: OpenAILogo,
    color: 'emerald',
    borderColor: 'border-emerald-500/80',
    bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'grok_bot',
    name: 'xAI Grok Bot',
    description: 'xAI cloud agent with real-time reasoning and computer tools.',
    icon: GrokLogo,
    color: 'sky',
    borderColor: 'border-sky-500/80',
    bgColor: 'bg-sky-50/50 dark:bg-sky-950/40',
    textColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'meta_muse',
    name: 'Meta Muse',
    description: 'Meta Muse secure VM agent with webhook check-in fallback.',
    icon: MetaMuseLogo,
    color: 'indigo',
    borderColor: 'border-indigo-500/80',
    bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'claude',
    name: 'Claude Cloud',
    description: 'Anthropic Claude cloud agent with high reasoning density.',
    icon: ClaudeLogo,
    color: 'amber',
    borderColor: 'border-amber-500/80',
    bgColor: 'bg-amber-50/50 dark:bg-amber-950/40',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
] as const;

const commonAuthorityRules = [
  'Require human sign-off before modifying production databases',
  'Require operator approval before dispatching external emails',
  'Require human verification for financial transactions exceeding $0',
  'Require sign-off before executing irreversible API deletions',
];

export function CreateAgentModal() {
  const {
    isCreateAgentModalOpen,
    closeCreateAgentModal,
    addAgentNode,
    openPairingModal,
    workspaceId,
  } = useWorkspaceStore();

  const [provider, setProvider] = useState<'openai_dot' | 'grok_bot' | 'meta_muse' | 'claude'>('openai_dot');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [schedulePreset, setSchedulePreset] = useState<'none' | 'hourly' | 'daily' | 'custom'>('none');
  const [customCron, setCustomCron] = useState('');
  const [authorityRules, setAuthorityRules] = useState<string[]>([
    'Require human sign-off before modifying production databases',
  ]);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const selectedProviderOption = providerOptions.find((opt) => opt.id === provider);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const baseUrl = isLocalhost
    ? 'https://folding-trend-troy-optional.trycloudflare.com'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');

  const defaultSlug = provider === 'openai_dot' ? 'chatgpt' : provider === 'claude' ? 'claude' : provider === 'meta_muse' ? 'muse' : 'grok';
  const computedSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || defaultSlug;
  const dynamicMcpUrl = `${baseUrl}/mcp/ws/${workspaceId || 'default-workspace'}/${computedSlug}`;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(dynamicMcpUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  if (!isCreateAgentModalOpen) return null;

  const toggleCommonRule = (rule: string) => {
    if (authorityRules.includes(rule)) {
      setAuthorityRules(authorityRules.filter((existing) => existing !== rule));
    } else {
      setAuthorityRules([...authorityRules, rule]);
    }
  };

  const handleAddCustomRule = () => {
    const trimmed = newRuleInput.trim();
    if (trimmed && !authorityRules.includes(trimmed)) {
      setAuthorityRules([...authorityRules, trimmed]);
      setNewRuleInput('');
    }
  };

  const handleRemoveRule = (ruleToRemove: string) => {
    setAuthorityRules(authorityRules.filter((rule) => rule !== ruleToRemove));
  };

  const getComputedScheduleCron = (): string => {
    switch (schedulePreset) {
      case 'hourly':
        return '0 * * * *';
      case 'daily':
        return '0 9 * * *';
      case 'custom':
        return customCron.trim();
      default:
        return '';
    }
  };

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const scheduleCron = getComputedScheduleCron();
      const finalGoal = goal.trim() || `Autonomous ${selectedProviderOption?.name || 'Cloud'} Agent pursuing tasks and reporting telemetry.`;

      const response = await fetch(`${apiUrl}/api/v1/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId || 'default-workspace',
          name: name.trim(),
          provider,
          goal: finalGoal,
          schedule_cron: scheduleCron,
          authority_rules: authorityRules,
          position_x: 250 + Math.random() * 200,
          position_y: 150 + Math.random() * 150,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const responseJson = await response.json();
      const payload = responseJson.data || responseJson;

      const newAgent: AgentData = {
        id: payload.agent.id,
        name: payload.agent.name,
        provider: payload.agent.provider,
        goal: payload.agent.goal,
        scheduleCron: payload.agent.schedule_cron,
        status: 'unpaired',
      };

      // Add to canvas graph
      addAgentNode(newAgent);

      // Close creation modal and transition directly to the 3-step pairing wizard
      closeCreateAgentModal();
      openPairingModal(newAgent, payload.mcp_url, payload.bootstrap_prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to provision agent record';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-[#202124] dark:text-zinc-100 overflow-hidden">
        {/* Modal Header (Fixed) */}
        <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-indigo-950/80 border border-blue-200 dark:border-indigo-700/50">
              <Bot className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124] dark:text-white">Add Closed Cloud Agent</h2>
              <p className="text-xs text-[#5f6368] dark:text-zinc-400">
                Provision a Tier 3 cloud agent blueprint with remote MCP switchboard credentials.
              </p>
            </div>
          </div>
          <button
            onClick={closeCreateAgentModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs font-mono">
                {errorMessage}
              </div>
            )}
          {/* Provider Selection */}
          <div>
            <label className="block text-[#202124] dark:text-zinc-300 font-semibold mb-2">1. Select Cloud Agent Provider</label>
            <div className="grid grid-cols-2 gap-3">
              {providerOptions.map((option) => {
                const IconComponent = option.icon;
                const isSelected = provider === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setProvider(option.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? `${option.borderColor} ${option.bgColor} ring-1 ${option.borderColor}`
                        : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 ${option.textColor}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#202124] dark:text-zinc-100 flex items-center gap-1.5">
                        <span>{option.name}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-[#5f6368] dark:text-zinc-400 mt-0.5 leading-snug">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name, Dynamic Endpoint & Goal */}
          <div className="space-y-3">
            <div>
              <label className="block text-[#202124] dark:text-zinc-300 font-semibold mb-1.5">2. Agent Identity & Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(changeEvent) => setName(changeEvent.target.value)}
                placeholder="e.g. Email Reader, Urgent Escalator, Sales Lead Scout"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-[#202124] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-indigo-500 text-xs font-sans"
              />
            </div>

            {/* Dynamic Remote MCP Endpoint Preview */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-zinc-900/80 border border-blue-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs text-blue-900 dark:text-cyan-300 flex items-center gap-1.5 font-mono">
                  <Radio className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 animate-pulse" />
                  <span>Dynamic Remote MCP Endpoint</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyEndpoint}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-cyan-400 font-medium text-xs transition-colors"
                >
                  {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEndpoint ? 'Copied' : 'Copy Endpoint'}</span>
                </button>
              </div>
              <code className="block p-2 rounded bg-white dark:bg-zinc-950 border border-blue-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-900 dark:text-cyan-300 break-all select-all">
                {dynamicMcpUrl}
              </code>
              <p className="text-[11px] text-[#5f6368] dark:text-zinc-400 mt-1.5 leading-relaxed">
                Connect your {selectedProviderOption?.name || 'Agent'} using this exact URL. All handshakes, live thought streaming, and task deliveries route automatically to this canvas node.
              </p>
            </div>

            <div>
              <label className="block text-[#202124] dark:text-zinc-300 font-semibold mb-1.5">
                3. Ongoing Mission & Goal <span className="text-[10px] text-zinc-400 font-normal font-sans">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={goal}
                onChange={(changeEvent) => setGoal(changeEvent.target.value)}
                placeholder={`Define operational goal for ${name.trim() || 'this agent'} (optional)...`}
                className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-[#202124] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-indigo-500 text-xs font-sans leading-relaxed"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-[#202124] dark:text-zinc-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>4. Execution Schedule</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSchedulePreset('none')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'none'
                    ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-950/60 text-blue-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#5f6368] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                }`}
              >
                Event-driven / Handoffs Only
              </button>
              <button
                type="button"
                onClick={() => setSchedulePreset('hourly')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'hourly'
                    ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-950/60 text-blue-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#5f6368] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                }`}
              >
                Hourly (:00)
              </button>
              <button
                type="button"
                onClick={() => setSchedulePreset('daily')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'daily'
                    ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-950/60 text-blue-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#5f6368] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                }`}
              >
                Daily (9:00 AM)
              </button>
              <button
                type="button"
                onClick={() => setSchedulePreset('custom')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'custom'
                    ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-950/60 text-blue-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#5f6368] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                }`}
              >
                Custom Cron
              </button>
            </div>

            {schedulePreset === 'custom' && (
              <input
                type="text"
                value={customCron}
                onChange={(changeEvent) => setCustomCron(changeEvent.target.value)}
                placeholder="e.g. 0 */4 * * * (every 4 hours)"
                className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-[#202124] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Authority Constraints */}
          <div>
            <label className="block text-[#202124] dark:text-zinc-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>5. Authority Constraints (45s Hold Gating)</span>
            </label>
            <p className="text-[11px] text-[#5f6368] dark:text-zinc-500 mb-2">
              Actions triggering these rules will automatically pause execution for human operator sign-off.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {commonAuthorityRules.map((commonRule) => {
                const isSelected = authorityRules.includes(commonRule);
                return (
                  <button
                    key={commonRule}
                    type="button"
                    onClick={() => toggleCommonRule(commonRule)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-[#5f6368] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                    <span>{commonRule}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Rule Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newRuleInput}
                onChange={(changeEvent) => setNewRuleInput(changeEvent.target.value)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter') {
                    keyEvent.preventDefault();
                    handleAddCustomRule();
                  }
                }}
                placeholder="Add bespoke authority rule..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-[#202124] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomRule}
                disabled={!newRuleInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 disabled:opacity-50 text-zinc-700 dark:text-zinc-200 font-medium text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Active Rules List */}
            {authorityRules.length > 0 && (
              <ul className="mt-2.5 space-y-1 max-h-28 overflow-y-auto pr-1">
                {authorityRules.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-center justify-between p-1.5 rounded bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-[11px] text-[#202124] dark:text-zinc-300"
                  >
                    <span className="truncate mr-2">• {rule}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule)}
                      className="text-zinc-400 hover:text-rose-500 transition-colors p-0.5"
                      title="Remove rule"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Form Actions (Fixed Footer) */}
        <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeCreateAgentModal}
            className="px-4 py-2 rounded-xl text-[#5f6368] dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-md shadow-blue-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Provisioning Blueprint...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Blueprint & Pair</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}
