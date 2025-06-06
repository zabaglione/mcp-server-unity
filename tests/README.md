# Unity MCP Server - Test Suite

This directory contains comprehensive tests for the Unity MCP Server.

## Test Structure

### 1. **Direct Server Test** (`test-server-direct.js`)
- Basic service functionality tests
- Tests core operations without protocol complexity
- Quick smoke tests for all major features

### 2. **E2E Direct Test** (`e2e-direct-test.ts`)
- End-to-end workflow tests
- Tests complete user scenarios
- Validates error handling and edge cases

### 3. **Performance Benchmark** (`performance-direct-test.ts`)
- Measures operation performance
- Tests with 100+ file projects
- Exports benchmark results to JSON
- Key metrics:
  - Script creation: ~5,200 ops/sec
  - Script reading: ~1,350 ops/sec
  - Package search: ~73,000 ops/sec

### 4. **Snapshot & Boundary Test** (`snapshot-direct-test.ts`)
- Validates generated file content
- Tests boundary conditions:
  - Long file names (250 chars)
  - Empty file names
  - Special characters
  - Unicode support
  - Path traversal prevention
  - Deep folder hierarchies

## Running Tests

### Run All Tests
```bash
./tests/run-all-direct-tests.sh
```

### Run Individual Tests
```bash
# Direct server test
node tests/test-server-direct.js

# E2E test
node build/tests/e2e-direct-test.js

# Performance benchmark
node build/tests/performance-direct-test.js

# Snapshot test
node build/tests/snapshot-direct-test.js
```

## Test Utilities

### Virtual Unity Project (`virtual-unity-project.ts`)
Creates realistic Unity project structures for testing:
- Configurable number of scripts
- Standard Unity folders (Assets, ProjectSettings, etc.)
- Sample scripts, scenes, materials, and shaders
- Meta file generation

### Test Utils (`test-utils.ts`)
Helper functions for test operations:
- Test project creation and cleanup
- Execution time measurement
- Result formatting

## Test Results

All tests should pass with 100% success rate. Performance benchmarks are saved to `benchmark-results.json`.

## Adding New Tests

1. Create test file in TypeScript
2. Use `VirtualUnityProject` for test environments
3. Access services via `(server as any).services`
4. Add to `run-all-direct-tests.sh`

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:
```yaml
- name: Run Unity MCP Tests
  run: ./tests/run-all-direct-tests.sh
```