⏺ Unity MCPサーバー diffベースアップデート機能仕様

  1. 基本機能

  script_update_diff

  ファイル単体に対してdiffを適用する基本機能

  script_update_diff(
    path: string,           // 対象ファイルパス (例: "Assets/Scripts/Player.cs")
    diff: string,           // unified diff形式の文字列
    options?: DiffOptions   // オプション設定
  ): DiffResult

  interface DiffOptions {
    // マッチング設定
    fuzzy?: number;              // ファジーマッチング許容度 (0-100, デフォルト: 0)
    ignoreWhitespace?: boolean;  // 空白文字を無視 (デフォルト: false)
    ignoreCase?: boolean;        // 大文字小文字を無視 (デフォルト: false)

    // 安全性設定
    createBackup?: boolean;      // 適用前にバックアップ作成 (デフォルト: true)
    validateSyntax?: boolean;    // 適用後に構文チェック (デフォルト: true)
    dryRun?: boolean;           // 実際には適用しない (デフォルト: false)

    // エラーハンドリング
    partial?: boolean;          // 部分的な適用を許可 (デフォルト: false)
    stopOnError?: boolean;      // エラー時に中断 (デフォルト: true)
  }

  interface DiffResult {
    success: boolean;           // 全体の成功/失敗
    path: string;              // 処理したファイルパス
    hunksTotal: number;        // 総ハンク数
    hunksApplied: number;      // 適用成功したハンク数
    hunksRejected: number;     // 拒否されたハンク数

    // 詳細情報
    applied: HunkResult[];     // 適用されたハンクの詳細
    rejected: RejectedHunk[];  // 拒否されたハンクの詳細
    warnings: string[];        // 警告メッセージ

    // バックアップ情報
    backupPath?: string;       // バックアップファイルのパス

    // プレビュー (dryRun時のみ)
    preview?: string;          // 適用後のファイル内容プレビュー

    // 検証結果
    syntaxValid?: boolean;     // 構文チェック結果
    compileErrors?: string[];  // コンパイルエラー
  }

  interface HunkResult {
    hunkIndex: number;         // ハンクのインデックス
    startLine: number;         // 適用開始行
    linesRemoved: number;      // 削除された行数
    linesAdded: number;        // 追加された行数
  }

  interface RejectedHunk {
    hunkIndex: number;         // ハンクのインデックス
    reason: string;            // 拒否理由
    expectedContext: string[]; // 期待されていたコンテキスト
    actualContext: string[];   // 実際のコンテキスト
    suggestion?: string;       // 修正提案
  }

  2. 複数ファイル対応

  script_apply_patch

  複数ファイルへの一括パッチ適用

  script_apply_patch(
    patch: string | PatchFile[],  // Git形式のパッチ or 個別ファイル配列
    options?: PatchOptions
  ): PatchResult

  interface PatchFile {
    path: string;                 // ファイルパス
    diff: string;                 // そのファイルのdiff
    priority?: number;            // 適用優先順位 (小さいほど先)
  }

  interface PatchOptions extends DiffOptions {
    // トランザクション設定
    atomic?: boolean;             // 全て成功 or 全てロールバック (デフォルト: true)
    continueOnError?: boolean;    // エラー時も継続 (デフォルト: false)

    // 進捗コールバック
    onProgress?: (current: number, total: number, file: string) => void;
  }

  interface PatchResult {
    success: boolean;             // 全体の成功/失敗
    filesTotal: number;           // 総ファイル数
    filesProcessed: number;       // 処理されたファイル数
    filesSucceeded: number;       // 成功したファイル数
    filesFailed: number;          // 失敗したファイル数

    // 個別結果
    results: Map<string, DiffResult>;  // ファイルパスごとの結果

    // ロールバック情報
    rollbackAvailable: boolean;   // ロールバック可能か
    rollbackPaths?: string[];     // ロールバック対象パス
  }

  3. diffフォーマット仕様

  サポートするdiff形式

  --- a/Assets/Scripts/Player.cs
  +++ b/Assets/Scripts/Player.cs
  @@ -10,7 +10,7 @@ public class Player : MonoBehaviour
       {
           health = maxHealth;
           speed = 5f;
  -        Debug.Log("Player initialized");
  +        Debug.Log($"Player initialized with health: {health}");
       }

       void Update()

  拡張unified diff形式（オプション）

  --- a/Assets/Scripts/Player.cs
  +++ b/Assets/Scripts/Player.cs
  @@ -10,7 +10,7 @@ public class Player : MonoBehaviour ## Start()
  - ## でメソッド名やクラス名を指定可能（より正確なマッチング）

  4. エラーハンドリング

  エラーコード

  enum DiffErrorCode {
    FILE_NOT_FOUND = "FILE_NOT_FOUND",
    INVALID_DIFF_FORMAT = "INVALID_DIFF_FORMAT",
    CONTEXT_MISMATCH = "CONTEXT_MISMATCH",
    SYNTAX_ERROR = "SYNTAX_ERROR",
    COMPILE_ERROR = "COMPILE_ERROR",
    BACKUP_FAILED = "BACKUP_FAILED",
    PERMISSION_DENIED = "PERMISSION_DENIED"
  }

  interface DiffError {
    code: DiffErrorCode;
    message: string;
    file?: string;
    line?: number;
    hunk?: number;
  }

  5. ユーティリティ機能

  script_create_diff

  2つのコンテンツからdiffを生成

  script_create_diff(
    original: string | { path: string },  // 元のコンテンツまたはファイルパス
    modified: string | { path: string },  // 変更後のコンテンツまたはファイルパス
    options?: CreateDiffOptions
  ): string

  interface CreateDiffOptions {
    contextLines?: number;        // コンテキスト行数 (デフォルト: 3)
    ignoreWhitespace?: boolean;
    ignoreCase?: boolean;
    includeHeader?: boolean;      // ファイルヘッダを含む (デフォルト: true)
  }

  script_validate_diff

  diffの妥当性を事前検証

  script_validate_diff(
    path: string,
    diff: string
  ): ValidationResult

  interface ValidationResult {
    valid: boolean;
    applicable: boolean;          // 適用可能か
    conflicts: ConflictInfo[];    // 予想されるコンフリクト
    warnings: string[];
  }

  6. Unity統合機能

  自動リフレッシュ

  // DiffOptionsに追加
  interface DiffOptions {
    // ... 既存のオプション

    // Unity統合
    refreshAssets?: boolean;      // AssetDatabase.Refresh() (デフォルト: true)
    reimportAssets?: boolean;     // 変更ファイルの再インポート (デフォルト: true)
    recompile?: boolean;          // スクリプト再コンパイル (デフォルト: true)
  }

  7. 使用例

  基本的な使用

  // 単一ファイルの更新
  const result = await script_update_diff(
    "Assets/Scripts/Player.cs",
    `@@ -15,3 +15,3 @@
  -    private float speed = 5f;
  +    private float speed = 10f;
   `,
    { validateSyntax: true }
  );

  // Gitスタイルのパッチ適用
  const patchResult = await script_apply_patch(
    `diff --git a/Assets/Scripts/Player.cs b/Assets/Scripts/Player.cs
  index abc123..def456 100644
  --- a/Assets/Scripts/Player.cs
  +++ b/Assets/Scripts/Player.cs
  @@ -15,3 +15,3 @@
  -    private float speed = 5f;
  +    private float speed = 10f;`,
    { atomic: true }
  );

  8. セキュリティ考慮事項

  - パス traversal攻撃の防止（Assets/フォルダ外へのアクセス制限）
  - 大きすぎるdiffの拒否（DoS対策）
  - バックアップファイルの自動クリーンアップ
  - 適切な権限チェック

  この仕様に基づいて実装を進めていただければ、安全で使いやすいdiffベースのファイル更新機能が実現できると思います。
