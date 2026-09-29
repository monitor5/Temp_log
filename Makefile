.DEFAULT_GOAL := help
COMPOSE ?= docker compose

.PHONY: help init build up down status logs check backup theme

help:
	@printf '%s\n' \
	  'make up      : initialize credentials if absent, build and start' \
	  'make down    : stop containers (keep posts, uploads and database)' \
	  'make status  : show service health and ports' \
	  'make logs    : follow recent logs' \
	  'make build   : build the Ghost and MySQL images' \
	  'make check   : validate Compose without printing secrets' \
	  'make backup  : back up SQL and uploads together' \
	  'make theme   : package the theme ZIP'

init:
	@if [ ! -f .env ]; then python3 scripts/init-local.py; fi

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

theme:
	python3 scripts/package-theme.py
