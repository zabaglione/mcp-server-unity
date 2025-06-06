#!/bin/bash

# Unity MCP Server - Direct Test Runner
# Run all tests directly without complex harness

set -e

echo "🧪 Unity MCP Server - Comprehensive Test Suite"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Build first
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

echo ""
echo "Running test suites..."
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    echo "─────────────────────────────────────────"
    
    if node "$test_file"; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

# Run all tests
run_test "Direct Server Test" "tests/test-server-direct.js"
run_test "E2E Test" "build/tests/e2e-direct-test.js"
run_test "Performance Benchmark" "build/tests/performance-direct-test.js"
run_test "Snapshot & Boundary Test" "build/tests/snapshot-direct-test.js"

# Summary
echo ""
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed.${NC}"
    exit 1
fi