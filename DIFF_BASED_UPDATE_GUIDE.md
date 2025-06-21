# Diff-Based Script Update Guide

Unity MCPサーバーに、より直感的でエラーの少ないdiff形式のスクリプト更新機能を追加しました。

## 新しいツール

### 1. `asset_update_script_diff`
diff形式のパッチを使用してスクリプトを部分的に更新します。

### 2. `asset_create_diff_from_content`
新しい完全なコンテンツと既存のスクリプトを比較してdiffパッチを生成します。

## 使用方法

### 1. 行番号指定による更新

```json
{
  "name": "asset_update_script_diff",
  "arguments": {
    "fileName": "PlayerController.cs",
    "patches": [{
      "startLine": 10,
      "endLine": 12,
      "newContent": "    public float moveSpeed = 10f;\n    public float jumpHeight = 5f;"
    }]
  }
}
```

### 2. パターン検索による更新

```json
{
  "name": "asset_update_script_diff",
  "arguments": {
    "fileName": "GameManager.cs",
    "patches": [{
      "searchPattern": "void Start()",
      "newContent": "    void Start()\n    {\n        // Initialize game\n        InitializeGame();\n    }",
      "matchMode": "exact"
    }]
  }
}
```

### 3. コンテンツベースの置換

```json
{
  "name": "asset_update_script_diff",
  "arguments": {
    "fileName": "Enemy.cs",
    "patches": [{
      "oldContent": "    void Update()\n    {\n        // TODO: Implement AI\n    }",
      "newContent": "    void Update()\n    {\n        UpdateAI();\n        CheckPlayerDistance();\n    }"
    }]
  }
}
```

### 4. コンテキスト検証付き更新

```json
{
  "name": "asset_update_script_diff", 
  "arguments": {
    "fileName": "UIManager.cs",
    "patches": [{
      "startLine": 25,
      "contextBefore": ["    private void InitializeUI()"],
      "contextAfter": ["    }"],
      "newContent": "        CreateMainMenu();\n        SetupEventHandlers();"
    }],
    "validateContext": true
  }
}
```

### 5. ドライラン（プレビュー）

```json
{
  "name": "asset_update_script_diff",
  "arguments": {
    "fileName": "PlayerHealth.cs",
    "dryRun": true,
    "patches": [{
      "searchPattern": "health > 0",
      "newContent": "health > 0 && !isDead",
      "matchMode": "fuzzy"
    }]
  }
}
```

## パッチオプション詳細

### 位置指定方法

1. **行番号ベース**
   - `startLine`: 開始行（1ベース）
   - `endLine`: 終了行（省略時はstartLineと同じ）

2. **パターンベース**
   - `searchPattern`: 検索パターン
   - `matchMode`: 
     - `"exact"`: 完全一致（デフォルト）
     - `"fuzzy"`: 大文字小文字無視
     - `"regex"`: 正規表現
   - `occurrence`: 何番目の出現を置換するか（デフォルト: 1）

3. **コンテンツベース**
   - `oldContent`: 置換対象の複数行コンテンツ

### 検証オプション

- `contextBefore`: 変更前に存在すべき行の配列
- `contextAfter`: 変更後に存在すべき行の配列
- `validateContext`: コンテキスト検証を有効化（デフォルト: true）

## 利点

1. **視覚的に分かりやすい**
   - 行番号やパターンで位置を指定
   - コンテキストで正しい場所を確認

2. **エラーが少ない**
   - 文字位置の計算不要
   - BOM処理を自動化
   - コンテキスト検証で誤った場所への適用を防止

3. **柔軟な指定方法**
   - 行番号、パターン、コンテンツの3つの方法
   - 正規表現サポート
   - 複数回出現時の指定も可能

4. **安全な更新**
   - ドライラン機能でプレビュー可能
   - アトミック書き込みでファイル破損を防止
   - Unity自動リフレッシュ連携

## 実装例

### メソッド追加
```json
{
  "patches": [{
    "searchPattern": "public class PlayerController",
    "contextAfter": ["{"],
    "newContent": "public class PlayerController : MonoBehaviour\n{\n    // New properties\n    public float speed = 5f;\n    public float jumpPower = 10f;"
  }]
}
```

### エラーハンドリング追加
```json
{
  "patches": [{
    "searchPattern": "LoadData();",
    "newContent": "try\n        {\n            LoadData();\n        }\n        catch (Exception e)\n        {\n            Debug.LogError($\"Failed to load data: {e.Message}\");\n        }",
    "contextBefore": ["    void Start()"]
  }]
}
```

### 複数箇所の一括更新
```json
{
  "patches": [
    {
      "searchPattern": "Debug.Log",
      "newContent": "// Debug.Log",
      "matchMode": "fuzzy",
      "occurrence": 1
    },
    {
      "searchPattern": "Debug.Log", 
      "newContent": "// Debug.Log",
      "matchMode": "fuzzy",
      "occurrence": 2
    }
  ]
}
```

## 既存の部分更新との使い分け

- **文字位置ベース（`asset_update_script_partial`）**
  - 精密な位置指定が必要な場合
  - プログラムによる自動生成
  - 高速な小規模変更

- **Diffベース（`asset_update_script_diff`）**
  - 人間が読みやすい形式
  - 行単位の変更
  - コンテキスト検証が必要な場合
  - 複雑なパターンマッチング