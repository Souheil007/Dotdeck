import { useEffect } from 'react';
import { Bot, Share2, Plus, Sparkles, Shield, Users } from 'lucide-react';
import { AgentCanvas } from './components/canvas/AgentCanvas';
import { InspectorDrawer } from './components/inspector/InspectorDrawer';
import { PairingWizard } from './components/modals/PairingWizard';
import { ShareModal } from './components/modals/ShareModal';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import type { Node, Edge } from '@xyflow/react';
import type { AgentData } from './store/useWorkspaceStore';

export function App() {
  const {
    nodes,
    setNodes,
    setEdges,
    setShareModalOpen,
    openPairingModal,
    cursors,
    userRole,
  } = useWorkspaceStore();

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

  return (
    <div className="relative w-screen h-screen flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Top Navigation */}
      <header className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md z-30">
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
          {/* Teammate Presence Avatars */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-indigo-500 ring-2 ring-zinc-950 flex items-center justify-center text-[10px] font-bold text-white">
              You
            </div>
            {Object.values(cursors).map((c) => (
              <div
                key={c.userId}
                style={{ backgroundColor: c.color }}
                className="w-6 h-6 rounded-full ring-2 ring-zinc-950 flex items-center justify-center text-[10px] font-bold text-white"
                title={c.userName}
              >
                {c.userName.slice(0, 2).toUpperCase()}
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
            onClick={() =>
              openPairingModal({
                id: 'new-agent-' + Math.random().toString().slice(2, 6),
                name: 'New Cloud Agent',
                provider: 'openai_dot',
                goal: 'Collaborate with the active workspace fleet.',
                status: 'unpaired',
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Agent Node</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative">
        <AgentCanvas />
        <InspectorDrawer />
      </main>

      {/* Modals */}
      <PairingWizard />
      <ShareModal />
    </div>
  );
}

export default App;
