### SYSTEM AUDIT & ARCHITECTURAL CONTEXT: CatBite URL Routing

#### 1. Background & Current Infrastructure
* **Frontend**: Next.js deployed on **Azure Static Web Apps (SWA)** under custom domain `catbite.me` (DNS and CDN handled via Cloudflare).
* **Backend**: Python-based API hosted separately on **Azure Functions**.
* **Edge Architecture**: There is no centralized Azure Front Door routing layer; Cloudflare points directly to the Azure Static Web Apps frontend origin.

#### 2. The Core Problem
I've just bought the domain `catbite.me`, and setup proxy to bring traffic to catbite.me to the origin SWA. I'm still waiting for Azure to validate my custom domain
Therefore, visitors navigating to `catbite.me/<6-char-code>` (e.g., `catbite.me/aB3x9Z`) currently fail to resolve to the target destination. And the backend logic also returns the APIM domain e.g. `https://apim-urlmagic-prod.azure-api.net/api/v1/N0GNuk`. I need to update the backend logic to return `https://catbite.me/N0GNuk` instead. 

#### 3. Agent Task (Audit & Verification Only — Do Not Write Code Yet)
Before writing any implementation, perform a read-only audit of the codebase.

Summarize your findings shortly and end task there.