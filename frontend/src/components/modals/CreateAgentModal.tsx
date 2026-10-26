import { useState } from 'react';
import { X, Sparkles, Flame, Globe, Cpu, ShieldAlert, Clock, Plus, Trash2, Loader2, Bot } from 'lucide-react';
import { useWorkspaceStore, type AgentData } from '../../store/useWorkspaceStore';

const providerOptions = [
  {
    id: 'openai_dot',
    name: 'OpenAI Dot',
    description: 'Tier 3 OpenAI cloud computer with autonomous tool execution.',
    icon: Sparkles,
    color: 'emerald',
    borderColor: 'border-emerald-600',
    bgColor: 'bg-emerald-950/40',
    textColor: 'text-emerald-400',
  },
  {
    id: 'grok_bot',
    name: 'Grok Bot',
    description: 'xAI cloud agent with real-time reasoning and computer tools.',
    icon: Flame,
    color: 'orange',
    borderColor: 'border-orange-600',
    bgColor: 'bg-orange-950/40',
    textColor: 'text-orange-400',
  },
  {
    id: 'meta_muse',
    name: 'Meta Muse',
    description: 'Meta Muse secure VM agent with webhook check-in fallback.',
    icon: Globe,
    color: 'blue',
    borderColor: 'border-blue-600',
    bgColor: 'bg-blue-950/40',
    textColor: 'text-blue-400',
  },
  {
    id: 'claude',
    name: 'Claude Agent',
    description: 'Anthropic Claude cloud agent with high reasoning density.',
    icon: Cpu,
    color: 'amber',
    borderColor: 'border-amber-600',
    bgColor: 'bg-amber-950/40',
    textColor: 'text-amber-400',
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
    if (!name.trim() || !goal.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const scheduleCron = getComputedScheduleCron();

      const response = await fetch(`${apiUrl}/api/v1/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId || 'default-workspace',
          name: name.trim(),
          provider,
          goal: goal.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl my-8">
        <button
          onClick={closeCreateAgentModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/50">
            <Bot className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Add Closed Cloud Agent</h2>
            <p className="text-xs text-zinc-400">
              Provision an autonomous Tier 3 cloud agent blueprint with remote MCP switchboard credentials.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Provider Selection */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-2">1. Select Cloud Agent Provider</label>
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
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 ${option.textColor}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                        <span>{option.name}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Goal */}
          <div className="space-y-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">2. Agent Identity & Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(changeEvent) => setName(changeEvent.target.value)}
                placeholder="e.g. Sales Prospecting Dot, Security Audit Bot"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-sans"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">3. Ongoing Mission & Goal</label>
              <textarea
                required
                rows={3}
                value={goal}
                onChange={(changeEvent) => setGoal(changeEvent.target.value)}
                placeholder="Define the primary operational objective this cloud agent will autonomously pursue..."
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-sans leading-relaxed"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>4. Execution Schedule</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSchedulePreset('none')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'none'
                    ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Event-driven / Handoffs Only
              </button>
              <button
                type="button"
                onClick={() => setSchedulePreset('hourly')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'hourly'
                    ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Hourly (:00)
              </button>
              <button
                type="button"
                onClick={() => setSchedulePreset('daily')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'daily'
                    ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Daily (9:00 AM)
              </button>
              <button
                type="button"
                onClick={() => setSchedulePreset('custom')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  schedulePreset === 'custom'
                    ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
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
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Authority Constraints */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>5. Authority Constraints (45s Hold Gating)</span>
            </label>
            <p className="text-[11px] text-zinc-500 mb-2">
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
                        ? 'border-amber-600 bg-amber-950/40 text-amber-300'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-zinc-600'}`} />
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
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomRule}
                disabled={!newRuleInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-medium text-xs flex items-center gap-1 transition-colors"
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
                    className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-300"
                  >
                    <span className="truncate mr-2">• {rule}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-0.5"
                      title="Remove rule"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeCreateAgentModal}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !goal.trim() || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
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
