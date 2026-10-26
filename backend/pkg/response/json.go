// Package response provides standardized JSON success and error response formatting
// for HTTP REST endpoints.
package response

import (
	"encoding/json"
	"net/http"
)

// Response standardizes outbound JSON payload envelopes.
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// JSON serializes the provided data structure as a JSON response with the given HTTP status code.
func JSON(writer http.ResponseWriter, statusCode int, data interface{}) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(statusCode)
	_ = json.NewEncoder(writer).Encode(Response{
		Success: statusCode >= 200 && statusCode < 300,
		Data:    data,
	})
}

// Error writes a standardized JSON error message envelope with the specified HTTP status code.
func Error(writer http.ResponseWriter, statusCode int, message string) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(statusCode)
	_ = json.NewEncoder(writer).Encode(Response{
		Success: false,
		Error:   message,
	})
}
