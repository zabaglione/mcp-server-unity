using System;
using UnityEngine;
using UnityEditor;

namespace UnityMCP
{
    /// <summary>
    /// Unity MCP Server control window
    /// </summary>
    public class UnityMCPServerWindow : EditorWindow
    {
        // Version information (should match UnityHttpServer)
        private const string SCRIPT_VERSION = "1.1.0";
        
        private int serverPort = 23457;
        private bool isServerRunning = false;
        private string serverStatus = "Stopped";
        private string lastError = "";
        
        [MenuItem("Window/Unity MCP Server")]
        public static void ShowWindow()
        {
            GetWindow<UnityMCPServerWindow>("Unity MCP Server");
        }
        
        void OnEnable()
        {
            // Load saved settings
            serverPort = EditorPrefs.GetInt("UnityMCP.ServerPort", 23457);
            UpdateStatus();
        }
        
        void OnDisable()
        {
            // Save settings
            EditorPrefs.SetInt("UnityMCP.ServerPort", serverPort);
        }
        
        void OnGUI()
        {
            GUILayout.Label("Unity MCP Server Control", EditorStyles.boldLabel);
            GUILayout.Label($"Version: {SCRIPT_VERSION}", EditorStyles.miniLabel);
            
            EditorGUILayout.Space();
            
            // Server Status
            EditorGUILayout.BeginHorizontal();
            GUILayout.Label("Status:", GUILayout.Width(60));
            var statusColor = isServerRunning ? Color.green : Color.red;
            var originalColor = GUI.color;
            GUI.color = statusColor;
            GUILayout.Label(serverStatus, EditorStyles.boldLabel);
            GUI.color = originalColor;
            EditorGUILayout.EndHorizontal();
            
            EditorGUILayout.Space();
            
            // Port Configuration
            EditorGUILayout.BeginHorizontal();
            GUILayout.Label("Port:", GUILayout.Width(60));
            var newPort = EditorGUILayout.IntField(serverPort);
            if (newPort != serverPort && newPort > 0 && newPort <= 65535)
            {
                serverPort = newPort;
                EditorPrefs.SetInt("UnityMCP.ServerPort", serverPort);
            }
            EditorGUILayout.EndHorizontal();
            
            // Port validation
            if (serverPort < 1024)
            {
                EditorGUILayout.HelpBox("Warning: Ports below 1024 may require administrator privileges.", MessageType.Warning);
            }
            
            EditorGUILayout.Space();
            
            // Control Buttons
            EditorGUILayout.BeginHorizontal();
            
            GUI.enabled = !isServerRunning;
            if (GUILayout.Button("Start Server", GUILayout.Height(30)))
            {
                StartServer();
            }
            
            GUI.enabled = isServerRunning;
            if (GUILayout.Button("Stop Server", GUILayout.Height(30)))
            {
                StopServer();
            }
            
            GUI.enabled = true;
            EditorGUILayout.EndHorizontal();
            
            EditorGUILayout.Space();
            
            // Connection Info
            if (isServerRunning)
            {
                EditorGUILayout.BeginVertical(EditorStyles.helpBox);
                GUILayout.Label("Connection Information", EditorStyles.boldLabel);
                EditorGUILayout.SelectableLabel($"http://localhost:{serverPort}/");
                EditorGUILayout.EndVertical();
            }
            
            // Error Display
            if (!string.IsNullOrEmpty(lastError))
            {
                EditorGUILayout.Space();
                EditorGUILayout.HelpBox(lastError, MessageType.Error);
                if (GUILayout.Button("Clear Error"))
                {
                    lastError = "";
                }
            }
            
            EditorGUILayout.Space();
            
            // Instructions
            EditorGUILayout.BeginVertical(EditorStyles.helpBox);
            GUILayout.Label("Instructions", EditorStyles.boldLabel);
            GUILayout.Label("1. Configure the port (default: 23457)");
            GUILayout.Label("2. Click 'Start Server' to begin");
            GUILayout.Label("3. Use the MCP client to connect");
            GUILayout.Label("4. Click 'Stop Server' when done");
            EditorGUILayout.EndVertical();
        }
        
        void StartServer()
        {
            try
            {
                UnityHttpServer.Start(serverPort);
                UpdateStatus();
                lastError = "";
                Debug.Log($"[UnityMCP] Server started on port {serverPort}");
            }
            catch (Exception e)
            {
                lastError = $"Failed to start server: {e.Message}";
                Debug.LogError($"[UnityMCP] {lastError}");
            }
        }
        
        void StopServer()
        {
            try
            {
                UnityHttpServer.Shutdown();
                UpdateStatus();
                lastError = "";
                Debug.Log("[UnityMCP] Server stopped");
            }
            catch (Exception e)
            {
                lastError = $"Failed to stop server: {e.Message}";
                Debug.LogError($"[UnityMCP] {lastError}");
            }
        }
        
        void UpdateStatus()
        {
            isServerRunning = UnityHttpServer.IsRunning;
            serverStatus = isServerRunning ? $"Running on port {UnityHttpServer.CurrentPort}" : "Stopped";
            Repaint();
        }
        
        void Update()
        {
            // Update status periodically
            UpdateStatus();
        }
    }
}