# Binary name
BINARY_NAME=fastly-mcp
BINARY_PATH=bin/$(BINARY_NAME)

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
GOFMT=gofmt
GOVET=$(GOCMD) vet
GOLINT=golangci-lint

# Build flags
LDFLAGS=-ldflags "-s -w"

.PHONY: all build test clean fmt lint vet tidy help

all: build

build: ## Build the binary
	@mkdir -p bin
	$(GOBUILD) $(LDFLAGS) -o $(BINARY_PATH) ./cmd/fastly-mcp
	@echo "Binary built: $(BINARY_PATH)"

test: ## Run tests
	$(GOTEST) -v ./...

clean: ## Remove binary and bin directory
	@rm -rf bin/
	@echo "Cleaned up bin directory"

fmt: ## Format Go code
	$(GOFMT) -s -w .
	@echo "Code formatted"

lint: ## Run golangci-lint
	@if command -v $(GOLINT) >/dev/null 2>&1; then \
		$(GOLINT) run ./...; \
	else \
		echo "golangci-lint not installed. Install with:"; \
		echo "  curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $$(go env GOPATH)/bin"; \
		exit 1; \
	fi

vet: ## Run go vet
	$(GOVET) ./...
	@echo "Vet complete"

tidy: ## Run go mod tidy
	$(GOMOD) tidy
	@echo "Go modules tidied"

help: ## Display this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help