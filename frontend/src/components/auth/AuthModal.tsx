import { useState } from 'react';
import { X, Shield, Lock, Mail, ArrowRight, UserCheck, Sparkles, Terminal } from 'lucide-react';
import { useAuthStore, DEMO_USERS, type UserRole } from '../../store/useAuthStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthModalProps) {
  const { login, quickLogin } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    const userName = name || email.split('@')[0];
    login({
      id: `usr-${Date.now()}`,
      name: userName,
      email,
      avatar: selectedRole === 'admin' ? '👑' : selectedRole === 'write' ? '⚡' : '👁️',
      role: selectedRole,
      token: `jwt-${Date.now()}`,
    });

    onClose();
    if (onSuccess) onSuccess();
  };

  const handleQuickDemo = (role: UserRole) => {
    quickLogin(role);
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-cyan-500/30 p-7 text-[#202124] dark:text-zinc-100 shadow-2xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-transparent via-blue-500 dark:via-cyan-400 to-transparent blur-sm" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-cyan-500/20 border border-blue-200 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#202124] dark:text-white flex items-center gap-2">
              Dotdeck Switchboard
            </h2>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400">Multi-Vendor Agent Orchestration Command</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 p-1 my-5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-cyan-300 shadow-sm border border-zinc-200 dark:border-cyan-500/20 font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-cyan-300 shadow-sm border border-zinc-200 dark:border-cyan-500/20 font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-zinc-300 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Souheil Bichiou"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:outline-none text-[#202124] dark:text-zinc-100 placeholder:text-zinc-400"
                />
                <UserCheck className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#3c4043] dark:text-zinc-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:outline-none text-[#202124] dark:text-zinc-100 placeholder:text-zinc-400"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3c4043] dark:text-zinc-300 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:outline-none text-[#202124] dark:text-zinc-100 placeholder:text-zinc-400"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-zinc-300 mb-1">Assigned Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'write', 'read'] as UserRole[]).map((roleItem) => (
                  <button
                    key={roleItem}
                    type="button"
                    onClick={() => setSelectedRole(roleItem)}
                    className={`p-2 rounded-xl text-xs font-medium border text-center transition-all ${
                      selectedRole === roleItem
                        ? 'border-blue-500 dark:border-cyan-400 bg-blue-50 dark:bg-cyan-500/10 text-blue-700 dark:text-cyan-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                    }`}
                  >
                    {roleItem === 'admin' ? '👑 Admin' : roleItem === 'write' ? '⚡ Operator' : '👁️ Observer'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-2 rounded-lg">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <span>{mode === 'signin' ? 'Sign In to Dashboard' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-zinc-900 px-3 text-[#5f6368] dark:text-zinc-500 flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-cyan-400" /> One-Click Demo Access
            </span>
          </div>
        </div>

        {/* Quick Demo Login Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleQuickDemo('admin')}
            className="w-full py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-cyan-500/40 text-xs flex items-center justify-between text-[#3c4043] dark:text-zinc-300 hover:text-black dark:hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">👑</span>
              <span className="font-medium text-[#202124] dark:text-white">{DEMO_USERS.admin.name}</span>
              <span className="text-[10px] text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Admin
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemo('write')}
            className="w-full py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-amber-500/40 text-xs flex items-center justify-between text-[#3c4043] dark:text-zinc-300 hover:text-black dark:hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">⚡</span>
              <span className="font-medium text-[#202124] dark:text-white">{DEMO_USERS.write.name}</span>
              <span className="text-[10px] text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Operator
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemo('read')}
            className="w-full py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-zinc-600 text-xs flex items-center justify-between text-[#3c4043] dark:text-zinc-300 hover:text-black dark:hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">👁️</span>
              <span className="font-medium text-[#202124] dark:text-white">{DEMO_USERS.read.name}</span>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Observer
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Security Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-[#5f6368] dark:text-zinc-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> End-to-End HMAC & MCP Token Secured
          </span>
          <span className="font-mono text-zinc-400 dark:text-zinc-600">v1.2.0</span>
        </div>
      </div>
    </div>
  );
}
