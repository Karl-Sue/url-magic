# URL Magic

URL Magic is a cloud-native URL shortener, QR code generator, and concurrent URL health checker built on FastAPI, Next.js, and the Microsoft Azure ecosystem (Azure Functions, Cosmos DB, Redis, and Static Web Apps).

## Architecture

```mermaid
flowchart TD

subgraph group_client["Web client"]
  node_dashboard["Dashboard<br/>[page.tsx]"]
  node_shorten_ui["Shorten form<br/>[ShorternerTab.tsx]"]
  node_qr_ui["QR interface<br/>[QRTab.tsx]"]
  node_monitor_ui["Health dashboard<br/>[DashboardTab.tsx]"]
end

subgraph group_api["API workflows"]
  node_api_app["FastAPI app<br/>[main.py]"]
  node_api_routes["API routing<br/>[api.py]"]
  node_url_ops["Shorten and QR<br/>[url_ops.py]"]
  node_redirect_route["Redirect route<br/>[redirect.py]"]
  node_health_route["Health route<br/>[health.py]"]
  node_guest_session["Guest sessions<br/>[creator.py]"]
  node_health_checks["Health checks<br/>[health.py]"]
  node_qr_generator["QR generation<br/>[qr_generator.py]"]
  node_shortener["Code generation<br/>[url_shortener.py]"]
end

subgraph group_security["URL protection"]
  node_security["URL validation<br/>[middleware.py]"]
  node_safe_browsing["Safe Browsing<br/>[middleware.py]"]
  node_dependencies["Dependency wiring<br/>[deps.py]"]
end

subgraph group_storage["Persistence"]
  node_query_repo["URL repository<br/>[cosmos_client.py]"]
  node_cosmos[("Cosmos DB")]
  node_redis_repo["Redis repository<br/>[redis.py]"]
  node_redis[("Redis")]
end

node_visitor(("Visitor"))
node_google["Google Safe Browsing"]

node_visitor -->|"uses"| node_dashboard
node_dashboard -.->|"shows"| node_shorten_ui
node_dashboard -.->|"shows"| node_qr_ui
node_dashboard -.->|"shows"| node_monitor_ui
node_visitor -->|"calls API"| node_api_app
node_api_app -->|"mounts routes"| node_api_routes
node_api_routes -->|"registers"| node_url_ops
node_api_routes -->|"registers"| node_redirect_route
node_api_routes -->|"registers"| node_health_route
node_api_routes -->|"creates session"| node_guest_session
node_url_ops -->|"creates record"| node_query_repo
node_url_ops -->|"generates QR"| node_qr_generator
node_url_ops -->|"issues cookies"| node_guest_session
node_redirect_route -->|"looks up link"| node_query_repo
node_health_route -->|"runs checks"| node_health_checks
node_dependencies -->|"configures"| node_query_repo
node_dependencies -->|"provides"| node_redis_repo
node_dependencies -->|"configures"| node_security
node_security -->|"checks reputation"| node_safe_browsing
node_security -->|"rate limits"| node_redis_repo
node_safe_browsing -->|"queries"| node_google
node_safe_browsing -->|"caches verdict"| node_redis_repo
node_query_repo -->|"validates URL"| node_security
node_query_repo -->|"generates code"| node_shortener
node_query_repo -->|"reads and writes"| node_cosmos
node_query_repo -->|"caches records"| node_redis_repo
node_redis_repo -->|"stores cache"| node_redis
node_shorten_ui -.->|"submits URL"| node_url_ops
node_qr_ui -.->|"requests QR"| node_url_ops
node_monitor_ui -.->|"requests checks"| node_health_route

click node_dashboard "https://github.com/karl-sue/url-magic/blob/main/client/app/page.tsx"
click node_shorten_ui "https://github.com/karl-sue/url-magic/blob/main/client/components/ShorternerTab.tsx"
click node_qr_ui "https://github.com/karl-sue/url-magic/blob/main/client/components/QRTab.tsx"
click node_monitor_ui "https://github.com/karl-sue/url-magic/blob/main/client/components/DashboardTab.tsx"
click node_api_app "https://github.com/karl-sue/url-magic/blob/main/api/main.py"
click node_api_routes "https://github.com/karl-sue/url-magic/blob/main/api/apim/v1/api.py"
click node_url_ops "https://github.com/karl-sue/url-magic/blob/main/api/apim/v1/routes/url_ops.py"
click node_redirect_route "https://github.com/karl-sue/url-magic/blob/main/api/apim/v1/routes/redirect.py"
click node_health_route "https://github.com/karl-sue/url-magic/blob/main/api/apim/v1/routes/health.py"
click node_guest_session "https://github.com/karl-sue/url-magic/blob/main/api/functions/creator.py"
click node_health_checks "https://github.com/karl-sue/url-magic/blob/main/api/functions/health.py"
click node_qr_generator "https://github.com/karl-sue/url-magic/blob/main/api/services/qr_generator.py"
click node_shortener "https://github.com/karl-sue/url-magic/blob/main/api/services/url_shortener.py"
click node_security "https://github.com/karl-sue/url-magic/blob/main/api/core/middleware.py"
click node_safe_browsing "https://github.com/karl-sue/url-magic/blob/main/api/core/middleware.py"
click node_dependencies "https://github.com/karl-sue/url-magic/blob/main/api/core/deps.py"
click node_query_repo "https://github.com/karl-sue/url-magic/blob/main/api/db/cosmos_client.py"
click node_redis_repo "https://github.com/karl-sue/url-magic/blob/main/api/db/redis.py"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_dashboard,node_shorten_ui,node_qr_ui,node_monitor_ui toneBlue
class node_api_app,node_api_routes,node_url_ops,node_redirect_route,node_health_route,node_guest_session,node_health_checks,node_qr_generator,node_shortener toneAmber
class node_security,node_safe_browsing,node_dependencies toneMint
class node_query_repo,node_cosmos,node_redis_repo,node_redis toneRose
class node_visitor,node_google toneIndigo
```

