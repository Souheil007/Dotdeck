import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Clock,
  Terminal,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { ThoughtStep } from '../../store/useWorkspaceStore';

interface ThoughtStreamProps {
  thoughts: ThoughtStep[];
}

interface RunGroup {
  runId: string;
  runNumber: number;
  startTime: string;
  steps: ThoughtStep[];
}

type VirtualItemData =
  | {
      type: 'run_header';
      id: string;
      runId: string;
      runNumber: number;
      startTime: string;
      stepCount: number;
      isCollapsed: boolean;
      isLatest: boolean;
    }
  | {
      type: 'thought_step';
      id: string;
      runId: string;
      stepNumber: number;
      step: ThoughtStep;
    };

export function ThoughtStream({ thoughts }: ThoughtStreamProps) {
  const [collapsedRuns, setCollapsedRuns] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Group thoughts into chronological execution runs with ordered steps
  const runGroups = useMemo(() => {
    if (!thoughts || thoughts.length === 0) return [];

    // 1. Sort all thoughts chronologically (oldest first, newest last)
    const sortedThoughts = [...thoughts].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeA - timeB;
    });

    const groups: RunGroup[] = [];
    let currentGroup: RunGroup | null = null;
    let runNumber = 1;

    for (let index = 0; index < sortedThoughts.length; index++) {
      const step = sortedThoughts[index];
      const previousStep = index > 0 ? sortedThoughts[index - 1] : null;

      const timeGap = previousStep
        ? (new Date(step.timestamp).getTime() || 0) - (new Date(previousStep.timestamp).getTime() || 0)
        : 0;

      // New run if stepIndex resets to 0 (after a previous step > 0) or gap > 5 minutes
      const isNewRun =
        index === 0 ||
        (previousStep !== null && (
          (step.stepIndex === 0 && previousStep.stepIndex > 0) ||
          timeGap > 5 * 60 * 1000
        ));

      if (isNewRun) {
        currentGroup = {
          runId: `run-${runNumber}`,
          runNumber: runNumber,
          startTime: step.timestamp,
          steps: [step],
        };
        groups.push(currentGroup);
        runNumber++;
      } else if (currentGroup) {
        currentGroup.steps.push(step);
      }
    }

    // Inside each run, ensure steps are sorted in ascending order (Step 1 first, Step 2 second, etc.)
    groups.forEach((group) => {
      group.steps.sort((a, b) => {
        if (a.stepIndex !== b.stepIndex && a.stepIndex > 0 && b.stepIndex > 0) {
          return a.stepIndex - b.stepIndex;
        }
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeA - timeB;
      });
    });

    // Display runs with Latest Run at the top for operator flight control
    return [...groups].reverse();
  }, [thoughts]);

  const allCollapsed = useMemo(() => {
    return runGroups.length > 0 && runGroups.every((g) => Boolean(collapsedRuns[g.runId]));
  }, [runGroups, collapsedRuns]);

  const toggleAllRuns = () => {
    if (allCollapsed) {
      setCollapsedRuns({});
    } else {
      const nextCollapsed: Record<string, boolean> = {};
      runGroups.forEach((g) => {
        nextCollapsed[g.runId] = true;
      });
      setCollapsedRuns(nextCollapsed);
    }
  };

  // Flatten groups for virtual scrolling
  const flatItems: VirtualItemData[] = useMemo(() => {
    const items: VirtualItemData[] = [];
    const totalRuns = runGroups.length;

    runGroups.forEach((group) => {
      const isCollapsed = Boolean(collapsedRuns[group.runId]);
      const isLatest = group.runNumber === totalRuns;

      items.push({
        type: 'run_header',
        id: `header-${group.runId}`,
        runId: group.runId,
        runNumber: group.runNumber,
        startTime: group.startTime,
        stepCount: group.steps.length,
        isCollapsed,
        isLatest,
      });

      if (!isCollapsed) {
        group.steps.forEach((step, stepIndexInRun) => {
          items.push({
            type: 'thought_step',
            id: `step-${group.runId}-${stepIndexInRun}-${step.id || step.timestamp}`,
            runId: group.runId,
            stepNumber: stepIndexInRun + 1,
            step,
          });
        });
      }
    });

    return items;
  }, [runGroups, collapsedRuns]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (flatItems[index]?.type === 'run_header' ? 44 : 124),
    overscan: 6,
  });

  const toggleRun = (runId: string) => {
    setCollapsedRuns((previous) => ({
      ...previous,
      [runId]: !previous[runId],
    }));
  };

  const copyTrace = (stepId: string, traceText: string) => {
    navigator.clipboard.writeText(traceText);
    setCopiedId(stepId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!thoughts || thoughts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 my-auto">
        <div className="relative w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-zinc-400 dark:text-zinc-500">
          <Terminal className="w-5 h-5 stroke-[1.5]" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-500/80 animate-ping" />
        </div>
        <p className="text-xs font-semibold text-[#202124] dark:text-zinc-200 font-mono uppercase tracking-wider">
          Telemetry Bus Silent
        </p>
        <p className="text-[11px] text-[#5f6368] dark:text-zinc-400 mt-1.5 max-w-xs leading-relaxed font-sans">
          No live reasoning events recorded for this agent node. When the agent decomposes instructions or invokes tools, hypotheses stream here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Telemetry Header Strip */}
      <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px]">
          <Layers className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          <span>
            {thoughts.length} Total Steps &bull; {runGroups.length} {runGroups.length === 1 ? 'Run' : 'Runs'}
          </span>
        </div>

        {runGroups.length > 1 && (
          <button
            onClick={toggleAllRuns}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors"
          >
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </button>
        )}
      </div>

      {/* Virtualized Stream List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = flatItems[virtualItem.index];
            if (!item) return null;

            if (item.type === 'run_header') {
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="py-1"
                >
                  <button
                    onClick={() => toggleRun(item.runId)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {item.isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      )}
                      <span className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                        EXECUTION RUN #{item.runNumber}
                      </span>
                      {item.isLatest && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-mono font-bold uppercase">
                          Latest Run
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tabular-nums">
                        {new Date(item.startTime).toLocaleTimeString()}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300 font-mono">
                      {item.stepCount} {item.stepCount === 1 ? 'step' : 'steps'}
                    </span>
                  </button>
                </div>
              );
            }

            const { step } = item;
            const isCopied = copiedId === step.id;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="py-1.5"
              >
                <div className="p-3 rounded-lg bg-white dark:bg-[#0d0e12] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-xs font-mono group shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 mb-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-cyan-950/60 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800/80 font-bold font-mono">
                        STEP #{String(item.stepNumber).padStart(2, '0')}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 font-mono tabular-nums">
                        <Clock className="w-3 h-3" />
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <button
                      onClick={() => copyTrace(step.id, step.reasoningTrace)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                      title="Copy raw reasoning trace"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="text-[#202124] dark:text-zinc-200 leading-relaxed font-sans text-xs mb-2 break-words">
                    {step.reasoningTrace}
                  </div>

                  {step.nextPlannedStep && (
                    <div className="flex items-start gap-1.5 text-[11px] text-blue-700 dark:text-cyan-300 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-blue-50/30 dark:bg-cyan-950/20 -mx-3 -mb-3 p-2.5 rounded-b-lg">
                      <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-blue-600 dark:text-cyan-400" />
                      <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 shrink-0">
                        Next:
                      </span>
                      <span className="leading-snug font-sans text-zinc-700 dark:text-zinc-300 font-medium">
                        {step.nextPlannedStep}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
