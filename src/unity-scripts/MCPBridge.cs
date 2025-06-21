using UnityEngine;
using UnityEditor;
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using System.Text;
using System.IO.Pipes;
using System.Net.Sockets;

namespace Unity.MCP.Bridge
{
    /// <summary>
    /// Unity 6 MCP Bridge - Direct Unity API integration for external tools
    /// Enables real-time communication between MCP clients and Unity Editor
    /// </summary>
    [InitializeOnLoad]
    public static class MCPBridge
    {
        private static NamedPipeServerStream pipeServer;
        private static TcpListener tcpListener;
        private static bool isRunning = false;
        private static bool isShuttingDown = false;
        private static Dictionary<int, TaskCompletionSource<object>> pendingRequests = 
            new Dictionary<int, TaskCompletionSource<object>>();

        static MCPBridge()
        {
            EditorApplication.update += Initialize;
            EditorApplication.quitting += Shutdown;
            
            // Listen for asset changes to notify MCP clients
            EditorApplication.projectChanged += OnProjectChanged;
            CompilationPipeline.compilationStarted += OnCompilationStarted;
            CompilationPipeline.compilationFinished += OnCompilationFinished;
        }

        static void Initialize()
        {
            if (!isRunning && !isShuttingDown)
            {
                EditorApplication.update -= Initialize;
                StartBridgeServer();
            }
        }

