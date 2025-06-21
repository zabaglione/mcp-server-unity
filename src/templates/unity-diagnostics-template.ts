export const unityDiagnosticsTemplate = `using UnityEngine;
using UnityEditor;
using UnityEditor.Compilation;
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Text;

namespace MCP.Diagnostics
{
    /// <summary>
    /// Unity Diagnostics Tool for MCP Server
    /// Provides real-time compilation and validation feedback
    /// </summary>
    public static class UnityDiagnostics
    {
        private const string DIAGNOSTICS_PATH = "Assets/Editor/MCP/Diagnostics";
        private const string RESULTS_FILE = "diagnostics_results.json";
        
        [MenuItem("MCP/Diagnostics/Run Full Diagnostics")]
        public static void RunFullDiagnostics()
        {
            var results = new DiagnosticsResults();
            
            // Compilation check
            results.compilation = CheckCompilation();
            
            // Asset validation
            results.assetValidation = ValidateAssets();
            
            // Missing references
            results.missingReferences = FindMissingReferences();
            
            // Console logs
            results.consoleLogs = GetRecentConsoleLogs();
            
            // Save results
            SaveResults(results);
            
            Debug.Log($"MCP Diagnostics completed. Results saved to {GetResultsPath()}");
        }
        
        [MenuItem("MCP/Diagnostics/Check Compilation")]
        public static void CheckCompilationStatus()
        {
            var result = CheckCompilation();
            Debug.Log($"Compilation Status: {(result.hasErrors ? "FAILED" : "SUCCESS")}");
            
            if (result.hasErrors)
            {
                foreach (var error in result.errors)
                {
                    Debug.LogError($"{error.file}({error.line},{error.column}): {error.message}");
                }
            }
        }
        
        [MenuItem("MCP/Diagnostics/Validate Assets")]
        public static void ValidateAssetsMenu()
        {
            var result = ValidateAssets();
            Debug.Log($"Asset Validation: Found {result.issues.Count} issues");
            
            foreach (var issue in result.issues)
            {
                Debug.LogWarning($"{issue.type}: {issue.path} - {issue.description}");
            }
        }
        
        [InitializeOnLoadMethod]
        private static void SetupCompilationCallbacks()
        {
            CompilationPipeline.compilationStarted += OnCompilationStarted;
            CompilationPipeline.compilationFinished += OnCompilationFinished;
            CompilationPipeline.assemblyCompilationFinished += OnAssemblyCompilationFinished;
        }
        
        private static void OnCompilationStarted(object obj)
        {
            Debug.Log("MCP: Compilation started");
        }
        
        private static void OnCompilationFinished(object obj)
        {
            Debug.Log("MCP: Compilation finished");
            
            // Auto-run diagnostics on compilation finish if there were errors
            if (EditorUtility.scriptCompilationFailed)
            {
                RunFullDiagnostics();
            }
        }
        
        private static void OnAssemblyCompilationFinished(string assemblyPath, CompilerMessage[] messages)
        {
            var errors = messages.Where(m => m.type == CompilerMessageType.Error).ToArray();
            if (errors.Length > 0)
            {
                Debug.LogError($"MCP: Assembly {Path.GetFileName(assemblyPath)} has {errors.Length} compilation errors");
                
                // Save compilation errors immediately
                var result = new CompilationResult
                {
                    hasErrors = true,
                    errors = errors.Select(e => new CompilationError
                    {
                        file = e.file,
                        line = e.line,
                        column = e.column,
                        message = e.message
                    }).ToList()
                };
                
                SaveCompilationResult(result);
            }
        }
        
        private static CompilationResult CheckCompilation()
        {
            var result = new CompilationResult
            {
                hasErrors = EditorUtility.scriptCompilationFailed
            };
            
            // Try to get compilation errors from CompilationPipeline
            var assemblies = CompilationPipeline.GetAssemblies();
            
            foreach (var assembly in assemblies)
            {
                // Check if there's a compilation log file for this assembly
                var logPath = Path.Combine("Temp", $"Assembly-{assembly.name}-Editor.log");
                if (File.Exists(logPath))
                {
                    var logContent = File.ReadAllText(logPath);
                    var errors = ParseCompilationLog(logContent);
                    result.errors.AddRange(errors);
                }
            }
            
            // Also check Unity's Temp folder for error files
            if (Directory.Exists("Temp"))
            {
                var errorFiles = Directory.GetFiles("Temp", "*.rsp.error");
                foreach (var errorFile in errorFiles)
                {
                    try
                    {
                        var content = File.ReadAllText(errorFile);
                        var errors = ParseCompilationLog(content);
                        result.errors.AddRange(errors);
                    }
                    catch { }
                }
            }
            
            // If no specific errors found but compilation failed, add generic message
            if (result.hasErrors && result.errors.Count == 0)
            {
                result.errors.Add(new CompilationError
                {
                    message = "Script compilation failed. Check Unity Console for details."
                });
            }
            
            return result;
        }
        
        private static List<CompilationError> ParseCompilationLog(string logContent)
        {
            var errors = new List<CompilationError>();
            var lines = logContent.Split(new char[] {'\\\\n'}, StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var line in lines)
            {
                // Parse C# compiler error format: file(line,column): error CS0000: message
                var match = System.Text.RegularExpressions.Regex.Match(line, "(.+)\\((\\d+),(\\d+)\\):\\s*(error|warning)\\s+(\\w+):\\s*(.+)");
                
                if (match.Success)
                {
                    errors.Add(new CompilationError
                    {
                        file = match.Groups[1].Value,
                        line = int.Parse(match.Groups[2].Value),
                        column = int.Parse(match.Groups[3].Value),
                        message = match.Groups[6].Value.Trim()
                    });
                }
            }
            
            return errors;
        }
        
        private static AssetValidationResult ValidateAssets()
        {
            var result = new AssetValidationResult();
            result.issues = new List<AssetIssue>();
            
            // Check for missing meta files
            var allAssets = AssetDatabase.GetAllAssetPaths()
                .Where(p => p.StartsWith("Assets/") && !p.EndsWith(".meta"))
                .ToArray();
                
            foreach (var assetPath in allAssets)
            {
                if (!File.Exists(assetPath + ".meta"))
                {
                    result.issues.Add(new AssetIssue
                    {
                        type = "MissingMeta",
                        path = assetPath,
                        description = "Missing .meta file"
                    });
                }
            }
            
            // Check for missing script references
            var allPrefabs = AssetDatabase.FindAssets("t:Prefab")
                .Select(guid => AssetDatabase.GUIDToAssetPath(guid))
                .ToArray();
                
            foreach (var prefabPath in allPrefabs)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
                if (prefab != null)
                {
                    var components = prefab.GetComponentsInChildren<Component>(true);
                    foreach (var component in components)
                    {
                        if (component == null)
                        {
                            result.issues.Add(new AssetIssue
                            {
                                type = "MissingScript",
                                path = prefabPath,
                                description = "Prefab has missing script reference"
                            });
                            break;
                        }
                    }
                }
            }
            
            return result;
        }
        
        private static List<MissingReference> FindMissingReferences()
        {
            var missingRefs = new List<MissingReference>();
            
            // Check all scenes in build settings
            foreach (var scene in EditorBuildSettings.scenes)
            {
                if (!scene.enabled) continue;
                
                // This would need to open each scene and check for missing references
                // Simplified for this example
                missingRefs.Add(new MissingReference
                {
                    scenePath = scene.path,
                    objectName = "Check scene for missing references"
                });
            }
            
            return missingRefs;
        }
        
        private static List<ConsoleLog> GetRecentConsoleLogs()
        {
            var logs = new List<ConsoleLog>();
            
            // Unity doesn't expose console logs directly via API
            // This is a placeholder - in production you'd need reflection or custom logging
            logs.Add(new ConsoleLog
            {
                timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                logType = "Info",
                message = "Console log capture not implemented in this version"
            });
            
            return logs;
        }
        
        private static void SaveResults(DiagnosticsResults results)
        {
            var json = JsonUtility.ToJson(results, true);
            var path = GetResultsPath();
            
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, json);
        }
        
        private static void SaveCompilationResult(CompilationResult result)
        {
            var json = JsonUtility.ToJson(result, true);
            var path = Path.Combine(DIAGNOSTICS_PATH, "compilation_errors.json");
            
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, json);
        }
        
        private static string GetResultsPath()
        {
            return Path.Combine(DIAGNOSTICS_PATH, RESULTS_FILE);
        }
        
        // Data structures for JSON serialization
        [Serializable]
        private class DiagnosticsResults
        {
            public CompilationResult compilation;
            public AssetValidationResult assetValidation;
            public List<MissingReference> missingReferences;
            public List<ConsoleLog> consoleLogs;
            public string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        }
        
        [Serializable]
        private class CompilationResult
        {
            public bool hasErrors;
            public List<CompilationError> errors = new List<CompilationError>();
        }
        
        [Serializable]
        private class CompilationError
        {
            public string file;
            public int line;
            public int column;
            public string message;
        }
        
        [Serializable]
        private class AssetValidationResult
        {
            public List<AssetIssue> issues;
        }
        
        [Serializable]
        private class AssetIssue
        {
            public string type;
            public string path;
            public string description;
        }
        
        [Serializable]
        private class MissingReference
        {
            public string scenePath;
            public string objectName;
        }
        
        [Serializable]
        private class ConsoleLog
        {
            public string timestamp;
            public string logType;
            public string message;
        }
    }
}
`;