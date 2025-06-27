# MCP Desktop Extension (.dxt) 作成ガイド

## 重要な発見事項

### 問題の根本原因
Claude Desktop は .dxt パッケージ内のディレクトリを「ファイル」として読み込もうとするため、以下のようなエラーが発生します：
```
ENOENT: no such file or directory, open '.../build/'
ENOENT: no such file or directory, open '.../node_modules/'
ENOENT: no such file or directory, open '.../dependencies/'
```

### 解決策：完全にフラットな構造にする
**すべてのコードと依存関係を単一のJavaScriptファイルにバンドルする**

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

# esbuildで単一ファイルにバンドル
npx esbuild build/your-server.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=extension-package/bundled-server.js \
  --external:fsevents \  # プラットフォーム固有のモジュールは除外
  --format=esm \
  --banner:js="#!/usr/bin/env node"

# 実行権限を付与
chmod +x extension-package/bundled-server.js

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

### プラットフォーム固有モジュールの除外
```bash
--external:fsevents  # macOS固有
--external:@parcel/watcher  # オプショナルな依存関係
```

### 大きなファイルサイズへの対処
- バンドル後のファイルサイズが大きい場合（>1MB）でも動作します
- Unity MCPの例：333KB（バンドル後）

### Node.js バージョン
```bash
--target=node18  # Claude Desktop の Node.js バージョンに合わせる
```

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

## まとめ

MCP Desktop Extension を作成する際の最重要ポイント：
- **ディレクトリ構造は使用しない** - Claude Desktop はディレクトリをファイルとして読み込もうとする
- **すべてを単一のJavaScriptファイルにバンドル** - esbuild が最適
- **manifest.json は正確に** - 特に entry_point の設定
- **テストは実際のインストールで** - 構造の問題は実際にインストールするまで分からない

この方法に従えば、Claude Desktop で確実に動作する MCP 拡張機能を作成できます。