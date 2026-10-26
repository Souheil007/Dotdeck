import { useState } from 'react';
import {
  Bot,
  Shield,
  ArrowRight,
  Sparkles,
  Users,
  Terminal,
  ExternalLink,
  ChevronRight,
  Clock,
  Eye,
  GitBranch,
  MousePointer2,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthModal } from '../auth/AuthModal';
import { ThemeToggle } from '../common/ThemeToggle';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenShowcase: () => void;
}

export function LandingPage({ onEnterApp, onOpenShowcase }: LandingPageProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handlePrimaryCTA = () => {
    if (isAuthenticated) {
      onEnterApp();
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="agentgrid-bg w-full min-h-screen overflow-y-auto overflow-x-hidden text-[#202124] dark:text-zinc-100 font-sans selection:bg-blue-500/20 selection:text-blue-500 relative">
      {/* Signature AgentGrid Clean Blueprint Grid Overlay */}
      <div className="agentgrid-grid-overlay" />

      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent dark:from-cyan-500/10 dark:via-blue-500/5 dark:to-transparent blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="border-b border-zinc-200/80 dark:border-zinc-800/80 glass-panel sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-cyan-500 dark:to-blue-600 flex items-center justify-center text-white shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-[#202124] dark:text-white">
                Dotdeck
              </span>
              <span className="text-[10px] text-blue-700 dark:text-cyan-400 font-mono bg-blue-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded-full border border-blue-200 dark:border-cyan-800">
                Switchboard
              </span>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[#5f6368] dark:text-zinc-400">
          <a href="#preview" className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors">
            Live Preview
          </a>
          <a href="#features" className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors">
            Architecture
          </a>
          <a href="#models" className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors">
            Supported Frontiers
          </a>
          <a
            href="https://github.com/Souheil007/Dotdeck"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#202124] dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {/* Theme Toggle (Google White vs Google Night) */}
          <ThemeToggle />

          {isAuthenticated && user ? (
            <button
              onClick={onEnterApp}
              className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <span>Workspaces ({user.name.split(' ')[0]})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="py-1.5 px-3 rounded-xl text-[#5f6368] dark:text-zinc-300 hover:text-[#202124] dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-900 text-xs font-semibold transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <span>Launch Deck</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center z-10">
        {/* Shimmer Pill Badge (AgentGrid Style) */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-cyan-500/30 text-blue-700 dark:text-cyan-300 text-xs font-mono font-medium mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
          <span>The Command Deck for Autonomous Cloud Agents</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#202124] dark:text-white max-w-4xl mx-auto leading-[1.12] mb-6">
          Where Humans & Cloud Agents{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 dark:from-cyan-400 dark:via-sky-300 dark:to-blue-500">
            Co-Orchestrate
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#5f6368] dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-9">
          Dotdeck is the vendor-neutral switchboard for Tier 3 closed cloud agents. 
          Monitor reasoning in real-time, wire peer delegations across frontiers, and resolve 45-second human approval holds in sub-50ms.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <button
            onClick={handlePrimaryCTA}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <span>Launch Switchboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenShowcase}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[#3c4043] dark:text-zinc-300 hover:text-black dark:hover:text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Eye className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            <span>Explore Live Showcase</span>
          </button>
        </div>

        {/* Supported Frontiers Strip */}
        <div id="models" className="flex items-center justify-center gap-6 sm:gap-10 text-xs font-mono text-[#5f6368] dark:text-zinc-400 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Tier 3 Frontiers:</span>
          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>OpenAI Dots</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-sky-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>xAI Grok Bots</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Anthropic Claude</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Meta Muse</span>
          </div>
        </div>
      </section>

      {/* Interactive Live Collaborative Fleet Window (AgentGrid Style) */}
      <section id="preview" className="px-6 max-w-5xl mx-auto mb-20 relative z-10">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
          {/* Top Window Bar */}
          <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-950 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-[#3c4043] dark:text-zinc-300 ml-2 font-semibold">
                Dotdeck Live Switchboard Canvas
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Multiplayer Mesh: 2 Operators Online</span>
              </div>
            </div>
          </div>

          {/* Collaborative Canvas Body */}
          <div className="p-6 sm:p-10 relative min-h-[380px] bg-[#ffffff] dark:bg-[#0c0d12] flex flex-col md:flex-row items-center justify-around gap-6">
            {/* Agent Node A: OpenAI Lead Researcher */}
            <div className="w-full md:w-64 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/40 shadow-sm text-left relative group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                  OpenAI Dot
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h4 className="font-bold text-sm text-[#202124] dark:text-white mb-1">Lead Researcher</h4>
              <p className="text-[11px] text-[#5f6368] dark:text-zinc-400 line-clamp-2 mb-3">
                Scrapes tech stacks and prepares dossier for copy generation.
              </p>
              <div className="p-2 rounded-lg bg-[#f1f3f4] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                ⚡ Thought: Extracted 12 Fortune 500 contacts
              </div>
            </div>

            {/* Pulsing Animated Delegation Edge */}
            <div className="flex flex-col items-center justify-center gap-1.5 my-2 md:my-0">
              <div className="h-0.5 w-24 md:w-36 bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 relative">
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-cyan-300 shadow-md animate-ping" />
              </div>
              <span className="text-[10px] font-mono text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-blue-200 dark:border-cyan-800 font-medium">
                delegate_task()
              </span>
            </div>

            {/* Agent Node B: Grok Copywriter (Blocked on Human Hold) */}
            <div className="w-full md:w-64 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-amber-500/50 shadow-sm text-left relative group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold">
                  xAI Grok Bot
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
              <h4 className="font-bold text-sm text-[#202124] dark:text-white mb-1">Grok Copywriter</h4>
              <p className="text-[11px] text-[#5f6368] dark:text-zinc-400 line-clamp-2 mb-3">
                Drafted tailored sequences. Paused on human verification.
              </p>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 font-mono text-[10px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>🛑 45s Human Hold</span>
                <span className="bg-amber-500 text-black px-1.5 py-0.2 rounded font-bold">Awaiting Sign-off</span>
              </div>
            </div>

            {/* Simulated Multiplayer Cursors (AgentGrid Touch) */}
            <div className="absolute top-12 left-1/3 hidden lg:flex items-center gap-1.5 pointer-events-none animate-bounce duration-1000">
              <MousePointer2 className="w-4 h-4 text-blue-600 dark:text-cyan-400 fill-blue-600 dark:fill-cyan-400" />
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-mono font-bold shadow-sm">
                Souheil (Admin)
              </span>
            </div>
          </div>

          {/* Console Bottom Action Bar */}
          <div className="px-5 py-3 bg-[#f8f9fa] dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#5f6368] dark:text-zinc-400 font-mono text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Inbound JSON-RPC 2.0 / MCP Endpoint Active</span>
            </div>
            <button
              onClick={handlePrimaryCTA}
              className="py-1 px-3.5 rounded-lg bg-blue-50 dark:bg-cyan-500/10 hover:bg-blue-100 dark:hover:bg-cyan-500/20 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span>Launch Live Deck</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Clean Bento Grid Features */}
      <section id="features" className="px-6 max-w-5xl mx-auto mb-20 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] dark:text-white tracking-tight mb-2">
            Built for Supervised Agent Fleets
          </h2>
          <p className="text-xs sm:text-sm text-[#5f6368] dark:text-zinc-400 max-w-lg mx-auto">
            Zero plumbing. Give any cloud agent an MCP token and manage its lifecycle visually or headlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-cyan-500/40 shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400 mb-3">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#202124] dark:text-white mb-1.5">Dynamic MCP Hub</h3>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400 leading-relaxed">
              Synthesizes peer delegation tools at runtime via JSON-RPC 2.0 endpoints without model lock-in.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#202124] dark:text-white mb-1.5">45s Hold Engine</h3>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400 leading-relaxed">
              Pauses high-stakes actions in memory, pings team channels, and resumes inline in &lt;50ms.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#202124] dark:text-white mb-1.5">Circuit Breakers</h3>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400 leading-relaxed">
              Sliding-window loop detectors block runaway handoffs (&gt;5 in 10m) and cap 512KB payloads.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#202124] dark:text-white mb-1.5">Multiplayer RBAC</h3>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400 leading-relaxed">
              Real-time teammate cursors, distributed race-condition locks, and Admin &gt; Operator &gt; Observer roles.
            </p>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-7 px-6 text-center text-xs text-[#5f6368] dark:text-zinc-500 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-cyan-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <Bot className="w-3 h-3" />
          </div>
          <span className="font-bold text-[#202124] dark:text-zinc-300">Dotdeck</span>
          <span>© 2026. Vendor-Neutral Cloud Agent Switchboard.</span>
        </div>

        <div className="flex items-center gap-4 text-[#5f6368] dark:text-zinc-400">
          <a href="https://github.com/Souheil007/Dotdeck" target="_blank" rel="noreferrer" className="hover:text-black dark:hover:text-white">
            GitHub
          </a>
          <span>·</span>
          <button onClick={onOpenShowcase} className="hover:text-blue-600 dark:hover:text-cyan-300">
            Live Showcase
          </button>
          <span>·</span>
          <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-blue-600 dark:hover:text-cyan-300">
            Login
          </button>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => onEnterApp()}
      />
    </div>
  );
}
