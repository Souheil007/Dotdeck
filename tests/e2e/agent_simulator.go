// Package main simulates closed cloud agents (OpenAI Dots, Grok Bots, Claude)
// interacting with a live Dotdeck switchboard over HTTP/MCP.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// CloudAgentSimulator emulates a cloud agent running inside OpenAI Cloud Computer or Grok VM.
type CloudAgentSimulator struct {
	BaseURL    string
	AgentToken string
	Client     *http.Client
}

// NewSimulator constructs a simulator client for the specified server URL and agent token.
func NewSimulator(baseURL, token string) *CloudAgentSimulator {
	return &CloudAgentSimulator{
		BaseURL:    baseURL,
		AgentToken: token,
		Client:     &http.Client{Timeout: 60 * time.Second},
	}
}

// SendJSONRPC dispatches a JSON-RPC 2.0 tool call to the Dotdeck MCP endpoint.
func (s *CloudAgentSimulator) SendJSONRPC(method string, params interface{}) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/mcp/%s", s.BaseURL, s.AgentToken)
	reqBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      time.Now().UnixNano(),
		"method":  method,
		"params":  params,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	resp, err := s.Client.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("posting to mcp endpoint: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("server returned error HTTP %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var res map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &res); err != nil {
		return nil, fmt.Errorf("unmarshalling response: %w", err)
	}

	return res, nil
}

// Initialize performs the MCP handshake.
func (s *CloudAgentSimulator) Initialize() error {
	fmt.Printf("[Simulator] Sending mcp.initialize to %s...\n", s.BaseURL)
	res, err := s.SendJSONRPC("initialize", map[string]interface{}{
		"protocolVersion": "2024-11-05",
	})
	if err != nil {
		return err
	}
	fmt.Printf("[Simulator] Initialized successfully: %v\n", res["result"])
	return nil
}

// ReportThought sends an analytical reasoning step to the live canvas.
func (s *CloudAgentSimulator) ReportThought(step int, trace, nextStep string) error {
	fmt.Printf("[Simulator] Reporting thought step #%d: %s\n", step, trace)
	_, err := s.SendJSONRPC("tools/call", map[string]interface{}{
		"name": "report_thought_step",
		"arguments": map[string]interface{}{
			"step_index":        step,
			"reasoning_trace":   trace,
			"next_planned_step": nextStep,
		},
	})
	return err
}

func main() {
	baseURL := flag.String("url", "http://localhost:8080", "Dotdeck server base URL")
	token := flag.String("token", "", "Agent MCP authorization token")
	flag.Parse()

	if *token == "" {
		fmt.Println("Usage: go run tests/e2e/agent_simulator.go --url http://localhost:8080 --token <agent_token>")
		os.Exit(1)
	}

	sim := NewSimulator(*baseURL, *token)

	if err := sim.Initialize(); err != nil {
		fmt.Printf("Init failed: %v\n", err)
		os.Exit(1)
	}

	time.Sleep(1 * time.Second)
	_ = sim.ReportThought(1, "Analyzing lead database for uncontacted CTOs", "Drafting personalized outreach")
	time.Sleep(2 * time.Second)
	_ = sim.ReportThought(2, "Found 12 matching profiles on LinkedIn", "Evaluating domain deliverability")

	fmt.Println("[Simulator] Simulation completed successfully.")
}
