# MCP Server for Unity

Model Context Protocol (MCP) サーバーで、ClaudeがUnityプロジェクトと直接連携し、スクリプト作成、アセット管理、プロジェクトビルドなどのツールを提供します。

## 機能

### コア機能
- **プロジェクト管理**: Unityプロジェクトパスの設定と検証
- **スクリプト操作**: C#スクリプトの作成、読み取り、一覧表示（フォルダ整理対応）
- **アセット作成**: Unityシーン、マテリアル、プレファブの生成
- **アセット管理**: タイプ別にプロジェクトアセットの一覧表示とフィルタリング
- **プロジェクト情報**: Unityバージョンとプロジェクト統計の取得

### 高度な機能
- **シェーダーサポート**: Built-in、URP、HDRPレンダーパイプライン用シェーダーの作成
- **Shader Graph**: URPとHDRP用のビジュアルシェーダーグラフの生成
- **エディタ拡張**: カスタムエディタウィンドウ、インスペクタ、プロパティドロワー、メニューアイテムの作成
- **ProBuilder統合**: ProBuilder APIを使用した3Dモデルとプロシージャルメッシュの作成
- **ランタイムメッシュ生成**: 実行時の動的なメッシュ生成と修正

### 自動化と効率化
- **自動Unityリフレッシュ**: アセットデータベースの更新とスクリプトの再コンパイル
- **バッチ操作**: 複数のファイル操作をキューに入れて効率的に一度でリフレッシュ
- **ビルド自動化**: コマンドラインから複数プラットフォーム用のUnityプロジェクトビルド
- **パッケージ管理**: スマート検索機能付きのUnityパッケージの検索、インストール、削除
- **ファイルシステムウォッチャー**: Unity自動同期のためのリアルタイム監視

### アーキテクチャの利点
- **サービス指向アーキテクチャ**: 拡張とメンテナンスが容易なモジュラー設計
- **依存性注入**: 柔軟なサービス構成とテスト
- **包括的な検証**: パストラバーサル保護と入力サニタイゼーション
- **テンプレートシステム**: カスタマイズ可能なテンプレートによる一貫したコード生成
- **エラーハンドリング**: リカバリー提案付きの詳細なエラーメッセージ

## 必要条件

- Node.js 18.x 以上
- Unity 2021.3 LTS 以降（ビルド機能を使用する場合）
- Claude Desktop

## インストール

### クイックセットアップ（Unix/Linux/macOS）

```bash
git clone https://github.com/zabaglione/mcp-server-unity.git
cd mcp-server-unity
./setup.sh
```

### 手動セットアップ

1. リポジトリのクローン:
```bash
git clone https://github.com/zabaglione/mcp-server-unity.git
cd mcp-server-unity
```

2. 依存関係のインストール:
```bash
npm install
```

3. プロジェクトのビルド:
```bash
npm run build
```

## 設定

