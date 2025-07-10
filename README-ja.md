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
   - `src/unity-scripts/UnityHttpServer.cs`を`Assets/Editor/UnityHttpServer.cs`にコピー
   - Unity Editorを開くと自動的にサーバーが起動します

3. **Claude Desktopの設定**
   ```json
   {
     "mcpServers": {
       "unity": {
         "command": "node",
         "args": ["path/to/unity-mcp/build/simple-index.js"]
       }
     }
   }
   ```

## ✨ 機能

- 📝 **スクリプト管理**: C#スクリプトの作成、読取、削除
- 🎨 **シェーダー操作**: Unityシェーダーの作成と管理
- 📊 **プロジェクト情報**: Unityプロジェクト情報の取得
- 🔌 **シンプルなHTTP API**: MCPとUnity間の信頼性の高い通信
- 🧪 **完全なテスト**: 包括的なユニットテストと統合テスト

## 🏗️ アーキテクチャ

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │  MCP    │                 │  HTTP   │                 │
│  AIアシスタント  │────────▶│   MCPサーバー    │────────▶│  Unity Editor   │
│   (Claude)      │  stdio  │   (Node.js)     │  :3001  │  (HTTPサーバー)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## 🛠️ 利用可能なツール

| ツール | 説明 |
|------|------|
| `script_create` | 新しいC#スクリプトを作成 |
| `script_read` | スクリプトの内容を読取 |
| `script_delete` | スクリプトを削除 |
| `shader_create` | 新しいシェーダーを作成 |
| `shader_read` | シェーダーの内容を読取 |
| `shader_delete` | シェーダーを削除 |
| `project_info` | Unityプロジェクト情報を取得 |
| `project_status` | 接続状態を確認 |

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

1. `src/unity-scripts/UnityHttpServer.cs`をUnityプロジェクトの`Assets/Editor/`フォルダにコピー
2. HTTPサーバーがポート3001で自動的に起動します
3. Unityコンソールで「Unity HTTP Server started」メッセージを確認

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

// スクリプトを削除
await tools.executeTool('script_delete', {
  path: 'Assets/Scripts/PlayerController.cs'
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
// プロジェクト情報を取得
await tools.executeTool('project_info', {});

// 接続状態を確認
await tools.executeTool('project_status', {});
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
- UnityHttpServer.csがEditorフォルダにあることを確認
- ポート3001が使用されていないことを確認

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

## 🙏 謝辞

- Anthropicによる[Model Context Protocol](https://modelcontextprotocol.io/)
- Unity Technologies