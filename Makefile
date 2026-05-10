.PHONY: dev dev-stop dev-logs help

help:
	@echo "TGroup v2.0 Local Development Commands"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  dev              Start full local stack (api + web + db + face-service + compreface)"
	@echo "  dev-stop         Stop and remove all containers (preserves volumes)"
	@echo "  dev-logs         Follow logs from all services"
	@echo "  help             Show this help message"

dev:
	@echo "==> Starting TGroup full stack (dev mode with hot reload)"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo ""
	@echo "Stack is starting. Waiting for services to be healthy..."
	@sleep 5
	@echo ""
	@echo "==> Service Status:"
	@docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
	@echo ""
	@echo "✅ Stack ready!"
	@echo ""
	@echo "Access the services:"
	@echo "  Web UI:         http://localhost:5175"
	@echo "  API:            http://localhost:3002/api"
	@echo "  Face Service:   http://localhost:8001"
	@echo "  Compreface:     http://localhost:8000"
	@echo "  Database:       localhost:55433 (postgres)"
	@echo ""
	@echo "View logs:       make dev-logs"
	@echo "Stop stack:      make dev-stop"

dev-stop:
	@echo "==> Stopping TGroup stack (volumes preserved)..."
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down
	@echo "✓ Stack stopped"
	@echo ""
	@echo "To remove volumes (DATA LOSS): docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v"

dev-logs:
	@echo "==> Following logs from all services (Ctrl+C to stop)"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

.DEFAULT_GOAL := help
