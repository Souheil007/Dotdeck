// Package store provides persistence tests for connection pools, migrations, and repositories.
package store

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Souheil007/Dotdeck/backend/internal/store/migrations"
)

// TestEmbeddedMigrations verifies that all SQL migrations are embedded and contain partitioning statements.
func TestEmbeddedMigrations(testingT *testing.T) {
	upBytes, readUpError := migrations.Files.ReadFile("000001_init_schema.up.sql")
	if readUpError != nil {
		testingT.Fatalf("failed to read embedded up migration: %v", readUpError)
	}

	upContent := string(upBytes)
	requiredKeywords := []string{
		"CREATE TABLE IF NOT EXISTS workspaces",
		"CREATE TABLE IF NOT EXISTS workspace_members",
		"CREATE TABLE IF NOT EXISTS agents",
		"CREATE TABLE IF NOT EXISTS agent_edges",
		"CREATE TABLE IF NOT EXISTS thought_events",
		"PARTITION BY RANGE (created_at)",
		"CREATE TABLE IF NOT EXISTS thought_events_2026_10 PARTITION OF thought_events",
		"CREATE TABLE IF NOT EXISTS thought_events_default PARTITION OF thought_events",
		"CREATE TABLE IF NOT EXISTS approvals",
	}

	for _, keyword := range requiredKeywords {
		if !strings.Contains(upContent, keyword) {
			testingT.Errorf("expected migration to contain keyword %q, but was missing", keyword)
		}
	}

	downBytes, readDownError := migrations.Files.ReadFile("000001_init_schema.down.sql")
	if readDownError != nil {
		testingT.Fatalf("failed to read embedded down migration: %v", readDownError)
	}

	downContent := string(downBytes)
	if !strings.Contains(downContent, "DROP TABLE IF EXISTS approvals") {
		testingT.Errorf("expected down migration to drop approvals table")
	}
}

// TestDefaultPoolConfiguration verifies default pool sizing parameters.
func TestDefaultPoolConfiguration(testingT *testing.T) {
	if DefaultConfig.MaxConnections != 50 {
		testingT.Errorf("expected MaxConnections=50, got %d", DefaultConfig.MaxConnections)
	}
	if DefaultConfig.MinConnections != 10 {
		testingT.Errorf("expected MinConnections=10, got %d", DefaultConfig.MinConnections)
	}
	if DefaultConfig.MaxConnectionIdle != 30*time.Minute {
		testingT.Errorf("expected MaxConnectionIdle=30m, got %v", DefaultConfig.MaxConnectionIdle)
	}
}

// TestNewPoolInvalidConnectionString verifies that malformed connection strings return an error cleanly.
func TestNewPoolInvalidConnectionString(testingT *testing.T) {
	testContext, cancelTest := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancelTest()

	_, poolError := NewPool(testContext, "invalid://bad-connection-string:port")
	if poolError == nil {
		testingT.Errorf("expected error initializing pool with invalid connection string, got nil")
	}
}
