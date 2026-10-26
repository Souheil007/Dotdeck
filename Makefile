.PHONY: all dev dev-backend dev-frontend build test clean migrate sqlc docker-up docker-down

all: build

# Start both backend and frontend for local development
dev:
	@echo "Starting Dotdeck local development environment..."
	@powershell -Command "Start-Process powershell -ArgumentList 'cd backend; go run cmd/server/main.go'; Start-Process powershell -ArgumentList 'cd frontend; npm run dev'"

dev-backend:
	cd backend && go run cmd/server/main.go

dev-frontend:
	cd frontend && npm run dev

build:
	cd backend && go build -o bin/server cmd/server/main.go
	cd frontend && npm run build

test:
	cd backend && go test ./...
	cd frontend && npm test

clean:
	rm -rf backend/bin frontend/dist

docker-up:
	docker compose up -d

docker-down:
	docker compose down

sqlc:
	cd backend && sqlc generate

migrate-up:
	cd backend && go run cmd/migrate/main.go up
