SHELL := /bin/sh

API_DIR := api
CLIENT_DIR := client

.PHONY: setup data api client swa dev stop

setup:
	cd $(API_DIR) && uv venv && uv sync
	cd $(CLIENT_DIR) && npm install

data:
	@docker start redis-local 2>/dev/null || docker run -d --name redis-local --restart unless-stopped -p 6379:6379 redis:7-alpine
	@docker start cosmos-emulator 2>/dev/null || docker run -d --name cosmos-emulator --restart unless-stopped -p 8081:8081 -p 1234:1234 -p 10250-10255:10250-10255 -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=10 -e AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=true mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest
	@docker start azurite-local 2>/dev/null || docker run -d --name azurite-local --restart unless-stopped -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite

api:
	bash -lc 'source "$$HOME/.nvm/nvm.sh" && nvm use 20 && cd $(API_DIR) && uv run func start --verbose'

client:
	cd $(CLIENT_DIR) && npm run dev

swa:
	bash -lc 'source "$$HOME/.nvm/nvm.sh" && nvm use 24 && swa start http://localhost:3000 --api-devserver-url http://localhost:7071 --verbose'

dev: setup data
	@echo "Start these targets in separate terminals:"
	@echo "make api"
	@echo "make client"
	@echo "make swa"

stop:
	-docker stop redis-local cosmos-emulator azurite-local