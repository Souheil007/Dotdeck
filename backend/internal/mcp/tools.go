package mcp

import "fmt"

// ToolDefinition describes an MCP tool schema exposed to cloud agents.
type ToolDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// BuildTelemetryTool returns the mandatory schema for logging agent reasoning steps.
func BuildTelemetryTool() ToolDefinition {
	return ToolDefinition{
		Name:        "report_thought_step",
		Description: "MANDATORY TELEMETRY: You MUST call this tool at major reasoning milestones, deduction steps, or before calling external tools to stream your analytical progress to the Dotdeck cockpit.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"reasoning_trace": map[string]interface{}{
					"type":        "string",
					"description": "Current analytical hypothesis, intermediate deduction, or finding.",
				},
				"next_planned_step": map[string]interface{}{
					"type":        "string",
					"description": "Immediate downstream action or tool call planned next.",
				},
				"step_index": map[string]interface{}{
					"type":        "integer",
					"description": "Sequential index of the execution step (optional).",
				},
			},
			"required": []string{"reasoning_trace", "next_planned_step"},
		},
	}
}

// BuildHumanApprovalTool returns the schema for gating actions behind operator sign-off.
func BuildHumanApprovalTool() ToolDefinition {
	return ToolDefinition{
		Name:        "ask_human_question",
		Description: "CRITICAL HUMAN AUTHORITY GATE: You MUST call this tool and wait for human operator authorization before performing irreversible actions, high-impact mutations, or when encountering critical decisions.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"question": map[string]interface{}{
					"type":        "string",
					"description": "Action, decision, or query requiring human authorization.",
				},
				"options": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "string",
					},
					"description": "Suggested choices for fast one-click approval.",
				},
				"reasoning_trace": map[string]interface{}{
					"type":        "string",
					"description": "Contextual rationale explaining why human authority is invoked.",
				},
			},
			"required": []string{"question", "reasoning_trace"},
		},
	}
}

// BuildTaskCompletionTool returns the schema for announcing task completion and storing deliverable summaries on the canvas.
func BuildTaskCompletionTool() ToolDefinition {
	return ToolDefinition{
		Name:        "complete_task",
		Description: "TASK COMPLETION: Call this tool when your assigned goal or response turn is finished. Stores your deliverable summary on the Dotdeck cockpit canvas and transitions your status to resting.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"summary": map[string]interface{}{
					"type":        "string",
					"description": "Concise 1-2 sentence executive summary of what was delivered or concluded.",
				},
				"deliverable": map[string]interface{}{
					"type":        "string",
					"description": "Optional full text or markdown representation of the final deliverable output.",
				},
			},
			"required": []string{"summary"},
		},
	}
}

// BuildDelegationTool dynamically generates an MCP tool for dispatching work across canvas edges.
// It incorporates both the target peer's identity and its operational objective/mission so calling agents
// understand the peer's domain specialization and make informed delegation decisions.
func BuildDelegationTool(targetAgentName, targetAgentGoal, toolName string) ToolDefinition {
	descriptionText := fmt.Sprintf("Hands off a structured subtask to peer agent %s via the Dotdeck switchboard.", targetAgentName)
	if targetAgentGoal != "" {
		descriptionText = fmt.Sprintf("Hands off a structured subtask to peer agent %s via the Dotdeck switchboard. Peer Objective & Specialization: %q. Invoke this tool whenever your task requires this peer's domain specialization or downstream handoff.", targetAgentName, targetAgentGoal)
	}

	return ToolDefinition{
		Name:        toolName,
		Description: descriptionText,
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"instructions": map[string]interface{}{
					"type":        "string",
					"description": "Specific directive and expectations for the peer agent.",
				},
				"payload": map[string]interface{}{
					"type":        "object",
					"description": "Structured artifacts, JSON blobs, or contextual data for downstream processing.",
				},
				"current_reasoning_trace": map[string]interface{}{
					"type":        "string",
					"description": "Summary of work completed so far that motivates this handoff.",
				},
			},
			"required": []string{"instructions", "current_reasoning_trace"},
		},
	}
}
