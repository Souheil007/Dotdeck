package mcp

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
		Description: "Records an internal milestone or reasoning trace on the Dotdeck live canvas.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"reasoning_trace": map[string]interface{}{
					"type":        "string",
					"description": "Current analytical hypothesis or intermediate deduction.",
				},
				"next_planned_step": map[string]interface{}{
					"type":        "string",
					"description": "Immediate downstream action or tool call planned next.",
				},
				"step_index": map[string]interface{}{
					"type":        "integer",
					"description": "Sequential index of the execution step.",
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
		Description: "Suspends execution and alerts human workspace operators for explicit approval or direction.",
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

// BuildDelegationTool dynamically generates an MCP tool for dispatching work across canvas edges.
func BuildDelegationTool(targetAgentName, toolName string) ToolDefinition {
	return ToolDefinition{
		Name:        toolName,
		Description: "Hands off a structured subtask to peer agent " + targetAgentName + " via the Dotdeck switchboard.",
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
