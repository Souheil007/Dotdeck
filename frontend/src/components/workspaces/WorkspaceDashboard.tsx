import { useState } from 'react';
import {
  FolderPlus,
  Search,
  Bot,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  List,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { UserNavDropdown } from '../navigation/UserNavDropdown';

interface WorkspaceDashboardProps {
  onSelectWorkspace: (workspaceId: string) => void;
  onGoToLanding: () => void;
  onOpenSettings?: () => void;
}

export function WorkspaceDashboard({ onSelectWorkspace, onGoToLanding, onOpenSettings }: WorkspaceDashboardProps) {
  const { workspaces, switchWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'matrix' | 'dense'>('matrix');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'held'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredWorkspaces = workspaces.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'active') return item.agentCount > 0;
    if (filterMode === 'held') return item.activeApprovalsCount > 0;
    return true;
  });

  const totalAgents = workspaces.reduce((sum, ws) => sum + ws.agentCount, 0);
  const totalHeld = workspaces.reduce((sum, ws) => sum + ws.activeApprovalsCount, 0);

  const handleOpenWorkspace = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    onSelectWorkspace(workspaceId);
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'openai_dot':
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono text-[10px] font-semibold">
            OpenAI Dot
          </span>
        );
      case 'grok_bot':
        return (
          <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 font-mono text-[10px] font-semibold">
            xAI Grok
          </span>
        );
      case 'claude':
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono text-[10px] font-semibold">
            Claude
          </span>
        );
      case 'meta_muse':
        return (
          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px] font-semibold">
            Meta Muse
          </span>
        );
      default:
        return <Bot className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="agentgrid-bg w-full min-h-screen overflow-y-auto text-[#121417] dark:text-[#f0f2f5] flex flex-col font-sans selection:bg-blue-500/20 selection:text-blue-500">
      <div className="agentgrid-grid-overlay" />

      {/* Top Mission Control Bar */}
      <header className="border-b border-[#dfe1e6] dark:border-[#22262e] bg-[#ffffff]/90 dark:bg-[#111317]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onGoToLanding}
            className="flex items-center gap-2 group transition-transform active:scale-95 text-left"
            title="Return to Dotdeck Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0052cc] dark:bg-[#2684ff] flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-sm text-[#121417] dark:text-[#f0f2f5] tracking-tight">
              Dotdeck
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Create Workspace CTA */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="py-1.5 px-3 rounded-xl bg-[#0052cc] hover:bg-[#0747a6] dark:bg-[#2684ff] dark:hover:bg-[#0065ff] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Fleet</span>
          </button>

          {/* User Nav Dropdown or Theme Toggle */}
          {user ? (
            <UserNavDropdown
              onOpenSettings={onOpenSettings || (() => {})}
              onOpenWorkspaces={() => {}}
              onGoToLanding={onGoToLanding}
            />
          ) : (
            <ThemeToggle />
          )}
        </div>
      </header>

      {/* Main Command Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 relative z-10">
        
        {/* Fleet Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-3.5 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-sm">
            <div className="flex items-center justify-between text-[#5e6c84] dark:text-[#8c96a5] text-xs mb-1">
              <span>Managed Fleets</span>
              <Layers className="w-3.5 h-3.5 text-[#0052cc] dark:text-[#2684ff]" />
            </div>
            <div className="font-mono text-xl font-bold text-[#121417] dark:text-[#f0f2f5] tabular-nums">
              {workspaces.length}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-sm">
            <div className="flex items-center justify-between text-[#5e6c84] dark:text-[#8c96a5] text-xs mb-1">
              <span>Active Agent Nodes</span>
              <Activity className="w-3.5 h-3.5 text-[#00875a] dark:text-[#36b37e]" />
            </div>
            <div className="font-mono text-xl font-bold text-[#121417] dark:text-[#f0f2f5] tabular-nums">
              {totalAgents}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-sm">
            <div className="flex items-center justify-between text-[#5e6c84] dark:text-[#8c96a5] text-xs mb-1">
              <span>Pending Human Holds</span>
              <AlertTriangle className="w-3.5 h-3.5 text-[#ff8b00] dark:text-[#ffab00]" />
            </div>
            <div className="font-mono text-xl font-bold text-[#121417] dark:text-[#f0f2f5] tabular-nums">
              {totalHeld}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] shadow-tactical-sm">
            <div className="flex items-center justify-between text-[#5e6c84] dark:text-[#8c96a5] text-xs mb-1">
              <span>Security Perimeter</span>
              <Shield className="w-3.5 h-3.5 text-[#0052cc] dark:text-[#2684ff]" />
            </div>
            <div className="font-mono text-sm font-bold text-[#00875a] dark:text-[#36b37e] flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#00875a] dark:bg-[#36b37e] animate-pulse" />
              <span>MCP Auth Enforced</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Command Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#dfe1e6] dark:border-[#22262e]">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] p-0.5 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-[#111317] text-[#121417] dark:text-[#f0f2f5] shadow-xs font-semibold'
                    : 'text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417]'
                }`}
              >
                All Fleets ({workspaces.length})
              </button>
              <button
                onClick={() => setFilterMode('active')}
                className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
                  filterMode === 'active'
                    ? 'bg-white dark:bg-[#111317] text-[#121417] dark:text-[#f0f2f5] shadow-xs font-semibold'
                    : 'text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417]'
                }`}
              >
                Active ({workspaces.filter((w) => w.agentCount > 0).length})
              </button>
              <button
                onClick={() => setFilterMode('held')}
                className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
                  filterMode === 'held'
                    ? 'bg-white dark:bg-[#111317] text-[#121417] dark:text-[#f0f2f5] shadow-xs font-semibold'
                    : 'text-[#5e6c84] dark:text-[#8c96a5] hover:text-[#121417]'
                }`}
              >
                Holds ({workspaces.filter((w) => w.activeApprovalsCount > 0).length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] p-0.5 text-xs">
              <button
                onClick={() => setViewMode('matrix')}
                title="Matrix View"
                className={`p-1 rounded ${viewMode === 'matrix' ? 'bg-white dark:bg-[#111317] text-[#0052cc] dark:text-[#2684ff] shadow-xs' : 'text-[#5e6c84] dark:text-[#8c96a5]'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('dense')}
                title="Dense List View"
                className={`p-1 rounded ${viewMode === 'dense' ? 'bg-white dark:bg-[#111317] text-[#0052cc] dark:text-[#2684ff] shadow-xs' : 'text-[#5e6c84] dark:text-[#8c96a5]'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#5e6c84] dark:text-[#8c96a5] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search fleets & topologies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] rounded-lg focus:border-[#0052cc] dark:focus:border-[#2684ff] focus:outline-none text-[#121417] dark:text-[#f0f2f5] placeholder:text-[#5e6c84]"
              />
            </div>
          </div>
        </div>

        {/* Workspaces List / Grid Presentation */}
        {viewMode === 'matrix' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkspaces.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenWorkspace(item.id)}
                className="group relative rounded-xl bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] hover:border-[#0052cc] dark:hover:border-[#2684ff] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-tactical-sm hover:shadow-tactical-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-display font-bold text-base text-[#121417] dark:text-[#f0f2f5] group-hover:text-[#0052cc] dark:group-hover:text-[#2684ff] transition-colors">
                      {item.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.2 rounded border bg-[#f4f5f7] dark:bg-[#171a21] border-[#dfe1e6] dark:border-[#22262e] text-[#5e6c84] dark:text-[#8c96a5]">
                      {item.role}
                    </span>
                  </div>

                  <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] line-clamp-2 leading-relaxed mb-4">
                    {item.description}
                  </p>

                  {/* Model Providers */}
                  <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                    {item.providers.length > 0 ? (
                      item.providers.map((p, idx) => (
                        <span key={idx}>{getProviderBadge(p)}</span>
                      ))
                    ) : (
                      <span className="text-[11px] font-mono text-[#5e6c84] italic">Clean instance (0 agents)</span>
                    )}
                  </div>
                </div>

                {/* Telemetry Footer */}
                <div className="pt-3.5 border-t border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[#121417] dark:text-[#f0f2f5] font-mono text-xs">
                      <Bot className="w-3.5 h-3.5 text-[#0052cc] dark:text-[#2684ff]" />
                      <span>{item.agentCount}</span>
                    </div>

                    {item.activeApprovalsCount > 0 ? (
                      <div className="flex items-center gap-1 text-[#ff8b00] dark:text-[#ffab00] font-mono text-[11px] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{item.activeApprovalsCount} Hold</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[#00875a] dark:text-[#36b37e] font-mono text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Nominal</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[#5e6c84] dark:text-[#8c96a5] text-[11px] font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{item.lastActive}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[#0052cc] dark:text-[#2684ff] text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Deck</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}

            {/* Quick Provisioning Card */}
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl border-2 border-dashed border-[#dfe1e6] dark:border-[#22262e] hover:border-[#0052cc] dark:hover:border-[#2684ff] bg-white/40 dark:bg-[#111317]/40 hover:bg-white dark:hover:bg-[#111317] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[190px] group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-center text-[#5e6c84] group-hover:text-[#0052cc] dark:group-hover:text-[#2684ff] transition-colors mb-2.5">
                <FolderPlus className="w-5 h-5" />
              </div>
              <h4 className="font-display font-semibold text-sm text-[#121417] dark:text-[#f0f2f5] group-hover:text-[#0052cc] dark:group-hover:text-[#2684ff]">
                Provision New Fleet
              </h4>
              <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] mt-1 max-w-[210px]">
                Deploy clean canvas with private MCP router.
              </p>
            </div>
          </div>
        ) : (
          /* High-Density List Presentation */
          <div className="rounded-xl bg-white dark:bg-[#111317] border border-[#dfe1e6] dark:border-[#22262e] divide-y divide-[#dfe1e6] dark:divide-[#22262e] overflow-hidden shadow-tactical-sm">
            {filteredWorkspaces.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenWorkspace(item.id)}
                className="p-4 flex items-center justify-between hover:bg-[#f4f5f7] dark:hover:bg-[#171a21] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#f4f5f7] dark:bg-[#171a21] border border-[#dfe1e6] dark:border-[#22262e] flex items-center justify-center text-[#0052cc] dark:text-[#2684ff] shrink-0 font-bold font-mono text-xs">
                    {item.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-sm text-[#121417] dark:text-[#f0f2f5] group-hover:text-[#0052cc] dark:group-hover:text-[#2684ff] transition-colors">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded uppercase border bg-[#f4f5f7] dark:bg-[#171a21] border-[#dfe1e6] dark:border-[#22262e] text-[#5e6c84]">
                        {item.role}
                      </span>
                    </div>
                    <p className="text-xs text-[#5e6c84] dark:text-[#8c96a5] truncate max-w-md mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[#5e6c84] dark:text-[#8c96a5]">
                    <Bot className="w-3.5 h-3.5 text-[#0052cc] dark:text-[#2684ff]" />
                    <span>{item.agentCount} Agents</span>
                  </div>

                  {item.activeApprovalsCount > 0 ? (
                    <div className="flex items-center gap-1 text-[#ff8b00] dark:text-[#ffab00] font-mono text-[11px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{item.activeApprovalsCount} Hold</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[#00875a] dark:text-[#36b37e] font-mono text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Nominal</span>
                    </div>
                  )}

                  <div className="text-[11px] font-mono text-[#5e6c84] hidden md:block">
                    {item.lastActive}
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#5e6c84] group-hover:text-[#0052cc] dark:group-hover:text-[#2684ff] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Persistent System Footer */}
      <footer className="border-t border-[#dfe1e6] dark:border-[#22262e] py-3.5 px-6 text-xs text-[#5e6c84] dark:text-[#8c96a5] flex items-center justify-between max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00875a] dark:bg-[#36b37e] animate-pulse" />
          <span className="font-mono text-[11px]">Dynamic MCP Switchboard Mesh: Active</span>
        </div>
        <div className="font-mono text-[11px] text-[#5e6c84] dark:text-[#8c96a5]">
          Dotdeck Closed Cloud Orchestration Deck
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
