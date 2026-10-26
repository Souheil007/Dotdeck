import { useState, useEffect } from 'react';
import { Bot, Share2, Plus, Sparkles, Crown, Zap, Eye, ChevronDown } from 'lucide-react';
import { AgentCanvas } from './components/canvas/AgentCanvas';
import { InspectorDrawer } from './components/inspector/InspectorDrawer';
import { PairingWizard } from './components/modals/PairingWizard';
import { CreateAgentModal } from './components/modals/CreateAgentModal';
import { ShareModal } from './components/modals/ShareModal';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import type { Node, Edge } from '@xyflow/react';
import type { AgentData } from './store/useWorkspaceStore';

export function App() {
  const {
    currentUserId,
    userRole,
    setUserRole,
    nodes,
    setNodes,
    setEdges,
    setShareModalOpen,
    openCreateAgentModal,
    cursors,
  } = useWorkspaceStore();

  const [isShowcase, setIsShowcase] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Check URL parameters for public showcase mode
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('showcase') || searchParams.get('role') === 'read') {
      setIsShowcase(true);
      setUserRole('read');
    }
  }, [setUserRole]);

  // Populate sample multi-vendor fleet if canvas is empty
  useEffect(() => {
    if (nodes.length === 0) {
      const demoNodes: Node<AgentData>[] = [
        {
          id: 'agent-1',
          type: 'agentNode',
          position: { x: 100, y: 150 },
          data: {
            id: 'agent-1',
            name: 'Sales Research Dot',
            provider: 'openai_dot',
            goal: 'Scrape high-intent SaaS leads and extract corporate tech stacks.',
            status: 'working',
            currentThought: 'Analyzing Stripe documentation page for webhook signature format',
            currentStep: 'Drafting outbound brief for Grok Copywriter',
            lastRunStatus: 'success',
            lastRunTime: '4m ago',
          },
        },
        {
          id: 'agent-2',
          type: 'agentNode',
          position: { x: 550, y: 80 },
          data: {
            id: 'agent-2',
            name: 'Grok Copywriter',
            provider: 'grok_bot',
            goal: 'Draft tailored outreach sequences based on incoming technical dossiers.',
            status: 'blocked_on_user',
            currentThought: 'Generated 3 email variants; awaiting sign-off on pricing mention.',
            lastRunStatus: 'success',
            lastRunTime: '12m ago',
          },
        },
        {
          id: 'agent-3',
          type: 'agentNode',
          position: { x: 550, y: 320 },
          data: {
            id: 'agent-3',
            name: 'Claude Compliance',
            provider: 'claude',
            goal: 'Verify outbound emails adhere to GDPR and company privacy policies.',
            status: 'resting',
            lastRunStatus: 'success',
            lastRunTime: '1h ago',
            nextScheduledTime: 'Tomorrow 9:00 AM',
          },
        },
      ];

      const demoEdges: Edge[] = [
        {
          id: 'edge-1-2',
          source: 'agent-1',
          target: 'agent-2',
          type: 'pulseEdge',
          data: { toolName: 'delegate_task_to_grok_copywriter' },
        },
        {
          id: 'edge-2-3',
          source: 'agent-2',
          target: 'agent-3',
          type: 'pulseEdge',
          data: { toolName: 'delegate_task_to_claude_compliance' },
        },
      ];

      setNodes(demoNodes);
      setEdges(demoEdges);
    }
  }, [nodes.length, setNodes, setEdges]);

  const roleBadgeConfig = {
    admin: { label: 'Admin', icon: Crown, badgeClass: 'bg-amber-950/80 border-amber-700/80 text-amber-300' },
    write: { label: 'Operator', icon: Zap, badgeClass: 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300' },
    read: { label: 'Observer', icon: Eye, badgeClass: 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300' },
  };

  const currentRoleConfig = roleBadgeConfig[userRole] || roleBadgeConfig.write;
  const RoleIcon = currentRoleConfig.icon;

  return (
    <div className="relative w-screen h-screen flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {/* Public Showcase Banner */}
      {isShowcase && (
        <div className="h-8 bg-gradient-to-r from-emerald-950 via-zinc-900 to-indigo-950 border-b border-emerald-700/60 px-4 flex items-center justify-between text-xs text-emerald-300 z-40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">Public Read-Only Showcase</span>
            <span className="text-zinc-600">•</span>
            <span className="text-[11px] text-zinc-400">Live 24/7 Cloud Agent Telemetry Feed</span>
          </div>
          <button
            onClick={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setIsShowcase(false);
              setUserRole('write');
            }}
            className="text-[10px] underline hover:text-white font-mono transition-colors"
          >
            Exit Showcase & Switch to Operator
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <header className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-950/85 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white">Dotdeck</span>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                SWITCHBOARD
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="font-medium text-zinc-200">Tier 3 Closed Cloud Fleet</span>
            <span className="text-zinc-600">•</span>
            <span className="text-[11px] text-emerald-400">3 Online</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* RBAC Role Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium transition-all ${currentRoleConfig.badgeClass} hover:opacity-90`}
              title="Change your simulated workspace role"
            >
              <RoleIcon className="w-3 h-3" />
              <span>{currentRoleConfig.label}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 top-8 mt-1 w-44 rounded-xl bg-zinc-900 border border-zinc-800 p-1.5 shadow-2xl z-50 text-xs">
                <span className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase block">
                  Simulate Role
                </span>
                <button
                  onClick={() => {
                    setUserRole('admin');
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    userRole === 'admin' ? 'bg-amber-950/60 text-amber-300 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>👑 Admin</span>
                </button>
                <button
                  onClick={() => {
                    setUserRole('write');
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    userRole === 'write' ? 'bg-indigo-950/60 text-indigo-300 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>⚡ Operator</span>
                </button>
                <button
                  onClick={() => {
                    setUserRole('read');
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    userRole === 'read' ? 'bg-emerald-950/60 text-emerald-300 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>👁️ Observer</span>
                </button>
              </div>
            )}
          </div>

          {/* Teammate Presence Avatars */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-indigo-500 ring-2 ring-zinc-950 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              You
            </div>
            {Object.values(cursors)
              .filter((teammateCursor) => teammateCursor.userId !== currentUserId)
              .map((teammateCursor) => (
                <div
                  key={teammateCursor.userId}
                  style={{ backgroundColor: teammateCursor.color }}
                  className="w-6 h-6 rounded-full ring-2 ring-zinc-950 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  title={teammateCursor.userName}
                >
                  {teammateCursor.userName.slice(0, 2).toUpperCase()}
                </div>
              ))}
          </div>

          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            onClick={openCreateAgentModal}
            disabled={userRole === 'read'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-medium transition-colors shadow-sm"
            title={userRole === 'read' ? 'Read-only observer mode (Write permissions required)' : 'Add agent node'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Agent Node</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative overflow-hidden">
        <AgentCanvas />
        <InspectorDrawer />

        {/* Viral Growth Badge (Bottom-Left) */}
        <a
          href="https://github.com/Souheil007/Dotdeck"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white shadow-2xl backdrop-blur-md transition-all text-xs group"
          title="Dotdeck Open Source Repository"
        >
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="font-medium text-[11px]">
            Powered by <strong className="text-white font-semibold">Dotdeck</strong> — Build Your Fleet
          </span>
        </a>
      </main>

      {/* Modals */}
      <CreateAgentModal />
      <PairingWizard />
      <ShareModal />
    </div>
  );
}

export default App;
