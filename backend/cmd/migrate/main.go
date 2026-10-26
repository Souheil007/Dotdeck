// Package main provides the command-line migration utility for Dotdeck database schemas.
package main

import (
	"context"
	"flag"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souheil007/Dotdeck/backend/internal/store/migrations"
)

type migrationEntry struct {
	version    int64
	name       string
	scriptPath string
}

func main() {
	migrationDirection := flag.String("direction", "up", "Migration direction: up or down")
	migrationSteps := flag.Int("steps", 0, "Number of migration steps to run (0 runs all for up, 1 for down)")
	databaseURL := flag.String("database-url", "", "PostgreSQL connection string (defaults to DATABASE_URL env var)")
	flag.Parse()

	targetDatabaseURL := *databaseURL
	if targetDatabaseURL == "" {
		targetDatabaseURL = os.Getenv("DATABASE_URL")
	}

	if targetDatabaseURL == "" {
		fmt.Fprintln(os.Stderr, "Error: database URL must be specified via -database-url or DATABASE_URL environment variable")
		os.Exit(1)
	}

	rootContext, cancelRoot := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancelRoot()

	databasePool, poolError := pgxpool.New(rootContext, targetDatabaseURL)
	if poolError != nil {
		slog.Error("Failed to connect to PostgreSQL", "error", poolError)
		os.Exit(1)
	}
	defer databasePool.Close()

	if ensureError := ensureMigrationTable(rootContext, databasePool); ensureError != nil {
		slog.Error("Failed to initialize schema_migrations table", "error", ensureError)
		os.Exit(1)
	}

	switch *migrationDirection {
	case "up":
		if runError := runMigrationsUp(rootContext, databasePool, *migrationSteps); runError != nil {
			slog.Error("Migration up failed", "error", runError)
			os.Exit(1)
		}
	case "down":
		stepsToRun := *migrationSteps
		if stepsToRun <= 0 {
			stepsToRun = 1
		}
		if runError := runMigrationsDown(rootContext, databasePool, stepsToRun); runError != nil {
			slog.Error("Migration down failed", "error", runError)
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "Error: invalid direction %q (choose 'up' or 'down')\n", *migrationDirection)
		os.Exit(1)
	}
}

