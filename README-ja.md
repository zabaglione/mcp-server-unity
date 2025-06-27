# Unity 6 MCP Bridge v3.0.0

**AIアシスタント向けUnity Editor直接統合**

[English README is here](README.md) | [日本語](README-ja.md)

[![Unity 6](https://img.shields.io/badge/Unity-6000.0+-blue.svg)](https://unity.com/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Test Status](https://img.shields.io/badge/Tests-100%25-success.svg)](V3_TEST_REPORT.md)

Unity 6 MCP Bridgeは、AIアシスタント（Claudeなど）とUnity Editorの間でダイレクトなAPI連携を実現します。Unity 6000以降向けの完全な再実装で、業界標準のdiff処理と堅牢なエラーハンドリングを特徴としています。

## 🚀 主な機能

### Unity 6統合
- **Unity APIの直接呼び出し** - Named Pipes/Domain Sockets経由
- **リアルタイム同期** - Unity Editorとの即時連携
- **ネイティブAssetDatabase操作** - metaファイル問題を解決
- **Roslyn搭載コード解析** とIntelliSense
- **Unity 6テンプレートシステム** によるコード生成

### スクリプト操作
- **script_create** - Unity 6テンプレートからスクリプト生成（MonoBehaviour、ScriptableObject、Editor、Custom）
- **script_read** - 大容量ファイル対応のストリーミング読み取り
- **script_delete** - 参照チェック付き安全な削除
- **script_rename** - クラス名自動更新付きリネーム
- **script_update_diff** - ファジーマッチングと空白処理付きdiff適用
- **script_apply_patch** - ロールバック対応の複数ファイル一括変更
- **script_create_diff** - コンテンツ間のunified diff生成
- **script_validate_diff** - 適用前のdiff検証

### フォルダー管理
- **folder_create** - 親ディレクトリの自動作成
- **folder_delete** - アセットクリーンアップ付き安全な削除
- **folder_rename** - 参照更新付きリネーム
- **folder_list** - Unityメタデータ（GUID、タイプ）付き一覧表示

### 高度なDiff処理 (v3.0)
- **業界標準のdiff-match-patchアルゴリズム** (Google製)
- **ファジーマッチング** - 軽微な差異への対応
- **BOM保持** - Unityファイル向け
- **詳細なエラーレポート** - 行単位の分析
- **高速処理** - 10,000行を5ms以内で処理

## インストール

### 前提条件
- **Unity 6000.0以降** （必須）
- **Node.js 18+**
- **Claude Desktop** または互換MCPクライアント

### 1. MCP Bridgeのインストール
```bash
npm install -g unity-mcp-bridge
```

### 2. Unity Bridgeのプロジェクトへのインストール

ビルトインインストーラーを使用：
```bash
# Claude Desktop設定後、このMCPツールを使用：
bridge_install --projectPath /path/to/your/unity/project
```

または手動インストール：
1. `src/unity-scripts/`からUnityスクリプトをコピー
2. Unityプロジェクトの`Assets/Editor/MCP/`に配置
3. Unityが自動的にコンパイルしBridgeを開始

### 3. Claude Desktopの設定

Claude Desktopの設定ファイル（macOSの場合：`~/Library/Application Support/Claude/claude_desktop_config.json`）に追加：

```json
{
  "mcpServers": {
    "unity-bridge": {
      "command": "unity-mcp-bridge",
      "args": []
    }
  }
}
```

## 📖 使用例

### プロジェクトパスの設定
```bash
# 作業するUnityプロジェクトを設定
project_set_path /path/to/your/unity/project

# 接続状態を確認
project_get_info
```

### スクリプト操作
```bash
# 新しいプレイヤーコントローラーを作成
script_create Player --template MonoBehaviour --folder Assets/Scripts/Player

# カスタムコンテンツで作成
script_create GameManager --content "using UnityEngine;\n\npublic class GameManager : MonoBehaviour\n{\n    // ゲームロジックをここに\n}"

# 既存スクリプトを読み取り
script_read Assets/Scripts/Enemy.cs

# クラス更新付きでリネーム
script_rename Assets/Scripts/Enemy.cs EnemyAI
```

### 高度なDiff操作
```bash
# diffを適用してコードを更新
script_update_diff Assets/Scripts/Player.cs "--- a/Player.cs\n+++ b/Player.cs\n@@ -10,7 +10,7 @@\n-    private float speed = 5.0f;\n+    private float speed = 10.0f;"

# 不正確な一致にファジーマッチングを使用
script_update_diff Assets/Scripts/Enemy.cs "$DIFF_CONTENT" --fuzzy 80 --ignoreWhitespace

# 適用前に検証
script_validate_diff Assets/Scripts/Player.cs "$DIFF_CONTENT"
```

### フォルダー操作
```bash
# ネストしたフォルダーを作成
folder_create Assets/Scripts/AI/Behaviors --recursive

# メタデータ付きでフォルダー内容を一覧表示
folder_list Assets/Scripts

# フォルダーをリネーム
folder_rename Assets/Scripts/AI Assets/Scripts/ArtificialIntelligence
```

## 🔧 技術詳細

### アーキテクチャ
- **Unity Bridge Client**: WebSocket/TCP通信でUnity Editorと連携
- **APIレイヤー**: モジュラーAPI設計（Script、Folder、Diff API）
- **MCPサーバー**: Claude Desktop向け標準I/Oインターフェース
- **エラーハンドリング**: 実行可能なメッセージを含む包括的なエラータイプ

### パフォーマンス
- 大容量ファイルサポート（1MB以上でストリーミング）
- バッチ操作サポート
- コネクションプーリングとリトライロジック
- 最適化されたdiff処理（10,000行を5ms以内）

### テスト
- 単体テストカバレッジ: 100%
- Unity Bridgeモックによる統合テスト
- パフォーマンスベンチマーク同梱
- 日本語/UTF-8完全サポート

## 📋 APIリファレンス

詳細なテスト結果とAPI例については[V3_TEST_REPORT.md](V3_TEST_REPORT.md)を参照してください。

## ⚠️ v2.xからの破壊的変更

- Unity 6向けの完全なAPI再設計
- Unity 6000.0以降が必要
- 新しいUnity Bridgeアーキテクチャ
- 業界標準のdiff処理
- すべてのv2.xサービスベースAPIを削除

## 🛠️ 開発

```bash
# 依存関係をインストール
npm install

# ビルド
npm run build

# テストを実行
npm test

# 開発モードで起動
npm run dev
```

## 🤝 貢献

貢献を歓迎します！以下の手順でお願いします：
1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. テストを実行: `npm test`
4. プルリクエストを送信

## 📜 ライセンス

MITライセンス - 詳細は[LICENSE](LICENSE)を参照。

## 🙏 謝辞

- Google's [diff-match-patch](https://github.com/google/diff-match-patch)ライブラリ
- Anthropicの[Model Context Protocol](https://modelcontextprotocol.io/)
- Unity TechnologiesのUnity 6

---

**注記**: これはv3.0の完全な再実装で、破壊的変更を含みます。v2.xのドキュメントは[v2.xブランチ](https://github.com/zabaglione/unity-mcp/tree/v2.x)を参照してください。

## 🚨 トラブルシューティング

### Unity Bridgeが接続できない
1. Unity Editorが起動していることを確認
2. `Assets/Editor/MCP/MCPBridge.cs`がインストールされていることを確認
3. Unityコンソールでコンパイルエラーがないか確認
4. ポート23456がファイアウォールでブロックされていないか確認

### Diff適用が失敗する
1. ファイルのバージョンが正しいことを確認
2. `--fuzzy`オプションを使用してファジーマッチングを有効化
3. `--ignoreWhitespace`で空白の違いを無視
4. `script_validate_diff`で事前検証を実行

### 大容量ファイルの処理が遅い
- 自動的にストリーミング処理が有効になります（1MB以上）
- ネットワーク遅延を確認
- Unity Editorの負荷を確認

## 📊 パフォーマンス指標

| 操作 | ファイルサイズ | 処理時間 |
|------|--------------|----------|
| script_read | 10MB | <100ms |
| script_update_diff | 10,000行 | <5ms |
| folder_list | 1,000アイテム | <50ms |
| script_apply_patch | 50ファイル | <500ms |

## 🔄 更新履歴

### v3.0.1 (2025-06-27)
- テスト成功率を100%に改善
- ignoreWhitespaceオプションの完全実装
- ファジーマッチングの精度向上
- 複数ハンク処理の修正

### v3.0.0 (2025-06-26)
- Unity 6向け完全再実装
- 業界標準のdiff-match-patchアルゴリズム採用
- 大容量ファイルのストリーミングサポート
- 包括的なテストスイートを追加