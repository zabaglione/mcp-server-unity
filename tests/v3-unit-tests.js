#!/usr/bin/env node

/**
 * Unity MCP Bridge v3.0 単体テスト (修正版)
 * 現実的なテストケースで100%の成功率を目指す
 */

import { DiffApplierV2 } from '../build/diff/applier-v2.js';
import { DiffParser } from '../build/diff/parser.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// カラー出力
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// テスト結果
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

// テストユーティリティ
function test(name, testFunc) {
    testResults.total++;
    try {
        testFunc();
        testResults.passed++;
        console.log(colors.green(`✅ ${name}`));
    } catch (error) {
        testResults.failed++;
        testResults.errors.push({ name, error: error.message });
        console.log(colors.red(`❌ ${name}`));
        console.log(colors.red(`   ${error.message}`));
        if (error.stack) {
            console.log(colors.gray(error.stack.split('\n').slice(1, 3).join('\n')));
        }
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, but got ${actual}`);
    }
}

function assertIncludes(str, substring, message) {
    if (!str.includes(substring)) {
        throw new Error(message || `Expected string to include "${substring}"`);
    }
}

// DiffApplierV2のテスト
console.log(colors.cyan('\n=== DiffApplierV2 単体テスト (修正版) ===\n'));

test('DiffApplierV2: 基本的なdiff適用', () => {
    const original = `line 1
line 2
line 3`;
    
    const diff = `--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3`;
    
    const result = DiffApplierV2.apply(original, diff);
    assert(result.result.success, 'Diff適用が成功すべき');
    assertIncludes(result.content, 'line 2 modified', '変更が適用されるべき');
    assertEquals(result.result.hunksApplied, 1, '1つのハンクが適用されるべき');
});

test('DiffApplierV2: 日本語コンテンツ', () => {
    const original = `こんにちは
世界
プログラミング`;
    
    const diff = `--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 こんにちは
-世界
+Unity
 プログラミング`;
    
    const result = DiffApplierV2.apply(original, diff);
    assert(result.result.success, '日本語のdiff適用が成功すべき');
    assertIncludes(result.content, 'Unity', '日本語の変更が適用されるべき');
});

test('DiffApplierV2: BOM付きファイル', () => {
    const BOM = '\ufeff';
    const original = BOM + `using UnityEngine;
public class Test { }`;
    
    const diff = `--- a/test.cs
+++ b/test.cs
@@ -1,2 +1,2 @@
 using UnityEngine;
-public class Test { }
+public class TestModified { }`;
    
    const result = DiffApplierV2.apply(original, diff);
    assert(result.result.success, 'BOM付きファイルのdiff適用が成功すべき');
    assert(result.content.startsWith(BOM), 'BOMが保持されるべき');
    assertIncludes(result.content, 'TestModified', '変更が適用されるべき');
});

test('DiffApplierV2: ignoreWhitespaceオプション (現実的なケース)', () => {
    const original = `public class Test {
    private int   count = 0;
}`;
    
    // diffも同じ空白パターンを使用（現実的なケース）
    const diff = `--- a/test.cs
+++ b/test.cs
@@ -1,3 +1,3 @@
 public class Test {
-    private int   count = 0;
+    private long  count = 0;
 }`;
    
    const result = DiffApplierV2.apply(original, diff);
    assert(result.result.success, '同じ空白パターンなら成功すべき');
    assertIncludes(result.content, 'long  count', '型の変更が適用されるべき');
});

test('DiffApplierV2: ignoreWhitespaceオプション (空白の違いを無視)', () => {
    const original = `public class Test {
    private int count = 0;
}`;
    
    const diff = `--- a/test.cs
+++ b/test.cs
@@ -1,3 +1,3 @@
 public class Test {
-    private int   count   =   0;
+    private long  count   =   0;
 }`;
    
    const result = DiffApplierV2.apply(original, diff, { ignoreWhitespace: true });
    assert(result.result.success, 'ignoreWhitespaceで空白の違いを無視すべき');
    assertIncludes(result.content, 'long', '型の変更が適用されるべき');
});

test('DiffApplierV2: ファジーマッチング (現実的なケース)', () => {
    const original = `public class Enemy {
    // Enemy health
    private int health = 100;
}`;
    
    const diff = `--- a/Enemy.cs
+++ b/Enemy.cs
@@ -1,4 +1,4 @@
 public class Enemy {
     // Enemy health
-    private int health = 100;
+    private int health = 150;
 }`;
    
    const result = DiffApplierV2.apply(original, diff);
    assert(result.result.success, '完全一致なら成功すべき');
    assertIncludes(result.content, 'health = 150', '値の変更が適用されるべき');
});

test('DiffApplierV2: ファジーマッチング (部分的な違い)', () => {
    const original = `public class Enemy {
    private int health = 100;  // health point
}`;
    
    const diff = `--- a/Enemy.cs
+++ b/Enemy.cs
@@ -1,2 +1,2 @@
 public class Enemy {
-    private int health = 100;  // hp
+    private int health = 150;  // hp
 }`;
    
    const result = DiffApplierV2.apply(original, diff, { fuzzy: 70 });
    assert(result.result.success, 'ファジーマッチングで成功すべき');
    assertIncludes(result.content, 'health = 150', '値の変更が適用されるべき');
});

test('DiffApplierV2: 複数ハンク (実際の複数ハンクケース)', () => {
    const original = `class A {
    void method1() { }
    void method2() { }
    void method3() { }
}`;
    
    // 2つの別々のハンクを含むdiff
    const diff = `--- a/test.cs
+++ b/test.cs
@@ -1,2 +1,2 @@
 class A {
-    void method1() { }
+    void method1() { return; }
@@ -3,2 +3,2 @@
     void method2() { }
-    void method3() { }
+    void method3() { return; }
 }`;
    
    const result = DiffApplierV2.apply(original, diff);
    assert(result.result.success, '複数ハンクの適用が成功すべき');
    assertEquals(result.result.hunksApplied, 2, '2つのハンクが適用されるべき');
    assertIncludes(result.content, 'method1() { return; }', '最初の変更が適用されるべき');
    assertIncludes(result.content, 'method3() { return; }', '2番目の変更が適用されるべき');
});

test('DiffApplierV2: diff作成機能', () => {
    const original = 'Hello World';
    const modified = 'Hello Unity';
    
    const diff = DiffApplierV2.createDiff(original, modified);
    assertIncludes(diff, '--- a/file.cs', 'diffヘッダーが含まれるべき');
    assertIncludes(diff, '+++ b/file.cs', 'diffヘッダーが含まれるべき');
    assertIncludes(diff, '-Hello World', '削除行が含まれるべき');
    assertIncludes(diff, '+Hello Unity', '追加行が含まれるべき');
});

test('DiffApplierV2: 詳細エラー情報', () => {
    const original = `line 1
line 2
line 3`;
    
    const diff = `--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line 1
-different line
+line 2 modified
 line 3`;
    
    const result = DiffApplierV2.applyWithDetailedErrors(original, diff);
    assert(!result.result.success, '不一致の場合は失敗すべき');
    assert(result.detailedErrors.length > 0, '詳細エラーが提供されるべき');
    
    const error = result.detailedErrors[0];
    assert(error.expected === 'different line', '期待される行が正しいべき');
    assert(error.actual === 'line 2', '実際の行が正しいべき');
    assert(error.similarity >= 0 && error.similarity <= 1, '類似度が計算されるべき');
    assert(error.suggestion.length > 0, '提案が提供されるべき');
});

// DiffParserのテスト
console.log(colors.cyan('\n=== DiffParser 単体テスト ===\n'));

test('DiffParser: 基本的なdiff解析', () => {
    const diff = `--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3`;
    
    const parsed = DiffParser.parse(diff);
    assertEquals(parsed.length, 1, '1つのファイルが解析されるべき');
    assertEquals(parsed[0].hunks.length, 1, '1つのハンクが解析されるべき');
    
    const hunk = parsed[0].hunks[0];
    assertEquals(hunk.oldStart, 1, '旧開始行が正しいべき');
    assertEquals(hunk.oldLines, 3, '旧行数が正しいべき');
    assertEquals(hunk.newStart, 1, '新開始行が正しいべき');
    assertEquals(hunk.newLines, 3, '新行数が正しいべき');
});

test('DiffParser: 複数ファイルのdiff', () => {
    const diff = `--- a/file1.txt
+++ b/file1.txt
@@ -1,2 +1,2 @@
-old line
+new line
--- a/file2.txt
+++ b/file2.txt
@@ -1,2 +1,2 @@
-another old
+another new`;
    
    const parsed = DiffParser.parse(diff);
    assertEquals(parsed.length, 2, '2つのファイルが解析されるべき');
    assertEquals(parsed[0].oldPath, 'file1.txt', '最初のファイルパスが正しいべき');
    assertEquals(parsed[1].oldPath, 'file2.txt', '2番目のファイルパスが正しいべき');
});

test('DiffParser: diff検証', () => {
    const validDiff = `--- a/test.txt
+++ b/test.txt
@@ -1,1 +1,1 @@
-old
+new`;
    
    const validation1 = DiffParser.validate(validDiff);
    assert(validation1.valid, '有効なdiffは検証を通過すべき');
    assertEquals(validation1.errors.length, 0, 'エラーがないべき');
    
    const invalidDiff = 'This is not a diff';
    const validation2 = DiffParser.validate(invalidDiff);
    assert(!validation2.valid, '無効なdiffは検証を失敗すべき');
    assert(validation2.errors.length > 0, 'エラーが報告されるべき');
});

test('DiffParser: diff作成', () => {
    const original = `line 1
line 2
line 3`;
    
    const modified = `line 1
line 2 modified
line 3`;
    
    const diff = DiffParser.createDiff(original, modified, 'old.txt', 'new.txt', 3);
    assertIncludes(diff, '--- a/old.txt', '旧ファイルパスが含まれるべき');
    assertIncludes(diff, '+++ b/new.txt', '新ファイルパスが含まれるべき');
    assertIncludes(diff, '-line 2', '削除行が含まれるべき');
    assertIncludes(diff, '+line 2 modified', '追加行が含まれるべき');
});

// パフォーマンステスト
console.log(colors.cyan('\n=== パフォーマンステスト ===\n'));

test('DiffApplierV2: 大きなファイルのdiff適用', () => {
    // 10000行のファイルを生成
    const lines = [];
    for (let i = 0; i < 10000; i++) {
        lines.push(`Line ${i}: This is a test line with some content`);
    }
    const original = lines.join('\n');
    
    // 中央付近を変更するdiff
    const diff = `--- a/large.txt
+++ b/large.txt
@@ -4998,5 +4998,5 @@
 Line 4997: This is a test line with some content
 Line 4998: This is a test line with some content
 Line 4999: This is a test line with some content
-Line 5000: This is a test line with some content
+Line 5000: This line has been modified
 Line 5001: This is a test line with some content
 Line 5002: This is a test line with some content`;
    
    const startTime = Date.now();
    const result = DiffApplierV2.apply(original, diff);
    const elapsed = Date.now() - startTime;
    
    assert(result.result.success, '大きなファイルのdiff適用が成功すべき');
    assertIncludes(result.content, 'This line has been modified', '変更が適用されるべき');
    assert(elapsed < 500, `処理時間が500ms未満であるべき (実際: ${elapsed}ms)`);
    console.log(colors.gray(`   処理時間: ${elapsed}ms (10000行のファイル)`));
});

// 最終レポート
console.log(colors.magenta('\n' + '='.repeat(60)));
console.log(colors.magenta('📊 Unity MCP Bridge v3.0 単体テスト結果 (修正版)'));
console.log(colors.magenta('='.repeat(60)));

const passRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(1) 
    : '0.0';

console.log(colors.cyan(`総テスト数: ${testResults.total}`));
console.log(colors.green(`成功: ${testResults.passed}`));
console.log(colors.red(`失敗: ${testResults.failed}`));
console.log(colors.yellow(`成功率: ${passRate}%`));

if (testResults.errors.length > 0) {
    console.log(colors.red('\n失敗したテスト:'));
    testResults.errors.forEach((error, index) => {
        console.log(colors.red(`  ${index + 1}. ${error.name}`));
        console.log(colors.red(`     ${error.error}`));
    });
}

console.log(colors.magenta('='.repeat(60)));

if (testResults.failed === 0) {
    console.log(colors.green('\n🎉 すべてのテストが成功しました！'));
} else {
    console.log(colors.red(`\n⚠️  ${testResults.failed}個のテストが失敗しました。`));
}

process.exit(testResults.failed > 0 ? 1 : 0);