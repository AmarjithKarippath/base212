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

**Production (www.base212.com + CloudPanel)**

```
Internet ──► CloudPanel (TLS) ──► Docker frontend :3009 ──► /api ──► FastAPI ──► Novita API
              www.base212.com         (127.0.0.1)                (internal)
```

- **Frontend** — React + Vite, served by nginx in production
- **Backend** — FastAPI, OpenAI-compatible client pointed at Novita
- **Roles** — defined in `app/data/roles.json`, exposed via `GET /roles`
- **Production** — CloudPanel handles SSL and reverse proxy; backend is not exposed publicly

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
│   └── cloudpanel.conf.example  # CloudPanel reverse proxy reference
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

Production uses Docker + **CloudPanel** on your VPS for SSL and reverse proxy.

- **CloudPanel** — HTTPS and reverse proxy for `www.base212.com`
- **Docker frontend** — bound to `127.0.0.1:3009`, serves React and proxies `/api`
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

### 3. Build and deploy Docker

```bash
make prod-up
```

Or:

```bash
./scripts/deploy-prod.sh
```

This starts the stack on **http://127.0.0.1:3009**.

### 4. Configure CloudPanel

In CloudPanel:

1. Create site: **www.base212.com**
2. Enable **SSL** (Let's Encrypt)
3. Open **Vhost → Reverse Proxy**
4. Set upstream to: `http://127.0.0.1:3009`

Optionally redirect `base212.com` → `www.base212.com` via a second site or CloudPanel redirect rule.

See `deploy/cloudpanel.conf.example` for an nginx reference config.

### 5. Verify

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
curl -I https://www.base212.com
curl https://www.base212.com/sitemap.xml
```

### Google Search Console

After deploy, submit the sitemap in [Google Search Console](https://search.google.com/search-console):

1. Add property: `https://www.base212.com`
2. Verify domain ownership (DNS TXT record or HTML file)
3. Go to **Sitemaps** → submit:

```
https://www.base212.com/sitemap.xml
```

These files are served from the frontend build:

| URL | File |
|-----|------|
| https://www.base212.com/sitemap.xml | `frontend/public/sitemap.xml` |
| https://www.base212.com/robots.txt | `frontend/public/robots.txt` |

Verify they are reachable:

```bash
curl https://www.base212.com/sitemap.xml
curl https://www.base212.com/robots.txt
```

### Production files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production stack (backend + frontend) |
| `frontend/Dockerfile.prod` | Builds optimized React app with production nginx |
| `frontend/nginx.prod.conf` | nginx config for `www.base212.com` |
| `deploy/cloudpanel.conf.example` | CloudPanel reverse proxy reference |
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
- **Infrastructure:** Docker, nginx, CloudPanel, uvicorn

## License

Private — all rights reserved.
