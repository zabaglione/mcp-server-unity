using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using UnityEngine;
using UnityEditor;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace UnityMCP
{
    /// <summary>
    /// Simple HTTP server for Unity MCP integration
    /// </summary>
    [InitializeOnLoad]
    public static class UnityHttpServer
    {
        private const int PORT = 23457;
        private static HttpListener httpListener;
        private static Thread listenerThread;
        private static bool isRunning = false;
        
        static UnityHttpServer()
        {
            EditorApplication.playModeStateChanged += OnPlayModeChanged;
            EditorApplication.quitting += Shutdown;
            EditorApplication.delayCall += Start;
        }
        
        public static void Start()
        {
            if (isRunning) return;
            
            try
            {
                httpListener = new HttpListener();
                httpListener.Prefixes.Add($"http://localhost:{PORT}/");
                httpListener.Start();
                isRunning = true;
                
                listenerThread = new Thread(ListenLoop) 
                { 
                    IsBackground = true,
                    Name = "UnityMCPHttpListener"
                };
                listenerThread.Start();
                
                Debug.Log($"[UnityMCP] HTTP Server started on port {PORT}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[UnityMCP] Failed to start HTTP server: {e.Message}");
            }
        }
        
        public static void Shutdown()
        {
            isRunning = false;
            httpListener?.Stop();
            listenerThread?.Join(1000);
            Debug.Log("[UnityMCP] HTTP Server stopped");
        }
        
        static void OnPlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.ExitingEditMode)
            {
                Shutdown();
            }
            else if (state == PlayModeStateChange.EnteredEditMode)
            {
                EditorApplication.delayCall += Start;
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
                        Debug.LogError($"[UnityMCP] Listen error: {e.Message}");
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
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
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
                
                Debug.Log($"[UnityMCP] Processing request: {method}");
                
                // Execute on main thread
                object result = null;
                Exception error = null;
                var resetEvent = new ManualResetEvent(false);
                
                EditorApplication.delayCall += () =>
                {
                    try
                    {
                        result = ProcessRequest(method, requestData);
                    }
                    catch (Exception e)
                    {
                        error = e;
                    }
                    finally
                    {
                        resetEvent.Set();
                    }
                };
                
                if (!resetEvent.WaitOne(15000))
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
            catch (Exception e)
            {
                SendResponse(response, 400, false, null, $"Bad request: {e.Message}");
            }
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
                
                default:
                    throw new NotImplementedException($"Method not found: {method}");
            }
        }
        
        static object CreateScript(JObject request)
        {
            var fileName = request["fileName"]?.ToString();
            if (string.IsNullOrEmpty(fileName))
                throw new ArgumentException("fileName is required");
            
            if (!fileName.EndsWith(".cs"))
                fileName += ".cs";
            
            var content = request["content"]?.ToString();
            var folder = request["folder"]?.ToString() ?? "Assets/Scripts";
            
            var path = Path.Combine(folder, fileName);
            var directory = Path.GetDirectoryName(path);
            
            // Create directory if needed
            if (!AssetDatabase.IsValidFolder(directory))
            {
                CreateFolderRecursive(directory);
            }
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(7));
            File.WriteAllText(fullPath, content ?? GetDefaultScriptContent(fileName));
            
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
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(7));
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");
            
            return new
            {
                path = path,
                content = File.ReadAllText(fullPath),
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
        
        static object CreateShader(JObject request)
        {
            var name = request["name"]?.ToString();
            if (string.IsNullOrEmpty(name))
                throw new ArgumentException("name is required");
            
            if (!name.EndsWith(".shader"))
                name += ".shader";
            
            var content = request["content"]?.ToString();
            var folder = request["folder"]?.ToString() ?? "Assets/Shaders";
            
            var path = Path.Combine(folder, name);
            var directory = Path.GetDirectoryName(path);
            
            if (!AssetDatabase.IsValidFolder(directory))
            {
                CreateFolderRecursive(directory);
            }
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(7));
            File.WriteAllText(fullPath, content ?? GetDefaultShaderContent(name));
            
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
            
            var fullPath = Path.Combine(Application.dataPath, path.Substring(7));
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");
            
            return new
            {
                path = path,
                content = File.ReadAllText(fullPath),
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
            return $@"using UnityEngine;

public class {className} : MonoBehaviour
{{
    void Start()
    {{
        
    }}
    
    void Update()
    {{
        
    }}
}}";
        }
        
        static string GetDefaultShaderContent(string fileName)
        {
            var shaderName = Path.GetFileNameWithoutExtension(fileName);
            return $@"Shader ""Custom/{shaderName}""
{{
    Properties
    {{
        _MainTex (""Texture"", 2D) = ""white"" {{}}
    }}
    SubShader
    {{
        Tags {{ ""RenderType""=""Opaque"" }}
        LOD 200

        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows

        sampler2D _MainTex;

        struct Input
        {{
            float2 uv_MainTex;
        }};

        void surf (Input IN, inout SurfaceOutputStandard o)
        {{
            fixed4 c = tex2D (_MainTex, IN.uv_MainTex);
            o.Albedo = c.rgb;
            o.Alpha = c.a;
        }}
        ENDCG
    }}
    FallBack ""Diffuse""
}}";
        }
        
        static void SendResponse(HttpListenerResponse response, int statusCode, bool success, object result, string error)
        {
            response.StatusCode = statusCode;
            response.ContentType = "application/json";
            
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