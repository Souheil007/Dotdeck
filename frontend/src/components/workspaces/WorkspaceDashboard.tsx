import { useState } from 'react';
import {
  FolderPlus,
  Search,
  Bot,
  Clock,
  LogOut,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { ThemeToggle } from '../common/ThemeToggle';

interface WorkspaceDashboardProps {
  onSelectWorkspace: (workspaceId: string) => void;
  onGoToLanding: () => void;
}

export function WorkspaceDashboard({ onSelectWorkspace, onGoToLanding }: WorkspaceDashboardProps) {
  const { workspaces, switchWorkspace } = useWorkspaceStore();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredWorkspaces = workspaces.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenWorkspace = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    onSelectWorkspace(workspaceId);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai_dot':
        return <span title="OpenAI Dot" className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">OpenAI</span>;
      case 'grok_bot':
        return <span title="xAI Grok Bot" className="text-blue-600 dark:text-sky-400 font-mono text-[11px] font-bold">xAI</span>;
      case 'claude':
        return <span title="Anthropic Claude" className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold">Claude</span>;
      case 'meta_muse':
        return <span title="Meta Muse" className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">Meta</span>;
      default:
        return <Bot className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-[#f8f9fa] dark:bg-[#07080b] bg-cyber-dots bg-dots-sm text-[#202124] dark:text-zinc-100 flex flex-col font-sans selection:bg-blue-500/20 selection:text-blue-500">
      {/* Top Command Bar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800/80 glass-panel sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onGoToLanding}
            className="flex items-center gap-2.5 group transition-transform active:scale-95 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-cyan-500 dark:to-blue-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[#202124] dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                  Dotdeck
                </span>
                <span className="text-[10px] text-blue-700 dark:text-cyan-400 font-mono bg-blue-50 dark:bg-cyan-950/80 px-1.5 py-0.2 rounded border border-blue-200 dark:border-cyan-800/80">
                  Switchboard
                </span>
              </div>
            </div>
          </button>

          <span className="text-zinc-400 dark:text-zinc-600">/</span>
          <span className="text-xs font-semibold text-[#5f6368] dark:text-zinc-300">Workspace Hub</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs shadow-sm">
              <span className="text-sm">{user.avatar}</span>
              <div className="text-left hidden sm:block">
                <p className="font-medium text-[#202124] dark:text-white text-xs leading-none">{user.name}</p>
                <p className="text-[10px] text-[#5f6368] dark:text-zinc-400 leading-none mt-0.5">{user.email}</p>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider bg-zinc-100 dark:bg-zinc-800 text-[#3c4043] dark:text-zinc-300 border-zinc-300 dark:border-zinc-700">
                {user.role}
              </span>
            </div>
          )}

          {/* Create Workspace CTA */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Workspace</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 rounded-xl bg-white dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-[#5f6368] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 shadow-sm transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#202124] dark:text-white flex items-center gap-2.5">
              <span>Agentic Workspaces</span>
              <span className="text-xs font-mono font-medium text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/60 border border-blue-200 dark:border-cyan-800/80 px-2 py-0.5 rounded-full">
                {workspaces.length} Active Instances
              </span>
            </h1>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400 mt-1 max-w-xl">
              Each workspace hosts an isolated multi-agent fleet topology, private MCP endpoint tokens, 45s hold channels, and WebSocket room routers.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:outline-none text-[#202124] dark:text-zinc-100 placeholder:text-zinc-400 shadow-sm"
            />
          </div>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkspaces.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenWorkspace(item.id)}
              className="group relative rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-cyan-500/40 p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-sm hover:shadow-md"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <h3 className="font-bold text-base text-[#202124] dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                    {item.name}
                  </h3>
                  <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded border bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-[#5f6368] dark:text-zinc-400">
                    {item.role}
                  </span>
                </div>

                <p className="text-xs text-[#5f6368] dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {item.description}
                </p>

                {/* Providers Badge Row */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-[10px] text-zinc-400 font-medium">Models:</span>
                  {item.providers.length > 0 ? (
                    item.providers.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#f1f3f4] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                      >
                        {getProviderIcon(p)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">None yet (Ready for agents)</span>
                  )}
                </div>
              </div>

              {/* Card Footer / Status Telemetry */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[#3c4043] dark:text-zinc-300">
                    <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                    <span className="font-mono font-medium">{item.agentCount}</span>
                  </div>

                  {item.activeApprovalsCount > 0 ? (
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-mono text-[11px] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{item.activeApprovalsCount} Hold</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Nominal</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[#5f6368] dark:text-zinc-500 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{item.lastActive}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-blue-600 dark:text-cyan-400 text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>Open</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Quick Create Card */}
          <div
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-blue-500/60 dark:hover:border-cyan-500/50 bg-white/50 dark:bg-zinc-950/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 group-hover:border-blue-500/50 dark:group-hover:border-cyan-500/50 flex items-center justify-center text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors mb-3">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[#202124] dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
              Deploy New Workspace
            </h4>
            <p className="text-xs text-[#5f6368] dark:text-zinc-500 mt-1 max-w-[200px]">
              Provision empty switchboard ready for new agents.
            </p>
          </div>
        </div>
      </main>

      {/* System Telemetry Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/60 py-4 px-6 text-center text-xs text-[#5f6368] dark:text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Switchboard Engine: JSON-RPC 2.0 / MCP Active</span>
        </div>
        <div className="font-mono text-[11px] text-[#5f6368] dark:text-zinc-600">
          Dotdeck Closed Cloud Orchestration Hub
        </div>
      </footer>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(id) => handleOpenWorkspace(id)}
      />
    </div>
  );
}
