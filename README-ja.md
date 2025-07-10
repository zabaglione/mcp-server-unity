# Unity MCP Server

Unity MCP ServerはModel Context Protocol (MCP)を通じて、AIアシスタント（Claudeなど）がUnityプロジェクトを操作できるようにするサーバーです。このシンプルな実装は、軽量なHTTPベースのアーキテクチャを使用して、Unityスクリプトとシェーダーを管理するための必須ツールを提供します。

[日本語版 README はこちら](README-ja.md) | [English](README.md)

## 🚀 クイックスタート

1. **MCPサーバーのインストール**
   ```bash
   npm install
   npm run build
   ```

2. **Unity HTTPサーバーをUnityプロジェクトに追加**
   - 自動セットアップ（推奨）: `setup_unity_bridge`ツールを使用
   - 手動セットアップ: スクリプトを`Assets/Editor/MCP/`フォルダにコピー
   - Unity Editorを開くと自動的にサーバーが起動します（ポート23457）

3. **Claude Desktopの設定**
   ```json
   {
     "mcpServers": {
       "unity": {
         "command": "node",
         "args": ["/path/to/mcp-server-unity/build/simple-index.js"]
       }
     }
   }
   ```

## ✨ 機能

- 📝 **スクリプト管理**: C#スクリプトの作成、読取、更新、削除
- 🔄 **差分ベースの更新**: unified diff形式によるスクリプトの部分更新
- 🎨 **シェーダー操作**: Unityシェーダーの作成、読取、削除
- 📁 **フォルダ操作**: フォルダの作成、リネーム、移動、削除、一覧表示
- 📊 **プロジェクト情報**: Unityプロジェクト情報の取得
- 🚀 **自動スクリプトデプロイ**: Unity MCPブリッジスクリプトの自動インストール・更新
- 🔌 **シンプルなHTTP API**: MCPとUnity間の信頼性の高い通信（ポート23457）
- 📦 **大容量ファイルサポート**: 最大1GBのファイル処理
- 🧪 **完全なテスト**: 包括的なユニットテストと統合テスト

## 🏗️ アーキテクチャ

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │  MCP    │                 │  HTTP   │                 │
│  AIアシスタント  │────────▶│   MCPサーバー    │────────▶│  Unity Editor   │
│   (Claude)      │  stdio  │   (Node.js)     │  :23457 │  (HTTPサーバー)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## 🛠️ 利用可能なツール

| ツール | 説明 |
|------|------|
| `project_info` | Unityプロジェクト情報を取得（スクリプトを自動デプロイ） |
| `project_status` | 接続状態を確認 |
| `setup_unity_bridge` | Unity MCPスクリプトをインストール/更新 |
| `script_create` | 新しいC#スクリプトを作成 |
| `script_read` | スクリプトの内容を読取 |
| `script_apply_diff` | diffでスクリプトを更新 |
| `script_delete` | スクリプトを削除 |
| `shader_create` | 新しいシェーダーを作成 |
| `shader_read` | シェーダーの内容を読取 |
| `shader_delete` | シェーダーを削除 |
| `folder_create` | フォルダを作成 |
| `folder_rename` | フォルダをリネーム |
| `folder_move` | フォルダを移動 |
| `folder_list` | フォルダ内容を一覧表示 |
| `folder_delete` | フォルダを削除 |

## 📋 要件

- Unity 2019.4以降
- Node.js 16以降
- npm

## 🔧 開発

```bash
# 依存関係のインストール
npm install

# プロジェクトのビルド
npm run build

# テストの実行
npm test

# 特定のテストスイートを実行
npm run test:unit        # ユニットテストのみ
npm run test:integration # 統合テストのみ

# 開発モード
npm run dev
```

## 📁 プロジェクト構造

```
unity-mcp/
├── src/
│   ├── adapters/          # Unity通信用HTTPアダプター
│   ├── api/               # API実装（シェーダー、スクリプト）
│   ├── tools/             # MCPツール定義
│   ├── unity-scripts/     # Unity C#スクリプト
│   └── simple-index.ts    # メインエントリーポイント
├── tests/
│   ├── unit/             # ユニットテスト
│   └── integration/      # 統合テスト
└── docs/
    └── ARCHITECTURE.md   # 詳細なアーキテクチャドキュメント
```

## 🚦 Unityセットアップ

### 自動セットアップ（推奨）
1. MCPサーバーをインストール・起動
2. `setup_unity_bridge`ツールでスクリプトをインストール：
   ```bash
   setup_unity_bridge projectPath="/path/to/your/unity/project"
   ```

