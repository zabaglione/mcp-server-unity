# Unity MCP Server - Claude Code作業指示書

## プロジェクト概要

ClaudeがUnityプロジェクトと直接連携できるModel Context Protocol (MCP) サーバーを作成してください。

### 技術仕様
- **言語**: TypeScript
- **ランタイム**: Node.js 18+
- **モジュール形式**: ESM
- **ビルドツール**: TypeScript Compiler (tsc)
- **メインライブラリ**: @modelcontextprotocol/sdk

## プロジェクト構造

```
unity-mcp-server/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── src/
│   └── index.ts                 # メインサーバー実装
├── build/                       # tscで生成（.gitignore対象）
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                      # MIT License
├── README.md
├── package.json
├── tsconfig.json
└── setup.sh                    # Unix用セットアップスクリプト
```

## 実装する機能

### 1. MCPサーバー基盤
- Model Context Protocol SDK を使用したサーバー実装
- stdio transport による Claude との通信
- エラーハンドリングとログ出力

### 2. Unity プロジェクト管理ツール

#### `set_unity_project`
- Unityプロジェクトのパスを設定・検証
- Assets、ProjectSettings フォルダの存在確認
- Scripts フォルダの自動作成

#### `create_script`
- C#スクリプトファイルの作成
- フォルダ階層対応
- .cs拡張子の自動追加

#### `read_script`
- C#スクリプトファイルの読み取り
- 再帰的ファイル検索

#### `list_scripts`
- プロジェクト内の全C#スクリプト一覧
- 相対パス表示

#### `create_scene`
- Unity シーンファイル(.unity)の作成
- 基本的なYAMLテンプレート使用

#### `create_material`
- Unity マテリアルファイル(.mat)の作成
- Standard シェーダーテンプレート

#### `list_assets`
- アセット一覧の取得
- タイプ別フィルタリング機能

#### `project_info`
- プロジェクト情報の取得
- Unityバージョン、スクリプト数、アセット数

#### `build_project`
- Unity コマンドライン経由でのビルド実行
- クロスプラットフォーム対応

### 3. MCP リソース対応
- プロジェクト設定ファイルへのアクセス
- ファイル読み取り機能

## 技術実装要件

### TypeScript設定
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "./build",
    "rootDir": "./src"
  }
}
```

### package.json 設定
```json
{
  "name": "unity-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "build/index.js",
  "bin": {
    "unity-mcp-server": "./build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 主要クラス設計

### UnityMCPServer クラス
```typescript
interface UnityProject {
  projectPath: string;
  assetsPath: string;
  scriptsPath: string;
}

class UnityMCPServer {
  private server: Server;
  private unityProject: UnityProject | null = null;

  // MCP ハンドラー設定
  private setupHandlers(): void;
  
  // Unity プロジェクト操作
  private async setUnityProject(projectPath: string);
  private async createScript(fileName: string, content: string, folder?: string);
  private async readScript(fileName: string);
  // ... その他のメソッド
}
```

## ファイルテンプレート

### Unity シーンテンプレート
基本的なYAML形式のUnityシーンファイル（OcclusionCullingSettings、RenderSettings、LightmapSettings、NavMeshSettings を含む）

### Unity マテリアルテンプレート
Standard シェーダーを使用した基本マテリアル設定

## 開発環境要件

### 必須ソフトウェア
- Node.js 18.x 以上
- npm または yarn
- TypeScript 5.x
- Git

### 推奨開発環境
- VS Code with TypeScript extension
- ESLint + Prettier (オプション)

## セットアップスクリプト要件

### Unix/Linux/macOS (setup.sh)
- Node.js バージョン確認
- プロジェクト構造作成
- 依存関係インストール
- 自動ビルド
- Claude設定例の表示

### Windows (setup.bat)
- 同等の機能をバッチファイルで実装

## GitHub設定

### CI/CD (GitHub Actions)
- Node.js 18.x, 20.x, 22.x でのテスト
- TypeScript 型チェック
- ビルド検証
- アーティファクト生成

### Issue テンプレート
- Bug Report
- Feature Request

## ドキュメント要件

### README.md
- インストール手順
- 使用方法とサンプル
- 全ツールの説明
- トラブルシューティング

### CONTRIBUTING.md
- 開発環境セットアップ
- コーディング規約
- プルリクエストガイドライン

### CHANGELOG.md
- バージョン履歴
- 機能追加・変更・修正の記録

## エラーハンドリング

### 必須エラーチェック
- Unity プロジェクトパスの妥当性
- ファイル・フォルダの存在確認
- 権限エラーの適切な処理
- MCP通信エラーの処理

## セキュリティ考慮事項

- ファイルパスの検証（パストラバーサル対策）
- 実行可能ファイルへのアクセス制限
- エラーメッセージでの機密情報漏洩防止

## Claude Codeでの作業手順提案

1. **プロジェクト初期化**
   ```bash
   claude-code "create unity-mcp-server project with TypeScript and MCP SDK"
   ```

2. **コア実装**
   ```bash
   claude-code "implement UnityMCPServer class with all Unity project management tools"
   ```

3. **設定ファイル作成**
   ```bash
   claude-code "create package.json, tsconfig.json, and build configuration"
   ```

4. **ドキュメント作成**
   ```bash
   claude-code "create README, CONTRIBUTING, and CHANGELOG documentation"
   ```

5. **CI/CD設定**
   ```bash
   claude-code "setup GitHub Actions workflow and issue templates"
   ```

## 成功基準

- TypeScript ビルドが成功する
- 全ての MCP ツールが正常に動作する
- Unity プロジェクトとの連携が確認できる
- クロスプラットフォーム対応が完了している
- 包括的なドキュメントが整備されている

## 追加情報

この仕様書に基づいて、Claude Codeでステップバイステップの実装を行ってください。各段階で動作確認を行い、問題があれば適宜修正してください。
