# Unity Editor Refresh Solution

## Problem Overview
Unity Editor requires focus to trigger asset compilation, which causes issues when MCP server updates files while Unity is in the background. This leads to:
- Files being updated but Unity not recognizing changes
- Compilation errors only appearing when Unity gains focus
- Inconsistent state between file system and Unity's asset database

## Implemented Solutions

### 1. Enhanced Unity Refresh Handler
The `UnityRefreshHandler.cs` script now includes:

- **Focus Detection**: Automatically processes pending refreshes when Unity gains focus
- **Forced Compilation**: Uses `CompilationPipeline.RequestScriptCompilation()` for scripts
- **Window Focus**: Attempts to bring Unity to foreground when critical
- **Timestamp Tracking**: Ensures file changes are detected even with identical content

### 2. Smart Refresh Service
The refresh service now:

- **Adds timestamps** to trigger files to ensure filesystem watchers detect changes
- **Touches files** using `fs.utimes()` to guarantee change detection
- **Creates lock files** to ensure Unity processes the refresh
- **Detects file types** and automatically triggers recompilation for .cs/.shader files

### 3. File Type Aware Refreshing
BaseService now:

- **Detects script/shader files** and forces recompilation
- **Saves assets** after refresh to persist changes
- **Provides detailed logging** about compilation state

## Usage Patterns

### For UI Toolkit Components
When creating UI components like GameHUD:
1. Files are written to disk
2. Refresh is triggered with script recompilation
3. Unity compiles when it gains focus or within 5 seconds

### Manual Refresh Options
If automatic refresh fails:
1. **In Unity**: Tools > MCP > Force Refresh
2. **In Unity**: Tools > MCP > Refresh Scripts Only
3. **Manual**: Right-click in Project window > Refresh

### Monitoring Refresh Status
Use Tools > MCP > Refresh Monitor to:
- See refresh history
- Manually trigger refreshes
- Monitor compilation status

## Best Practices

1. **Keep Unity Visible**: For immediate feedback, keep Unity window visible
2. **Use Batch Operations**: Group multiple file operations before refresh
3. **Check Compilation Status**: Look for compilation spinner in Unity
4. **Use Force Refresh**: When in doubt, use Tools > MCP > Force Refresh

## Technical Details

### Refresh Options
```typescript
interface RefreshOptions {
  forceRecompile?: boolean;      // Force full recompilation
  recompileScripts?: boolean;     // Request script compilation
  saveAssets?: boolean;           // Save all assets after refresh
  specificFolders?: string[];     // Only refresh specific folders
}
```

### File Watcher Strategy
- Primary: FileSystemWatcher on Temp folder
- Backup: EditorApplication.update polling every 5 seconds
- Focus trigger: Immediate check on EditorApplication.focusChanged

### Compilation Triggers
1. ImportAssetOptions.ForceSynchronousImport
2. CompilationPipeline.RequestScriptCompilation()
3. EditorApplication.ExecuteMenuItem("Assets/Refresh")
4. Window focus changes via ExecuteMenuItem("Window/General/Project")

## Troubleshooting

### Unity Not Compiling
1. Check Unity console for errors
2. Use Tools > MCP > Force Refresh
3. Manually focus Unity window
4. Check if Unity is in Play Mode (compilation paused)

### Files Not Updating
1. Verify file timestamps changed
2. Check Temp/unity_refresh_trigger.txt exists
3. Look for refresh handler logs in Unity console
4. Ensure UnityRefreshHandler.cs is in project

### Persistent Errors
1. Clear Unity's Library folder
2. Reimport all assets (Assets > Reimport All)
3. Restart Unity Editor
4. Check for compilation errors in other scripts

## Future Improvements

1. **Unity Remote Control**: Implement external API to force Unity focus
2. **Compilation Status API**: Query Unity's compilation state
3. **Asset Import Queue**: Track pending imports and report status
4. **Unity IPC**: Direct inter-process communication with Unity