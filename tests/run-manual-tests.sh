#!/bin/bash

# Unity MCP Server Manual Test Runner
# This script helps with manual regression testing

echo "Unity MCP Server - Manual Test Runner"
echo "===================================="
echo ""

# Check if Unity project path is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <unity-project-path>"
    echo "Example: $0 /Users/me/Unity/MyTestProject"
    exit 1
fi

UNITY_PROJECT_PATH="$1"

# Verify the Unity project exists
if [ ! -d "$UNITY_PROJECT_PATH/Assets" ] || [ ! -d "$UNITY_PROJECT_PATH/ProjectSettings" ]; then
    echo "Error: Invalid Unity project path. Must contain Assets and ProjectSettings folders."
    exit 1
fi

echo "Using Unity project: $UNITY_PROJECT_PATH"
echo ""
echo "This script will guide you through manual regression testing."
echo "Please ensure:"
echo "1. Unity MCP Server is built (npm run build)"
echo "2. Claude Desktop is configured with the server"
echo ""
echo "Press Enter to continue..."
read

# Test categories
declare -a categories=(
    "Project Management"
    "Script Operations"
    "Asset Creation"
    "Package Management"
    "Editor Extensions"
    "ProBuilder"
    "Build Operations"
    "System Operations"
)

# Test results
passed=0
failed=0
skipped=0

# Function to run a test
run_test() {
    local test_id=$1
    local test_name=$2
    local instructions=$3
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test: $test_id - $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Instructions:"
    echo "$instructions"
    echo ""
    echo "Result: [P]assed / [F]ailed / [S]kip?"
    read -n 1 result
    echo ""
    
    case $result in
        [Pp]* )
            echo "✅ Test PASSED"
            ((passed++))
            ;;
        [Ff]* )
            echo "❌ Test FAILED"
            ((failed++))
            echo "Please describe the issue:"
            read issue
            echo "$test_id: $issue" >> test-failures.log
            ;;
        [Ss]* )
            echo "⏭️  Test SKIPPED"
            ((skipped++))
            ;;
        * )
            echo "Invalid input, marking as skipped"
            ((skipped++))
            ;;
    esac
}

# Start testing
echo "" > test-failures.log

# Project Management Tests
echo ""
echo "📁 CATEGORY: Project Management"
echo ""

run_test "TC-001" "Set Valid Unity Project Path" \
"1. In Claude, send: 'Set Unity project to $UNITY_PROJECT_PATH'
2. Verify you get a success message
3. Check that Assets/Scripts folder exists"

run_test "TC-002" "Set Invalid Unity Project Path" \
"1. In Claude, send: 'Set Unity project to /invalid/path'
2. Verify you get an appropriate error message"

run_test "TC-003" "Get Project Information" \
"1. In Claude, send: 'Show project information'
2. Verify Unity version and asset counts are displayed"

# Script Operations Tests
echo ""
echo "📝 CATEGORY: Script Operations"
echo ""

run_test "TC-004" "Create New Script" \
"1. In Claude, send: 'Create a TestScript with basic MonoBehaviour'
2. Check that Assets/Scripts/TestScript.cs exists
3. Verify the content is valid C#"

run_test "TC-005" "Create Script in Subfolder" \
"1. In Claude, send: 'Create EnemyAI script in Enemies folder'
2. Check that Assets/Scripts/Enemies/EnemyAI.cs exists"

run_test "TC-006" "Read Existing Script" \
"1. In Claude, send: 'Show me the TestScript'
2. Verify the script content is displayed correctly"

# Package Management Tests
echo ""
echo "📦 CATEGORY: Package Management"
echo ""

run_test "TC-014" "Search Packages" \
"1. In Claude, send: 'Search for 2D packages'
2. Verify relevant 2D packages are listed with descriptions"

run_test "TC-015" "Install Package" \
"1. In Claude, send: 'Install ProBuilder'
2. Check Packages/manifest.json includes com.unity.probuilder
3. Verify Unity refresh message appears"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Passed:  $passed"
echo "❌ Failed:  $failed"
echo "⏭️  Skipped: $skipped"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:     $((passed + failed + skipped))"
echo ""

if [ $failed -gt 0 ]; then
    echo "Failed tests logged to: test-failures.log"
    echo ""
    echo "Exit code: 1 (failures detected)"
    exit 1
else
    echo "All tests passed!"
    echo ""
    echo "Exit code: 0 (success)"
    exit 0
fi