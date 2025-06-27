# Unity 6 MCP Bridge v3.0 Documentation

## Overview
Unity 6 MCP Bridge is a Model Context Protocol server that enables AI assistants like Claude to interact with Unity projects through direct Unity API integration.

## Documentation Structure

### API Documentation
- [Available Tools](./api/AVAILABLE_TOOLS.md) - Complete list of MCP tools
- [HTTP API](./api/HTTP_API.md) - REST API endpoints documentation

### Features & Guides
- [Setup Prompts](./guides/SETUP_PROMPTS.md) - Quick setup commands
- [Unity 6 API Integration](./features/UNITY_6_API_INTEGRATION.md) - Direct Unity API features
- [Diff-based Updates](./features/DIFF_BASED_UPDATE_GUIDE.md) - Advanced diff processing
- [Folder Deletion](./features/FOLDER_DELETION_IMPROVEMENTS.md) - Folder management improvements
- [UI Toolkit Integration](./features/ui-toolkit.md) - UXML/USS support
- [Diagnostics Guide](./DIAGNOSTICS.md) - Unity diagnostics features
- [Unity Refresh Solution](./UNITY-REFRESH-SOLUTION.md) - Asset refresh optimization
- [Critical Features](./CRITICAL-FEATURES.md) - Core functionality overview

### Internal Documentation
- [Development Instructions](./internal/CLAUDE.md) - Claude Code development guide
- [Improvements](./internal/IMPROVEMENTS.md) - Feature improvements tracking
- [Test Cases](./internal/REGRESSION_TEST_CASES.md) - Regression test documentation
- [Test Results](./internal/TEST_RESULTS.md) - Test execution results
- [V3 Test Report](./internal/V3_TEST_REPORT.md) - Comprehensive v3.0 testing
- [V3 Cleanup Summary](./internal/V3_CLEANUP_SUMMARY.md) - v3.0 refactoring details
- [Partial Update Fix](./internal/PARTIAL_UPDATE_FIX.md) - Diff application fixes
- [Feature Requests](./internal/FEATURE_REQUEST.md) - Community feature requests
- [Benchmark Results](./internal/benchmark-results.json) - Performance benchmarks

### Legacy Documentation
- [Enhanced Compilation README](./legacy/README-enhanced-compilation.md) - v2.x compilation features
- [Standalone Compilation README](./legacy/README-standalone-compilation.md) - v2.x standalone mode
- [Standalone Compilation Summary](./legacy/STANDALONE_COMPILATION_SUMMARY.md) - v2.x summary

## Quick Links
- [Main README](../README.md) - English documentation
- [日本語 README](../README-ja.md) - Japanese documentation
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [Changelog](../CHANGELOG.md) - Version history
- [Claude Instructions](../CLAUDE.md) - Project-specific Claude guidance

## Desktop Extension
- [Manifest](../manifest.json) - Desktop Extension configuration
- Build Command: `npm run extension:build`
- One-click installation via Claude Desktop Extensions