### 手動セットアップ
1. 以下のスクリプトをUnityプロジェクトにコピー：
   - `src/unity-scripts/UnityHttpServer.cs` → `Assets/Editor/MCP/UnityHttpServer.cs`
   - `src/unity-scripts/UnityMCPServerWindow.cs` → `Assets/Editor/MCP/UnityMCPServerWindow.cs`
2. HTTPサーバーがポート23457で自動的に起動します
3. Unityコンソールで「[UnityMCP] HTTP Server started」メッセージを確認
4. Window > Unity MCP Serverでサーバーを制御

## 📖 使用例

### スクリプト操作
```javascript
// 新しいスクリプトを作成
await tools.executeTool('script_create', {
  fileName: 'PlayerController',
  content: 'public class PlayerController : MonoBehaviour { }',
  folder: 'Assets/Scripts'
});

// スクリプトを読取
await tools.executeTool('script_read', {
  path: 'Assets/Scripts/PlayerController.cs'
});

// diffでスクリプトを更新
await tools.executeTool('script_apply_diff', {
  path: 'Assets/Scripts/PlayerController.cs',
  diff: `@@ -1,3 +1,4 @@
 using UnityEngine;
+using System.Collections;
 
 public class PlayerController : MonoBehaviour { }`
});

// スクリプトを削除
await tools.executeTool('script_delete', {
  path: 'Assets/Scripts/PlayerController.cs'
});
```

### フォルダ操作
```javascript
// フォルダを作成
await tools.executeTool('folder_create', {
  path: 'Assets/MyNewFolder'
});

// フォルダをリネーム
await tools.executeTool('folder_rename', {
  oldPath: 'Assets/MyNewFolder',
  newName: 'RenamedFolder'
});

// フォルダを移動
await tools.executeTool('folder_move', {
  sourcePath: 'Assets/RenamedFolder',
  targetPath: 'Assets/Scripts/RenamedFolder'
});

// フォルダ内容を一覧表示
await tools.executeTool('folder_list', {
  path: 'Assets/Scripts',
  recursive: false
});

// フォルダを削除
await tools.executeTool('folder_delete', {
  path: 'Assets/Scripts/RenamedFolder',
  recursive: true
});
```

### シェーダー操作
```javascript
// 新しいシェーダーを作成
await tools.executeTool('shader_create', {
  name: 'MyShader',
  content: 'Shader "Custom/MyShader" { }',
  folder: 'Assets/Shaders'
});

// シェーダーを読取
await tools.executeTool('shader_read', {
  path: 'Assets/Shaders/MyShader.shader'
});

// シェーダーを削除
await tools.executeTool('shader_delete', {
  path: 'Assets/Shaders/MyShader.shader'
});
```

### プロジェクト操作
```javascript
// プロジェクト情報を取得（必要に応じてスクリプトを自動デプロイ）
await tools.executeTool('project_info', {});

// 接続状態を確認
await tools.executeTool('project_status', {});

// Unity MCPスクリプトをインストール/更新
await tools.executeTool('setup_unity_bridge', {
  projectPath: '/path/to/unity/project',
  forceUpdate: false
});
```

## 🧪 テスト

プロジェクトはVitestを使用してテストしています：

- **ユニットテスト**: 個別のコンポーネントを独立してテスト
- **統合テスト**: モックUnityサーバーを使用した完全なフローのテスト
- **カバレッジ**: 信頼性のための包括的なテストカバレッジ

```bash
# すべてのテストを実行
npm test

# カバレッジ付きで実行
npm run test:coverage

# ウォッチモードで実行
npm run test:watch
```

## 🐛 トラブルシューティング

### Unityサーバーが応答しない
- Unityコンソールでエラーを確認
- スクリプトが`Assets/Editor/MCP/`フォルダにあることを確認
- ポート23457が使用されていないことを確認
- Window > Unity MCP Serverを開いてサーバーを手動で起動
- `setup_unity_bridge`を使用してスクリプトを再インストール

### MCP接続の問題
- Claude Desktop設定を確認
- ビルドディレクトリが存在することを確認
- エラーメッセージのログを確認

## 📝 ライセンス

MITライセンス - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🤝 貢献

貢献を歓迎します！以下を確認してください：
- すべてのテストがパスすること（`npm test`）
- 既存のパターンに従うコード
- 新機能にはテストを含める

## 📚 ドキュメント

- [アーキテクチャ概要](docs/ARCHITECTURE.md)
- [APIリファレンス](docs/API.md)

## 🔮 将来の拡張

- リアルタイム通信のためのWebSocketサポート
- 追加のUnity操作（マテリアル、プレハブなど）
- パフォーマンス向上のためのバッチ操作
- Unityプロジェクトテンプレート
- 競合解決を含む高度なdiffマージ

## 🙏 謝辞

- Anthropicによる[Model Context Protocol](https://modelcontextprotocol.io/)
- Unity Technologies