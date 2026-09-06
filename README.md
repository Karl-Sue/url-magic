# URL Magic

> **Development status:** This project is under development. The `/client` frontend is not ready for production, and the Terraform configuration has only been validated with `terraform plan`; it has not been tested against a real Azure environment.

URL Magic is a URL shortener and QR code service built for the Microsoft cloud ecosystem. The planned production architecture is:

```text
User -> Azure API Management (APIM) -> Azure Functions -> Redis -> Azure Cosmos DB
```

An architecture diagram will be added later.

## Project Structure

- [`api/`](api/) - FastAPI backend and Azure Functions code.
- [`client/`](client/) - Next.js frontend, currently under development.
- [`infra/`](infra/) - Terraform configuration for the Azure services.

## Prerequisites

- Docker Desktop
- Python 3.12 or later
- [`uv`](https://docs.astral.sh/uv/)
- Terraform 1.5 or later, for infrastructure validation

### Platform Setup

Install Docker, Python, `uv`, and Terraform using the instructions for your operating system:

#### 🪟 Windows

- Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/).
- Install [Python for Windows](https://www.python.org/downloads/windows/) and [`uv`](https://docs.astral.sh/uv/getting-started/installation/).
- Install [Terraform for Windows](https://developer.hashicorp.com/terraform/install).
- Run the commands in this README from PowerShell. Use `curl.exe` rather than PowerShell's `curl` alias.

#### 🐧 Linux

- Install [Docker Engine](https://docs.docker.com/engine/install/) and make sure your user can run Docker commands.
- Install [Python](https://www.python.org/downloads/) using your distribution's package manager, then install [`uv`](https://docs.astral.sh/uv/getting-started/installation/).
- Install [Terraform for Linux](https://developer.hashicorp.com/terraform/install).
- Run the commands in this README from a Bash-compatible terminal.

#### 🍎 macOS

- Install [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/).
- Install [Python](https://www.python.org/downloads/macos/) and [`uv`](https://docs.astral.sh/uv/getting-started/installation/), or install them with Homebrew.
- Install [Terraform for macOS](https://developer.hashicorp.com/terraform/install).
- Run the commands in this README from Terminal or another Bash-compatible shell.

## Run the API Locally

The local API uses two Docker containers:

- Redis, using `redis:alpine`, on port `6379` for caching and rate limiting.
- Azure Cosmos DB Emulator, on port `8081` for local persistence.

Start both containers. The Docker commands are the same on all platforms:

```bash
docker run -d --name url-magic-redis -p 6379:6379 redis:alpine
docker run -d --name url-magic-cosmos -p 8081:8081 -p 10250-10255:10250-10255 -e AZURE_COSMOS_EMULATOR_IP_ADDRESS_OVERRIDE=127.0.0.1 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest
```

The Cosmos DB emulator uses a self-signed certificate. The API's `AsyncCosmosClient` is configured for local development with `enable_endpoint_discovery=False` and `connection_verify=False`. On first use, it creates the `UrlMagicDb` database and the `Urls` container with `/shortCode` as the partition key.

From the API directory, install dependencies and start the development server.

Windows PowerShell:

```powershell
cd api
uv sync
uv run uvicorn main:app --reload --port 8000
```

Linux or macOS:

```bash
cd api
uv sync
uv run uvicorn main:app --reload --port 8000
```

The API is available at `http://localhost:8000`. Interactive documentation is available at `http://localhost:8000/docs`.

### Configure Local Settings

Create `api/.env` with the local Cosmos and application settings. Use the Cosmos DB Emulator key for `cosmos_key`:

```dotenv
SECRET_KEY=local-development-secret
SAFE_BROWSING=
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=<cosmos-emulator-key>
COSMOS_DATABASE=UrlMagicDb
COSMOS_CONTAINER=Urls
```

### Test the Main Endpoints

In a second terminal, run these commands from the `api` directory. The session request stores the guest cookies in `cookies.txt`, which are then reused for shortening:

```powershell
# Create a guest session
curl.exe -c cookies.txt http://localhost:8000/api/v1/session/guest

# Shorten a URL
curl.exe -b cookies.txt -H "Content-Type: application/json" `
	-d '{"url":"https://example.com","ttl":3600}' `
	http://localhost:8000/api/v1/shorten

# Generate a QR code and save the PNG
curl.exe -H "Content-Type: application/json" `
	-d '{"url":"https://example.com"}' `
	-o example-qr.png http://localhost:8000/api/v1/qr

# Check URL health
curl.exe -H "Content-Type: application/json" `
	-d '{"urls":["https://example.com"]}' `
	http://localhost:8000/api/v1/health

# Resolve a short code returned by /shorten
curl.exe -i http://localhost:8000/api/v1/<short_code>
```

The redirect endpoint returns a `301` response. Replace `<short_code>` with the value returned by the shortening request.

## Terraform

Terraform configuration is located in [`infra/`](infra/). It is intended to provision the Microsoft Azure resources used by the application, including Cosmos DB and Azure Functions. The frontend Static Web App module remains commented out until the client is ready.

The Terraform files are currently development work. They have only been checked with `terraform plan` and have not been applied or validated against a real Azure environment. Review all variables and credentials before any deployment.

To validate the development configuration without creating resources, run the following from PowerShell on Windows:

```powershell
cd infra/environements/dev
terraform init
terraform validate
terraform plan -var-file=terraform.tfvars
```

On Linux or macOS, run the same commands from a Bash-compatible terminal:

```bash
cd infra/environements/dev
terraform init
terraform validate
terraform plan -var-file=terraform.tfvars
```

The `prod` directory is also a work in progress and should be treated as an unverified configuration until it has been tested against the target Azure environment.

## Frontend

The Next.js frontend is in [`client/`](client/), but it is currently under development and is not part of a production deployment. Consult [`client/README.md`](client/README.md) for its local development commands.