# Makefile — dev helpers for gamemake

SHELL := /usr/bin/env bash

PORT ?= 8000
COV_DIR ?= .v8-coverage
COV_THRESHOLD ?= 95

.PHONY: serve serve-open cov clean help

help:
	@echo "Targets:"
	@echo "  make serve        # Serve repo root at http://localhost:$(PORT)/ (CTRL+C to stop)"
	@echo "  make serve-open   # Serve + open http://localhost:$(PORT)/public/ in browser"
	@echo "  make cov          # Run tests with V8 coverage and enforce $(COV_THRESHOLD)% threshold"
	@echo "  make clean        # Remove coverage artifacts"

serve:
	@echo "Serving repo root at http://localhost:$(PORT)/"
	@echo "Tip: open http://localhost:$(PORT)/public/ for the demo hub."
	python3 -m http.server $(PORT)

# Run the server in the foreground but also open the browser once.
serve-open:
	@echo "Starting server on http://localhost:$(PORT)/ and opening /public/…"
	@python3 -m http.server $(PORT) & \
	  pid=$$!; \
	  sleep 1; \
	  ( xdg-open "http://localhost:$(PORT)/public/" \
	    || open "http://localhost:$(PORT)/public/" \
	    || start "http://localhost:$(PORT)/public/" \
	    || true ); \
	  wait $$pid

cov:
	@rm -rf "$(COV_DIR)"
	@mkdir -p "$(COV_DIR)"
	@echo "Running tests with coverage → $(COV_DIR)…"
	@NODE_V8_COVERAGE="$(COV_DIR)" node --test
	@node tools/coverage.js "$(COV_DIR)" "$(COV_THRESHOLD)"

clean:
	@rm -rf "$(COV_DIR)"
	@echo "Cleaned coverage artifacts."
