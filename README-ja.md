# Unity MCP Server

[English README is here](./README.md)

Unity プロジェクトをプログラムで操作できるようにする Model Context Protocol (MCP) サーバーです。Claude Desktop との統合と HTTP API の両方をサポートし、柔軟な開発ワークフローを実現します。

## 主な機能

### 📦 コア機能
- **プロジェクト管理**: Unity プロジェクトの設定と自動検証
- **アセット作成**: スクリプト、マテリアル、シェーダー、シーンの作成
- **アセット管理**: Unity アセットの読み取り、一覧表示、更新
- **ビルド自動化**: マルチプラットフォームビルドのカスタム設定
- **レンダーパイプライン検出**: Built-in、URP、HDRP の自動検出

### 🎨 マテリアル管理
- **マテリアル作成**: レンダーパイプラインを自動検出して適切なシェーダーを選択
- **シェーダー更新**: GUID 管理によるマテリアルシェーダーの変更
- **プロパティ編集**: カラー、フロート、テクスチャ、ベクターの更新
- **一括変換**: 複数のマテリアルを異なるシェーダーに変換
- **マテリアル読み取り**: マテリアルプロパティとシェーダー情報の検査

### 📝 コード管理
- **スクリプト作成**: 適切な名前空間構造を持つ C# スクリプトの作成
- **スクリプト更新**: 完全なコンテンツ置換による既存スクリプトの更新
- **コード分析**: 差分比較、重複クラス検出
- **名前空間管理**: ファイル位置に基づく名前空間の自動提案と適用
- **コンパイル監視**: リアルタイムのコンパイルエラー追跡

### 🛠️ 高度な機能
- **エディター拡張**: カスタムウィンドウ、インスペクター、プロパティドロワー
- **シェーダー作成**: Built-in、URP、HDRP、Shader Graph のサポート
- **Unity リフレッシュ**: バッチ操作による自動アセットデータベース更新
- **診断**: コンパイルエラー、アセット検証、エディターログ分析

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/zabaglione/unity-mcp-server.git
cd unity-mcp-server

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build
```

## 使用方法

### オプション 1: Claude Desktop (MCP stdio)

Claude Desktop の設定ファイルに追加：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-server-unity": {
      "command": "node",
      "args": ["/absolute/path/to/unity-mcp/build/index.js"]
    }
  }
}
```

Claude Desktop で自然言語を使用：
- 「Unity プロジェクトを /path/to/project に設定」
- 「時間とともに色が変化するシェーダーを作成」
- 「ダブルジャンプ機能付きのプレイヤーコントローラーを生成」

### オプション 2: HTTP サーバー

1. **HTTP サーバーを起動:**
```bash
npm run start:http
# カスタムポートを指定
PORT=8080 npm run start:http
```

2. **Unity プロジェクトを設定:**
```bash
curl -X POST http://localhost:3000/api/project/setup \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path/to/your/unity/project"}'
```

## ドキュメント

- [API ドキュメント](./docs/api/HTTP_API.md) - 完全な HTTP API リファレンス
- [利用可能なツール](./docs/api/AVAILABLE_TOOLS.md) - すべての MCP ツールのリスト
- [ドキュメントインデックス](./docs/index.md) - すべてのドキュメント

## 主な MCP ツール

### プロジェクト管理
- `project_setup_path` - Unity プロジェクトパスを設定
- `project_read_info` - プロジェクト情報を取得

### アセット作成と管理
- `asset_create_script` - C# スクリプトを作成
- `asset_create_material` - マテリアルを作成
- `asset_create_material_with_shader` - 特定のシェーダーでマテリアルを作成
- `asset_create_shader` - シェーダーを作成
- `asset_update_material_shader` - マテリアルのシェーダーを変更
- `asset_update_material_properties` - マテリアルプロパティを更新

### コード分析
- `code_analyze_diff` - ファイル間の詳細な差分を取得
- `code_detect_duplicates` - 重複するクラス名を検出
- `code_suggest_namespace` - ファイル用の名前空間を提案
- `code_apply_namespace` - スクリプトに名前空間を適用

### コンパイルツール
- `compile_get_errors` - コンテキスト付きのコンパイルエラーを取得
- `compile_get_status` - 現在のコンパイル状態を取得
- `compile_install_helper` - コンパイル監視ヘルパーをインストール

## 使用例