Claude Desktopの設定ファイルに以下を追加してください：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-server-unity": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-unity/build/index.js"]
    }
  }
}
```

`/absolute/path/to/mcp-server-unity` を実際のインストールパスに置き換えてください。

## 使用例

Claude Desktopは自然な日本語での入力を適切なMCPツールコマンドに変換できます。以下に例を示します：

### プロジェクト設定
```
「Unityプロジェクトを /Users/me/MyGame に設定して」
「/path/to/project のUnityプロジェクトを使用」
「Unityプロジェクトパスを設定: /Users/john/UnityProjects/MyAwesomeGame」
```

### スクリプトの作成
```
「基本的な移動処理を含むPlayerControllerスクリプトを作成」
「Enemiesフォルダに新しいEnemyAIというC#スクリプトを作って」
「GameManagerシングルトンスクリプトを生成」
```

### スクリプトの読み取り
```
「PlayerControllerスクリプトを表示して」
「GameManager.csファイルを読んで」
「EnemyAIスクリプトの中身は？」
```

### アセットの作成
```
「MainMenuという新しいシーンを作成」
「PlayerMaterialという名前のマテリアルを作って」
「WaterShaderというURPシェーダーを作成」
「CustomLitというHDRP用のShader Graphを生成」
```

### パッケージ管理
```
「ProBuilderパッケージを検索」
「2Dパッケージには何がある？」
「レンダーパイプライン用のパッケージを探して」
「ProBuilderをインストール」
「TextMeshProのバージョン3.0.6をインストール」
「ProBuilderパッケージを削除」
「インストール済みパッケージを表示」
「ProBuilder、TextMeshPro、Cinemachineを一度にインストール」
```

### エディタ拡張
```
「レベルデザイン用のカスタムエディタウィンドウを作成」
「MyComponent用のカスタムインスペクタを作って」
「RangeAttribute用のプロパティドロワーを生成」
```

### ProBuilder操作
```
「ProBuilderのキューブプレファブを作成」
「メッシュジェネレータースクリプトを生成」
「ProBuilderシェイプクリエイターを作って」
```

### ビルド操作
```
「プロジェクトをWindows用にビルド」
「/Users/me/BuildsにmacOSビルドを作成」
「WebGL用に/path/to/outputにビルド」
```

### ユーティリティ操作
```
「プロジェクト内の全スクリプトを一覧表示」
「全てのシェーダーを表示」
「プロジェクト情報を取得」
「Unityをリフレッシュ」
「バッチ操作を開始」
```

## ツールリファレンス

直接ツールを使用する場合の利用可能なMCPツール：

### プロジェクト管理
- `project_setup_path` - Unityプロジェクトパスを設定
- `project_read_info` - プロジェクト情報を取得

### アセット作成・管理
- `asset_create_script` - C#スクリプトを作成
- `asset_read_script` - スクリプト内容を読み取り
- `asset_list_scripts` - 全スクリプトを一覧表示
- `asset_create_scene` - Unityシーンを作成
- `asset_create_material` - マテリアルを作成
- `asset_create_shader` - シェーダーを作成
- `asset_list_shaders` - 全シェーダーを一覧表示
- `asset_list_all` - タイプ別に全アセットを一覧表示

### エディタ拡張
- `editor_create_script` - エディタスクリプトを作成
- `editor_list_scripts` - エディタスクリプトを一覧表示

### ProBuilder/モデリング
- `modeling_create_script` - ProBuilderスクリプトを作成
- `modeling_create_prefab` - ProBuilderプレファブを作成
- `modeling_list_scripts` - ProBuilderスクリプトを一覧表示

### パッケージ管理
- `package_search` - パッケージを検索
- `package_install` - パッケージをインストール
- `package_install_multiple` - 複数パッケージをインストール
- `package_remove` - パッケージを削除
- `package_list` - インストール済みパッケージを一覧表示

### ビルド操作
- `build_execute_project` - Unityプロジェクトをビルド

### システム操作
- `system_setup_refresh` - Unityリフレッシュハンドラーをセットアップ
- `system_refresh_assets` - Unityアセットをリフレッシュ
- `system_batch_start` - バッチモードを開始
- `system_batch_end` - バッチモードを終了

## サポートされているビルドターゲット

- StandaloneWindows64
- StandaloneOSX
- StandaloneLinux64
- iOS
- Android
- WebGL

## 開発

### スクリプト

- `npm run build` - TypeScriptプロジェクトをビルド
- `npm run dev` - 開発用ウォッチモード
- `npm start` - ビルド済みサーバーを実行
- `npm run clean` - ビルドディレクトリをクリーン
- `npm run test` - 自動テストを実行（実装時）
- `npm run test:manual` - 手動テストの手順

### プロジェクト構造

```
mcp-server-unity/
├── src/
│   ├── server.ts                 # メインサーバー実装
│   ├── config/                   # 設定ファイル
│   ├── services/                 # サービスレイヤー（モジュラーアーキテクチャ）
│   │   ├── project-service.ts    # Unityプロジェクト管理
│   │   ├── script-service.ts     # スクリプト操作
│   │   ├── asset-service.ts      # アセット作成
│   │   ├── shader-service.ts     # シェーダー管理
│   │   ├── editor-script-service.ts  # エディタ拡張
│   │   ├── probuilder-service.ts # ProBuilder統合
│   │   ├── package-service.ts    # パッケージ管理
│   │   ├── build-service.ts      # ビルド自動化
│   │   └── unity-refresh-service.ts  # Unityリフレッシュシステム
│   ├── templates/                # コード生成テンプレート
│   ├── types/                    # TypeScript型定義
│   ├── utils/                    # ユーティリティ関数
│   └── validators/               # 入力検証
├── tests/
│   ├── comprehensive-test.js     # 全機能テストスイート
│   ├── integration-test.js       # 統合テスト
│   └── run-manual-tests.sh      # 手動テストランナー
├── build/                        # コンパイル出力（gitignore対象）
├── package.json                  # プロジェクト設定
├── tsconfig.json                 # TypeScript設定
├── setup.sh                      # セットアップスクリプト
└── REGRESSION_TEST_CASES.md      # 詳細なテストドキュメント
```

## トラブルシューティング

### Unityプロジェクトが認識されない
- プロジェクトパスに `Assets` と `ProjectSettings` フォルダが含まれていることを確認
- ファイル権限を確認

### ビルドコマンドが失敗する
- Unityが期待される場所にインストールされていることを確認
- カスタムUnityインストールの場合は、フォークでUnityパスを修正

### スクリプトが見つからない
- スクリプトはAssetsフォルダから再帰的に検索されます
- ファイルに.cs拡張子があることを確認

## テスト

プロジェクトには100%の機能カバレッジを持つ包括的なテストケースが含まれています：

### 包括的テストスイート
```bash
# 全機能テストの実行（38テストケース）
node tests/comprehensive-test.js /path/to/unity/project

# 例
node tests/comprehensive-test.js /Users/me/Unity/MyProject
```

### 自動統合テスト
```bash
# Unityプロジェクトを指定して統合テストを実行
npm run test:integration /path/to/unity/project

# 例
npm run test:integration /Users/me/Unity/MyProject
```

### 手動テスト
```bash
# ガイド付き手動テストを実行
./tests/run-manual-tests.sh /path/to/unity/project
```

### テストカバレッジ
- **38の自動テストケース**で全機能をカバー
- **10のテストカテゴリ**: プロジェクト、スクリプト、アセット、シェーダー、エディタ、ProBuilder、パッケージ、リフレッシュ、ビルド、エラー
- テスト実行後の**自動クリーンアップ**
- 各テストの**パフォーマンスメトリクス**

- **テストケース**: 詳細なテストケースは [REGRESSION_TEST_CASES.md](REGRESSION_TEST_CASES.md) を参照
- **テストフレームワーク**: `tests/integration-test.js` に統合テスト

## コントリビューション

開発環境のセットアップと貢献ガイドラインについては、[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

MITライセンス - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## リポジトリ

推奨リポジトリ名: `mcp-server-unity`

MCPエコシステムの命名規則に従い、MCPサーバーは `mcp-server-` で始まる名前を使用します。