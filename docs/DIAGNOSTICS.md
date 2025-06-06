# Unity MCP Server - Diagnostics Guide

Unity MCP Serverの診断機能により、AIがUnityプロジェクトのエラーや問題を自律的に検出・分析できます。

## 概要

診断システムは以下の方法でUnityの状態を監視します：

1. **Unity Editor Log** - エラーと警告をリアルタイムで読み取り
2. **コンパイルエラー** - C#スクリプトのコンパイルエラーを検出
3. **アセット検証** - メタファイルやアセット参照の整合性チェック
4. **自動診断スクリプト** - Unity内で実行される診断ツール

## 使用方法

### 1. 診断システムのセットアップ

```bash
# Unity実行ファイルのパスを設定（自動検出も可能）
diagnostics_set_unity_path

# 診断スクリプトをUnityプロジェクトにインストール
diagnostics_install_script
```

### 2. 基本的な診断

```bash
# Unity Editorのログを読み取る
diagnostics_read_editor_log

# アセットの整合性を検証
diagnostics_validate_assets

# 包括的な診断サマリーを取得
diagnostics_summary
```

### 3. Unity内での診断

診断スクリプトをインストール後、Unityエディタで以下のメニューが利用可能：

- `MCP/Diagnostics/Run Full Diagnostics` - 完全な診断を実行
- `MCP/Diagnostics/Check Compilation` - コンパイル状態をチェック
- `MCP/Diagnostics/Validate Assets` - アセット検証

### 4. 診断結果の読み取り

```bash
# Unity内で実行された診断結果を読み取る
diagnostics_read_results
```

## 診断項目

### コンパイルエラー検出
- C#スクリプトのシンタックスエラー
- 型の不一致
- メソッド/プロパティの欠落
- 名前空間の競合

### アセット検証
- 欠落している.metaファイル
- 孤立した.metaファイル
- スクリプト参照の欠落
- クラス名とファイル名の不一致

### リアルタイム監視
診断スクリプトは以下を自動的に監視：
- コンパイル開始/終了イベント
- アセンブリごとのエラー
- コンソールログ

## AIによる自律診断

AIは以下のフローで問題を検出・解決できます：

1. **エラー検出**
   ```
   diagnostics_summary
   ```

2. **問題の分析**
   - エラーメッセージの解析
   - 影響範囲の特定
   - 原因の推定

3. **解決策の実行**
   - スクリプトの修正
   - アセットの再配置
   - 参照の修復

## 診断結果の形式

### Editor Log Summary
```
Unity Editor Log Summary
========================
Errors: 3
Warnings: 5

Recent Errors:
1. NullReferenceException: Object reference not set to an instance
   Stack: PlayerController.Update() at line 45

2. CS0246: The type or namespace 'MissingClass' could not be found
```

### Asset Validation Report
```
Asset Validation Report
======================
Missing .meta files (2):
  - Assets/Scripts/NewScript.cs
  - Assets/Materials/TestMaterial.mat

Script validation issues (1):
  - Assets/Scripts/WrongName.cs: Class name does not match file name
```

### Diagnostics JSON
Unity内で実行される診断は以下の形式でJSONに保存：
```json
{
  "compilation": {
    "hasErrors": true,
    "errors": [{
      "file": "Assets/Scripts/Player.cs",
      "line": 10,
      "column": 5,
      "message": "';' expected"
    }]
  },
  "assetValidation": {
    "issues": [{
      "type": "MissingMeta",
      "path": "Assets/Textures/icon.png",
      "description": "Missing .meta file"
    }]
  },
  "timestamp": "2024-01-07 10:30:45"
}
```

## トラブルシューティング

### Unity実行ファイルが見つからない
```bash
# 手動でパスを指定
diagnostics_set_unity_path /Applications/Unity/Hub/Editor/2022.3.10f1/Unity.app/Contents/MacOS/Unity
```

### ログファイルが見つからない
Unityエディタを少なくとも一度起動する必要があります。

### 診断結果が更新されない
1. Unityで`MCP/Diagnostics/Run Full Diagnostics`を実行
2. `diagnostics_read_results`で結果を読み取る

## ベストプラクティス

1. **定期的な診断**
   - 大きな変更後は必ず診断を実行
   - CIパイプラインに組み込む

2. **エラーの早期発見**
   - 診断スクリプトをインストールして自動監視
   - コンパイルエラーは即座に対処

3. **AIとの連携**
   - エラーが発生したら`diagnostics_summary`を実行
   - AIに問題の分析と解決を依頼

## 制限事項

- Unity実行ファイルへのアクセスが必要（一部機能）
- PlayModeのエラーは検出できない場合がある
- 一部のランタイムエラーは静的解析では検出不可