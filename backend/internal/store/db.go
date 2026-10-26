// Package store provides PostgreSQL connection pool management, database migrations,
// and sqlc persistence repositories for Dotdeck.
package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DefaultPoolConfig provides production-tuned connection limits for the Go switchboard.
type DefaultPoolConfig struct {
	MaxConnections     int32
	MinConnections     int32
	MaxConnectionIdle  time.Duration
	MaxConnectionLife  time.Duration
	HealthCheckPeriod  time.Duration
}

// DefaultConfig defines the default sizing parameters matching the System Design Specification.
var DefaultConfig = DefaultPoolConfig{
	MaxConnections:    50,
	MinConnections:    10,
	MaxConnectionIdle: 30 * time.Minute,
	MaxConnectionLife: 1 * time.Hour,
	HealthCheckPeriod: 1 * time.Minute,
}

// NewPool initializes a production-grade pgx connection pool with health checking and connection limits.
func NewPool(connectionContext context.Context, connectionString string) (*pgxpool.Pool, error) {
	poolConfig, parseError := pgxpool.ParseConfig(connectionString)
	if parseError != nil {
		return nil, fmt.Errorf("failed to parse database configuration string: %w", parseError)
	}

	poolConfig.MaxConns = DefaultConfig.MaxConnections
	poolConfig.MinConns = DefaultConfig.MinConnections
	poolConfig.MaxConnIdleTime = DefaultConfig.MaxConnectionIdle
	poolConfig.MaxConnLifetime = DefaultConfig.MaxConnectionLife
	poolConfig.HealthCheckPeriod = DefaultConfig.HealthCheckPeriod

	databasePool, connectError := pgxpool.NewWithConfig(connectionContext, poolConfig)
	if connectError != nil {
		return nil, fmt.Errorf("failed to initialize postgres connection pool: %w", connectError)
	}

	pingContext, cancelPing := context.WithTimeout(connectionContext, 5*time.Second)
	defer cancelPing()

	if pingError := databasePool.Ping(pingContext); pingError != nil {
		databasePool.Close()
		return nil, fmt.Errorf("database connectivity validation failed: %w", pingError)
	}

	return databasePool, nil
}

// PingDatabase performs a quick connectivity check against the active PostgreSQL pool.
func PingDatabase(checkContext context.Context, databasePool *pgxpool.Pool) error {
	pingContext, cancelPing := context.WithTimeout(checkContext, 3*time.Second)
	defer cancelPing()

	return databasePool.Ping(pingContext)
}