---

## Project Structure

- [`api/`](api/) - FastAPI backend running on Azure Functions (Python 3.12+).
- [`client/`](client/) - Next.js dashboard and frontend.
- [`infra/`](infra/) - Terraform configuration for Azure cloud resources.
- [`docs/`](docs/) - Architecture diagrams, design docs, and guides.
- [`Makefile`](Makefile) - Local development orchestration targets.

---

## Prerequisites

Ensure you have the following installed on your machine:

1. **Docker Engine / Docker Desktop** (running)
2. **Python 3.12+** and [`uv`](https://docs.astral.sh/uv/)
3. **Node.js**:
   - **Node 20** for Azure Functions Core Tools
   - **Node 24** for Next.js & Azure Static Web Apps CLI
   - Recommended: [`nvm`](https://github.com/nvm-sh/nvm) to easily switch Node versions
4. **Global CLIs**:
   - Azure Functions Core Tools v4 (`npm install -g azure-functions-core-tools@4 --unsafe-perm true`) - make sure you use node 20 to download this tool
   - Azure Static Web Apps CLI (`npm install -g @azure/static-web-apps-cli`)
5. **GNU Make**

---

## Quickstart (Newcomer Local Setup)

### 1. Install Dependencies
Run the top-level setup target to sync python packages via `uv` and install client dependencies via `npm`:
```bash
make setup
```

### 2. Configure Environment Settings
The backend requires configuration files for Azure Functions and local services. Templates are provided in `api/`:

```bash
# Copy Function host settings template (remove the 'example.' prefix)
cp api/example.local.settings.json api/local.settings.json

# Copy environment variables template
cp api/.env.example api/.env
```
> The default values in `example.local.settings.json` and `.env.example` are pre-configured to connect directly with the local Docker emulator services. Only `SAFE_BROWSING` uses actual Safe Browsing API key, so make sure you have that to check the URL against Google service.

### 3. Start Local Data Services
Launch the background Docker containers (Redis, Cosmos DB Emulator, and Azurite):
```bash
make data
```
> This starts or creates `redis-local` (port 6379), `cosmos-emulator` (port 8081), and `azurite-local` (ports 10000–10002).

### 4. Run the Application
Open **three separate terminal windows** to run the services:

- **Terminal 1 (Backend API):**
  ```bash
  make api
  ```
  *Runs Azure Functions host on `http://localhost:7071` (Node 20).*
  *(Fallback: if Core Tools is unavailable, run `cd api && uv run uvicorn main:app --reload --port 8000`)*

- **Terminal 2 (Frontend Client):**
  ```bash
  make client
  ```
  *Runs the Next.js dev server on `http://localhost:3000` (Node 24).*

- **Terminal 3 (SWA Proxy Emulator):**
  ```bash
  make swa
  ```
  *Runs Azure Static Web Apps CLI proxying frontend and backend at `http://localhost:4280` (Node 24).*

---

## Using the Application

Open your browser to:
👉 **[http://localhost:4280](http://localhost:4280)**

All requests through port `4280` automatically proxy frontend pages and `/api/v1` backend endpoints.

---

## Quick API Smoke Test

To verify the backend API endpoints directly from a terminal:

```bash
# 1. Create a guest session (stores session cookies)
curl -i -c cookies.txt -b cookies.txt http://localhost:4280/api/v1/session/guest

# 2. Shorten a URL
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","ttl":3600}' \
  http://localhost:4280/api/v1/shorten

# 3. Generate a QR code
curl -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  -o example-qr.png \
  http://localhost:4280/api/v1/qr

# 4. Check URL health
curl -H "Content-Type: application/json" \
  -d '{"urls":["https://example.com"]}' \
  http://localhost:4280/api/v1/health
```

---

## Stopping Local Services

When finished developing, stop the local Docker containers:
```bash
make stop
```
