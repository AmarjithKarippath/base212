# base212

**base212** is an AI team chat app. Pick expert roles (Co-Founder, Software Architect, Product Manager, and more), ask a question, and get a combined response powered by [Novita AI](https://novita.ai).

## Features

- **Multi-role AI team** — select one or more expert roles per session
- **Combined responses** — the backend merges role prompts and instructions into a single system query
- **Chat UI** — clean React interface with markdown rendering (tables, lists, code blocks)
- **Docker-ready** — run the full stack with one command

## Architecture

**Local / staging**

```
┌─────────────────┐     /api/*      ┌─────────────────┐     Novita API
│  React (nginx)  │ ──────────────► │  FastAPI        │ ──────────────►
│  port 3009      │                 │  port 8008      │
└─────────────────┘                 └─────────────────┘
```

**Production (www.base212.com)**

```
Internet ──► Caddy (443/80, TLS) ──► nginx frontend ──► /api ──► FastAPI ──► Novita API
              www.base212.com         (internal)              (internal)
```

- **Frontend** — React + Vite, served by nginx in production
- **Backend** — FastAPI, OpenAI-compatible client pointed at Novita
- **Roles** — defined in `app/data/roles.json`, exposed via `GET /roles`
- **Production** — Caddy terminates HTTPS; backend is not exposed publicly

## Project structure

```
base212/
├── app/                    # FastAPI backend
│   ├── data/roles.json     # AI team role definitions
│   ├── main.py             # API routes
│   ├── novita.py           # Novita client
│   ├── roles.py            # Role selection & prompt formatting
│   └── schemas.py          # Request/response models
├── frontend/               # React frontend
│   ├── src/
│   ├── Dockerfile          # Local/staging image
│   ├── Dockerfile.prod     # Production image
│   ├── nginx.conf
│   └── nginx.prod.conf
├── deploy/
│   └── Caddyfile           # TLS + reverse proxy for www.base212.com
├── scripts/
│   └── deploy-prod.sh
├── Dockerfile              # Backend image
├── docker-compose.yml      # Local/staging
├── docker-compose.prod.yml # Production (www.base212.com)
├── requirements.txt
├── .env.example
└── .env.production.example
```

## Prerequisites

- **Local dev:** Python 3.13+, Node.js 22+
- **Docker:** Docker Desktop (or Docker Engine + Compose)
- **Novita API key** from [novita.ai](https://novita.ai)

## Environment variables

Copy the example env file and add your key:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NOVITA_API_KEY` | Yes | Your Novita API key |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (defaults include local dev ports) |

Optional backend settings (with defaults):

| Variable | Default |
|----------|---------|
| `NOVITA_BASE_URL` | `https://api.novita.ai/openai` |
| `DEFAULT_MODEL` | `openai/gpt-oss-120b` |

## Run with Docker (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| App (frontend) | http://localhost:3009 |
| API (backend) | http://localhost:8008 |
| API docs | http://localhost:8008/docs |

Background mode:

```bash
docker compose up --build -d
docker compose logs -f
docker compose down
```

## Production deployment (www.base212.com)

Production uses a separate compose file with:

- **Caddy** — automatic HTTPS on ports 80/443 for `www.base212.com` and `base212.com`
- **nginx** — serves the React build and proxies `/api` to the backend
- **FastAPI** — internal only (not exposed to the public internet)

### 1. DNS

Point your domain to the server:

| Record | Value |
|--------|-------|
| `A` | `@` → your server IP |
| `A` or `CNAME` | `www` → your server IP |

### 2. Configure environment

```bash
cp .env.production.example .env.production
# Set NOVITA_API_KEY in .env.production
```

### 3. Build and deploy

```bash
./scripts/deploy-prod.sh
```

Or manually:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

| URL | Purpose |
|-----|---------|
| https://www.base212.com | App |
| https://base212.com | Redirects to www |

### 4. Verify

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy
curl -I https://www.base212.com
```

Caddy obtains and renews Let's Encrypt certificates automatically once DNS is live and ports 80/443 are reachable.

### Production files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production stack (backend + frontend + Caddy) |
| `frontend/Dockerfile.prod` | Builds optimized React app with production nginx |
| `frontend/nginx.prod.conf` | nginx config for `www.base212.com` |
| `deploy/Caddyfile` | TLS termination and reverse proxy |
| `.env.production` | Production secrets (not committed) |

## Local development

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api` to the backend on port 8000.

## API

### `GET /health`

Health check.

### `GET /roles`

Returns the role catalog (used by the frontend role picker).

### `POST /chat`

Chat with the selected AI team. Returns JSON.

**Request:**

```json
{
  "message": "Should we launch an MVP first?",
  "role_ids": ["cofounder", "product_manager"]
}
```

**Response:**

```json
{
  "reply": "...",
  "model": "openai/gpt-oss-120b",
  "selected_roles": [
    { "id": "cofounder", "name": "Co-Founder", "category": "Business" }
  ],
  "finish_reason": "stop",
  "usage": { "prompt_tokens": 120, "completion_tokens": 80, "total_tokens": 200 }
}
```

### `POST /v1/chat/completions`

Lower-level OpenAI-compatible completions endpoint (supports streaming).

## AI roles

Roles are configured in `app/data/roles.json`. Default roles:

| ID | Name | Category |
|----|------|----------|
| `cofounder` | Co-Founder | Business |
| `software_architect` | Software Architect | Engineering |
| `product_manager` | Product Manager | Product |
| `marketing_advisor` | Marketing Advisor | Marketing |

When multiple roles are selected, the backend builds a structured system prompt with a merge instruction so the model combines all perspectives in one reply.

## Tech stack

- **Backend:** FastAPI, OpenAI Python SDK, Pydantic Settings
- **Frontend:** React 19, TypeScript, Vite, react-markdown, remark-gfm
- **Infrastructure:** Docker, nginx, Caddy, uvicorn

## License

Private — all rights reserved.
