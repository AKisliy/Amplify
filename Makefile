NAMESPACE ?= amplify-dev
MINIKUBE_MEMORY ?= 4096
MINIKUBE_CPUS ?= 2

# ─── Инфраструктура (docker-compose) ──────────────────────────────────────────

.PHONY: dev-infra-up
dev-infra-up: ## Запустить PostgreSQL, RabbitMQ, MinIO, Redis
	docker compose -f docker-compose.dev.yaml up -d

.PHONY: dev-infra-down
dev-infra-down: ## Остановить инфраструктурные контейнеры
	docker compose -f docker-compose.dev.yaml down

.PHONY: dev-infra-clean
dev-infra-clean: ## Остановить и удалить тома с данными
	docker compose -f docker-compose.dev.yaml down -v

# ─── Кластер ──────────────────────────────────────────────────────────────────

.PHONY: dev-cluster-reset
dev-cluster-reset: ## Удалить существующий кластер minikube и пересоздать
	minikube delete
	$(MAKE) dev-cluster

.PHONY: dev-cluster
dev-cluster: ## Запустить minikube, установить Istio и External Secrets Operator
	minikube start --memory=$(MINIKUBE_MEMORY) --cpus=$(MINIKUBE_CPUS)
	@echo "→ Installing Istio..."
	@which istioctl > /dev/null 2>&1 || brew install istioctl
	istioctl install --set profile=default -y
	@echo "→ Creating namespace $(NAMESPACE)..."
	kubectl create namespace $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -
	kubectl label namespace $(NAMESPACE) istio-injection=enabled --overwrite

# ─── Сборка образов ───────────────────────────────────────────────────────────

SERVICES := publisher userservice media-ingest websocket-gateway video-editor ai-gateway template-service

.PHONY: dev-build
dev-build: ## Собрать Docker-образы всех сервисов и загрузить в minikube
	@for svc in $(SERVICES); do \
	  echo "→ Building $$svc..."; \
	  docker build -t ghcr.io/akisliy/amplify/$$svc:latest ./$$svc || exit 1; \
	  minikube image load ghcr.io/akisliy/amplify/$$svc:latest; \
	done

.PHONY: dev-build-svc
dev-build-svc: ## Собрать один сервис: make dev-build-svc SVC=ai-gateway
	docker build -t ghcr.io/akisliy/amplify/$(SVC):latest ./$(SVC)
	minikube image load ghcr.io/akisliy/amplify/$(SVC):latest

# ─── Деплой ───────────────────────────────────────────────────────────────────

.PHONY: dev-operators
dev-operators: ## Установить ESO, задеплоить gateway (ClusterSecretStore, Istio Gateway)
	@echo "→ Installing External Secrets Operator..."
	helm upgrade --install external-secrets \
	  oci://ghcr.io/external-secrets/charts/external-secrets \
	  --namespace external-secrets-system --create-namespace \
	  --set installCRDs=true --wait
	helmfile -e dev apply -l name=gateway

.PHONY: dev-deploy
dev-deploy: ## Задеплоить все backend-сервисы
	helmfile -e dev apply -l tier=backend

.PHONY: dev-up
dev-up: dev-infra-up dev-cluster dev-build dev-operators dev-deploy ## Полный запуск dev-окружения

# ─── Доступ ───────────────────────────────────────────────────────────────────

.PHONY: dev-port-forward
dev-port-forward: ## Открыть доступ к Istio Ingress Gateway на localhost:8080
	kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80

# ─── Статус и очистка ─────────────────────────────────────────────────────────

.PHONY: dev-status
dev-status: ## Показать состояние подов в namespace $(NAMESPACE)
	kubectl get pods -n $(NAMESPACE)

.PHONY: dev-clean
dev-clean: ## Удалить все ресурсы dev-окружения
	helmfile -e dev destroy -l tier=backend || true
	helmfile -e dev destroy -l tier=infra || true
	kubectl delete namespace $(NAMESPACE) --ignore-not-found
	docker compose -f docker-compose.dev.yaml down -v

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  %-22s %s\n", $$1, $$2}'
