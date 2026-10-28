import { useState, useEffect } from 'react';
import {
  Bot,
  Share2,
  Plus,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  Home,
  FolderKanban,
} from 'lucide-react';
import { AgentCanvas } from './components/canvas/AgentCanvas';
import { InspectorDrawer } from './components/inspector/InspectorDrawer';
import { PairingWizard } from './components/modals/PairingWizard';
import { CreateAgentModal } from './components/modals/CreateAgentModal';
import { ShareModal } from './components/modals/ShareModal';
import { DecommissionAgentModal } from './components/modals/DecommissionAgentModal';
import { LandingPage } from './components/home/LandingPage';
import { WorkspaceDashboard } from './components/workspaces/WorkspaceDashboard';
import { CreateWorkspaceModal } from './components/workspaces/CreateWorkspaceModal';
import { SettingsPage } from './components/settings/SettingsPage';
import { UserNavDropdown } from './components/navigation/UserNavDropdown';
import { ThemeToggle } from './components/common/ThemeToggle';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { useAuthStore } from './store/useAuthStore';

export function App() {
  const {
    currentUserId,
    userRole,
    setUserRole,
    nodes,
    setShareModalOpen,
    openCreateAgentModal,
    cursors,
    workspaces,
    activeWorkspaceId,
    activeWorkspaceName,
    switchWorkspace,
  } = useWorkspaceStore();

  const { user } = useAuthStore();

  const [activeView, setActiveView] = useState<'landing' | 'dashboard' | 'canvas' | 'settings'>('landing');
  const [previousView, setPreviousView] = useState<'landing' | 'dashboard' | 'canvas'>('canvas');
  const [isShowcase, setIsShowcase] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);

  const handleOpenSettings = (fromView?: 'landing' | 'dashboard' | 'canvas') => {
    setPreviousView(fromView || (activeView === 'settings' ? 'canvas' : activeView));
    setActiveView('settings');
  };

  // Initialize view and role based strictly on explicit URL params on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('showcase') || searchParams.get('role') === 'read') {
      setIsShowcase(true);
      setUserRole('read');
      switchWorkspace('ws-prod-sales');
      setActiveView('canvas');
    } else if (searchParams.get('view') === 'canvas' || searchParams.has('workspace')) {
      const targetWorkspace = searchParams.get('workspace') || 'ws-prod-sales';
      switchWorkspace(targetWorkspace);
      setActiveView('canvas');
    } else if (searchParams.get('view') === 'dashboard') {
      setActiveView('dashboard');
    } else {
      // Default to the Dotdeck landing homepage on initial visit
      setActiveView('landing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync role with logged-in user if available and not showcase
  useEffect(() => {
    if (user && !isShowcase) {
      setUserRole(user.role);
    }
  }, [user, isShowcase, setUserRole]);

  // Route: Landing View
  if (activeView === 'landing') {
    return (
      <LandingPage
        onEnterApp={() => setActiveView('dashboard')}
        onOpenSettings={() => handleOpenSettings('landing')}
        onOpenShowcase={() => {
          setIsShowcase(true);
          setUserRole('read');
          switchWorkspace('ws-prod-sales');
          setActiveView('canvas');
        }}
      />
    );
  }

  // Route: Workspace Dashboard View
  if (activeView === 'dashboard') {
    return (
      <WorkspaceDashboard
        onSelectWorkspace={() => setActiveView('canvas')}
        onGoToLanding={() => setActiveView('landing')}
        onOpenSettings={() => handleOpenSettings('dashboard')}
      />
    );
  }

  // Route: Dedicated Operator Settings View
  if (activeView === 'settings') {
    return (
      <SettingsPage
        onBack={() => setActiveView(previousView)}
        onGoToLanding={() => setActiveView('landing')}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#07080b] text-[#202124] dark:text-zinc-100 select-none overflow-hidden font-sans">
      {/* Public Showcase Banner */}
      {isShowcase && (
        <div className="h-8 bg-emerald-500/10 border-b border-emerald-500/30 px-4 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 z-40 shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold uppercase tracking-wider text-[11px]">Public Read-Only Fleet Monitor</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-sans">Live 24/7 Cloud Agent Telemetry Feed</span>
          </div>
          <button
            onClick={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setIsShowcase(false);
              setUserRole('write');
              setActiveView('dashboard');
            }}
            className="text-[11px] hover:text-black dark:hover:text-white transition-colors underline decoration-dashed"
          >
            Exit Showcase &amp; Enter Cockpit &rarr;
          </button>
        </div>
      )}

      {/* Top Command Bar & Switchboard Navigation */}
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 px-4 flex items-center justify-between bg-white/90 dark:bg-[#07080b]/90 backdrop-blur-md z-30 shrink-0 font-sans">
        <div className="flex items-center gap-3">
          {/* Dotdeck Logo & Name */}
          <button
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2 group mr-1 text-left"
            title="Return to Dotdeck Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0052cc] dark:bg-[#2684ff] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-sm text-[#121417] dark:text-[#f0f2f5] tracking-tight">
              Dotdeck
            </span>
          </button>

          <span className="text-zinc-300 dark:text-zinc-700">/</span>

          {/* Back to Workspaces */}
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#121318] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-mono font-medium transition-colors shadow-xs"
            title="Return to Fleet Hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hub</span>
          </button>

          <span className="text-zinc-300 dark:text-zinc-700">/</span>

          {/* Workspace Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#121318] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-750 text-zinc-900 dark:text-zinc-100 text-xs font-semibold shadow-xs transition-all font-display"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>{activeWorkspaceName || 'Active Workspace'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isWorkspaceSwitcherOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-[#121318] border border-zinc-200 dark:border-zinc-700 py-1 shadow-2xl z-50 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                  Fleet Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setIsWorkspaceSwitcherOpen(false);
                      setActiveView('canvas');
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors ${
                      ws.id === activeWorkspaceId ? 'text-blue-600 dark:text-cyan-300 bg-blue-50 dark:bg-cyan-950/40 font-semibold' : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{ws.agentCount} bots</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{nodes.length} Agents Live</span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Teammate Presence Avatars */}
          <div className="hidden sm:flex items-center -space-x-1.5 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-cyan-600 ring-2 ring-white dark:ring-[#07080b] flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              {user ? user.avatar : 'You'}
            </div>
            {Object.values(cursors)
              .filter((teammateCursor) => teammateCursor.userId !== currentUserId)
              .map((teammateCursor) => (
                <div
                  key={teammateCursor.userId}
                  style={{ backgroundColor: teammateCursor.color }}
                  className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-[#07080b] flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  title={teammateCursor.userName}
                >
                  {teammateCursor.userName.slice(0, 2).toUpperCase()}
                </div>
              ))}
          </div>

          {/* Share Canvas */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121318] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-medium transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Add Agent CTA */}
          <button
            onClick={openCreateAgentModal}
            disabled={userRole === 'read'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0052cc] hover:bg-[#0747a6] dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-black text-white text-xs font-mono font-bold shadow-xs transition-all active:scale-[0.98] disabled:opacity-40"
            title={userRole === 'read' ? 'Read-only observer mode (Write permissions required)' : 'Add agent node'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Agent</span>
          </button>

          {/* User Profile Dropdown or Guest Controls */}
          {user ? (
            <UserNavDropdown
              onOpenSettings={() => handleOpenSettings('canvas')}
              onOpenWorkspaces={() => setActiveView('dashboard')}
              onGoToLanding={() => setActiveView('landing')}
            />
          ) : (
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setActiveView('landing')}
                title="Landing Home"
                className="p-1.5 rounded-xl bg-white dark:bg-[#121318] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-250 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-xs"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative overflow-hidden bg-[#f8f9fa] dark:bg-[#07080b]">
        <AgentCanvas key={activeWorkspaceId} />
        <InspectorDrawer />

        {/* Viral Growth Badge (Bottom-Left) */}
        <a
          href="https://github.com/Souheil007/Dotdeck"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-950/90 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-cyan-500/40 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-lg backdrop-blur-md transition-all text-xs group"
          title="Dotdeck Open Source Repository"
        >
          <div className="w-5 h-5 rounded-lg bg-blue-600 dark:bg-gradient-to-tr dark:from-cyan-500 dark:to-blue-600 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="font-medium text-[11px]">
            Powered by <strong className="text-zinc-900 dark:text-white font-semibold">Dotdeck</strong> — Build Your Fleet
          </span>
        </a>
      </main>

      {/* Modals */}
      <CreateAgentModal />
      <PairingWizard />
      <ShareModal />
      <DecommissionAgentModal />
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        onSuccess={(createdId) => {
          switchWorkspace(createdId);
          setActiveView('canvas');
        }}
      />
    </div>
  );
}

export default App;
