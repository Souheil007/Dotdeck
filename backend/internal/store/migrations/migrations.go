// Package migrations embeds PostgreSQL schema migration scripts for runtime execution.
package migrations

import "embed"

// Files embeds all SQL migration files for the Dotdeck switchboard.
//
//go:embed *.sql
var Files embed.FS
