package mcp

import (
	"fmt"
	"strings"
)

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
		Description: "MANDATORY EXECUTION TELEMETRY: The operator cockpit monitors your live execution in real time. For ANY goal or analytical turn, you MUST call this tool before and during your analysis (e.g. before evaluating data, reading emails, or synthesizing deductions) to stream your intermediate findings to the Dotdeck cockpit.",
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
		Description: "CRITICAL HUMAN AUTHORITY GATE: You MUST call this tool and wait for human operator authorization before performing irreversible actions, sending external communications, executing high-impact mutations, or when encountering critical decisions.",
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
		Description: "MANDATORY FINAL DELIVERABLE: In this connected cockpit environment, your response and final findings MUST be submitted via complete_task. Plain text chat alone will NOT be recorded on the operator canvas. You MUST call complete_task with your 1-2 sentence executive summary and full deliverable for EVERY completed request.",
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

// FormatProviderVendor maps internal provider tokens into human- and LLM-friendly brand names.
func FormatProviderVendor(rawProvider string) string {
	switch strings.ToLower(rawProvider) {
	case "openai_dot", "chatgpt", "openai":
		return "ChatGPT / OpenAI Dot"
	case "grok_bot", "grok", "xai":
		return "xAI Grok"
	case "claude", "anthropic":
		return "Anthropic Claude"
	case "meta_muse", "muse", "meta":
		return "Meta Muse"
	default:
		if rawProvider != "" {
			return rawProvider
		}
		return "Cloud Agent"
	}
}

// BuildDelegationTool dynamically generates an MCP tool for dispatching work across canvas edges.
// It incorporates the target peer's identity, cloud provider platform, and operational objective
// so calling agents understand the peer's specialization and make informed delegation decisions.
func BuildDelegationTool(targetAgentName, targetAgentGoal, targetAgentProvider, toolName string) ToolDefinition {
	vendorLabel := FormatProviderVendor(targetAgentProvider)
	descriptionText := fmt.Sprintf("Hands off a structured subtask to peer agent %s (%s) via the Dotdeck switchboard.", targetAgentName, vendorLabel)
	if targetAgentGoal != "" {
		descriptionText = fmt.Sprintf("Hands off a structured subtask to peer agent %s (%s) via the Dotdeck switchboard. Peer Objective & Specialization: %q. Invoke this tool whenever your task requires this peer's domain specialization, provider capabilities (%s), or downstream processing handoff.", targetAgentName, vendorLabel, targetAgentGoal, vendorLabel)
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

// BuildPipelineIngestionTool returns the schema for fetching data deliverables automatically forwarded across canvas edges.
func BuildPipelineIngestionTool() ToolDefinition {
	return ToolDefinition{
		Name:        "fetch_pipeline_deliverable",
		Description: "PIPELINE INBOX RETRIEVAL: Retrieves the latest data deliverable, report, or unread emails automatically forwarded to you by upstream connected agents (such as Grok or email reader bots) on the Dotdeck canvas. Invoke this tool at the start of your turn whenever asked to inspect, categorize, summarize, or analyze incoming team data.",
		InputSchema: map[string]interface{}{
			"type":       "object",
			"properties": map[string]interface{}{},
		},
	}
}
