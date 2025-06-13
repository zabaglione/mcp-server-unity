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
- `asset_read_script` - スクリプト内容を読み取り
- `asset_update_script` - スクリプト内容を更新
- `asset_list_scripts` - 全スクリプトを一覧表示
- `asset_create_scene` - Unity シーンを作成
- `asset_create_shader` - シェーダーを作成（builtin、URP、HDRP、ShaderGraph）
- `asset_read_shader` - シェーダー内容を読み取り
- `asset_update_shader` - シェーダー内容を更新
- `asset_list_shaders` - 全シェーダーを一覧表示

### マテリアル管理
- `asset_create_material` - レンダーパイプライン自動検出でマテリアルを作成
- `asset_create_material_with_shader` - 特定のシェーダーでマテリアルを作成
- `asset_update_material_shader` - マテリアルのシェーダーを変更
- `asset_update_material_properties` - マテリアルプロパティを更新
- `asset_read_material` - マテリアル情報を読み取り
- `asset_update_material` - マテリアル全体を更新（YAML形式）
- `asset_clone_material` - マテリアルを新しい名前でクローン
- `asset_batch_convert_materials` - 複数マテリアルを一括変換
- `asset_list_materials` - 全マテリアルを一覧表示

### コード分析
- `code_analyze_diff` - ファイル間の詳細な差分を取得
- `code_detect_duplicates` - 重複するクラス名を検出
- `code_suggest_namespace` - ファイル用の名前空間を提案
- `code_apply_namespace` - スクリプトに名前空間を適用

### コンパイルツール
- `compile_get_errors` - コンテキスト付きのコンパイルエラーを取得
- `compile_get_status` - 現在のコンパイル状態を取得
- `compile_install_helper` - コンパイル監視ヘルパーをインストール

### UI Toolkit操作
- `ui_create_uxml` - UXMLレイアウトファイルを作成
- `ui_create_uss` - USSスタイルファイルを作成
- `ui_update_uxml` - 既存のUXML内容を更新
- `ui_update_uss` - 既存のUSS内容を更新
- `ui_read_uxml` - UXMLファイル内容を読み取り
- `ui_read_uss` - USSファイル内容を読み取り
- `ui_list_uxml` - 全UXMLファイルを一覧表示
- `ui_list_uss` - 全USSファイルを一覧表示
- `ui_create_component` - 完全なUIコンポーネントを作成（UXML + USS + C#）

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
「既存のシェーダーを更新」
「マテリアルをクローンして新しいバリエーションを作成」
```

### コード分析
```
「PlayerControllerの変更内容を確認」
「重複するクラス名がないかチェック」
「適切な名前空間を提案」
```

### UI Toolkit
```
# 重要：効果的な指示パターン
UI Toolkitを正しく認識させるには、「UI Toolkitのpanelコンポーネント」のような具体的なキーワードを使用するか、ファイルタイプ（UXML、USS）を明示してください。

# ゲームHUDの作成
✅ 推奨 - コンポーネントタイプを指定
「UI Toolkitのpanelコンポーネントとして、GameHUDを作成してください。体力バー、スコア表示、ミニマップを含めてください」

✅ 推奨 - ファイルタイプを明示
「体力バー付きゲームHUD用のGameHUD.uxml、GameHUD.uss、GameHUDController.csを作成」

# 設定メニューの作成
✅ 推奨方法
「UI Toolkitのpanelコンポーネントとして、グラフィック、オーディオ、コントロールのタブを持つSettingsMenuを作成」

別の方法：コンポーネントタイプを指定
「UI Toolkitのformコンポーネントとして設定メニューを作成」

# カスタムUIコンポーネント
✅ コンポーネントタイプを指定して認識率向上
「ホバーエフェクト付きのCustomButtonというUI Toolkitのbuttonコンポーネントを作成」

# インベントリシステム
「アイテムスロットとドラッグ＆ドロップ対応のInventorySystemというUI Toolkitのpanelコンポーネントを作成」

# ダイアログシステム
「タイプライター効果付きのDialogBoxというUI Toolkitのmodalコンポーネントを作成」

# 既存UIの更新
「MainMenu.uxmlにクレジットボタンを追加」
「GameTheme.ussをダークカラースキームに更新」

# UIファイルの読み取り
「現在のHUD.uxmlレイアウトを表示」
「GameTheme.ussのスタイルを読み取る」

# 段階的アプローチ（自動認識が失敗した場合）
「1. UI Toolkit用のHUD.uxmlを作成」
「2. スタイリング用のHUD.ussを作成」
「3. UIロジック用のHUDController.csを作成」
```

## UI Toolkitのトラブルシューティング

UI ToolkitのコマンドがUXML/USSファイルではなくC#スクリプトのみを作成する場合：

1. **具体的なコンポーネントタイプを使用**：単に「UI Toolkit」ではなく「UI Toolkitのpanelコンポーネント」と指定
2. **コンポーネント名を明示的に指定**：「GameHUDという名前のUI Toolkitのpanelコンポーネントを作成」
3. **ファイルタイプに言及**：「GameHUD.uxmlとGameHUD.ussを作成」
4. 自動認識が失敗した場合は**段階的アプローチを使用**

## 最近の更新

### v2.3.0 (2025-06-13)
- UI Toolkit完全サポートを追加
- UXML/USSファイルの作成、読み取り、更新機能
- 完全なUIコンポーネント作成（UXML + USS + C#）
- 複数のUIテンプレート（ボタン、パネル、リスト、フォーム、カード、モーダル）
- テーマシステムとユーティリティスタイルのサポート

### v2.2.0 (2025-06-06)
- シェーダーとマテリアルの更新機能を追加
- 一時的なバックアップシステムを実装（自動クリーンアップ付き）
- マテリアルクローン機能を追加
- シェーダーGUIDキャッシュと検索を強化
- シェーダーの包括的な読み取り操作を追加

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