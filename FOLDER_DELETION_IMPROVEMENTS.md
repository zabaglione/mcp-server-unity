# Unity フォルダー削除処理の根本的改善

## 問題の原因分析

Unityのドキュメント調査により、以下の根本的問題が判明しました：

### 1. **Unity推奨方法の未使用**
- 現在の実装：手動ファイルシステム操作
- Unity推奨：`AssetDatabase.DeleteAsset()` API使用
- Unityドキュメント：「never create, move or delete them using the filesystem. Instead, you can use AssetDatabase API」

### 2. **メタファイル処理順序の問題**
- 問題：フォルダー削除後にメタファイルを削除しようとしていた
- 正解：メタファイルはフォルダーが空になった後に削除する必要がある

## 実装した根本的対策

### 1. **Unity AssetDatabase API統合**
```typescript
// Method 1: Unity AssetDatabase経由での削除（推奨）
const success = await this.deleteAssetViaUnity(relativePath);
```

- Unity標準の`AssetDatabase.DeleteAsset()`を使用
- メタファイルを自動的に適切に処理
- Unity内部の参照関係を保持

### 2. **段階的削除処理**
手動削除の場合、以下の3段階で処理：

```typescript
// Phase 1: 全ファイルとそのメタファイルを削除
// Phase 2: サブディレクトリを再帰的に削除、その後メタファイル削除
// Phase 3: 空になったディレクトリ自体を削除
```

### 3. **処理順序の最適化**
```
旧方式：
1. ディレクトリのメタファイル削除 ❌
2. ディレクトリ削除（中身含む）
→ エラー: メタファイルが先に削除されてしまう

新方式：
1. ファイルのメタファイル削除
2. ファイル削除
3. サブディレクトリ再帰処理
4. ディレクトリのメタファイル削除 ✅
5. 空ディレクトリ削除
```

### 4. **プロジェクト相対パス正規化**
```typescript
// Unity要求形式: "Assets/MyFolder/SubFolder"
relativePath = relativePath.replace(/\\/g, '/');
if (!relativePath.startsWith('Assets/')) {
  throw new Error('Can only delete folders within the Assets folder');
}
```

## 技術的詳細

### Unity AssetDatabase方式
1. 一時的なC#スクリプトを生成
2. `AssetDatabase.DeleteAsset(assetPath)`を呼び出し
3. 結果をファイルに出力
4. 一時スクリプトをクリーンアップ

### フォールバック方式
Unity API が使用できない場合：
1. **Phase 1**: 全ファイルとメタファイルをペアで削除
2. **Phase 2**: サブディレクトリを再帰的に処理
3. **Phase 3**: 最後にディレクトリとメタファイルを削除

### エラーハンドリング強化
- メタファイル削除失敗時は警告ログを出力し、処理を継続
- Unity API失敗時は自動的にフォールバック方式に切り替え
- 詳細なデバッグログでトラブルシューティングを支援

## 期待される効果

1. **メタファイルエラーの根絶**
   - `ENOENT: no such file or directory, unlink '*.meta'` エラーの解決
   
2. **Unity標準との整合性**
   - AssetDatabase API使用により、Unity内部の一貫性を保持
   
3. **安定性向上**
   - 段階的処理により、部分的失敗からの回復が可能
   
4. **デバッグ性向上**
   - 詳細なログ出力でトラブルシューティングが容易

## 使用方法

既存の`deleteFolder()`メソッドがそのまま使用可能：

```typescript
await fileOperationsService.deleteFolder('Assets/Scripts/Prompts');
```

内部で自動的に最適な削除方法を選択し、メタファイルを適切に処理します。