func ensureMigrationTable(execContext context.Context, databasePool *pgxpool.Pool) error {
	createTableQuery := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version BIGINT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`
	_, executionError := databasePool.Exec(execContext, createTableQuery)
	return executionError
}

func runMigrationsUp(execContext context.Context, databasePool *pgxpool.Pool, maximumSteps int) error {
	migrationEntries, scanError := discoverMigrations("up")
	if scanError != nil {
		return scanError
	}

	appliedVersions, queryError := getAppliedVersions(execContext, databasePool)
	if queryError != nil {
		return queryError
	}

	executedCount := 0
	for _, entry := range migrationEntries {
		if _, alreadyApplied := appliedVersions[entry.version]; alreadyApplied {
			continue
		}

		if maximumSteps > 0 && executedCount >= maximumSteps {
			break
		}

		fileBytes, readError := migrations.Files.ReadFile(entry.scriptPath)
		if readError != nil {
			return fmt.Errorf("failed to read migration file %s: %w", entry.scriptPath, readError)
		}

		fmt.Printf("Applying migration %s...\n", entry.name)

		transaction, beginError := databasePool.Begin(execContext)
		if beginError != nil {
			return fmt.Errorf("failed to begin transaction: %w", beginError)
		}

		if _, scriptError := transaction.Exec(execContext, string(fileBytes)); scriptError != nil {
			_ = transaction.Rollback(execContext)
			return fmt.Errorf("failed to apply migration %s: %w", entry.name, scriptError)
		}

		recordQuery := `INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW())`
		if _, recordError := transaction.Exec(execContext, recordQuery, entry.version, entry.name); recordError != nil {
			_ = transaction.Rollback(execContext)
			return fmt.Errorf("failed to record migration %s: %w", entry.name, recordError)
		}

		if commitError := transaction.Commit(execContext); commitError != nil {
			return fmt.Errorf("failed to commit migration %s: %w", entry.name, commitError)
		}

		fmt.Printf("Applied migration %s successfully.\n", entry.name)
		executedCount++
	}

	if executedCount == 0 {
		fmt.Println("Database schema is already up to date. Zero migrations applied.")
	} else {
		fmt.Printf("Completed applying %d migration(s).\n", executedCount)
	}

	return nil
}

func runMigrationsDown(execContext context.Context, databasePool *pgxpool.Pool, maximumSteps int) error {
	migrationEntries, scanError := discoverMigrations("down")
	if scanError != nil {
		return scanError
	}

	entriesByVersion := make(map[int64]migrationEntry)
	for _, entry := range migrationEntries {
		entriesByVersion[entry.version] = entry
	}

	queryRows, queryError := databasePool.Query(execContext, "SELECT version, name FROM schema_migrations ORDER BY version DESC")
	if queryError != nil {
		return fmt.Errorf("failed to query applied schema versions: %w", queryError)
	}
	defer queryRows.Close()

	type appliedRecord struct {
		version int64
		name    string
	}
	var recordsToRollback []appliedRecord
	for queryRows.Next() {
		var record appliedRecord
		if scanRowError := queryRows.Scan(&record.version, &record.name); scanRowError != nil {
			return scanRowError
		}
		recordsToRollback = append(recordsToRollback, record)
	}

	executedCount := 0
	for _, record := range recordsToRollback {
		if maximumSteps > 0 && executedCount >= maximumSteps {
			break
		}

		downEntry, exists := entriesByVersion[record.version]
		if !exists {
			return fmt.Errorf("corresponding down migration file not found for version %d (%s)", record.version, record.name)
		}

		fileBytes, readError := migrations.Files.ReadFile(downEntry.scriptPath)
		if readError != nil {
			return fmt.Errorf("failed to read rollback file %s: %w", downEntry.scriptPath, readError)
		}

		fmt.Printf("Rolling back migration %s...\n", record.name)

		transaction, beginError := databasePool.Begin(execContext)
		if beginError != nil {
			return fmt.Errorf("failed to begin rollback transaction: %w", beginError)
		}

		if _, scriptError := transaction.Exec(execContext, string(fileBytes)); scriptError != nil {
			_ = transaction.Rollback(execContext)
			return fmt.Errorf("failed to execute rollback for %s: %w", record.name, scriptError)
		}

		deleteQuery := `DELETE FROM schema_migrations WHERE version = $1`
		if _, deleteError := transaction.Exec(execContext, deleteQuery, record.version); deleteError != nil {
			_ = transaction.Rollback(execContext)
			return fmt.Errorf("failed to remove migration record %s: %w", record.name, deleteError)
		}

		if commitError := transaction.Commit(execContext); commitError != nil {
			return fmt.Errorf("failed to commit rollback for %s: %w", record.name, commitError)
		}

		fmt.Printf("Rolled back migration %s successfully.\n", record.name)
		executedCount++
	}

	fmt.Printf("Completed rolling back %d migration(s).\n", executedCount)
	return nil
}

func discoverMigrations(direction string) ([]migrationEntry, error) {
	suffix := fmt.Sprintf(".%s.sql", direction)
	var discoveredEntries []migrationEntry

	walkError := fs.WalkDir(migrations.Files, ".", func(filePath string, directoryEntry fs.DirEntry, visitError error) error {
		if visitError != nil {
			return visitError
		}
		if directoryEntry.IsDir() || !strings.HasSuffix(directoryEntry.Name(), suffix) {
			return nil
		}

		fileName := directoryEntry.Name()
		prefixPart := strings.Split(fileName, "_")[0]
		versionNumber, parseError := strconv.ParseInt(prefixPart, 10, 64)
		if parseError != nil {
			return fmt.Errorf("invalid migration version prefix in file %s: %w", fileName, parseError)
		}

		discoveredEntries = append(discoveredEntries, migrationEntry{
			version:    versionNumber,
			name:       strings.TrimSuffix(fileName, suffix),
			scriptPath: filePath,
		})
		return nil
	})

	if walkError != nil {
		return nil, walkError
	}

	sort.Slice(discoveredEntries, func(firstIndex, secondIndex int) bool {
		return discoveredEntries[firstIndex].version < discoveredEntries[secondIndex].version
	})

	return discoveredEntries, nil
}

func getAppliedVersions(execContext context.Context, databasePool *pgxpool.Pool) (map[int64]bool, error) {
	queryRows, queryError := databasePool.Query(execContext, "SELECT version FROM schema_migrations")
	if queryError != nil {
		return nil, fmt.Errorf("failed to query applied schema versions: %w", queryError)
	}
	defer queryRows.Close()

	appliedMap := make(map[int64]bool)
	for queryRows.Next() {
		var versionNumber int64
		if scanError := queryRows.Scan(&versionNumber); scanError != nil {
			return nil, scanError
		}
		appliedMap[versionNumber] = true
	}
	return appliedMap, nil
}
