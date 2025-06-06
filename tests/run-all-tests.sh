#!/bin/bash

# Unity MCP Server - Comprehensive Test Runner
# This script runs all test suites for the Unity MCP Server

set -e  # Exit on error

echo "🧪 Unity MCP Server - Test Suite Runner"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if TypeScript is compiled
if [ ! -d "build" ]; then
    echo -e "${YELLOW}Build directory not found. Running build...${NC}"
    npm run build
fi

# Create test results directory
mkdir -p test-results
TEST_RESULTS_DIR="test-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEST_RESULTS_DIR"

echo "Test results will be saved to: $TEST_RESULTS_DIR"
echo ""

# Function to run a test and capture results
run_test() {
    local test_name=$1
    local test_file=$2
    local test_args=${3:-}
    
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    echo "─────────────────────────────────────────"
    
    if [ -n "$test_args" ]; then
        node "$test_file" $test_args > "$TEST_RESULTS_DIR/$test_name.log" 2>&1
    else
        node "$test_file" > "$TEST_RESULTS_DIR/$test_name.log" 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        echo "   See $TEST_RESULTS_DIR/$test_name.log for details"
        return 1
    fi
}

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Check for Unity project argument
if [ -z "$1" ]; then
    echo "Usage: $0 <unity-project-path> [test-type]"
    echo ""
    echo "Test types:"
    echo "  all          - Run all tests (default)"
    echo "  unit         - Run unit tests only"
    echo "  integration  - Run integration tests only"
    echo "  e2e          - Run E2E tests only"
    echo "  performance  - Run performance benchmarks only"
    echo "  snapshot     - Run snapshot and boundary tests only"
    echo ""
    echo "Example: $0 /path/to/UnityProject all"
    exit 1
fi

UNITY_PROJECT_PATH="$1"
TEST_TYPE="${2:-all}"

# Verify Unity project
if [ ! -d "$UNITY_PROJECT_PATH/Assets" ] || [ ! -d "$UNITY_PROJECT_PATH/ProjectSettings" ]; then
    echo -e "${RED}Error: Invalid Unity project path: $UNITY_PROJECT_PATH${NC}"
    echo "Must contain Assets and ProjectSettings folders."
    exit 1
fi

echo "Unity Project: $UNITY_PROJECT_PATH"
echo "Test Type: $TEST_TYPE"
echo ""

# Run tests based on type
case $TEST_TYPE in
    "all"|"unit")
        if run_test "mcp-harness-test" "tests/test-mcp-harness.js"; then
            ((PASSED_TESTS++))
        else
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
        ;;&
        
    "all"|"integration")
        if run_test "integration-test" "tests/integration-test.js" "$UNITY_PROJECT_PATH"; then
            ((PASSED_TESTS++))
        else
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
        ;;&
        
    "all"|"integration")
        if run_test "comprehensive-test" "tests/comprehensive-test.js" "$UNITY_PROJECT_PATH"; then
            ((PASSED_TESTS++))
        else
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
        ;;&
        
    "all"|"e2e")
        if run_test "e2e-pipeline" "tests/e2e-test-pipeline.js"; then
            ((PASSED_TESTS++))
        else
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
        ;;&
        
    "all"|"performance")
        if run_test "performance-benchmark" "tests/performance-benchmark.js"; then
            ((PASSED_TESTS++))
        else
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
        
        # Copy benchmark results
        if [ -f "benchmark-results.json" ]; then
            cp benchmark-results.json "$TEST_RESULTS_DIR/"
        fi
        ;;&
        
    "all"|"snapshot")
        if run_test "snapshot-boundary" "tests/snapshot-boundary-tests.js"; then
            ((PASSED_TESTS++))
        else
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
        ;;&
esac

# Generate summary report
echo ""
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
else
    echo -e "\n${RED}⚠️  Some tests failed. Check the logs for details.${NC}"
fi

# Generate HTML report
cat > "$TEST_RESULTS_DIR/summary.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Unity MCP Server Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .passed { color: green; }
        .failed { color: red; }
        .summary { background: #f0f0f0; padding: 10px; margin: 20px 0; }
        pre { background: #f8f8f8; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Unity MCP Server Test Results</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Date: $(date)</p>
        <p>Unity Project: $UNITY_PROJECT_PATH</p>
        <p>Total Tests: $TOTAL_TESTS</p>
        <p class="passed">Passed: $PASSED_TESTS</p>
        <p class="failed">Failed: $FAILED_TESTS</p>
    </div>
    <h2>Test Logs</h2>
    <ul>
EOF

# Add links to log files
for log in "$TEST_RESULTS_DIR"/*.log; do
    if [ -f "$log" ]; then
        basename=$(basename "$log")
        echo "        <li><a href=\"$basename\">$basename</a></li>" >> "$TEST_RESULTS_DIR/summary.html"
    fi
done

cat >> "$TEST_RESULTS_DIR/summary.html" << EOF
    </ul>
</body>
</html>
EOF

echo ""
echo "📄 Detailed results saved to: $TEST_RESULTS_DIR"
echo "🌐 Open $TEST_RESULTS_DIR/summary.html for HTML report"

# Exit with appropriate code
exit $FAILED_TESTS