# Makefile — zero external deps
COV_DIR := .v8-coverage
THRESH  := 95

.PHONY: test cov clean

test:
	@node --test

cov: clean
	@mkdir -p $(COV_DIR)
	@NODE_V8_COVERAGE=$(COV_DIR) node --test
	@node tools/coverage.js $(COV_DIR) $(THRESH)

clean:
	@rm -rf $(COV_DIR)
