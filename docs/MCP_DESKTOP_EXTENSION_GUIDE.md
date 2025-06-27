# MCP Desktop Extension (.dxt) 作成ガイド

## 重要な発見事項

### 問題の根本原因
1. **ディレクトリ構造の問題**: Claude Desktop は .dxt パッケージ内のディレクトリを「ファイル」として読み込もうとするため、ENOENT エラーが発生
2. **Shebang の問題**: `#!/usr/bin/env node` が含まれていると SyntaxError が発生
3. **モジュール形式の問題**: ESM (import/export) を使用すると `Cannot use import statement outside a module` エラーが発生

### 解決策：単一ファイル + CommonJS 形式
**すべてのコードと依存関係を単一の CommonJS 形式 JavaScript ファイルにバンドルする**

## 必須要件

### 1. manifest.json の構造
```json
{
  "dxt_version": "1.0.0",
  "name": "extension-name",
  "version": "1.0.0",
  "server": {
    "type": "node",
    "entry_point": "bundled-server.js",  // 単一ファイル！
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/bundled-server.js"]
    }
  },
  "tools": [
    {
      "name": "tool_name",
      "description": "Tool description"
    }
    // ... 他のツール
  ]
}
```

### 2. ビルドプロセス

#### 必要なツール
```bash
npm install --save-dev esbuild
```

#### ビルドスクリプト例
```bash
#!/bin/bash

# TypeScriptをコンパイル
npm run build

# esbuildで単一ファイルにバンドル（重要：CommonJS形式で出力）
npx esbuild build/index.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=extension-package/bundled-server.js \
  --external:fsevents \  # プラットフォーム固有のモジュールは除外
  --format=cjs \         # CommonJS形式（重要！）

# Shebangを削除（重要！）
# esbuildが自動的に追加する可能性があるため
sed -i '' '1s/^#!/\/\/ Removed shebang: #!/' extension-package/bundled-server.js

# manifest.json をコピーしてパスを更新
cp manifest.json extension-package/
sed -i '' 's|"entry_point": ".*"|"entry_point": "bundled-server.js"|g' extension-package/manifest.json

# アイコンをコピー（あれば）
if [ -f "icon.png" ]; then
  cp icon.png extension-package/
fi

# .dxt パッケージを作成（ZIPアーカイブ）
cd extension-package
zip -r ../your-extension.dxt . -x "*.DS_Store"
cd ..
```

## 推奨される .dxt パッケージ構造

```
your-extension.dxt (ZIPアーカイブ)
├── manifest.json           # 拡張機能のメタデータ
├── bundled-server.js       # すべてのコードと依存関係を含む単一ファイル
└── icon.png               # オプション（512x512推奨）
```

**重要**: サブディレクトリは作成しないこと！

## よくある間違いと対策

### ❌ 間違い：node_modules を含める
```
extension.dxt
├── manifest.json
├── server.js
└── node_modules/    # これがエラーの原因！
```

### ✅ 正解：依存関係をバンドル
```
extension.dxt
├── manifest.json
├── bundled-server.js  # node_modules の内容はここに含まれる
└── icon.png
```

### ❌ 間違い：複数のディレクトリ構造
```
extension.dxt
├── manifest.json
├── build/          # エラー！
├── src/            # エラー！
└── lib/            # エラー！
```

### ✅ 正解：フラットな構造
```
extension.dxt
├── manifest.json
├── bundled-server.js
└── icon.png
```

## esbuild の重要な設定

### 必須設定
```bash
--format=cjs      # CommonJS形式（ESMではエラーになる）
--platform=node   # Node.js環境
--target=node18   # Claude Desktop の Node.js バージョン
```

### プラットフォーム固有モジュールの除外
```bash
--external:fsevents  # macOS固有
--external:@parcel/watcher  # オプショナルな依存関係
```

### Shebang の処理
```bash
# esbuildが自動的に追加する shebang を削除
sed -i '' '1s/^#!/\/\/ Removed shebang: #!/' bundled-file.js
```

### 大きなファイルサイズへの対処
- バンドル後のファイルサイズが大きい場合（>1MB）でも動作します
- Unity MCPの例：326KB（バンドル後）

## テストとデバッグ

### 1. パッケージ構造の確認
```bash
unzip -l your-extension.dxt
# ディレクトリが含まれていないことを確認
```

### 2. manifest.json の検証
```bash
# entry_point が単一ファイルを指していることを確認
cat manifest.json | jq '.server.entry_point'
```

### 3. バンドルファイルの動作確認
```bash
# 直接実行してエラーがないか確認
node bundled-server.js
```

## Unity MCP での実装例

完全な実装例は以下を参照：
- [build-extension.sh](../scripts/build-extension.sh)
- [manifest.json](../manifest.json)

### 成功のポイント
1. **esbuild** を使用してすべての依存関係を単一ファイルにバンドル
2. **フラットな構造** - サブディレクトリなし
3. **manifest.json の正確な設定** - entry_point は単一ファイルを指す
4. **適切な除外設定** - プラットフォーム固有のモジュールは除外

## デバッグ方法

### インストール後のファイル確認
```bash
# macOS の場合
cd "/Users/$USER/Library/Application Support/Claude/Claude Extensions/local.dxt.your-extension-name/"
ls -la

# ファイルを直接実行してテスト
node bundled-server.js
```

### ログファイルの確認
```bash
# macOS の場合
tail -f "/Users/$USER/Library/Logs/Claude/mcp-server-your-extension-name.log"
```

## まとめ

MCP Desktop Extension を作成する際の最重要ポイント：

1. **ディレクトリ構造は使用しない** - Claude Desktop はディレクトリをファイルとして読み込もうとする
2. **単一の CommonJS ファイルにバンドル** - esbuild で `--format=cjs` を使用
3. **Shebang を削除** - `#!/usr/bin/env node` は SyntaxError の原因
4. **manifest.json は正確に** - 特に entry_point の設定
5. **テストは実際のインストールで** - 構造の問題は実際にインストールするまで分からない

### 確認済みの動作環境
- Claude Desktop (macOS)
- Node.js v20.15.0
- esbuild でバンドル
- CommonJS 形式

この方法に従えば、Claude Desktop で確実に動作する MCP 拡張機能を作成できます。