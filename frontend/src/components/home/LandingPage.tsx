import { useState, useEffect } from 'react';
import {
  Bot,
  ArrowRight,
  ExternalLink,
  Clock,
  Eye,
  GitBranch,
  CheckCircle,
  XCircle,
  RotateCcw,
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

  // Live Interactive Hero Switchboard Simulator State
  const [activeTab, setActiveTab] = useState<'hold' | 'delegate' | 'thought'>('hold');
  const [holdTimer, setHoldTimer] = useState<number>(45.0);
  const [isHoldActive, setIsHoldActive] = useState<boolean>(true);
  const [holdDecision, setHoldDecision] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [delegationActive, setDelegationActive] = useState<boolean>(true);

  // 45-Second countdown simulation timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isHoldActive && holdDecision === 'pending') {
      interval = setInterval(() => {
        setHoldTimer((prev) => {
          if (prev <= 0.1) {
            setHoldDecision('rejected');
            return 0.0;
          }
          return parseFloat((prev - 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHoldActive, holdDecision]);

  const resetHoldDemo = () => {
    setHoldTimer(45.0);
    setHoldDecision('pending');
    setIsHoldActive(true);
  };

  const handleAuthorize = () => {
    setHoldDecision('approved');
    setIsHoldActive(false);
  };

  const handleReject = () => {
    setHoldDecision('rejected');
    setIsHoldActive(false);
  };

  const handlePrimaryCTA = () => {
    if (isAuthenticated) {
      onEnterApp();
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="agentgrid-bg w-full min-h-screen overflow-y-auto overflow-x-hidden text-[#121417] dark:text-[#f0f2f5] font-sans selection:bg-blue-500/20 selection:text-blue-500 relative">
      {/* Signature Tactical Grid Overlay */}
      <div className="agentgrid-grid-overlay" />

      {/* Top Command Bar */}
      <header className="border-b border-[#dfe1e6] dark:border-[#22262e] bg-[#ffffff]/90 dark:bg-[#111317]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0052cc] dark:bg-[#2684ff] flex items-center justify-center text-white shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[#121417] dark:text-[#f0f2f5]">
            Dotdeck
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#5e6c84] dark:text-[#8c96a5]">
          <a href="#simulator" className="hover:text-[#0052cc] dark:hover:text-[#2684ff] transition-colors">
            Interactive Deck
          </a>
          <a href="#architecture" className="hover:text-[#0052cc] dark:hover:text-[#2684ff] transition-colors">
            Architecture
          </a>
          <a href="#frontiers" className="hover:text-[#0052cc] dark:hover:text-[#2684ff] transition-colors">
            Supported Frontiers
          </a>
          <a
            href="https://github.com/Souheil007/Dotdeck"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#121417] dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-[#5e6c84] dark:text-[#8c96a5]" />
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated && user ? (
            <button
              onClick={onEnterApp}
              className="py-1.5 px-3.5 rounded-lg bg-[#0052cc] hover:bg-[#0747a6] dark:bg-[#2684ff] dark:hover:bg-[#0065ff] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <span>Workspaces ({user.name.split(' ')[0]})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="py-1.5 px-3 rounded-lg text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="py-1.5 px-3.5 rounded-lg bg-[#0052cc] hover:bg-[#0747a6] dark:bg-[#2684ff] dark:hover:bg-[#0065ff] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <span>Enter Switchboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Asymmetric Tactical Hero Section */}
      <section className="pt-16 pb-12 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Direct Value Proposition */}
          <div className="lg:col-span-5 text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#00875a] dark:bg-[#36b37e] animate-pulse" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#00875a] dark:text-[#36b37e]">
                Autonomous Swarm Orchestration
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#121417] dark:text-[#f0f2f5] leading-[1.1] mb-5">
              The Command Switchboard for Closed Cloud Agents
            </h1>

            <p className="text-sm sm:text-base text-[#5e6c84] dark:text-[#8c96a5] leading-relaxed mb-8">
              Orchestrate autonomous OpenAI Dots, xAI Grok Bots, Meta Muse, and Claude Agents across isolated vendor clouds. 
              Synthesize peer delegation tools on the fly, inspect inner reasoning loops, and hold high-stakes executions in 45-second operator channels.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-10">
              <button
                onClick={handlePrimaryCTA}
                className="px-6 py-2.5 rounded-lg bg-[#0052cc] hover:bg-[#0747a6] dark:bg-[#2684ff] dark:hover:bg-[#0065ff] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <span>Launch Deck</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenShowcase}
                className="px-5 py-2.5 rounded-lg bg-white dark:bg-[#111317] hover:bg-[#f4f5f7] dark:hover:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] text-[#121417] dark:text-[#f0f2f5] font-semibold text-sm flex items-center gap-2 transition-all shadow-tactical-sm"
              >
                <Eye className="w-4 h-4 text-[#0052cc] dark:text-[#2684ff]" />
                <span>Explore Live Fleet</span>
              </button>
            </div>

            {/* High-Density Telemetry Metrics Strip */}
            <div className="pt-6 border-t border-[#dfe1e6] dark:border-[#22262e] grid grid-cols-3 gap-4">
              <div>
                <div className="font-mono text-xl font-bold text-[#121417] dark:text-[#f0f2f5] tabular-nums">45.0s</div>
                <div className="text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">Held Decision Window</div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-[#121417] dark:text-[#f0f2f5] tabular-nums">&lt;50ms</div>
                <div className="text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">Inline Resumption</div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-[#121417] dark:text-[#f0f2f5] tabular-nums">0 SDKs</div>
                <div className="text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">Pure MCP JSON-RPC 2.0</div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Switchboard Simulator */}
          <div id="simulator" className="lg:col-span-7">
            <div className="rounded-xl bg-[#ffffff] dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-md overflow-hidden">
              
              {/* Simulator Header Tabs */}
              <div className="px-4 py-2.5 bg-[#f4f5f7] dark:bg-[#07080b] border-b border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#de350b]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffab00]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#36b37e]" />
                  <span className="font-semibold text-[#121417] dark:text-[#f0f2f5] ml-1.5">
                    Live Telemetry Simulator
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('hold')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      activeTab === 'hold'
                        ? 'bg-[#ffffff] dark:bg-[#171a21] text-[#0052cc] dark:text-[#2684ff] font-bold shadow-xs border border-[#dfe1e6] dark:border-[#22262e]'
                        : 'text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417]'
                    }`}
                  >
                    45s Human Hold
                  </button>
                  <button
                    onClick={() => setActiveTab('delegate')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      activeTab === 'delegate'
                        ? 'bg-[#ffffff] dark:bg-[#171a21] text-[#0052cc] dark:text-[#2684ff] font-bold shadow-xs border border-[#dfe1e6] dark:border-[#22262e]'
                        : 'text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417]'
                    }`}
                  >
                    Peer Delegation
                  </button>
                  <button
                    onClick={() => setActiveTab('thought')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      activeTab === 'thought'
                        ? 'bg-[#ffffff] dark:bg-[#171a21] text-[#0052cc] dark:text-[#2684ff] font-bold shadow-xs border border-[#dfe1e6] dark:border-[#22262e]'
                        : 'text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417]'
                    }`}
                  >
                    Thought Stream
                  </button>
                </div>
              </div>

              {/* Simulator Interactive Body */}
              <div className="p-6 relative bg-[#f4f5f7]/50 dark:bg-[#07080b]/50 min-h-[320px]">
                
                {/* Mode 1: 45s Human Hold Demonstration */}
                {activeTab === 'hold' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ffab00] animate-ping" />
                        <span className="text-xs font-mono font-bold text-[#ffab00] uppercase">
                          Parked HTTP Connection: Paused in Goroutine
                        </span>
                      </div>
                      <button
                        onClick={resetHoldDemo}
                        className="text-[11px] font-mono text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417] flex items-center gap-1"
                        title="Reset simulation"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restart</span>
                      </button>
                    </div>

                    {/* Agent Status Avionics Card */}
                    <div className="p-4 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-xs">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
                              Grok Outbound Copywriter
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              xAI Grok Bot
                            </span>
                          </div>
                          <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-0.5">
                            Attempted action: <code className="text-[#121417] dark:text-[#f0f2f5] font-mono font-semibold">issue_discount_code(50%)</code>
                          </p>
                        </div>

                        {/* Circular 45.0s SVG Countdown Timer */}
                        <div className="flex items-center gap-2 font-mono text-sm font-bold">
                          <div className="relative w-9 h-9 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-gray-200 dark:text-gray-800 stroke-current"
                                strokeWidth="3"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className={`${
                                  holdDecision === 'approved'
                                    ? 'text-[#00875a] dark:text-[#36b37e]'
                                    : holdDecision === 'rejected'
                                    ? 'text-[#de350b] dark:text-[#ff5630]'
                                    : 'text-[#ff8b00] dark:text-[#ffab00]'
                                } stroke-current transition-all duration-100`}
                                strokeDasharray={`${(holdTimer / 45.0) * 100}, 100`}
                                strokeWidth="3"
                                strokeLinecap="round"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <span className="absolute text-[10px] tabular-nums font-mono font-bold">
                              {Math.ceil(holdTimer)}s
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payload Diff Box */}
                      <div className="p-3 rounded bg-[#f4f5f7] dark:bg-[#07080b] border border-[#dfe1e6] dark:border-[#22262e] font-mono text-xs text-[#121417] dark:text-[#f0f2f5] mb-3">
                        <div className="text-[10px] text-[#5e6c84] dark:text-[#8c96a5] mb-1">PROPOSED MCP PAYLOAD:</div>
                        <code>
                          {`{"tool": "issue_discount_code", "params": {"client": "Acme Corp", "rate": "50%", "reason": "Competitive match against competitor RFP"}}`}
                        </code>
                      </div>

                      {/* Interactive Operator Decision Buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-[#5e6c84] dark:text-[#8c96a5] font-mono">
                          {holdDecision === 'pending' ? (
                            <span className="text-[#ff8b00] dark:text-[#ffab00] font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              Awaiting Operator Sign-off...
                            </span>
                          ) : holdDecision === 'approved' ? (
                            <span className="text-[#00875a] dark:text-[#36b37e] font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approved in 4.2s. Channel Resumed.
                            </span>
                          ) : (
                            <span className="text-[#de350b] dark:text-[#ff5630] font-semibold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              Rejected. Error Returned to Agent.
                            </span>
                          )}
                        </div>

                        {holdDecision === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleReject}
                              className="px-3 py-1 rounded bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-semibold transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={handleAuthorize}
                              className="px-3.5 py-1 rounded bg-[#00875a] hover:bg-[#006644] dark:bg-[#36b37e] dark:hover:bg-[#2e9c6d] text-white text-xs font-semibold transition-all shadow-xs"
                            >
                              Authorize
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 2: Dynamic Peer Delegation Demonstration */}
                {activeTab === 'delegate' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono text-[#5e6c84] dark:text-[#8c96a5]">
                      <span>Cross-Vendor Tool Synthesis</span>
                      <button
                        onClick={() => setDelegationActive(!delegationActive)}
                        className="text-[#0052cc] dark:text-[#2684ff] font-semibold hover:underline"
                      >
                        {delegationActive ? 'Disconnect Edge' : 'Connect Edge'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-xs">
                        <span className="text-[10px] font-mono text-[#5e6c84] dark:text-[#8c96a5] block mb-1">SOURCE AGENT</span>
                        <div className="font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">Sales Research Dot</div>
                        <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">OpenAI Cloud Computer</div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-xs">
                        <span className="text-[10px] font-mono text-[#5e6c84] dark:text-[#8c96a5] block mb-1">TARGET AGENT</span>
                        <div className="font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">Grok Copywriter</div>
                        <div className="text-[11px] font-mono text-blue-600 dark:text-sky-400 mt-1">xAI Grok Bot</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#f4f5f7] dark:bg-[#07080b] border border-[#dfe1e6] dark:border-[#22262e]">
                      <div className="flex items-center justify-between mb-1.5 font-mono text-xs">
                        <span className="font-semibold text-[#121417] dark:text-[#f0f2f5]">Synthesized MCP Tool Contract:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          delegationActive 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                          {delegationActive ? 'TOOL EXPOSED (LIVE)' : 'WIRE DISCONNECTED'}
                        </span>
                      </div>
                      <code className="text-xs font-mono text-[#5e6c84] dark:text-[#8c96a5] block">
                        {delegationActive
                          ? 'POST /mcp/dot_sales_01 -> tool: delegate_task_to_grok_copywriter(brief, priority)'
                          : '// Drawing a connection wire on canvas dynamically registers this tool via MCP'}
                      </code>
                    </div>
                  </div>
                )}

                {/* Mode 3: Real-Time Inner Reasoning Stream */}
                {activeTab === 'thought' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-[#5e6c84] dark:text-[#8c96a5]">
                      <span>Inner Chain-of-Thought Stream</span>
                      <span className="text-[#00875a] dark:text-[#36b37e] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00875a] dark:bg-[#36b37e] animate-ping" />
                        Streaming Live
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#07080b] text-[#f0f2f5] border border-[#22262e] space-y-2 h-[170px] overflow-y-auto">
                      <div className="text-[#8c96a5] text-[11px]">[11:51:20.104] [OpenAI Dot] Emitted thought token</div>
                      <div className="text-emerald-400">&gt; Crawling target customer domain for OpenAPI specification...</div>
                      <div className="text-[#8c96a5] text-[11px]">[11:51:22.450] [OpenAI Dot] Discovered v3 webhook endpoint</div>
                      <div className="text-sky-300">&gt; Packaging payload into structured brief for Grok Copywriter</div>
                      <div className="text-[#8c96a5] text-[11px]">[11:51:23.002] [Switchboard] Synthesized delegation handoff dispatched</div>
                      <div className="text-amber-400">&gt; Grok Copywriter received brief; initiated draft sequence</div>
                    </div>
                  </div>
                )}

              </div>

              {/* Simulator Action Footer */}
              <div className="px-5 py-3 bg-[#f4f5f7] dark:bg-[#07080b] border-t border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-between text-xs">
                <span className="font-mono text-[#5e6c84] dark:text-[#8c96a5] text-[11px]">
                  Real-time protocol verified with Go backend daemon
                </span>
                <button
                  onClick={handlePrimaryCTA}
                  className="text-[#0052cc] dark:text-[#2684ff] hover:underline font-semibold flex items-center gap-1 text-xs"
                >
                  <span>Launch In Full Deck</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Architectural Capabilities Matrix (Zero Fluff, Real Content) */}
      <section id="architecture" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#dfe1e6] dark:border-[#22262e] relative z-10">
        <div className="mb-12 text-left">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs uppercase tracking-wider text-[#0052cc] dark:text-[#2684ff] font-bold">
            <GitBranch className="w-4 h-4" />
            <span>Architecture Specification</span>
          </div>
          <h2 className="font-display text-3xl font-extrabold text-[#121417] dark:text-[#f0f2f5] tracking-tight">
            How the Switchboard Works Under the Hood
          </h2>
          <p className="text-sm text-[#5e6c84] dark:text-[#8c96a5] mt-1 max-w-2xl">
            Dotdeck treats cloud agent instances as black-box computers, orchestrating them via the Model Context Protocol (MCP) and WebSocket event mesh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pillar 1 */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-sm">
            <div className="w-8 h-8 rounded bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-center text-[#0052cc] dark:text-[#2684ff] mb-4 font-mono font-bold text-xs">
              01
            </div>
            <h3 className="font-display font-bold text-base text-[#121417] dark:text-[#f0f2f5] mb-2">
              Dynamic MCP Gateway
            </h3>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] leading-relaxed mb-4">
              During VM boot, cloud agents receive an endpoint: <code className="text-[#121417] dark:text-[#f0f2f5] font-mono">/mcp/{'{token}'}</code>. Dotdeck dynamically synthesizes tools based on canvas connections.
            </p>
            <div className="p-2.5 rounded bg-[#f4f5f7] dark:bg-[#07080b] font-mono text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">
              Protocol: JSON-RPC 2.0 via HTTP/SSE
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-sm">
            <div className="w-8 h-8 rounded bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-center text-[#ff8b00] dark:text-[#ffab00] mb-4 font-mono font-bold text-xs">
              02
            </div>
            <h3 className="font-display font-bold text-base text-[#121417] dark:text-[#f0f2f5] mb-2">
              45-Second Held Approvals
            </h3>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] leading-relaxed mb-4">
              High-stakes tools hold the HTTP response in a parked Go channel. Operators resolve the hold in under 50ms from canvas, with fallback wake-up webhooks.
            </p>
            <div className="p-2.5 rounded bg-[#f4f5f7] dark:bg-[#07080b] font-mono text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">
              Safety: Sync pause, zero runaway spend
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-sm">
            <div className="w-8 h-8 rounded bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-center text-[#00875a] dark:text-[#36b37e] mb-4 font-mono font-bold text-xs">
              03
            </div>
            <h3 className="font-display font-bold text-base text-[#121417] dark:text-[#f0f2f5] mb-2">
              Multiplayer Presence Mesh
            </h3>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] leading-relaxed mb-4">
              Collaborative visualizer backed by WebSockets with presence cursors, optimistic approval locks, and 3-tier RBAC (Admin, Operator, Observer).
            </p>
            <div className="p-2.5 rounded bg-[#f4f5f7] dark:bg-[#07080b] font-mono text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">
              Concurrency: Optimistic locking, no race
            </div>
          </div>

        </div>
      </section>

      {/* Supported Frontiers Registry Strip */}
      <section id="frontiers" className="py-12 px-6 max-w-7xl mx-auto border-t border-[#dfe1e6] dark:border-[#22262e] relative z-10 text-left">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="font-display font-bold text-xl text-[#121417] dark:text-[#f0f2f5]">
              Supported Tier 3 Cloud Frontiers
            </h3>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-0.5">
              Vendor-neutral protocol integration across major proprietary autonomous cloud environments.
            </p>
          </div>
          <button
            onClick={handlePrimaryCTA}
            className="px-4 py-2 rounded-lg bg-[#0052cc] hover:bg-[#0747a6] dark:bg-[#2684ff] text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span>Provision Swarm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e]">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>OpenAI Dots</span>
            </div>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5]">
              Autonomous web exploration and lead research running in cloud sandboxes.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e]">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>xAI Grok Bots</span>
            </div>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5]">
              High-velocity copy generation and real-time knowledge synthesis.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e]">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Claude Cloud</span>
            </div>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5]">
              Compliance guardrails, code auditing, and safety policy enforcement.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e]">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#121417] dark:text-[#f0f2f5]">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Meta Muse</span>
            </div>
            <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5]">
              Secure perimeter scanning and infrastructure reconnaissance VMs.
            </p>
          </div>
        </div>
      </section>

      {/* Clean Mission Deck Footer */}
      <footer className="border-t border-[#dfe1e6] dark:border-[#22262e] py-8 px-6 text-xs text-[#5e6c84] dark:text-[#8c96a5] max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#0052cc] dark:bg-[#2684ff] flex items-center justify-center text-white">
            <Bot className="w-3 h-3" />
          </div>
          <span className="font-display font-bold text-[#121417] dark:text-[#f0f2f5]">Dotdeck</span>
          <span>© 2026. Vendor-Neutral Tier 3 Agent Switchboard.</span>
        </div>

        <div className="flex items-center gap-5">
          <a href="https://github.com/Souheil007/Dotdeck" target="_blank" rel="noreferrer" className="hover:text-[#121417] dark:hover:text-white">
            GitHub
          </a>
          <button onClick={onOpenShowcase} className="hover:text-[#0052cc] dark:hover:text-[#2684ff]">
            Public Fleet Audit
          </button>
          <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-[#0052cc] dark:hover:text-[#2684ff]">
            Operator Sign In
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
