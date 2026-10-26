import { useState, useEffect } from 'react';
import {
  Share2,
  Plus,
  Sparkles,
  Crown,
  Zap,
  Eye,
  ArrowLeft,
  ChevronDown,
  Home,
  LogOut,
  FolderKanban,
} from 'lucide-react';
import { AgentCanvas } from './components/canvas/AgentCanvas';
import { InspectorDrawer } from './components/inspector/InspectorDrawer';
import { PairingWizard } from './components/modals/PairingWizard';
import { CreateAgentModal } from './components/modals/CreateAgentModal';
import { ShareModal } from './components/modals/ShareModal';
import { LandingPage } from './components/home/LandingPage';
import { WorkspaceDashboard } from './components/workspaces/WorkspaceDashboard';
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

  const { isAuthenticated, user, logout } = useAuthStore();

  const [activeView, setActiveView] = useState<'landing' | 'dashboard' | 'canvas'>('landing');
  const [isShowcase, setIsShowcase] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);

  // Initialize view and role based on URL params and authentication state
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('showcase') || searchParams.get('role') === 'read') {
      setIsShowcase(true);
      setUserRole('read');
      setActiveView('canvas');
    } else if (searchParams.get('view') === 'canvas' || searchParams.has('workspace')) {
      setActiveView('canvas');
    } else if (searchParams.get('view') === 'dashboard' || isAuthenticated) {
      setActiveView('dashboard');
    } else {
      setActiveView('landing');
    }
  }, [isAuthenticated, setUserRole]);

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
        onOpenShowcase={() => {
          setIsShowcase(true);
          setUserRole('read');
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
      />
    );
  }

  const roleBadgeConfig = {
    admin: {
      label: 'Admin',
      icon: Crown,
      badgeClass: 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-300',
    },
    write: {
      label: 'Operator',
      icon: Zap,
      badgeClass: 'bg-blue-50 dark:bg-indigo-950/80 border-blue-300 dark:border-indigo-700/80 text-blue-800 dark:text-indigo-300',
    },
    read: {
      label: 'Observer',
      icon: Eye,
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-300',
    },
  };

  const currentRoleConfig = roleBadgeConfig[userRole] || roleBadgeConfig.write;
  const RoleIcon = currentRoleConfig.icon;

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#07080b] text-[#202124] dark:text-zinc-100 select-none overflow-hidden font-sans">
      {/* Public Showcase Banner */}
      {isShowcase && (
        <div className="h-8 bg-gradient-to-r from-emerald-100 via-white to-indigo-100 dark:from-emerald-950 dark:via-zinc-900 dark:to-indigo-950 border-b border-emerald-300 dark:border-emerald-700/60 px-4 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300 z-40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
            <span className="font-semibold">Public Read-Only Showcase</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Live 24/7 Cloud Agent Telemetry Feed</span>
          </div>
          <button
            onClick={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setIsShowcase(false);
              setUserRole('write');
              setActiveView('dashboard');
            }}
            className="text-[10px] underline hover:text-black dark:hover:text-white font-mono transition-colors"
          >
            Exit Showcase & Go to Dashboard
          </button>
        </div>
      )}

      {/* Top Command Bar & Switchboard Navigation */}
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 px-4 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back to Workspaces */}
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-medium transition-colors shadow-sm"
            title="Return to Workspace Hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workspaces</span>
          </button>

          <span className="text-zinc-400 dark:text-zinc-700">/</span>

          {/* Workspace Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-cyan-500/30 text-zinc-900 dark:text-white text-xs font-semibold shadow-sm transition-all"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>{activeWorkspaceName || 'Active Workspace'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isWorkspaceSwitcherOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-[#131418] border border-zinc-200 dark:border-cyan-500/30 py-1 shadow-2xl z-50 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Select Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setIsWorkspaceSwitcherOpen(false);
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

          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{nodes.length} Agents Online</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Workspace Role Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium shadow-sm ${currentRoleConfig.badgeClass}`}
            title={`Your Workspace Role: ${currentRoleConfig.label}`}
          >
            <RoleIcon className="w-3 h-3" />
            <span>{currentRoleConfig.label}</span>
          </div>

          {/* Teammate Presence Avatars */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-cyan-600 ring-2 ring-white dark:ring-[#07080b] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              {user ? user.avatar : 'You'}
            </div>
            {Object.values(cursors)
              .filter((teammateCursor) => teammateCursor.userId !== currentUserId)
              .map((teammateCursor) => (
                <div
                  key={teammateCursor.userId}
                  style={{ backgroundColor: teammateCursor.color }}
                  className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-[#07080b] flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  title={teammateCursor.userName}
                >
                  {teammateCursor.userName.slice(0, 2).toUpperCase()}
                </div>
              ))}
          </div>

          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={openCreateAgentModal}
            disabled={userRole === 'read'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/10 dark:shadow-cyan-500/20 disabled:opacity-40 transition-all"
            title={userRole === 'read' ? 'Read-only observer mode (Write permissions required)' : 'Add agent node'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Agent</span>
          </button>

          {/* Landing quick button */}
          <button
            onClick={() => setActiveView('landing')}
            title="Landing Home"
            className="p-1.5 rounded-xl bg-white dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Sign Out */}
          {isAuthenticated && (
            <button
              onClick={() => {
                logout();
                setActiveView('landing');
              }}
              title="Sign Out"
              className="p-1.5 rounded-xl bg-white dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shadow-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative overflow-hidden bg-[#f8f9fa] dark:bg-[#07080b]">
        <AgentCanvas />
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
    </div>
  );
}

export default App;
