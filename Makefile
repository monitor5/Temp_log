.DEFAULT_GOAL := help
COMPOSE ?= docker compose

.PHONY: help init build up down status logs check backup admin admin-reset

help:
	@printf '%s\n' \
	  'make up      : initialize credentials if absent, build and start' \
	  'make down    : stop containers (keep posts, uploads and database)' \
	  'make status  : show service health and ports' \
	  'make logs    : follow recent logs' \
	  'make build   : build the app and MongoDB images images' \
	  'make check   : validate Compose without printing secrets' \
	  'make backup  : back up stopped MongoDB and uploads together' \
	  'make admin   : create the first administrator securely'

init:
	@python3 scripts/init-local.py

check: init
	$(COMPOSE) config --quiet

build: check
	$(COMPOSE) build

up: check
	$(COMPOSE) up --build -d --wait --wait-timeout 240

down:
	$(COMPOSE) down

status:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs --tail=100 --follow

backup:
	./scripts/backup-local.sh

admin:
	python3 scripts/create-admin.py

admin-reset:
	python3 scripts/create-admin.py --reset-password
