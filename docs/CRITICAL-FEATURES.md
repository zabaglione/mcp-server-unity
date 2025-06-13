# Unity MCP Server - Critical Features Documentation

## Overview
This document outlines critical features that MUST be automatically executed to ensure proper Unity integration. These features are essential for the MCP server to function correctly and cannot be skipped.

## 1. Unity Asset Database Refresh (CRITICAL)

### Why It's Critical
- Unity caches asset information and doesn't automatically detect file system changes
- Without refresh, Unity will not recognize:
  - New files created by MCP
  - Updated files modified by MCP
  - Deleted files removed by MCP
- This leads to compilation errors, missing references, and inconsistent project state

### Implementation
All services that perform file operations MUST call `refreshAfterFileOperation()` after completing file writes:

```typescript
// After writing files
await fs.writeFile(filePath, content);
await fs.writeFile(metaPath, metaContent);

// CRITICAL: Refresh Unity to recognize changes
await this.refreshAfterFileOperation(filePath);
```

### Services Requiring Automatic Refresh
- `ScriptService` - C# script creation/updates
- `ShaderService` - Shader file creation/updates
- `MaterialService` - Material file creation/updates
- `EditorScriptService` - Editor extension creation
- `UIToolkitService` - UXML/USS file operations
- `GameSystemService` - Game system file creation
- `AIAutomationService` - AI-generated content

## 2. Meta File Generation (CRITICAL)

### Why It's Critical
- Unity uses .meta files to track assets with GUIDs
- Missing meta files cause:
  - Lost references between assets
  - Duplicate import warnings
  - Inconsistent asset database

### Implementation
Every asset creation MUST include meta file generation:

```typescript
// Generate meta file with consistent GUID
const metaContent = this.generateMetaFile(assetType);
await fs.writeFile(`${filePath}.meta`, metaContent);
```

## 3. Service Dependency Injection (CRITICAL)

### Why It's Critical
- Services depend on each other for proper functionality
- Missing dependencies cause features to silently fail
- RefreshService is especially critical for all file operations

### Implementation in ServiceFactory
```typescript
// CRITICAL: Set RefreshService for ALL file operation services
const fileOperationServices = [
  scriptService,
  shaderService,
  materialService,
  editorScriptService,
  uiToolkitService,
  gameSystemService,
  aiAutomationService
];

for (const service of fileOperationServices) {
  service.setRefreshService(refreshService);
}
```

## 4. Project Validation (CRITICAL)

### Why It's Critical
- Operations on invalid Unity projects cause cascading failures
- Ensures Unity version compatibility
- Validates required project structure

### Implementation
All services MUST call `ensureProjectSet()` before operations:

```typescript
protected ensureProjectSet(): void {
  if (!this.unityProject) {
    throw new UnityProjectNotSetError();
  }
}
```

## 5. Error Handling with User Guidance (CRITICAL)

### Why It's Critical
- Unity integration failures can be cryptic
- Users need actionable guidance to resolve issues
- Prevents silent failures that corrupt project state

### Implementation
```typescript
try {
  await this.refreshService.refreshUnityAssets();
} catch (error) {
  this.logger.error('Failed to refresh Unity assets:', error);
  this.logger.warn('Please manually refresh in Unity Editor (right-click -> Refresh)');
}
```

## Testing Critical Features

### 1. Automatic Refresh Test
```bash
# Create a new script
npm run test:manual -- ui-create-component TestComponent

# Verify in Unity:
# - Component appears immediately in Project window
# - No manual refresh required
# - Component compiles without errors
```

### 2. Service Integration Test
```bash
# Run integration test
npm run test:integration

# Verify:
# - All services have RefreshService set
# - File operations trigger refresh
# - No warnings about missing dependencies
```

### 3. Error Recovery Test
```bash
# Test with Unity closed
# MCP operations should:
# - Complete file operations
# - Log refresh failure with clear instructions
# - Not throw unhandled exceptions
```

## Monitoring Critical Features

### Log Indicators
Watch for these critical log messages:

✅ Success:
- "Unity assets refreshed successfully"
- "RefreshService connected to [service]"

⚠️ Warning:
- "RefreshService not set - Unity may not recognize file changes"
- "Failed to refresh Unity assets"

❌ Error:
- "UnityProjectNotSetError"
- "RefreshService is undefined"

## Best Practices

1. **Never Skip Refresh**: Always refresh after file operations
2. **Batch Operations**: Use batch mode for multiple file operations
3. **Fail Gracefully**: Provide manual fallback instructions
4. **Test Integration**: Verify service connections in tests
5. **Monitor Logs**: Watch for critical feature warnings

## Common Issues and Solutions

### Issue: Files created but Unity doesn't see them
**Cause**: RefreshService not connected or refresh not called
**Solution**: Ensure ServiceFactory sets RefreshService for all services

### Issue: Compilation errors after MCP operations
**Cause**: Unity using cached/old file content
**Solution**: Implement automatic refresh after all file writes

### Issue: "RefreshService not set" warnings
**Cause**: Service created without proper initialization
**Solution**: Use ServiceFactory.createServices() and connectServices()

### Issue: Silent failures with no error messages
**Cause**: Missing error handling in critical paths
**Solution**: Wrap all critical operations in try-catch with logging