import { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  User,
  Mail,
  Shield,
  Key,
  Sun,
  Moon,
  Check,
  Copy,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RotateCcw,
  Crown,
  Zap,
  Eye,
  Save,
} from 'lucide-react';
import { useAuthStore, type UserRole } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';

interface SettingsPageProps {
  onBack: () => void;
  onGoToLanding?: () => void;
}

const AVATAR_OPTIONS = ['👑', '⚡', '👁️', '🛡️', '🤖', '🚀', '💻', '🧠', '💼', '🎯'];

export function SettingsPage({ onBack, onGoToLanding }: SettingsPageProps) {
  const { user, updateProfile, updateRole, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [name, setName] = useState(user?.name || 'Operator');
  const [email, setEmail] = useState(user?.email || 'operator@dotdeck.io');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '👑');
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Fallback demo user if accessed without login
  const currentUser = user || {
    id: 'usr-admin-01',
    name: 'Operator Admin',
    email: 'admin@dotdeck.io',
    avatar: '👑',
    role: 'admin' as UserRole,
    token: 'jwt-admin-token-dotdeck',
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(name, email, selectedAvatar);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(currentUser.token || 'jwt-operator-dotdeck-key-8891');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleResetDemoState = () => {
    localStorage.removeItem('dotdeck-workspaces-store');
    window.location.reload();
  };

  const roleMatrix = [
    {
      role: 'admin' as UserRole,
      title: 'Administrator',
      icon: Crown,
      description: 'Full orchestration governance, agent decommissioning, fleet creation, and financial approval release.',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-300',
      permissions: [
        'Decommission and destroy cloud agent nodes',
        'Provision and delete fleet workspaces',
        'Authorize 45s high-stakes financial holds',
        'Generate dynamic MCP pairing endpoints',
      ],
    },
    {
      role: 'write' as UserRole,
      title: 'Swarm Operator',
      icon: Zap,
      description: 'Active switchboard manipulation, interactive wire linking, agent steering, and thought trace dispatching.',
      badgeClass: 'bg-blue-50 dark:bg-indigo-950/80 border-blue-300 dark:border-indigo-700/80 text-blue-800 dark:text-indigo-300',
      permissions: [
        'Connect agent nodes via dynamic MCP edges',
        'Add and arrange cloud agents on the canvas',
        'Resolve human operator questions',
        'View live thoughts and telemetry traces',
      ],
    },
    {
      role: 'read' as UserRole,
      title: 'Observer / Auditor',
      icon: Eye,
      description: 'Public showcase & regulatory compliance monitoring with strictly read-only canvas access.',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-300',
      permissions: [
        'Inspect live agent goals and telemetry traces',
        'Audit 45s human hold records and logs',
        'Read-only canvas exploration (wires protected)',
        'Zero write or delete capability',
      ],
    },
  ];

  return (
    <div className="agentgrid-bg w-full min-h-screen overflow-y-auto text-[#121417] dark:text-[#f0f2f5] font-sans selection:bg-blue-500/20 selection:text-blue-500 flex flex-col">
      <div className="agentgrid-grid-overlay" />

      {/* Top Mission Control Bar */}
      <header className="border-b border-[#dfe1e6] dark:border-[#22262e] bg-[#ffffff]/90 dark:bg-[#111317]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1e26] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-250 dark:border-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-xs transition-all active:scale-95"
            title="Return to previous screen"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-zinc-300 dark:text-zinc-700">/</span>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0052cc] dark:bg-[#2684ff] flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-[#121417] dark:text-[#f0f2f5]">
              Dotdeck
            </span>
            <span className="text-zinc-400 dark:text-zinc-600 text-xs">•</span>
            <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
              Operator Settings &amp; Governance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono animate-in fade-in duration-150">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved Successfully</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Session ({currentUser.role})</span>
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 relative z-10 space-y-8">
        {/* Section 1: Operator Profile & Identity */}
        <section className="bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] rounded-2xl p-6 shadow-tactical-sm">
          <div className="flex items-center justify-between border-b border-[#dfe1e6] dark:border-[#22262e] pb-4 mb-6">
            <div>
              <h2 className="font-display font-bold text-lg text-[#121417] dark:text-[#f0f2f5] tracking-tight flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                <span>Operator Identity &amp; Profile</span>
              </h2>
              <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-0.5">
                Manage your switchboard operator credentials and canvas multiplayer presence.
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              ID: {currentUser.id}
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#5e6c84] dark:text-[#8c96a5] font-bold mb-2">
                Operator Monogram / Avatar
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                      selectedAvatar === emoji
                        ? 'bg-blue-50 dark:bg-cyan-950/80 border-2 border-blue-600 dark:border-cyan-400 shadow-sm scale-105'
                        : 'bg-zinc-50 dark:bg-[#16181e] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#121417] dark:text-[#f0f2f5] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#0c0d10] border border-[#dfe1e6] dark:border-[#262b35] text-xs font-medium text-[#121417] dark:text-[#f0f2f5] focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121417] dark:text-[#f0f2f5] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#0c0d10] border border-[#dfe1e6] dark:border-[#262b35] text-xs font-medium text-[#121417] dark:text-[#f0f2f5] focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500"
                    placeholder="operator@company.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0052cc] hover:bg-[#0747a6] dark:bg-[#2684ff] dark:hover:bg-[#0065ff] text-white text-xs font-bold shadow-tactical-sm transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </section>

        {/* Section 2: Appearance & Theme Customization */}
        <section className="bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] rounded-2xl p-6 shadow-tactical-sm">
          <div className="border-b border-[#dfe1e6] dark:border-[#22262e] pb-4 mb-6">
            <h2 className="font-display font-bold text-lg text-[#121417] dark:text-[#f0f2f5] tracking-tight flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              <span>Appearance &amp; Display Themes</span>
            </h2>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-0.5">
              Customize the look and feel of your agent orchestration console.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Light Mode Card */}
            <div
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-[#0d0e12] hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
                    Light Paper Mode
                  </span>
                </div>
                {theme === 'light' && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Miniature Light Mockup */}
              <div className="p-3 rounded-lg bg-white border border-zinc-200 shadow-xs space-y-1.5 select-none pointer-events-none">
                <div className="h-2 w-1/3 bg-zinc-800 rounded-sm" />
                <div className="h-2 w-2/3 bg-zinc-200 rounded-sm" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-4 w-12 bg-blue-600 rounded" />
                  <div className="h-4 w-12 bg-zinc-100 border border-zinc-200 rounded" />
                </div>
              </div>
              <p className="text-[11px] text-[#5e6c84] dark:text-[#8c96a5] mt-2.5">
                Crisp high-contrast daylight aesthetic modeled on modern enterprise control rooms.
              </p>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-cyan-500 bg-cyan-950/20 shadow-md ring-2 ring-cyan-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-[#0d0e12] hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 text-cyan-300 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
                    Tactical Night Mode
                  </span>
                </div>
                {theme === 'dark' && (
                  <div className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Miniature Dark Mockup */}
              <div className="p-3 rounded-lg bg-[#07080b] border border-zinc-800 shadow-xs space-y-1.5 select-none pointer-events-none">
                <div className="h-2 w-1/3 bg-cyan-400 rounded-sm" />
                <div className="h-2 w-2/3 bg-zinc-800 rounded-sm" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-4 w-12 bg-cyan-500 rounded" />
                  <div className="h-4 w-12 bg-zinc-900 border border-zinc-800 rounded" />
                </div>
              </div>
              <p className="text-[11px] text-[#5e6c84] dark:text-[#8c96a5] mt-2.5">
                Deep OLED obsidian palette with neon cyan phosphor highlights for 24/7 monitor marathons.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Role & Governance Matrix */}
        <section className="bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] rounded-2xl p-6 shadow-tactical-sm">
          <div className="border-b border-[#dfe1e6] dark:border-[#22262e] pb-4 mb-6">
            <h2 className="font-display font-bold text-lg text-[#121417] dark:text-[#f0f2f5] tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Role Governance &amp; Authority Matrix</span>
            </h2>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-0.5">
              Select your active operator role to verify permissions across canvas actions and approval channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleMatrix.map((item) => {
              const isCurrent = currentUser.role === item.role;
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  onClick={() => updateRole(item.role)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'border-blue-600 dark:border-cyan-400 bg-blue-50/20 dark:bg-cyan-950/20 shadow-md ring-1 ring-blue-500 dark:ring-cyan-400'
                      : 'border-zinc-250 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0c0d10] hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                        <h4 className="font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
                          {item.title}
                        </h4>
                      </div>
                      {isCurrent ? (
                        <span className="px-1.5 py-0.2 rounded bg-blue-600 dark:bg-cyan-400 text-white dark:text-black font-mono text-[9px] font-bold uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-mono">
                          Switch
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mb-3 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                      Capabilities:
                    </span>
                    {item.permissions.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Remote MCP Endpoint Credentials */}
        <section className="bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] rounded-2xl p-6 shadow-tactical-sm">
          <div className="border-b border-[#dfe1e6] dark:border-[#22262e] pb-4 mb-6">
            <h2 className="font-display font-bold text-lg text-[#121417] dark:text-[#f0f2f5] tracking-tight flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
              <span>Remote MCP &amp; Switchboard Connectivity</span>
            </h2>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-0.5">
              Secure endpoints for connecting external Tier 3 cloud agents into your Dotdeck instance.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#121417] dark:text-[#f0f2f5] mb-1.5">
                Operator Master Access Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value={currentUser.token || 'jwt-operator-dotdeck-token-live-8921'}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#0c0d10] border border-[#dfe1e6] dark:border-[#262b35] font-mono text-xs text-[#5e6c84] dark:text-[#8c96a5]"
                />
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#0c0d10] border border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Synchronous Human Hold SLA
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  45 Seconds Default Timeout
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#0c0d10] border border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  WebSocket Real-time Engine
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  ws://localhost:8080/ws (Connected)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Data Management & Danger Zone */}
        <section className="bg-white dark:bg-[#111317] border border-rose-200 dark:border-rose-950/60 rounded-2xl p-6 shadow-tactical-sm">
          <div className="border-b border-rose-100 dark:border-rose-950/80 pb-4 mb-4">
            <h2 className="font-display font-bold text-lg text-rose-700 dark:text-rose-400 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Danger Zone &amp; State Reset</span>
            </h2>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-0.5">
              Destructive actions affecting your local storage cache and browser session.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
            <div>
              <h4 className="font-semibold text-xs text-[#121417] dark:text-[#f0f2f5]">
                Reset Demo Swarm State
              </h4>
              <p className="text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">
                Clears custom modified agent topologies and restores initial factory defaults for all fleets.
              </p>
            </div>

            {resetConfirmOpen ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setResetConfirmOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetDemoState}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  Confirm Reset
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Fleets</span>
              </button>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-rose-100 dark:border-rose-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-xs text-[#121417] dark:text-[#f0f2f5]">
                Sign Out of Operator Session
              </h4>
              <p className="text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">
                Terminate active JWT token credentials and return to the main Dotdeck landing page.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                if (onGoToLanding) {
                  onGoToLanding();
                } else {
                  onBack();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