Claude Desktopは自然な日本語での入力を適切なMCPツールコマンドに変換できます。以下に例を示します：

### プロジェクト設定
```
「Unityプロジェクトを /Users/me/MyGame に設定して」
「/path/to/project のUnityプロジェクトを使用」
```

### スクリプトの作成
```
「基本的な移動処理を含むPlayerControllerスクリプトを作成」
「Enemiesフォルダに新しいEnemyAIというC#スクリプトを作って」
```

### マテリアルとシェーダー
```
「時間とともに色が変化するシェーダーを作成」
「作成したシェーダーを使ってマテリアルを作成」
「マテリアルのプロパティを更新」
```

### コード分析
```
「PlayerControllerの変更内容を確認」
「重複するクラス名がないかチェック」
「適切な名前空間を提案」
```

## 最近の更新

### v2.1.0 (2025-06-06)
- シェーダー・マテリアル間の GUID 参照問題を修正
- すべての Unity アセット用のメタファイル生成を追加
- カスタムシェーダーの検出と検索を改善
- 適切なシェーダー参照によるマテリアル作成を強化
- 包括的なデバッグとログ出力を追加

完全なバージョン履歴は [CHANGELOG.md](./CHANGELOG.md) を参照してください。

## 既知の問題と解決策

### カスタムシェーダー参照
カスタムシェーダーを作成する際は、マテリアル作成時に完全なシェーダー名（"Custom/" プレフィックスを含む）を使用してください：

```bash
# シェーダーを作成
asset_create_shader shaderName:"MyShader" shaderType:"builtin"
# 戻り値: Shader Name: Custom/MyShader

# そのシェーダーでマテリアルを作成
asset_create_material_with_shader materialName:"MyMaterial" shaderName:"Custom/MyShader"
```

## 要件

- Node.js 18.x 以上
- Unity 2021.3 LTS 以降
- npm または yarn

## サポートされるプラットフォーム

- macOS
- Windows
- Linux

## サポートされる Unity バージョン

- Unity 2021.3 LTS 以降
- Unity 6000.x (Unity 6)

## 開発

### スクリプト

- `npm run build` - TypeScriptプロジェクトをビルド
- `npm run dev` - 開発用ウォッチモード
- `npm start` - ビルド済みサーバーを実行
- `npm run clean` - ビルドディレクトリをクリーン
- `npm run test` - 自動テストを実行
- `npm run test:manual` - 手動テストの手順

### プロジェクト構造

```
unity-mcp-server/
├── src/
│   ├── index.ts                 # MCPサーバー実装
│   ├── http-server.ts           # HTTPサーバー実装
│   ├── services/                # サービスレイヤー
│   │   ├── project-service.ts   # プロジェクト管理
│   │   ├── script-service.ts    # スクリプト操作
│   │   ├── material-service.ts  # マテリアル管理
│   │   ├── shader-service.ts    # シェーダー管理
│   │   ├── code-analysis-service.ts    # コード分析
│   │   └── compilation-service.ts      # コンパイル監視
│   ├── templates/               # コード生成テンプレート
│   ├── utils/                   # ユーティリティ関数
│   └── validators/              # 入力検証
├── tests/                       # テストスイート
├── docs/                        # ドキュメント
└── build/                       # コンパイル出力
```

## トラブルシューティング

### Unityプロジェクトが認識されない
- プロジェクトパスに `Assets` と `ProjectSettings` フォルダが含まれていることを確認
- ファイル権限を確認

### ビルドコマンドが失敗する
- Unityが期待される場所にインストールされていることを確認
- カスタムUnityインストールの場合は、Unityパスを修正

### スクリプトが見つからない
- スクリプトはAssetsフォルダから再帰的に検索されます
- ファイルに.cs拡張子があることを確認

## テスト

### 統合テスト
```bash
# Unityプロジェクトを指定して統合テストを実行
npm run test:integration /path/to/unity/project
```

### 手動テスト
```bash
# ガイド付き手動テストを実行
./tests/run-manual-tests.sh /path/to/unity/project
```

詳細なテストドキュメントは [tests/README.md](./tests/README.md) を参照してください。

## コントリビューション

開発環境のセットアップと貢献ガイドラインについては、[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

MITライセンス - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## サポート

問題や機能リクエストについては、[GitHub issue tracker](https://github.com/zabaglione/unity-mcp-server/issues) を使用してください。