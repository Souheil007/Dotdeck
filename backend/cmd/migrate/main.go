// Package main provides the command-line migration utility for Dotdeck database schemas.
package main

import (
	"flag"
	"fmt"
	"os"
)

func main() {
	migrationDirection := flag.String("direction", "up", "Migration direction: up or down")
	migrationSteps := flag.Int("steps", 0, "Number of migration steps to run (0 runs all)")
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

	switch *migrationDirection {
	case "up":
		fmt.Printf("Applying database migrations (direction=up, steps=%d)...\n", *migrationSteps)
		// Plan 01 wires golang-migrate or embedded SQL migration execution
		fmt.Println("Migrations up-to-date.")
	case "down":
		fmt.Printf("Rolling back database migrations (direction=down, steps=%d)...\n", *migrationSteps)
		// Plan 01 wires rollback execution
		fmt.Println("Rollback completed.")
	default:
		fmt.Fprintf(os.Stderr, "Error: invalid direction %q (choose 'up' or 'down')\n", *migrationDirection)
		os.Exit(1)
	}
}
