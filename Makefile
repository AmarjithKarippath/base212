.DEFAULT_GOAL := help

COMPOSE := docker compose
COMPOSE_FILE := docker-compose.yml
COMPOSE_PROD := docker-compose.prod.yml

BACKEND_PORT := 8000
FRONTEND_DEV_PORT := 5173

.PHONY: help
help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

.PHONY: env
env: ## Create local .env from example
	@test -f .env || cp .env.example .env
	@echo "Created .env — set NOVITA_API_KEY before running."

.PHONY: env-prod
env-prod: ## Create production .env.production from example
	@test -f .env.production || cp .env.production.example .env.production
	@echo "Created .env.production — set NOVITA_API_KEY before deploying."

.PHONY: install
install: install-backend install-frontend ## Install backend and frontend dependencies

.PHONY: install-backend
install-backend: env ## Install Python dependencies
	python3 -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt

.PHONY: install-frontend
install-frontend: ## Install frontend dependencies
	cd frontend && npm install

.PHONY: dev-backend
dev-backend: env ## Run FastAPI backend locally
	. .venv/bin/activate && uvicorn app.main:app --reload --port $(BACKEND_PORT)

.PHONY: dev-frontend
dev-frontend: ## Run React frontend locally
	cd frontend && npm run dev

.PHONY: build-frontend
build-frontend: ## Build frontend for production
	cd frontend && npm run build

.PHONY: build
build: build-frontend ## Build all production assets

.PHONY: docker-build
docker-build: env ## Build local Docker images
	$(COMPOSE) -f $(COMPOSE_FILE) build

.PHONY: up
up: env ## Start local Docker stack (frontend :3009, backend :8008)
	$(COMPOSE) -f $(COMPOSE_FILE) up --build -d

.PHONY: down
down: ## Stop local Docker stack
	$(COMPOSE) -f $(COMPOSE_FILE) down

.PHONY: logs
logs: ## Tail local Docker logs
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

.PHONY: restart
restart: down up ## Restart local Docker stack

.PHONY: prod-build
prod-build: env-prod ## Build production Docker images
	$(COMPOSE) -f $(COMPOSE_PROD) build

.PHONY: prod-up
prod-up: env-prod ## Start production stack (www.base212.com)
	$(COMPOSE) -f $(COMPOSE_PROD) up --build -d

.PHONY: prod-down
prod-down: ## Stop production stack
	$(COMPOSE) -f $(COMPOSE_PROD) down

.PHONY: prod-logs
prod-logs: ## Tail production Docker logs
	$(COMPOSE) -f $(COMPOSE_PROD) logs -f

.PHONY: prod-restart
prod-restart: prod-down prod-up ## Restart production stack

.PHONY: prod-deploy
prod-deploy: env-prod prod-build ## Build and deploy production stack
	$(COMPOSE) -f $(COMPOSE_PROD) up -d
	@echo "Production stack is running on http://127.0.0.1:3009"
	@echo "Configure CloudPanel reverse proxy: www.base212.com → http://127.0.0.1:3009"

.PHONY: clean
clean: ## Remove build artifacts and caches
	rm -rf frontend/dist frontend/node_modules/.vite
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
