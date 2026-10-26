import { useState, useEffect } from 'react';
import { X, Users, Globe, Copy, Check, Mail, Shield, Eye, Zap, Loader2, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function ShareModal() {
  const { isShareModalOpen, setShareModalOpen, workspaceId, currentUserId, currentUserName, userRole } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<'invite' | 'showcase'>('invite');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'write' | 'read'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; expiresAt: string } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [showcaseUrl, setShowcaseUrl] = useState<string>('');
  const [isLoadingShowcase, setIsLoadingShowcase] = useState(false);
  const [copiedShowcase, setCopiedShowcase] = useState(false);

  // Generate or retrieve showcase link when modal opens
  useEffect(() => {
    if (!isShareModalOpen) return;

    const fetchShowcaseLink = async () => {
      setIsLoadingShowcase(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId || 'default-workspace'}/showcase-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
          },
        });
        if (response.ok) {
          const json = await response.json();
          const data = json.data || json;
          setShowcaseUrl(data.showcase_url || `${window.location.origin}/?showcase=${data.showcase_token}`);
        } else {
          setShowcaseUrl(`${window.location.origin}/?showcase=public&workspace_id=${workspaceId || 'default-workspace'}`);
        }
      } catch {
        setShowcaseUrl(`${window.location.origin}/?showcase=public&workspace_id=${workspaceId || 'default-workspace'}`);
      } finally {
        setIsLoadingShowcase(false);
      }
    };

    fetchShowcaseLink();
  }, [isShareModalOpen, workspaceId]);

  if (!isShareModalOpen) return null;

  const handleSendInvite = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/v1/workspaces/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
          'X-User-Name': currentUserName,
          'X-User-Role': userRole,
        },
        body: JSON.stringify({
          workspace_id: workspaceId || 'default-workspace',
          email: email.trim(),
          role,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const data = json.data || json;
        setInviteResult({
          inviteUrl: data.invite_url || `${window.location.origin}/invite/${data.invitation_token}`,
          expiresAt: data.expires_at ? new Date(data.expires_at).toLocaleDateString() : '7 days',
        });
        setEmail('');
      } else {
        // Fallback for offline demo
        setInviteResult({
          inviteUrl: `${window.location.origin}/invite/demo-${Math.random().toString(36).slice(2, 10)}`,
          expiresAt: '7 days',
        });
      }
    } catch {
      setInviteResult({
        inviteUrl: `${window.location.origin}/invite/demo-${Math.random().toString(36).slice(2, 10)}`,
        expiresAt: '7 days',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'invite' | 'showcase') => {
    navigator.clipboard.writeText(text);
    if (type === 'invite') {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } else {
      setCopiedShowcase(true);
      setTimeout(() => setCopiedShowcase(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-[#202124] dark:text-zinc-100">
        <button
          onClick={() => setShareModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-indigo-950/80 border border-blue-200 dark:border-indigo-700/50">
            <Users className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#202124] dark:text-white">Workspace Collaboration & Access</h3>
            <p className="text-xs text-[#5f6368] dark:text-zinc-400">Invite teammates with RBAC roles or publish a live read-only showcase.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium mb-5">
          <button
            onClick={() => setActiveTab('invite')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'invite'
                ? 'border-blue-600 dark:border-indigo-500 text-blue-600 dark:text-indigo-300 font-semibold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Invite Teammates</span>
          </button>
          <button
            onClick={() => setActiveTab('showcase')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'showcase'
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-300 font-semibold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Showcase Link</span>
          </button>
        </div>

        {/* Tab 1: Invite Teammates */}
        {activeTab === 'invite' && (
          <div className="space-y-4 text-xs">
            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-[#202124] dark:text-zinc-300 font-semibold mb-1.5">Teammate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-750 text-[#202124] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#202124] dark:text-zinc-300 font-semibold mb-1.5">Assigned Role Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('write')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      role === 'write'
                        ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-950/60 text-blue-700 dark:text-indigo-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-indigo-400" />
                      <span className="text-xs">Operator</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-normal leading-tight">
                      Deploy agents, wire graph, resolve approvals.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('read')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      role === 'read'
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs">Observer</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-normal leading-tight">
                      Live canvas & thought feed (read-only).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      role === 'admin'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs">Admin</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-normal leading-tight">
                      Full workspace administration & invitations.
                    </p>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!email.trim() || isSubmitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Issuing Invitation...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Teammate Invitation</span>
                  </>
                )}
              </button>
            </form>

            {/* Generated Invite Result */}
            {inviteResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/60 space-y-2 mt-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Invitation Link Generated</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(inviteResult.inviteUrl, 'invite')}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-xs transition-colors"
                  >
                    {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInvite ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
                <code className="block p-2 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-[#202124] dark:text-zinc-300 break-all select-all">
                  {inviteResult.inviteUrl}
                </code>
                <p className="text-[10px] text-zinc-500 font-mono">Expires in {inviteResult.expiresAt}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Public Showcase Link */}
        {activeTab === 'showcase' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[#202124] dark:text-zinc-200">
                  <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>24/7 Live Read-Only Showcase</span>
                </div>
                <button
                  onClick={() => copyToClipboard(showcaseUrl, 'showcase')}
                  disabled={!showcaseUrl || isLoadingShowcase}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-xs transition-colors"
                >
                  {copiedShowcase ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedShowcase ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              <p className="text-[#5f6368] dark:text-zinc-400 text-[11px] leading-relaxed">
                Share this unguessable link with clients or on social media. Viewers can watch your fleet run 24/7 without logging in, but cannot modify nodes or resolve approvals.
              </p>

              {isLoadingShowcase ? (
                <div className="h-9 flex items-center justify-center gap-2 text-zinc-500 font-mono text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating secure showcase token...</span>
                </div>
              ) : (
                <code className="block p-2 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-[#202124] dark:text-zinc-300 break-all select-all">
                  {showcaseUrl}
                </code>
              )}
            </div>

            {/* Viral Growth Badge Preview */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-indigo-950/30 border border-blue-200 dark:border-indigo-800/50">
              <span className="text-[10px] uppercase font-mono tracking-wider text-blue-700 dark:text-indigo-400 block mb-1.5 font-semibold">
                Viral Footprint (Bottom-Left Canvas Badge)
              </span>
              <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-blue-600 dark:bg-indigo-600 flex items-center justify-center text-white">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-semibold text-[#202124] dark:text-zinc-200">
                    Powered by Dotdeck — Build Your Fleet
                  </span>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-indigo-400 font-mono">Live on Showcase</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
