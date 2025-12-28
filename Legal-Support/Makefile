# Legal Virtual Assistant Makefile

.PHONY: help build run test clean docker-up docker-down migration-up migration-down

# Default target
help:
	@echo "Available targets:"
	@echo "  build         Build the application"
	@echo "  run           Run the application locally"
	@echo "  test          Run all tests"
	@echo "  clean         Clean build artifacts"
	@echo "  docker-up     Start all services with Docker Compose"
	@echo "  docker-down   Stop all Docker Compose services"
	@echo "  docker-logs   Show Docker Compose logs"
	@echo "  migration-up  Apply database migrations"
	@echo "  seed-data     Load sample legal data"

# Build the application
build:
	go mod tidy
	go build -o bin/legal-api ./cmd/api

# Run the application locally
run:
	go run ./cmd/api

# Run tests
test:
	go test ./...

# Clean build artifacts
clean:
	rm -rf bin/
	docker-compose down -v --remove-orphans

# Docker Compose targets
docker-up:
	docker-compose up -d
	@echo "Services started. API available at http://localhost:8080"
	@echo "Run 'make docker-logs' to see logs"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Database migration
migration-up:
	@echo "Migrations are automatically applied on container startup"
	@echo "Check docker-compose logs for migration status"

# Load sample data (requires running services)
seed-data:
	@echo "Loading sample legal data..."
	curl -X POST http://localhost:8080/api/v1/query/ingest \
		-H "Content-Type: application/json" \
		-d @sample_data.json || echo "Note: Make sure the API is running (make docker-up)"
