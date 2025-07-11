# Unity MCP Server

Unity MCP ServerでClaudeがあなたのUnityプロジェクトと連携！自然な会話でスクリプト作成、シェーダー管理、フォルダ整理ができます。

[日本語版 README はこちら](README-ja.md) | [English](README.md)

## 🎮 何ができるの？

Claudeに話しかけるだけで：
- **Unityスクリプト作成**: 「ジャンプ機能付きのPlayerControllerスクリプトを作って」
- **シェーダー管理**: 「キャラクター用のトゥーンシェーダーを作成して」
- **プロジェクト整理**: 「RPGゲーム用のフォルダ構成を作って」
- **プロジェクト情報取得**: 「使っているレンダーパイプラインは何？」

## 🚀 クイックスタート（推奨：Claude Desktop拡張機能）

### 方法1：Claude Desktop拡張機能でインストール（最も簡単）

1. **拡張機能をダウンロード**
   - [最新リリース](https://github.com/zabaglione/mcp-server-unity/releases/latest)へアクセス
   - `unity-mcp-server.dxt`（42KB）をダウンロード

2. **Claude Desktopにインストール**
   - Claude Desktopを開く
   - 拡張機能メニューへ
   - 「ファイルからインストール」をクリック
   - ダウンロードした`unity-mcp-server.dxt`を選択

3. **使ってみよう！**
   - Unityプロジェクト（2019.4以降）を開く
   - Claudeに依頼：「/path/to/projectにUnity MCPをセットアップして」
   - Claudeが自動的にすべてをインストールします！

### 方法2：手動インストール（開発者向け）

<details>
<summary>手動インストール手順を見る</summary>

1. クローンしてビルド：
   ```bash
   git clone https://github.com/zabaglione/mcp-server-unity.git
   cd mcp-server-unity
   npm install
   npm run build
   ```

2. Claude Desktopを設定：
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

</details>

## 📝 使い方

インストール後は、Claudeに自然に話しかけるだけ：

### スクリプト作成
```
あなた：「ダメージと回復を処理するPlayerHealthスクリプトを作って」
Claude：PlayerHealthスクリプトを作成します...
```

### シェーダー作成
```
あなた：「波のアニメーション付きの水シェーダーが欲しい」
Claude：波のアニメーション付き水シェーダーを作成します...
```

### プロジェクト整理
```
あなた：「プラットフォーマーゲーム用のフォルダ構成を作って」
Claude：プラットフォーマー用の整理されたフォルダ構成を作成します...
```

### プロジェクト情報確認
```
あなた：「使っているUnityバージョンとレンダーパイプラインは？」
Claude：プロジェクト情報を確認します...
```

## 🎯 機能

- ✅ **スマートなスクリプト作成** - ClaudeはUnityのパターンを理解し、適切なMonoBehaviourを作成
- ✅ **シェーダーサポート** - Built-in、URP、HDRPレンダーパイプラインに対応
- ✅ **プロジェクト整理** - フォルダの作成、移動、名前変更でプロジェクトを整理整頓
- ✅ **自動セットアップ** - 必要な時にClaudeが自動的にUnity統合をセットアップ
- ✅ **安全な操作** - すべての変更は適切なUnityアセット処理で安全に実行

## 🛠️ トラブルシューティング

### 「Unityサーバーが応答しない」
1. Unity Editorが開いているか確認
2. Unityでウィンドウ → Unity MCP Serverを確認
3. サーバーが動いていない場合は「Start Server」をクリック

### 「プロジェクトが見つからない」
- Claudeに正確なパスを伝える：「UnityプロジェクトはC:/Projects/MyGameにあります」
- Assetsフォルダがある有効なUnityプロジェクトか確認

### ヘルプが必要？
- Claudeに聞く：「Unity MCPのトラブルシューティングを手伝って」
- [Issues](https://github.com/zabaglione/mcp-server-unity/issues)を確認
- 詳細は[技術ドキュメント](TECHNICAL.md)を参照

## 🎮 Unityバージョン対応

- **Unity 2019.4+** - フルサポート
- **Unity 6 (6000.0+)** - 最高の体験のため推奨
- Windows、macOS、Linuxで動作

## 📈 最新アップデート (v3.1.1)

- ✅ レンダーパイプライン検出を修正（Built-in、URP、HDRPを正しく識別）
- ✅ AssetDatabase同期エラーを解決
- ✅ ファイル管理とUnity統合の安定性を向上

## 🤝 貢献

Unity MCP Serverの改善に協力したい？[貢献ガイド](CONTRIBUTING.md)をチェック！

## 📝 ライセンス

MITライセンス - [LICENSE](LICENSE)を参照

## 🙏 謝辞

- [Anthropic](https://anthropic.com) - ClaudeとMCPを提供
- [Unity Technologies](https://unity.com) - 素晴らしいゲームエンジン
- すべての貢献者とユーザーの皆様！

---

**ClaudeでUnity開発を加速する準備はできましたか？** [今すぐ拡張機能をダウンロード！](https://github.com/zabaglione/mcp-server-unity/releases/latest)