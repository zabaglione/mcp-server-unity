# Unity 6 API Integration Architecture

## 概要

Unity 6000以降を対象とした、より高度なUnity API統合方法を提案します。

## 推奨アーキテクチャ：Unity Bridge Service

### 1. **双方向通信ブリッジ**

```
MCPサーバー ←→ TCP/Named Pipe ←→ Unity Editor Bridge ←→ Unity API
```

### 2. **Unity側の実装（C#）**

```csharp
// Assets/Editor/MCP/MCPBridge.cs
using UnityEngine;
using UnityEditor;
using System.Net;
using System.Net.Sockets;
using System.IO.Pipes;
using Unity.CodeEditor;

[InitializeOnLoad]
public class MCPBridge
{
    private static NamedPipeServerStream pipeServer;
    private static bool isRunning = false;

    static MCPBridge()
    {
        EditorApplication.update += Initialize;
    }

    static void Initialize()
    {
        if (!isRunning)
        {
            EditorApplication.update -= Initialize;
            StartBridgeServer();
        }
    }

    static async void StartBridgeServer()
    {
        isRunning = true;
        
        // Windows: Named Pipe, Mac/Linux: Domain Socket
        #if UNITY_EDITOR_WIN
        pipeServer = new NamedPipeServerStream("Unity.MCPBridge");
        #else
        // Unix domain socket implementation
        #endif

        while (isRunning)
        {
            await pipeServer.WaitForConnectionAsync();
            HandleClient();
        }
    }

    static async void HandleClient()
    {
        while (pipeServer.IsConnected)
        {
            var request = await ReadRequest();
            var response = ProcessRequest(request);
            await SendResponse(response);
        }
    }

    static object ProcessRequest(Request request)
    {
        switch (request.method)
        {
            case "AssetDatabase.CreateAsset":
                return CreateAssetFromData(request.params);
                
            case "AssetDatabase.ImportAsset":
                AssetDatabase.ImportAsset(
                    request.params.path, 
                    (ImportAssetOptions)request.params.options
                );
                return new { success = true };
                
            case "AssetDatabase.DeleteAsset":
                bool success = AssetDatabase.DeleteAsset(request.params.path);
                return new { success };
                
            case "AssetDatabase.MoveAsset":
                string error = AssetDatabase.MoveAsset(
                    request.params.oldPath,
                    request.params.newPath
                );
                return new { success = string.IsNullOrEmpty(error), error };
                
            case "CompilationPipeline.RequestScriptCompilation":
                CompilationPipeline.RequestScriptCompilation();
                return new { success = true };
                
            case "CodeGeneration.CreateFromTemplate":
                return CreateFromUnity6Template(request.params);
                
            case "CodeAnalysis.AnalyzeScript":
                return AnalyzeWithRoslyn(request.params);
                
            default:
                throw new NotImplementedException($"Method not implemented: {request.method}");
        }
    }

    // Unity 6 specific features
    static object CreateFromUnity6Template(dynamic params)
    {
        // Unity 6's new ScriptTemplates API
        var template = ScriptTemplates.GetTemplate(params.templateType);
        var content = template.Generate(new {
            className = params.className,
            namespaceName = params.namespaceName,
            unityVersion = params.unityVersion
        });
        
        File.WriteAllText(params.path, content);
        AssetDatabase.ImportAsset(params.path);
        
        return new { success = true, content };
    }

    static object AnalyzeWithRoslyn(dynamic params)
    {
        // Unity 6's integrated Roslyn analyzer
        var analyzer = new Unity.CodeAnalysis.RoslynAnalyzer();
        var compilation = analyzer.GetCompilation();
        var syntaxTree = analyzer.ParseFile(params.scriptPath);
        
        // Find all references and usages
        var semanticModel = compilation.GetSemanticModel(syntaxTree);
        var references = analyzer.FindReferences(params.scriptPath);
        var usages = analyzer.FindUsages(params.scriptPath);
        
        return new {
            references,
            usages,
            symbols = semanticModel.GetDeclaredSymbols(),
            diagnostics = semanticModel.GetDiagnostics()
        };
    }
}
```

### 3. **MCP側の使用例**

```typescript
// ファイル作成（Unity API使用）
await unityBridge.createAsset(
  scriptContent,
  "Assets/Scripts/Player.cs",
  "MonoScript"
);

// コード解析（Unity 6の機能）
const analysis = await unityBridge.analyzeCodeContext(
  "Assets/Scripts/GameManager.cs"
);
console.log("References:", analysis.references);
console.log("Usages:", analysis.usages);

// テンプレートからの生成
await unityBridge.createScriptWithTemplate(
  "PlayerController",
  "Game.Player",
  "Assets/Scripts/Player/PlayerController.cs",
  "MonoBehaviourTemplate"
);
```

## Unity 6の新機能活用

### 1. **Roslyn Integration**
- リアルタイムコード解析
- インテリセンス情報の取得
- リファクタリング支援

### 2. **Asset Pipeline v2**
- より高速なアセットインポート
- 並列処理のサポート
- カスタムインポーターの改善

### 3. **External Tools Protocol**
- 標準化された外部ツール通信
- IDE統合の改善
- デバッグ情報の共有

### 4. **Code Generation API**
- テンプレートベースのコード生成
- ソースジェネレーター対応
- アトリビュートベースの自動生成

## 実装の優先順位

1. **Phase 1: 基本的なBridge実装**
   - TCP/Named Pipe通信
   - 基本的なAssetDatabase操作
   - エラーハンドリング

2. **Phase 2: Unity 6機能の統合**
   - Roslyn解析
   - テンプレートシステム
   - 高度なコード生成

3. **Phase 3: 最適化と拡張**
   - バッチ操作
   - キャッシング
   - パフォーマンス最適化

## メリット

1. **直接的なUnity API使用**
   - AssetDatabase操作が確実
   - メタファイルの自動処理
   - 参照の整合性保証

2. **Unity 6の新機能活用**
   - 高度なコード解析
   - インテリジェントなコード生成
   - より良いエラー検出

3. **リアルタイム同期**
   - 即座の変更反映
   - 双方向の状態同期
   - イベントベースの更新

4. **開発体験の向上**
   - より正確な補完
   - 高度なリファクタリング
   - 統合されたワークフロー

## 移行計画

1. 既存のファイルシステムベースの実装を維持
2. Unity Bridgeを並行して実装
3. 機能ごとに段階的に移行
4. 完全移行後に旧実装を廃止

この方法により、Unity 6の最新機能を最大限活用しながら、より堅牢で高機能な統合を実現できます。