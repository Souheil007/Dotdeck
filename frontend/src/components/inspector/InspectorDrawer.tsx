import { useState } from 'react';
import { X, Brain, AlertCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { ThoughtStream } from './ThoughtStream';
import { ApprovalBox } from './ApprovalBox';
import { ChatBox } from './ChatBox';

export function InspectorDrawer() {
  const { selectedAgentId, setSelectedAgentId, nodes, thoughts, approvals } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<'thoughts' | 'approvals'>('thoughts');

  if (!selectedAgentId) return null;

  const agentNode = nodes.find((n) => n.id === selectedAgentId);
  if (!agentNode) return null;

  const agent = agentNode.data;
  const agentThoughts = thoughts[selectedAgentId] || [];
  const pendingApprovals = Object.values(approvals).filter((a) => a.agentId === selectedAgentId);

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-96 bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800/80 z-40 flex flex-col shadow-2xl transition-transform duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">{agent.name}</h3>
          </div>
          <p className="text-xs text-zinc-400 capitalize">{agent.provider.replace('_', ' ')}</p>
        </div>

        <button
          onClick={() => setSelectedAgentId(null)}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/80 bg-zinc-900/40 text-xs font-medium">
        <button
          onClick={() => setActiveTab('thoughts')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'thoughts'
              ? 'border-indigo-500 text-indigo-300 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Thought Stream</span>
          {agentThoughts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-400">
              {agentThoughts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'approvals'
              ? 'border-amber-500 text-amber-300 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Approvals</span>
          {pendingApprovals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 text-[10px] animate-pulse">
              {pendingApprovals.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'thoughts' ? (
          <ThoughtStream thoughts={agentThoughts} />
        ) : (
          <div className="p-4 space-y-3">
            {pendingApprovals.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-8">
                No active human approval requests for this agent.
              </p>
            ) : (
              pendingApprovals.map((app) => <ApprovalBox key={app.id} approval={app} />)
            )}
          </div>
        )}
      </div>

      {/* Direct Steering Chat */}
      <ChatBox agentName={agent.name} />
    </aside>
  );
}
