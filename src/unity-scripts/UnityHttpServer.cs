using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using UnityEngine;
using UnityEditor;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace UnityMCP
{
    [InitializeOnLoad]
    public static class UnityMCPInstaller
    {
        static UnityMCPInstaller()
        {
            CheckAndUpdateScripts();
        }
        
        static void CheckAndUpdateScripts()
        {
            var installedVersion = EditorPrefs.GetString(UnityHttpServer.VERSION_META_KEY, "0.0.0");
            if (installedVersion != UnityHttpServer.SCRIPT_VERSION)
            {
                Debug.Log($"[UnityMCP] Updating Unity MCP scripts from version {installedVersion} to {UnityHttpServer.SCRIPT_VERSION}");
                // Version update logic will be handled by the MCP server
                EditorPrefs.SetString(UnityHttpServer.VERSION_META_KEY, UnityHttpServer.SCRIPT_VERSION);
            }
        }
    }
    /// <summary>
    /// Simple HTTP server for Unity MCP integration
    /// </summary>
    public static class UnityHttpServer
    {
        // Version information for auto-update
        public const string SCRIPT_VERSION = "1.1.0";
        public const string VERSION_META_KEY = "UnityMCP.InstalledVersion";
        
        // Configuration constants
        private const int DEFAULT_PORT = 23457;
        private const int REQUEST_TIMEOUT_MS = 120000; // 2 minutes
        private const int THREAD_JOIN_TIMEOUT_MS = 1000; // 1 second
        public const string SERVER_LOG_PREFIX = "[UnityMCP]";
        private const string PREFS_PORT_KEY = "UnityMCP.ServerPort";
        private const string PREFS_PORT_BEFORE_PLAY_KEY = "UnityMCP.ServerPortBeforePlay";
        
        // File path constants
        private const string ASSETS_PREFIX = "Assets/";
        private const int ASSETS_PREFIX_LENGTH = 7;
        private const string DEFAULT_SCRIPTS_FOLDER = "Assets/Scripts";
        private const string DEFAULT_SHADERS_FOLDER = "Assets/Shaders";
        private const string CS_EXTENSION = ".cs";
        private const string SHADER_EXTENSION = ".shader";
        
        private static HttpListener httpListener;
        private static Thread listenerThread;
        private static bool isRunning = false;
        private static int currentPort = DEFAULT_PORT;
        
        /// <summary>
        /// Gets whether the server is currently running
        /// </summary>
        public static bool IsRunning => isRunning;
        
        /// <summary>
        /// Gets the current port the server is running on
        /// </summary>
        public static int CurrentPort => currentPort;
        
        [InitializeOnLoad]
        static class AutoShutdown
        {
            static AutoShutdown()
            {
                EditorApplication.playModeStateChanged += OnPlayModeChanged;
                EditorApplication.quitting += Shutdown;
                
                // Handle script recompilation
                UnityEditor.Compilation.CompilationPipeline.compilationStarted += OnCompilationStarted;
                UnityEditor.Compilation.CompilationPipeline.compilationFinished += OnCompilationFinished;
                
                // Auto-start server on Unity startup
                EditorApplication.delayCall += () => {
                    if (!isRunning)
                    {
                        var savedPort = EditorPrefs.GetInt(PREFS_PORT_KEY, DEFAULT_PORT);
                        Debug.Log($"{SERVER_LOG_PREFIX} Auto-starting server on port {savedPort}");
                        Start(savedPort);
                    }
                };
            }
            
            static void OnCompilationStarted(object obj)
            {
                Debug.Log($"{SERVER_LOG_PREFIX} Compilation started - stopping server");
                if (isRunning)
                {
                    Shutdown();
                }
            }
            
            static void OnCompilationFinished(object obj)
            {
                Debug.Log($"{SERVER_LOG_PREFIX} Compilation finished - auto-restarting server");
                // Always auto-restart after compilation
                var savedPort = EditorPrefs.GetInt(PREFS_PORT_KEY, DEFAULT_PORT);
                EditorApplication.delayCall += () => Start(savedPort);
            }
        }
        
        /// <summary>
        /// Start the HTTP server on the specified port
        /// </summary>
        /// <param name="port">Port to listen on</param>
        public static void Start(int port = DEFAULT_PORT)
        {
            if (isRunning) 
            {
                Debug.LogWarning($"{SERVER_LOG_PREFIX} Server is already running. Stop it first.");
                return;
            }
            
            currentPort = port;
            
            try
            {
                httpListener = new HttpListener();
                httpListener.Prefixes.Add($"http://localhost:{currentPort}/");
                httpListener.Start();
                isRunning = true;
                
                listenerThread = new Thread(ListenLoop) 
                { 
                    IsBackground = true,
                    Name = "UnityMCPHttpListener"
                };
                listenerThread.Start();
                
                Debug.Log($"{SERVER_LOG_PREFIX} HTTP Server started on port {currentPort}");
            }
            catch (Exception e)
            {
                isRunning = false;
                Debug.LogError($"{SERVER_LOG_PREFIX} Failed to start HTTP server: {e.Message}");
                throw;
            }
        }
        
        /// <summary>
        /// Stop the HTTP server
        /// </summary>
        public static void Shutdown()
        {
            if (!isRunning)
            {
                Debug.LogWarning($"{SERVER_LOG_PREFIX} Server is not running.");
                return;
            }
            
            isRunning = false;
            
            try
            {
                httpListener?.Stop();
                httpListener?.Close();
                listenerThread?.Join(THREAD_JOIN_TIMEOUT_MS);
                Debug.Log($"{SERVER_LOG_PREFIX} HTTP Server stopped");
            }
            catch (Exception e)
            {
                Debug.LogError($"{SERVER_LOG_PREFIX} Error during shutdown: {e.Message}");
            }
            finally
            {
                httpListener = null;
                listenerThread = null;
            }
        }
        
        static void OnPlayModeChanged(PlayModeStateChange state)
        {
            // Stop server when entering play mode to avoid conflicts
            if (state == PlayModeStateChange.ExitingEditMode)
            {
                if (isRunning)
                {
                    Debug.Log($"{SERVER_LOG_PREFIX} Stopping server due to play mode change");
                    EditorPrefs.SetInt(PREFS_PORT_BEFORE_PLAY_KEY, currentPort);
                    Shutdown();
                }
            }
            // Restart server when returning to edit mode
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                var savedPort = EditorPrefs.GetInt(PREFS_PORT_BEFORE_PLAY_KEY, DEFAULT_PORT);
                Debug.Log($"{SERVER_LOG_PREFIX} Restarting server after play mode on port {savedPort}");
                EditorApplication.delayCall += () => Start(savedPort);
            }
        }
        
        static void ListenLoop()
        {
            while (isRunning)
            {
                try
                {
                    var context = httpListener.GetContext();
                    ThreadPool.QueueUserWorkItem(_ => HandleRequest(context));
                }
                catch (Exception e)
                {
                    if (isRunning)
                        Debug.LogError($"{SERVER_LOG_PREFIX} Listen error: {e.Message}");
                }
            }
        }
        
        static void HandleRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            
            try
            {
                if (request.HttpMethod != "POST")
                {
                    SendResponse(response, 405, false, null, "Method not allowed");
                    return;
                }
                
                string requestBody;
                // Force UTF-8 encoding for request body
                using (var reader = new StreamReader(request.InputStream, Encoding.UTF8))
                {
                    requestBody = reader.ReadToEnd();
                }
                
                var requestData = JObject.Parse(requestBody);
                var method = requestData["method"]?.ToString();
                
                if (string.IsNullOrEmpty(method))
                {
                    SendResponse(response, 400, false, null, "Method is required");
                    return;
                }
                
                Debug.Log($"{SERVER_LOG_PREFIX} Processing request: {method}");
                
                // Check if this request requires main thread
                bool requiresMainThread = RequiresMainThread(method);
                
                if (!requiresMainThread)
                {
                    // Process directly on worker thread
                    try
                    {
                        var result = ProcessRequestOnWorkerThread(method, requestData);
                        SendResponse(response, 200, true, result, null);
                    }
                    catch (Exception e)
                    {
                        var statusCode = e is ArgumentException ? 400 : 500;
                        SendResponse(response, statusCode, false, null, e.Message);
                    }
                }
                else
                {
                    // Execute on main thread for Unity API calls
                    object result = null;
                    Exception error = null;
                    var resetEvent = new ManualResetEvent(false);
                    
                    EditorApplication.delayCall += () =>
                    {
                        try
                        {
                            Debug.Log($"{SERVER_LOG_PREFIX} Processing on main thread: {method}");
                            result = ProcessRequest(method, requestData);
                            Debug.Log($"{SERVER_LOG_PREFIX} Completed processing: {method}");
                        }
                        catch (Exception e)
                        {
                            error = e;
                            Debug.LogError($"{SERVER_LOG_PREFIX} Error processing {method}: {e.Message}");
                        }
                        finally
                        {
                            resetEvent.Set();
                        }
                    };
                    
                    if (!resetEvent.WaitOne(REQUEST_TIMEOUT_MS))
                    {
                        SendResponse(response, 504, false, null, "Request timeout - Unity may be busy or unfocused");
                        return;
                    }
                    
                    if (error != null)
                    {
                        var statusCode = error is ArgumentException ? 400 : 500;
                        SendResponse(response, statusCode, false, null, error.Message);
                        return;
                    }
                    
                    SendResponse(response, 200, true, result, null);
                }
            }
            catch (Exception e)
            {
                SendResponse(response, 400, false, null, $"Bad request: {e.Message}");
            }
        }
        
        static bool RequiresMainThread(string method)
        {
            // These methods can run on worker thread
            switch (method)
            {
                case "ping":
                case "project/info":
                case "script/read":
                case "shader/read":
                    return false;
                    
                // Creating, deleting files require Unity API (AssetDatabase)
                default:
                    return true;
            }
        }
        
        static object ProcessRequestOnWorkerThread(string method, JObject request)
        {
            switch (method)
            {
                case "ping":
                    return new { status = "ok", time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") };
                    
                case "project/info":
                    // Basic project info that doesn't require Unity API
                    var dataPath = Application.dataPath;
                    var projectPath = dataPath.Substring(0, dataPath.Length - ASSETS_PREFIX_LENGTH); // Remove "/Assets"
                    return new
                    {
                        projectPath = projectPath,
                        projectName = Path.GetFileName(projectPath),
                        unityVersion = Application.unityVersion,
                        platform = "Editor",
                        isPlaying = false
                    };
                    
                case "script/read":
                    return ReadScriptOnWorkerThread(request);
                    
                case "shader/read":
                    return ReadShaderOnWorkerThread(request);
                    
                // Folder operations (can run on worker thread)
                case "folder/create":
                    return CreateFolderOnWorkerThread(request);
                case "folder/rename":
                    return RenameFolderOnWorkerThread(request);
                case "folder/move":
                    return MoveFolderOnWorkerThread(request);
                case "folder/delete":
                    return DeleteFolderOnWorkerThread(request);
                case "folder/list":
                    return ListFolderOnWorkerThread(request);
                    
                default:
                    throw new NotImplementedException($"Method not implemented for worker thread: {method}");
            }
        }
        
        static object ReadScriptOnWorkerThread(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");
            
            return new
            {
                path = path,
                content = File.ReadAllText(fullPath, new UTF8Encoding(true)),
                guid = "" // GUID requires AssetDatabase, skip in worker thread
            };
        }
        
        static object ReadShaderOnWorkerThread(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");
            
            return new
            {
                path = path,
                content = File.ReadAllText(fullPath, new UTF8Encoding(true)),
                guid = "" // GUID requires AssetDatabase, skip in worker thread
            };
        }
        
        static object ProcessRequest(string method, JObject request)
        {
            switch (method)
            {
                case "ping":
                    return new { status = "ok", time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") };
                
                // Script operations
                case "script/create":
                    return CreateScript(request);
                case "script/read":
                    return ReadScript(request);
                case "script/delete":
                    return DeleteScript(request);
                case "script/applyDiff":
                    return ApplyDiff(request);
                
                // Shader operations
                case "shader/create":
                    return CreateShader(request);
                case "shader/read":
                    return ReadShader(request);
                case "shader/delete":
                    return DeleteShader(request);
                
                // Project operations
                case "project/info":
                    return GetProjectInfo();
                
                // Folder operations
                case "folder/create":
                    return CreateFolder(request);
                case "folder/rename":
                    return RenameFolder(request);
                case "folder/move":
                    return MoveFolder(request);
                case "folder/delete":
                    return DeleteFolder(request);
                case "folder/list":
                    return ListFolder(request);
                
                default:
                    throw new NotImplementedException($"Method not found: {method}");
            }
        }
        
        static object CreateScript(JObject request)
        {
            var fileName = request["fileName"]?.ToString();
            if (string.IsNullOrEmpty(fileName))
                throw new ArgumentException("fileName is required");
            
            if (!fileName.EndsWith(CS_EXTENSION))
                fileName += CS_EXTENSION;
            
            var content = request["content"]?.ToString();
            var folder = request["folder"]?.ToString() ?? DEFAULT_SCRIPTS_FOLDER;
            
            var path = Path.Combine(folder, fileName);
            var directory = Path.GetDirectoryName(path);
            
            // Create directory if needed
            if (!AssetDatabase.IsValidFolder(directory))
            {
                CreateFolderRecursive(directory);
            }
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            // Unity standard: UTF-8 with BOM
            var utf8WithBom = new UTF8Encoding(true);
            File.WriteAllText(fullPath, content ?? GetDefaultScriptContent(fileName), utf8WithBom);
            
            AssetDatabase.Refresh();
            
            return new
            {
                path = path,
                guid = AssetDatabase.AssetPathToGUID(path)
            };
        }
        
        static object ReadScript(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");
            
            return new
            {
                path = path,
                content = File.ReadAllText(fullPath, new UTF8Encoding(true)),
                guid = AssetDatabase.AssetPathToGUID(path)
            };
        }
        
        static object DeleteScript(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            if (!AssetDatabase.DeleteAsset(path))
                throw new InvalidOperationException($"Failed to delete: {path}");
            
            return new { message = "Script deleted successfully" };
        }
        
        static object ApplyDiff(JObject request)
        {
            var path = request["path"]?.ToString();
            var diff = request["diff"]?.ToString();
            var options = request["options"] as JObject;
            
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            if (string.IsNullOrEmpty(diff))
                throw new ArgumentException("diff is required");
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");
            
            var dryRun = options?["dryRun"]?.Value<bool>() ?? false;
            
            // Read current content using UTF-8 with BOM (Unity standard)
            var utf8WithBom = new UTF8Encoding(true);
            var originalContent = File.ReadAllText(fullPath, utf8WithBom);
            var lines = originalContent.Split('\n').ToList();
            
            // Parse and apply unified diff
            var diffLines = diff.Split('\n');
            var linesAdded = 0;
            var linesRemoved = 0;
            var currentLine = 0;
            
            for (int i = 0; i < diffLines.Length; i++)
            {
                var line = diffLines[i];
                if (line.StartsWith("@@"))
                {
                    // Parse hunk header: @@ -l,s +l,s @@
                    var match = System.Text.RegularExpressions.Regex.Match(line, @"@@ -(\d+),?\d* \+(\d+),?\d* @@");
                    if (match.Success)
                    {
                        currentLine = int.Parse(match.Groups[1].Value) - 1;
                    }
                }
                else if (line.StartsWith("-") && !line.StartsWith("---"))
                {
                    // Remove line
                    if (currentLine < lines.Count)
                    {
                        lines.RemoveAt(currentLine);
                        linesRemoved++;
                    }
                }
                else if (line.StartsWith("+") && !line.StartsWith("+++"))
                {
                    // Add line
                    lines.Insert(currentLine, line.Substring(1));
                    currentLine++;
                    linesAdded++;
                }
                else if (line.StartsWith(" "))
                {
                    // Context line
                    currentLine++;
                }
            }
            
            // Write result if not dry run
            if (!dryRun)
            {
                var updatedContent = string.Join("\n", lines);
                // Write with UTF-8 with BOM (Unity standard)
                File.WriteAllText(fullPath, updatedContent, utf8WithBom);
                AssetDatabase.Refresh();
            }
            
            return new
            {
                path = path,
                linesAdded = linesAdded,
                linesRemoved = linesRemoved,
                dryRun = dryRun,
                guid = AssetDatabase.AssetPathToGUID(path)
            };
        }
        
        static object CreateShader(JObject request)
        {
            var name = request["name"]?.ToString();
            if (string.IsNullOrEmpty(name))
                throw new ArgumentException("name is required");
            
            if (!name.EndsWith(SHADER_EXTENSION))
                name += SHADER_EXTENSION;
            
            var content = request["content"]?.ToString();
            var folder = request["folder"]?.ToString() ?? DEFAULT_SHADERS_FOLDER;
            
            var path = Path.Combine(folder, name);
            var directory = Path.GetDirectoryName(path);
            
            if (!AssetDatabase.IsValidFolder(directory))
            {
                CreateFolderRecursive(directory);
            }
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            // Unity standard: UTF-8 with BOM
            var utf8WithBom = new UTF8Encoding(true);
            File.WriteAllText(fullPath, content ?? GetDefaultShaderContent(name), utf8WithBom);
            
            AssetDatabase.Refresh();
            
            return new
            {
                path = path,
                guid = AssetDatabase.AssetPathToGUID(path)
            };
        }
        
        static object ReadShader(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");
            
            return new
            {
                path = path,
                content = File.ReadAllText(fullPath, new UTF8Encoding(true)),
                guid = AssetDatabase.AssetPathToGUID(path)
            };
        }
        
        static object DeleteShader(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            if (!AssetDatabase.DeleteAsset(path))
                throw new InvalidOperationException($"Failed to delete: {path}");
            
            return new { message = "Shader deleted successfully" };
        }
        
        static object GetProjectInfo()
        {
            return new
            {
                projectPath = Application.dataPath.Replace("/Assets", ""),
                projectName = Application.productName,
                unityVersion = Application.unityVersion,
                platform = Application.platform.ToString(),
                isPlaying = Application.isPlaying
            };
        }
        
        static void CreateFolderRecursive(string path)
        {
            var folders = path.Split('/');
            var currentPath = folders[0];
            
            for (int i = 1; i < folders.Length; i++)
            {
                var newPath = currentPath + "/" + folders[i];
                if (!AssetDatabase.IsValidFolder(newPath))
                {
                    AssetDatabase.CreateFolder(currentPath, folders[i]);
                }
                currentPath = newPath;
            }
        }
        
        static string GetDefaultScriptContent(string fileName)
        {
            var className = Path.GetFileNameWithoutExtension(fileName);
            return "using UnityEngine;\n\n" +
                   $"public class {className} : MonoBehaviour\n" +
                   "{\n" +
                   "    void Start()\n" +
                   "    {\n" +
                   "        \n" +
                   "    }\n" +
                   "    \n" +
                   "    void Update()\n" +
                   "    {\n" +
                   "        \n" +
                   "    }\n" +
                   "}";
        }
        
        static string GetDefaultShaderContent(string fileName)
        {
            var shaderName = Path.GetFileNameWithoutExtension(fileName);
            return $"Shader \"Custom/{shaderName}\"\n" +
                   "{\n" +
                   "    Properties\n" +
                   "    {\n" +
                   "        _MainTex (\"Texture\", 2D) = \"white\" {}\n" +
                   "    }\n" +
                   "    SubShader\n" +
                   "    {\n" +
                   "        Tags { \"RenderType\"=\"Opaque\" }\n" +
                   "        LOD 200\n" +
                   "\n" +
                   "        CGPROGRAM\n" +
                   "        #pragma surface surf Standard fullforwardshadows\n" +
                   "\n" +
                   "        sampler2D _MainTex;\n" +
                   "\n" +
                   "        struct Input\n" +
                   "        {\n" +
                   "            float2 uv_MainTex;\n" +
                   "        };\n" +
                   "\n" +
                   "        void surf (Input IN, inout SurfaceOutputStandard o)\n" +
                   "        {\n" +
                   "            fixed4 c = tex2D (_MainTex, IN.uv_MainTex);\n" +
                   "            o.Albedo = c.rgb;\n" +
                   "            o.Alpha = c.a;\n" +
                   "        }\n" +
                   "        ENDCG\n" +
                   "    }\n" +
                   "    FallBack \"Diffuse\"\n" +
                   "}";
        }
        
        // Folder operations
        static object CreateFolder(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            if (!path.StartsWith(ASSETS_PREFIX))
                path = Path.Combine(DEFAULT_SCRIPTS_FOLDER, path);
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            Directory.CreateDirectory(fullPath);
            
            AssetDatabase.Refresh();
            
            return new
            {
                path = path,
                guid = AssetDatabase.AssetPathToGUID(path)
            };
        }
        
        static object CreateFolderOnWorkerThread(JObject request)
        {
            var path = request["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            if (!path.StartsWith(ASSETS_PREFIX))
                path = Path.Combine(DEFAULT_SCRIPTS_FOLDER, path);
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            Directory.CreateDirectory(fullPath);
            
            return new
            {
                path = path,
                guid = "" // GUID requires AssetDatabase
            };
        }
        
        static object RenameFolder(JObject request)
        {
            var oldPath = request["oldPath"]?.ToString();
            var newName = request["newName"]?.ToString();
            
            if (string.IsNullOrEmpty(oldPath))
                throw new ArgumentException("oldPath is required");
            if (string.IsNullOrEmpty(newName))
                throw new ArgumentException("newName is required");
            
            var error = AssetDatabase.RenameAsset(oldPath, newName);
            if (!string.IsNullOrEmpty(error))
                throw new InvalidOperationException(error);
            
            var newPath = Path.Combine(Path.GetDirectoryName(oldPath), newName);
            return new
            {
                oldPath = oldPath,
                newPath = newPath,
                guid = AssetDatabase.AssetPathToGUID(newPath)
            };
        }
        
        static object RenameFolderOnWorkerThread(JObject request)
        {
            var oldPath = request["oldPath"]?.ToString();
            var newName = request["newName"]?.ToString();
            
            if (string.IsNullOrEmpty(oldPath))
                throw new ArgumentException("oldPath is required");
            if (string.IsNullOrEmpty(newName))
                throw new ArgumentException("newName is required");
            
            var oldFullPath = Path.Combine(Application.dataPath, oldPath.Substring(ASSETS_PREFIX_LENGTH));
            var parentDir = Path.GetDirectoryName(oldFullPath);
            var newFullPath = Path.Combine(parentDir, newName);
            
            if (!Directory.Exists(oldFullPath))
                throw new DirectoryNotFoundException($"Directory not found: {oldPath}");
            
            Directory.Move(oldFullPath, newFullPath);
            
            var newPath = Path.Combine(Path.GetDirectoryName(oldPath), newName);
            return new
            {
                oldPath = oldPath,
                newPath = newPath,
                guid = "" // GUID requires AssetDatabase
            };
        }
        
        static object MoveFolder(JObject request)
        {
            var sourcePath = request["sourcePath"]?.ToString();
            var targetPath = request["targetPath"]?.ToString();
            
            if (string.IsNullOrEmpty(sourcePath))
                throw new ArgumentException("sourcePath is required");
            if (string.IsNullOrEmpty(targetPath))
                throw new ArgumentException("targetPath is required");
            
            var error = AssetDatabase.MoveAsset(sourcePath, targetPath);
            if (!string.IsNullOrEmpty(error))
                throw new InvalidOperationException(error);
            
            return new
            {
                sourcePath = sourcePath,
                targetPath = targetPath,
                guid = AssetDatabase.AssetPathToGUID(targetPath)
            };
        }
        
        static object MoveFolderOnWorkerThread(JObject request)
        {
            var sourcePath = request["sourcePath"]?.ToString();
            var targetPath = request["targetPath"]?.ToString();
            
            if (string.IsNullOrEmpty(sourcePath))
                throw new ArgumentException("sourcePath is required");
            if (string.IsNullOrEmpty(targetPath))
                throw new ArgumentException("targetPath is required");
            
            var sourceFullPath = Path.Combine(Application.dataPath, sourcePath.Substring(ASSETS_PREFIX_LENGTH));
            var targetFullPath = Path.Combine(Application.dataPath, targetPath.Substring(ASSETS_PREFIX_LENGTH));
            
            if (!Directory.Exists(sourceFullPath))
                throw new DirectoryNotFoundException($"Directory not found: {sourcePath}");
            
            // Ensure target parent directory exists
            var targetParent = Path.GetDirectoryName(targetFullPath);
            if (!Directory.Exists(targetParent))
                Directory.CreateDirectory(targetParent);
            
            Directory.Move(sourceFullPath, targetFullPath);
            
            return new
            {
                sourcePath = sourcePath,
                targetPath = targetPath,
                guid = "" // GUID requires AssetDatabase
            };
        }
        
        static object DeleteFolder(JObject request)
        {
            var path = request["path"]?.ToString();
            var recursive = request["recursive"]?.Value<bool>() ?? true;
            
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            if (!Directory.Exists(fullPath))
                throw new DirectoryNotFoundException($"Directory not found: {path}");
            
            if (!AssetDatabase.DeleteAsset(path))
                throw new InvalidOperationException($"Failed to delete folder: {path}");
            
            return new { path = path };
        }
        
        static object DeleteFolderOnWorkerThread(JObject request)
        {
            var path = request["path"]?.ToString();
            var recursive = request["recursive"]?.Value<bool>() ?? true;
            
            if (string.IsNullOrEmpty(path))
                throw new ArgumentException("path is required");
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(ASSETS_PREFIX_LENGTH));
            if (!Directory.Exists(fullPath))
                throw new DirectoryNotFoundException($"Directory not found: {path}");
            
            Directory.Delete(fullPath, recursive);
            
            // Also delete .meta file
            var metaPath = fullPath + ".meta";
            if (File.Exists(metaPath))
                File.Delete(metaPath);
            
            return new { path = path };
        }
        
        static object ListFolder(JObject request)
        {
            var path = request["path"]?.ToString() ?? ASSETS_PREFIX;
            var recursive = request["recursive"]?.Value<bool>() ?? false;
            
            var fullPath = Path.Combine(Application.dataPath, path.StartsWith(ASSETS_PREFIX) ? path.Substring(ASSETS_PREFIX_LENGTH) : path);
            if (!Directory.Exists(fullPath))
                throw new DirectoryNotFoundException($"Directory not found: {path}");
            
            var entries = new List<object>();
            
            // Get directories
            var dirs = Directory.GetDirectories(fullPath, "*", recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly);
            foreach (var dir in dirs)
            {
                var relativePath = ASSETS_PREFIX + GetRelativePath(Application.dataPath, dir);
                entries.Add(new
                {
                    path = relativePath,
                    name = Path.GetFileName(dir),
                    type = "folder",
                    guid = AssetDatabase.AssetPathToGUID(relativePath)
                });
            }
            
            // Get files
            var files = Directory.GetFiles(fullPath, "*", recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly)
                                 .Where(f => !f.EndsWith(".meta"));
            foreach (var file in files)
            {
                var relativePath = ASSETS_PREFIX + GetRelativePath(Application.dataPath, file);
                entries.Add(new
                {
                    path = relativePath,
                    name = Path.GetFileName(file),
                    type = "file",
                    extension = Path.GetExtension(file),
                    guid = AssetDatabase.AssetPathToGUID(relativePath)
                });
            }
            
            return new
            {
                path = path,
                entries = entries
            };
        }
        
        static object ListFolderOnWorkerThread(JObject request)
        {
            var path = request["path"]?.ToString() ?? ASSETS_PREFIX;
            var recursive = request["recursive"]?.Value<bool>() ?? false;
            
            var fullPath = Path.Combine(Application.dataPath, path.StartsWith(ASSETS_PREFIX) ? path.Substring(ASSETS_PREFIX_LENGTH) : path);
            if (!Directory.Exists(fullPath))
                throw new DirectoryNotFoundException($"Directory not found: {path}");
            
            var entries = new List<object>();
            
            // Get directories
            var dirs = Directory.GetDirectories(fullPath, "*", recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly);
            foreach (var dir in dirs)
            {
                var relativePath = ASSETS_PREFIX + GetRelativePath(Application.dataPath, dir);
                entries.Add(new
                {
                    path = relativePath,
                    name = Path.GetFileName(dir),
                    type = "folder",
                    guid = "" // GUID requires AssetDatabase
                });
            }
            
            // Get files
            var files = Directory.GetFiles(fullPath, "*", recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly)
                                 .Where(f => !f.EndsWith(".meta"));
            foreach (var file in files)
            {
                var relativePath = ASSETS_PREFIX + GetRelativePath(Application.dataPath, file);
                entries.Add(new
                {
                    path = relativePath,
                    name = Path.GetFileName(file),
                    type = "file",
                    extension = Path.GetExtension(file),
                    guid = "" // GUID requires AssetDatabase
                });
            }
            
            return new
            {
                path = path,
                entries = entries
            };
        }
        
        static string GetRelativePath(string basePath, string fullPath)
        {
            if (!fullPath.StartsWith(basePath))
                return fullPath;
            
            var relativePath = fullPath.Substring(basePath.Length);
            if (relativePath.StartsWith(Path.DirectorySeparatorChar.ToString()))
                relativePath = relativePath.Substring(1);
            
            return relativePath.Replace(Path.DirectorySeparatorChar, '/');
        }
        
        static void SendResponse(HttpListenerResponse response, int statusCode, bool success, object result, string error)
        {
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentEncoding = Encoding.UTF8;
            
            var responseData = new Dictionary<string, object>
            {
                ["success"] = success
            };
            
            if (result != null)
                responseData["result"] = result;
            
            if (!string.IsNullOrEmpty(error))
                responseData["error"] = error;
            
            var json = JsonConvert.SerializeObject(responseData);
            var buffer = Encoding.UTF8.GetBytes(json);
            
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.Close();
        }
    }
}