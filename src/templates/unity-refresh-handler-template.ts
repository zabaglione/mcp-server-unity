export const getUnityRefreshHandlerTemplate = () => `using UnityEngine;
using UnityEditor;
using System.IO;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Handles asset database refresh requests from external tools
/// This script monitors a trigger file and refreshes Unity when needed
/// </summary>
[InitializeOnLoad]
public static class UnityRefreshHandler
{
    private static string RefreshTriggerPath => Path.Combine(Application.dataPath, "..", "Temp", "unity_refresh_trigger.txt");
    private static string BatchOperationPath => Path.Combine(Application.dataPath, "..", "Temp", "unity_batch_operation.txt");
    private static FileSystemWatcher fileWatcher;
    private static bool isRefreshing = false;
    private static System.DateTime lastRefreshTime = System.DateTime.MinValue;
    private static readonly float MinRefreshInterval = 2f; // Minimum seconds between refreshes
    
    static UnityRefreshHandler()
    {
        EditorApplication.update += CheckForRefreshRequest;
        SetupFileWatcher();
        
        // Also listen for play mode changes
        EditorApplication.playModeStateChanged += OnPlayModeStateChanged;
    }
    
    private static void SetupFileWatcher()
    {
        try
        {
            string tempPath = Path.GetDirectoryName(RefreshTriggerPath);
            if (!Directory.Exists(tempPath))
            {
                Directory.CreateDirectory(tempPath);
            }
            
            fileWatcher = new FileSystemWatcher(tempPath);
            fileWatcher.Filter = "unity_*.txt";
            fileWatcher.NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName;
            fileWatcher.Changed += OnFileChanged;
            fileWatcher.Created += OnFileChanged;
            fileWatcher.EnableRaisingEvents = true;
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to setup file watcher: {e.Message}");
        }
    }
    
    private static void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        if (e.FullPath == RefreshTriggerPath || e.FullPath == BatchOperationPath)
        {
            EditorApplication.delayCall += () => ProcessRefreshRequest();
        }
    }
    
    private static void CheckForRefreshRequest()
    {
        // Manual check as backup (runs less frequently)
        if (Time.realtimeSinceStartup % 5 < 0.1f) // Check every 5 seconds
        {
            if (File.Exists(RefreshTriggerPath))
            {
                ProcessRefreshRequest();
            }
        }
    }
    
    private static void ProcessRefreshRequest()
    {
        if (isRefreshing) return;
        
        // Check if enough time has passed since last refresh
        if ((System.DateTime.Now - lastRefreshTime).TotalSeconds < MinRefreshInterval)
        {
            EditorApplication.delayCall += () => ProcessRefreshRequest();
            return;
        }
        
        isRefreshing = true;
        
        try
        {
            // Check for batch operation
            if (File.Exists(BatchOperationPath))
            {
                string[] operations = File.ReadAllLines(BatchOperationPath);
                ProcessBatchOperations(operations);
                File.Delete(BatchOperationPath);
            }
            
            // Read refresh parameters if any
            RefreshOptions options = RefreshOptions.Default;
            if (File.Exists(RefreshTriggerPath))
            {
                string content = File.ReadAllText(RefreshTriggerPath);
                options = ParseRefreshOptions(content);
                File.Delete(RefreshTriggerPath);
            }
            
            // Perform refresh based on options
            PerformRefresh(options);
            
            lastRefreshTime = System.DateTime.Now;
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Error processing refresh request: {e.Message}");
        }
        finally
        {
            isRefreshing = false;
        }
    }
    
    private static void PerformRefresh(RefreshOptions options)
    {
        Debug.Log($"[UnityRefreshHandler] Refreshing assets with options: {options}");
        
        if (options.ImportAssets)
        {
            if (options.ForceRecompile)
            {
                // Force synchronous import and recompilation
                AssetDatabase.Refresh(ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
                
                // Additional step to ensure scripts are recompiled
                if (options.RecompileScripts)
                {
                    UnityEditor.Compilation.CompilationPipeline.RequestScriptCompilation();
                }
            }
            else
            {
                // Normal refresh
                AssetDatabase.Refresh(options.ImportOptions);
            }
        }
        
        if (options.RefreshSpecificFolders.Count > 0)
        {
            foreach (string folder in options.RefreshSpecificFolders)
            {
                if (Directory.Exists(folder))
                {
                    AssetDatabase.ImportAsset(folder, ImportAssetOptions.ImportRecursive);
                }
            }
        }
        
        // Save assets if requested
        if (options.SaveAssets)
        {
            AssetDatabase.SaveAssets();
        }
        
        // Show notification
        if (options.ShowNotification)
        {
            EditorWindow.focusedWindow?.ShowNotification(new GUIContent("Assets Refreshed"));
        }
    }
    
    private static RefreshOptions ParseRefreshOptions(string content)
    {
        RefreshOptions options = new RefreshOptions();
        
        string[] lines = content.Split('\\n');
        foreach (string line in lines)
        {
            string trimmed = line.Trim();
            if (trimmed.StartsWith("forceRecompile:"))
            {
                options.ForceRecompile = trimmed.Contains("true");
            }
            else if (trimmed.StartsWith("recompileScripts:"))
            {
                options.RecompileScripts = trimmed.Contains("true");
            }
            else if (trimmed.StartsWith("saveAssets:"))
            {
                options.SaveAssets = trimmed.Contains("true");
            }
            else if (trimmed.StartsWith("folder:"))
            {
                string folder = trimmed.Substring(7).Trim();
                if (!string.IsNullOrEmpty(folder))
                {
                    options.RefreshSpecificFolders.Add(folder);
                }
            }
        }
        
        return options;
    }
    
    private static void ProcessBatchOperations(string[] operations)
    {
        Debug.Log($"[UnityRefreshHandler] Processing {operations.Length} batch operations");
        
        List<string> foldersToRefresh = new List<string>();
        bool needsScriptRecompile = false;
        
        foreach (string operation in operations)
        {
            if (operation.StartsWith("created:") || operation.StartsWith("modified:"))
            {
                string path = operation.Substring(operation.IndexOf(':') + 1).Trim();
                string folder = Path.GetDirectoryName(path);
                
                if (!foldersToRefresh.Contains(folder))
                {
                    foldersToRefresh.Add(folder);
                }
                
                // Check if it's a script or shader
                if (path.EndsWith(".cs") || path.EndsWith(".shader") || path.EndsWith(".cginc"))
                {
                    needsScriptRecompile = true;
                }
            }
        }
        
        // Create optimized refresh options
        RefreshOptions options = new RefreshOptions
        {
            ForceRecompile = needsScriptRecompile,
            RecompileScripts = needsScriptRecompile,
            RefreshSpecificFolders = foldersToRefresh,
            SaveAssets = true
        };
        
        PerformRefresh(options);
    }
    
    private static void OnPlayModeStateChanged(PlayModeStateChange state)
    {
        if (state == PlayModeStateChange.ExitingEditMode)
        {
            // Check for pending refresh before entering play mode
            if (File.Exists(RefreshTriggerPath))
            {
                ProcessRefreshRequest();
            }
        }
    }
    
    // Public API for manual refresh
    [MenuItem("Tools/MCP/Force Refresh")]
    public static void ForceRefresh()
    {
        RefreshOptions options = new RefreshOptions
        {
            ForceRecompile = true,
            RecompileScripts = true,
            SaveAssets = true,
            ShowNotification = true
        };
        
        PerformRefresh(options);
    }
    
    [MenuItem("Tools/MCP/Refresh Scripts Only")]
    public static void RefreshScriptsOnly()
    {
        UnityEditor.Compilation.CompilationPipeline.RequestScriptCompilation();
        EditorWindow.focusedWindow?.ShowNotification(new GUIContent("Recompiling Scripts..."));
    }
    
    private class RefreshOptions
    {
        public bool ImportAssets = true;
        public bool ForceRecompile = false;
        public bool RecompileScripts = false;
        public bool SaveAssets = false;
        public bool ShowNotification = false;
        public ImportAssetOptions ImportOptions = ImportAssetOptions.Default;
        public List<string> RefreshSpecificFolders = new List<string>();
        
        public static RefreshOptions Default => new RefreshOptions();
        
        public override string ToString()
        {
            return $"ImportAssets: {ImportAssets}, ForceRecompile: {ForceRecompile}, " +
                   $"RecompileScripts: {RecompileScripts}, SaveAssets: {SaveAssets}, " +
                   $"Folders: {RefreshSpecificFolders.Count}";
        }
    }
}

// Helper window for monitoring refresh status
public class RefreshMonitorWindow : EditorWindow
{
    private Vector2 scrollPosition;
    private List<string> logMessages = new List<string>();
    
    [MenuItem("Tools/MCP/Refresh Monitor")]
    public static void ShowWindow()
    {
        GetWindow<RefreshMonitorWindow>("MCP Refresh Monitor");
    }
    
    void OnGUI()
    {
        EditorGUILayout.LabelField("Unity MCP Refresh Monitor", EditorStyles.boldLabel);
        EditorGUILayout.Space();
        
        if (GUILayout.Button("Force Refresh Now"))
        {
            UnityRefreshHandler.ForceRefresh();
        }
        
        if (GUILayout.Button("Recompile Scripts Only"))
        {
            UnityRefreshHandler.RefreshScriptsOnly();
        }
        
        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Log Messages:", EditorStyles.boldLabel);
        
        scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
        foreach (string message in logMessages)
        {
            EditorGUILayout.LabelField(message);
        }
        EditorGUILayout.EndScrollView();
    }
}`;