        static async void StartBridgeServer()
        {
            try
            {
                isRunning = true;
                
                // Use TCP for cross-platform compatibility
                int port = 23456; // Fixed port for Unity MCP Bridge
                
                Debug.Log($"Unity 6 MCP Bridge starting on TCP port: {port}");
                
                tcpListener = new TcpListener(IPAddress.Loopback, port);
                tcpListener.Start();

                Debug.Log("MCP Bridge waiting for connections...");
                
                while (isRunning && !isShuttingDown)
                {
                    try
                    {
                        var tcpClient = await tcpListener.AcceptTcpClientAsync();
                        Debug.Log("MCP Bridge client connected");
                        
                        _ = Task.Run(() => HandleTcpClientAsync(tcpClient));
                        
                        // Wait for client to disconnect
                        while (tcpClient.Connected && isRunning)
                        {
                            await Task.Delay(100);
                        }
                        
                        Debug.Log("MCP Bridge client disconnected");
                        
                        if (tcpClient.Connected)
                        {
                            tcpClient.Close();
                        }
                    }
                    catch (Exception e)
                    {
                        Debug.LogError($"MCP Bridge connection error: {e.Message}");
                        await Task.Delay(1000);
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge startup error: {e.Message}");
            }
        }


        static async Task HandleTcpClientAsync(TcpClient tcpClient)
        {
            var buffer = new byte[4096];
            var messageBuffer = new StringBuilder();
            
            var stream = tcpClient.GetStream();
            
            try
            {
                while (tcpClient.Connected && isRunning && !isShuttingDown)
                {
                    int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead == 0) break;
                    
                    string data = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    messageBuffer.Append(data);
                    
                    // Process complete messages (newline delimited JSON)
                    string bufferContent = messageBuffer.ToString();
                    string[] lines = bufferContent.Split('\n');
                    
                    // Keep incomplete message in buffer
                    messageBuffer.Clear();
                    if (!bufferContent.EndsWith("\n"))
                    {
                        messageBuffer.Append(lines[lines.Length - 1]);
                        lines = lines.Take(lines.Length - 1).ToArray();
                    }
                    
                    foreach (string line in lines)
                    {
                        if (!string.IsNullOrWhiteSpace(line))
                        {
                            _ = Task.Run(() => ProcessRequestAsync(line, stream));
                        }
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge client handling error: {e.Message}");
            }
        }

        static async Task ProcessRequestAsync(string requestJson, NetworkStream stream)
        {
            try
            {
                var request = JsonConvert.DeserializeObject<MCPRequest>(requestJson);
                var response = await ProcessMCPRequest(request);
                
                string responseJson = JsonConvert.SerializeObject(response) + "\n";
                byte[] responseBytes = Encoding.UTF8.GetBytes(responseJson);
                
                await stream.WriteAsync(responseBytes, 0, responseBytes.Length);
                await stream.FlushAsync();
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge request processing error: {e.Message}");
                
                var errorResponse = new MCPResponse
                {
                    id = -1,
                    error = e.Message
                };
                
                try
                {
                    string errorJson = JsonConvert.SerializeObject(errorResponse) + "\n";
                    byte[] errorBytes = Encoding.UTF8.GetBytes(errorJson);
                    await stream.WriteAsync(errorBytes, 0, errorBytes.Length);
                }
                catch { }
            }
        }

        static async Task<MCPResponse> ProcessMCPRequest(MCPRequest request)
        {
            var response = new MCPResponse { id = request.id };
            
            try
            {
                switch (request.method)
                {
                    // Script operations
                    case "Unity.Script.Create":
                        response.result = await CreateScript(request.parameters);
                        break;
                        
                    case "Unity.Script.Read":
                        response.result = await ReadScript(request.parameters);
                        break;
                        
                    case "Unity.Script.Delete":
                        response.result = await DeleteScript(request.parameters);
                        break;
                        
                    case "Unity.Script.Rename":
                        response.result = await RenameScript(request.parameters);
                        break;
                        
                        
                    // Folder operations
                    case "Unity.Folder.Create":
                        response.result = await CreateFolder(request.parameters);
                        break;
                        
                    case "Unity.Folder.Delete":
                        response.result = await DeleteFolder(request.parameters);
                        break;
                        
                    case "Unity.Folder.Rename":
                        response.result = await RenameFolder(request.parameters);
                        break;
                        
                    case "Unity.Folder.List":
                        response.result = await ListFolder(request.parameters);
                        break;
                        
                    default:
                        throw new NotImplementedException($"Method not implemented: {request.method}");
                }
            }
            catch (Exception e)
            {
                response.error = e.Message;
                Debug.LogError($"MCP Bridge method error [{request.method}]: {e.Message}");
            }
            
            return response;
        }

        // Script Operations Implementation
        static async Task<object> CreateScript(dynamic parameters)
        {
            string fileName = parameters.fileName;
            string content = parameters.content;
            string folder = parameters.folder ?? "Assets/Scripts";
            string template = parameters.template ?? "MonoBehaviour";
            
            // Ensure folder exists
            if (!AssetDatabase.IsValidFolder(folder))
            {
                string[] folders = folder.Split('/');
                string currentPath = folders[0];
                
                for (int i = 1; i < folders.Length; i++)
                {
                    string newPath = currentPath + "/" + folders[i];
                    if (!AssetDatabase.IsValidFolder(newPath))
                    {
                        AssetDatabase.CreateFolder(currentPath, folders[i]);
                    }
                    currentPath = newPath;
                }
            }
            
            string fullPath = $"{folder}/{fileName}.cs";
            
            // Generate content if not provided
            if (string.IsNullOrEmpty(content))
            {
                content = GenerateScriptFromTemplate(fileName, template, parameters.namespaceName, parameters.usings);
            }
            
            // Create the script file
            File.WriteAllText(fullPath, content);
            AssetDatabase.ImportAsset(fullPath);
            
            var guid = AssetDatabase.AssetPathToGUID(fullPath);
            
            return new
            {
                path = fullPath,
                guid = guid,
                folder = folder,
                success = true
            };
        }

        static async Task<object> ReadScript(dynamic parameters)
        {
            string path = parameters.path;
            
            if (!File.Exists(path))
            {
                throw new FileNotFoundException($"Script not found: {path}");
            }
            
            string content = File.ReadAllText(path);
            
            return new
            {
                path = path,
                content = content,
                success = true
            };
        }

        static async Task<object> DeleteScript(dynamic parameters)
        {
            string path = parameters.path;
            
            if (!AssetDatabase.DeleteAsset(path))
            {
                throw new InvalidOperationException($"Failed to delete script: {path}");
            }
            
            return new
            {
                path = path,
                success = true,
                brokenReferences = 0 // TODO: Implement reference counting
            };
        }

        // Folder Operations Implementation
        static async Task<object> CreateFolder(dynamic parameters)
        {
            string path = parameters.path;
            bool recursive = parameters.recursive ?? true;
            
            var createdPaths = new List<string>();
            
            if (recursive)
            {
                string[] folders = path.Split('/');
                string currentPath = folders[0];
                
                for (int i = 1; i < folders.Length; i++)
                {
                    string newPath = currentPath + "/" + folders[i];
                    if (!AssetDatabase.IsValidFolder(newPath))
                    {
                        string guid = AssetDatabase.CreateFolder(currentPath, folders[i]);
                        createdPaths.Add(newPath);
                    }
                    currentPath = newPath;
                }
            }
            else
            {
                string parentPath = Path.GetDirectoryName(path).Replace('\\', '/');
                string folderName = Path.GetFileName(path);
                
                if (!AssetDatabase.IsValidFolder(parentPath))
                {
                    throw new DirectoryNotFoundException($"Parent folder not found: {parentPath}");
                }
                
                string guid = AssetDatabase.CreateFolder(parentPath, folderName);
                createdPaths.Add(path);
            }
            
            var guid = AssetDatabase.AssetPathToGUID(path);
            
            return new
            {
                path = path,
                guid = guid,
                createdPaths = createdPaths,
                success = true
            };
        }

        static async Task<object> DeleteFolder(dynamic parameters)
        {
            string path = parameters.path;
            
            if (!AssetDatabase.DeleteAsset(path))
            {
                throw new InvalidOperationException($"Failed to delete folder: {path}");
            }
            
            return new
            {
                path = path,
                success = true,
                deletedAssets = 0, // TODO: Count deleted assets
                brokenReferences = 0 // TODO: Implement reference counting
            };
        }

        // Utility Methods
        static string GenerateScriptFromTemplate(string className, string template, string namespaceName = null, string[] usings = null)
        {
            var defaultUsings = new[] { "UnityEngine" };
            var usingStatements = usings ?? defaultUsings;
            
            var content = new StringBuilder();
            
            // Add using statements
            foreach (var usingStatement in usingStatements)
            {
                content.AppendLine($"using {usingStatement};");
            }
            content.AppendLine();
            
            // Add namespace if specified
            if (!string.IsNullOrEmpty(namespaceName))
            {
                content.AppendLine($"namespace {namespaceName}");
                content.AppendLine("{");
            }
            
            // Generate class based on template
            switch (template)
            {
                case "MonoBehaviour":
                    content.AppendLine($"    public class {className} : MonoBehaviour");
                    content.AppendLine("    {");
                    content.AppendLine("        void Start()");
                    content.AppendLine("        {");
                    content.AppendLine("            ");
                    content.AppendLine("        }");
                    content.AppendLine("        ");
                    content.AppendLine("        void Update()");
                    content.AppendLine("        {");
                    content.AppendLine("            ");
                    content.AppendLine("        }");
                    content.AppendLine("    }");
                    break;
                    
                case "ScriptableObject":
                    content.AppendLine($"    [CreateAssetMenu(fileName = \"New {className}\", menuName = \"{className}\")]");
                    content.AppendLine($"    public class {className} : ScriptableObject");
                    content.AppendLine("    {");
                    content.AppendLine("        ");
                    content.AppendLine("    }");
                    break;
                    
                default:
                    content.AppendLine($"    public class {className}");
                    content.AppendLine("    {");
                    content.AppendLine("        ");
                    content.AppendLine("    }");
                    break;
            }
            
            // Close namespace if specified
            if (!string.IsNullOrEmpty(namespaceName))
            {
                content.AppendLine("}");
            }
            
            return content.ToString();
        }

        // Event Handlers
        static void OnProjectChanged()
        {
            SendEvent("project.changed", new { timestamp = DateTime.Now });
        }

        static void OnCompilationStarted(object context)
        {
            SendEvent("compilation.started", new { context });
        }

        static void OnCompilationFinished(object context)
        {
            SendEvent("compilation.finished", new { 
                context,
                hasErrors = EditorUtility.scriptCompilationFailed
            });
        }

        static void SendEvent(string eventName, object data)
        {
            try
            {
                var eventMessage = new
                {
                    type = "event",
                    @event = eventName,
                    data = data
                };
                
                // TODO: Send to connected clients
                Debug.Log($"MCP Event: {eventName}");
            }
            catch (Exception e)
            {
                Debug.LogError($"Failed to send MCP event: {e.Message}");
            }
        }

        static void Shutdown()
        {
            isShuttingDown = true;
            isRunning = false;
            
            try
            {
                tcpListener?.Stop();
                pipeServer?.Close();
                pipeServer?.Dispose();
                Debug.Log("MCP Bridge shutdown complete");
            }
            catch (Exception e)
            {
                Debug.LogError($"MCP Bridge shutdown error: {e.Message}");
            }
        }

        // TODO: Implement remaining methods
        static async Task<object> RenameScript(dynamic parameters) => throw new NotImplementedException();
        static async Task<object> RenameFolder(dynamic parameters) => throw new NotImplementedException();
        static async Task<object> ListFolder(dynamic parameters) => throw new NotImplementedException();
    }

    // Data Transfer Objects
    [Serializable]
    public class MCPRequest
    {
        public int id;
        public string method;
        public dynamic parameters;
    }

    [Serializable]
    public class MCPResponse
    {
        public int id;
        public object result;
        public string error;
    }
}