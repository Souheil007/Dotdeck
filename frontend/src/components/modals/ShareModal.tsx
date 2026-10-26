import { useState } from 'react';
import { X, Users, Globe, Copy, Check, Mail, Shield } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function ShareModal() {
  const { isShareModalOpen, setShareModalOpen, workspaceId } = useWorkspaceStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'write' | 'read'>('write');
  const [copiedLink, setCopiedLink] = useState(false);
  const [invited, setInvited] = useState(false);

  if (!isShareModalOpen) return null;

  const publicLink = `http://localhost:3000/share/${workspaceId}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvite = (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!email.trim()) return;
    setInvited(true);
    setEmail('');
    setTimeout(() => setInvited(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl">
        <button
          onClick={() => setShareModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/50">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Share Workspace</h3>
            <p className="text-xs text-zinc-400">Collaborate with operators or invite client observers</p>
          </div>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="mt-5 space-y-3">
          <label className="block text-xs font-medium text-zinc-300">Invite Teammate</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@agency.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={role}
              onChange={(changeEvent) => setRole(changeEvent.target.value as 'write' | 'read')}
              className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="write">Operator (Write)</option>
              <option value="read">Observer (Read)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            {invited ? 'Invitation Sent!' : 'Send Invite'}
          </button>
        </form>

        {/* Public Showcase Link (PLG Viral Growth) */}
        <div className="mt-6 pt-5 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Public Read-Only Showcase Link</span>
            </div>
            <button
              onClick={copyPublicLink}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
            Anyone with this link can watch your agents run in real time with a &ldquo;Powered by Dotdeck&rdquo; badge.
          </p>
          <code className="block p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 truncate">
            {publicLink}
          </code>
        </div>
      </div>
    </div>
  );
}
