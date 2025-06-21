# 部分アップデート処理の修正

## 問題の原因

部分アップデート（`asset_update_script_partial`）で、意図しない場所に変更が適用される問題が発生していました。

### 根本原因
UTF-8 BOM（Byte Order Mark）の処理に問題がありました：

1. **旧実装の問題点**
   - BOMを削除してからパッチを適用していた
   - パッチの位置（start/end）は元のコンテンツ（BOM含む）の位置を指定
   - BOM削除により全ての文字位置が1つずれてしまう

```typescript
// 問題のあったコード
const hadBOM = hasUTF8BOM(originalContent);
let content = removeUTF8BOM(originalContent);  // ここでBOMを削除
// パッチ適用（位置がずれる）
content = content.substring(0, patch.start) + ...
```

## 実装した修正

### 1. BOM処理の順序を変更
```typescript
// 修正後のコード
const hadBOM = hasUTF8BOM(originalContent);
let content = originalContent;  // BOMを含んだまま処理
// パッチ適用（正しい位置で適用）
content = content.substring(0, patch.start) + ...
// 最後にBOMの一貫性を保証
```

### 2. デバッグログの追加
パッチ適用時の詳細情報をログ出力：
- パッチの位置と置換内容
- 元のテキスト内容
- コンテンツの長さ

### 3. エラーメッセージの改善
範囲外エラー時にコンテンツ長も表示：
```typescript
throw new Error(`Invalid patch range: ${patch.start}-${patch.end} (content length: ${content.length})`);
```

## 修正による効果

1. **正確な位置での部分更新**
   - BOMの有無に関わらず、指定した位置で正確に更新される
   
2. **BOMの保持**
   - 元ファイルにBOMがあれば保持
   - 元ファイルにBOMがなければ追加しない

3. **デバッグの容易化**
   - ログで実際の更新内容を確認可能
   - 問題発生時の原因特定が容易

## 使用例

```typescript
// 部分アップデートの使用例
await asset_update_script_partial({
  fileName: 'MyScript.cs',
  patches: [{
    start: 100,  // 文字位置（BOM含む）
    end: 150,
    replacement: 'new code here'
  }]
});
```

## 注意事項

- `start`と`end`は文字位置（バイト位置ではない）
- ファイルにBOMがある場合、位置0はBOM文字
- 複数パッチは自動的に逆順で適用（位置ずれを防ぐため）