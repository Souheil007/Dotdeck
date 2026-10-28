import { useState, useRef, useEffect } from 'react';
import {
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  FolderKanban,
  Crown,
  Zap,
  Eye,
} from 'lucide-react';
import { useAuthStore, type UserRole } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';

interface UserNavDropdownProps {
  onOpenSettings: () => void;
  onOpenWorkspaces: () => void;
  onGoToLanding?: () => void;
  className?: string;
}

export function UserNavDropdown({
  onOpenSettings,
  onOpenWorkspaces,
  onGoToLanding,
  className = '',
}: UserNavDropdownProps) {
  const { user, logout, updateRole } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const roleConfig: Record<
    UserRole,
    { label: string; icon: typeof Crown; badgeClass: string; textColor: string }
  > = {
    admin: {
      label: 'Admin',
      icon: Crown,
      badgeClass:
        'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-300',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    write: {
      label: 'Operator',
      icon: Zap,
      badgeClass:
        'bg-blue-50 dark:bg-indigo-950/80 border-blue-300 dark:border-indigo-700/80 text-blue-800 dark:text-indigo-300',
      textColor: 'text-blue-600 dark:text-indigo-400',
    },
    read: {
      label: 'Observer',
      icon: Eye,
      badgeClass:
        'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-300',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
  };

  const currentRole = roleConfig[user.role] || roleConfig.write;
  const RoleIcon = currentRole.icon;

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    if (onGoToLanding) onGoToLanding();
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121318] hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-medium shadow-xs transition-all active:scale-[0.98] group"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`${user.name} (${currentRole.label})`}
      >
        {/* Avatar Ring */}
        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-cyan-950/60 border border-blue-200 dark:border-cyan-800/60 flex items-center justify-center text-xs shrink-0 shadow-xs">
          {user.avatar || '👤'}
        </div>

        {/* User Name */}
        <span className="font-semibold text-xs tracking-tight truncate max-w-[110px] hidden sm:inline">
          {user.name}
        </span>

        {/* Compact Role Badge */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold ${currentRole.badgeClass}`}
        >
          <RoleIcon className="w-2.5 h-2.5" />
          <span>{currentRole.label}</span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Floating Tactical Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0e1014] border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header Profile Identity Strip */}
          <div className="p-3.5 bg-zinc-50/80 dark:bg-[#14171d]/90 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1e26] border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center text-lg shadow-xs shrink-0">
                {user.avatar || '👤'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {user.name}
                  </h4>
                  <span
                    className={`px-1.5 py-0.2 rounded border text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 ${currentRole.badgeClass}`}
                  >
                    {currentRole.label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Core Navigation Items */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenWorkspaces();
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-xs flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors font-medium"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-cyan-950/40 border border-blue-200 dark:border-cyan-800/50 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0">
                <FolderKanban className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  Fleet Workspaces
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Switchboard Mission Control Hub
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-xs flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors font-medium"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  Account &amp; System Settings
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Profile, credentials &amp; themes
                </div>
              </div>
            </button>
          </div>

          {/* Quick Theme Switcher Strip */}
          <div className="px-3 py-2 mx-1.5 rounded-xl bg-zinc-50 dark:bg-[#14171d] border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Appearance
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-[#1a1e26] p-0.5 rounded-lg border border-zinc-250 dark:border-zinc-750">
              <button
                onClick={() => setTheme('light')}
                className={`p-1 rounded-md text-xs transition-colors flex items-center gap-1 ${
                  theme === 'light'
                    ? 'bg-blue-50 text-blue-700 shadow-xs font-semibold'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="text-[10px]">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1 rounded-md text-xs transition-colors flex items-center gap-1 ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-cyan-300 shadow-xs font-semibold'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="text-[10px]">Dark</span>
              </button>
            </div>
          </div>

          {/* Quick Role Tester (Admin switch) */}
          <div className="px-3 pt-2 pb-1.5 mx-1.5 mt-1 border-t border-zinc-150 dark:border-zinc-850">
            <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
              <span>Switch Active Role</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['admin', 'write', 'read'] as UserRole[]).map((r) => {
                const isSelected = user.role === r;
                const rConf = roleConfig[r];
                return (
                  <button
                    key={r}
                    onClick={() => updateRole(r)}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-medium border text-center transition-all ${
                      isSelected
                        ? `${rConf.badgeClass} ring-1 ring-offset-1 ring-blue-500 dark:ring-cyan-400`
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {rConf.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

          {/* Log Out CTA */}
          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 rounded-xl text-left text-xs flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Dotdeck</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
