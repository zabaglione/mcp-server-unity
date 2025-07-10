# Unity MCP Server Architecture

## Overview

Unity MCP Serverは、Model Context Protocol (MCP)を使用してAIアシスタント（Claude）がUnityプロジェクトを操作できるようにするサーバーです。シンプルなHTTPベースのアーキテクチャを採用し、安定性と使いやすさを重視しています。

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │  MCP    │                 │  HTTP   │                 │
│  AI Assistant   │────────▶│   MCP Server    │────────▶│  Unity Editor   │
│   (Claude)      │  stdio  │   (Node.js)     │  :3001  │  (HTTP Server)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Components

### 1. Unity HTTP Server (`UnityHttpServer.cs`)
- **ポート**: 3001
- **実装**: `Assets/Editor/UnityHttpServer.cs`として配置
- **特徴**:
  - Unity Editor内で自動起動
  - 同期的なHTTPリクエスト処理
  - JSON形式でのデータ交換
  - エラーハンドリングとログ出力

### 2. MCP Server (TypeScript)
- **エントリーポイント**: `src/simple-index.ts`
- **プロトコル**: MCP標準 (stdio)
- **機能**:
  - MCPツール定義と実行
  - UnityとのHTTP通信
  - エラーハンドリング

### 3. HTTP Adapter (`UnityHttpAdapter`)
- **実装**: `src/adapters/unity-http-adapter.ts`
- **役割**: MCPサーバーとUnity間の通信を仲介
- **特徴**:
  - タイムアウト処理（デフォルト30秒）
  - 自動リトライ機能
  - エラーハンドリング

## API Endpoints

### Script Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/script/create` | C#スクリプトの作成 |
| POST | `/script/read` | スクリプトの読み取り |
| POST | `/script/delete` | スクリプトの削除 |

### Shader Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/shader/create` | シェーダーファイルの作成 |
| POST | `/shader/read` | シェーダーの読み取り |
| POST | `/shader/delete` | シェーダーの削除 |

### Project Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/project/info` | Unityプロジェクト情報の取得 |
| GET | `/ping` | 接続状態の確認 |

## MCP Tools

MCPプロトコルを通じて以下のツールが利用可能：

1. **script_create** - C#スクリプトの作成
2. **script_read** - スクリプトの読み取り
3. **script_delete** - スクリプトの削除
4. **shader_create** - シェーダーの作成
5. **shader_read** - シェーダーの読み取り
6. **shader_delete** - シェーダーの削除
7. **project_info** - プロジェクト情報の取得
8. **project_status** - 接続状態の確認

## Design Principles

1. **シンプルさ** 
   - 複雑な抽象化を避け、直接的な実装
   - HTTPベースの通信で理解しやすい

2. **安定性**
   - HTTPプロトコルによる確実な通信
   - 適切なタイムアウトとエラーハンドリング

3. **テスタビリティ**
   - 各コンポーネントの独立性
   - モックを使用した単体テスト
   - 統合テストによる動作確認

4. **エラーハンドリング**
   - 明確なHTTPステータスコード
   - 詳細なエラーメッセージ
   - ログによるデバッグ支援

## Testing Strategy

- **Unit Tests**: Vitestを使用した単体テスト
- **Integration Tests**: HTTPサーバーとの統合テスト
- **Coverage**: 主要機能の網羅的なテスト

## Future Considerations

- WebSocket対応によるリアルタイム通信
- より多くのUnity機能へのアクセス
- バッチ操作のサポート