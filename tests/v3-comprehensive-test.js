#!/usr/bin/env node

/**
 * Unity MCP Bridge v3.0 包括的テストスイート
 * ゆもつよメソッドに基づく徹底的な機能テスト
 */

import { spawn } from 'child_process';
import net from 'net';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テスト環境設定
const TEST_PROJECT_PATH = '/tmp/TestUnityProject';
const TEST_TIMEOUT = 10000; // 10秒

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

// テスト結果の集計
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

// MCP クライアントクラス
class MCPTestClient {
    constructor() {
        this.server = null;
        this.requestId = 1;
        this.pendingRequests = new Map();
    }

    async start() {
        return new Promise((resolve, reject) => {
            console.log(colors.blue('🚀 MCPサーバーを起動中...'));
            
            this.server = spawn('node', [path.join(__dirname, '../build/index.js')], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let initBuffer = '';
            let initialized = false;

            this.server.stdout.on('data', (data) => {
                const str = data.toString();
                
                if (!initialized) {
                    initBuffer += str;
                    if (initBuffer.includes('\n')) {
                        initialized = true;
                        console.log(colors.green('✅ MCPサーバーが起動しました'));
                        
                        // 初期化メッセージを送信
                        this.sendMessage({
                            jsonrpc: '2.0',
                            method: 'initialize',
                            params: {
                                protocolVersion: '2024-11-05',
                                capabilities: {}
                            },
                            id: this.requestId++
                        });
                        
                        setTimeout(resolve, 1000);
                    }
                    return;
                }
                
                // 通常のメッセージ処理
                this.handleServerOutput(str);
            });

            this.server.stderr.on('data', (data) => {
                const message = data.toString();
                if (message.includes('ERROR')) {
                    console.error(colors.red('サーバーエラー:'), message);
                }
            });

            this.server.on('error', reject);
            this.server.on('exit', (code) => {
                if (code !== 0) {
                    console.error(colors.red(`サーバーが異常終了しました: ${code}`));
                }
            });
        });
    }

    handleServerOutput(data) {
        const lines = data.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            try {
                const message = JSON.parse(line);
                if (message.id && this.pendingRequests.has(message.id)) {
                    const { resolve, reject } = this.pendingRequests.get(message.id);
                    this.pendingRequests.delete(message.id);
                    
                    if (message.error) {
                        reject(new Error(message.error.message));
                    } else {
                        resolve(message.result);
                    }
                }
            } catch (e) {
                // JSON以外の出力は無視
            }
        }
    }

    sendMessage(message) {
        const json = JSON.stringify(message) + '\n';
        this.server.stdin.write(json);
    }

    async callTool(toolName, args = {}) {
        const id = this.requestId++;
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            
            this.sendMessage({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                },
                id
            });
            
            // タイムアウト設定
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Timeout calling tool: ${toolName}`));
                }
            }, TEST_TIMEOUT);
        });
    }

    async stop() {
        if (this.server) {
            this.server.kill();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// テストユーティリティ
async function runTest(name, testFunc) {
    testResults.total++;
    console.log(colors.cyan(`\n📝 ${name}`));
    
    try {
        await testFunc();
        testResults.passed++;
        console.log(colors.green(`✅ ${name}: 成功`));
    } catch (error) {
        testResults.failed++;
        testResults.errors.push({ name, error: error.message });
        console.log(colors.red(`❌ ${name}: 失敗`));
        console.log(colors.red(`   エラー: ${error.message}`));
    }
}

// Unity Bridgeのモックサーバー
class UnityBridgeMock {
    constructor() {
        this.server = null;
        this.connected = false;
    }

    async start() {
        return new Promise((resolve) => {
            this.server = net.createServer((socket) => {
                console.log(colors.gray('   Unity Bridgeモック: クライアント接続'));
                this.connected = true;
                
                socket.on('data', (data) => {
                    const lines = data.toString().split('\n').filter(line => line.trim());
                    
                    for (const line of lines) {
                        try {
                            const request = JSON.parse(line);
                            console.log(colors.gray(`   Unity Bridgeモック: ${request.method} リクエスト受信`));
                            
                            // モックレスポンスを送信
                            const response = this.getMockResponse(request);
                            socket.write(JSON.stringify(response) + '\n');
                        } catch (e) {
                            console.error(colors.red('   Unity Bridgeモック: パースエラー'), e);
                        }
                    }
                });
                
                socket.on('end', () => {
                    console.log(colors.gray('   Unity Bridgeモック: クライアント切断'));
                    this.connected = false;
                });
            });
            
            this.server.listen(23456, '127.0.0.1', () => {
                console.log(colors.gray('   Unity Bridgeモックサーバー起動 (port: 23456)'));
                resolve();
            });
        });
    }

    getMockResponse(request) {
        const response = {
            id: request.id,
            result: null
        };

        switch (request.method) {
            case 'Unity.Script.Create':
                response.result = {
                    path: request.parameters.folder + '/' + request.parameters.fileName + '.cs',
                    guid: 'mock-guid-' + Date.now(),
                    folder: request.parameters.folder,
                    success: true
                };
                break;
                
            case 'Unity.Script.Read':
                response.result = {
                    path: request.parameters.path,
                    content: `// Mock content for ${request.parameters.path}\npublic class TestClass : MonoBehaviour\n{\n    void Start() { }\n}`,
                    success: true
                };
                break;
                
            case 'Unity.Script.Delete':
                response.result = {
                    path: request.parameters.path,
                    success: true
                };
                break;
                
            case 'Unity.Folder.Create':
                response.result = {
                    path: request.parameters.path,
                    guid: 'mock-folder-guid-' + Date.now(),
                    createdPaths: [request.parameters.path],
                    success: true
                };
                break;
                
            case 'Unity.Folder.List':
                response.result = {
                    path: request.parameters.path || 'Assets',
                    folders: [
                        { name: 'Scripts', path: 'Assets/Scripts', type: 'folder', guid: 'guid-1' },
                        { name: 'Materials', path: 'Assets/Materials', type: 'folder', guid: 'guid-2' }
                    ],
                    files: [
                        { name: 'Player.cs', path: 'Assets/Scripts/Player.cs', type: 'file', extension: '.cs', guid: 'guid-3' },
                        { name: 'Enemy.cs', path: 'Assets/Scripts/Enemy.cs', type: 'file', extension: '.cs', guid: 'guid-4' }
                    ],
                    success: true
                };
                break;
                
            default:
                response.error = `Unknown method: ${request.method}`;
        }
        
        return response;
    }

    async stop() {
        if (this.server) {
            this.server.close();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// テストケース実装
async function testProjectManagement(client) {
    console.log(colors.magenta('\n=== プロジェクト管理テスト ==='));
    
    // プロジェクトパス設定
    await runTest('project_set_path', async () => {
        const result = await client.callTool('project_set_path', {
            projectPath: TEST_PROJECT_PATH
        });
        
        if (!result.content || !result.content[0].text.includes('Project path set')) {
            throw new Error('プロジェクトパスの設定に失敗');
        }
    });
    
    // プロジェクト情報取得
    await runTest('project_get_info', async () => {
        const result = await client.callTool('project_get_info', {});
        
        const text = result.content[0].text;
        if (!text.includes(TEST_PROJECT_PATH) || !text.includes('Unity Bridge')) {
            throw new Error('プロジェクト情報の取得に失敗');
        }
    });
}

async function testBridgeOperations(client) {
    console.log(colors.magenta('\n=== Unity Bridge操作テスト ==='));
    
    // Bridge状態確認
    await runTest('bridge_status', async () => {
        const result = await client.callTool('bridge_status', {
            projectPath: TEST_PROJECT_PATH
        });
        
        const text = result.content[0].text;
        if (!text.includes('MCPBridge Status Report')) {
            throw new Error('Bridge状態の確認に失敗');
        }
    });
}

async function testScriptOperations(client) {
    console.log(colors.magenta('\n=== スクリプト操作テスト ==='));
    
    // スクリプト作成 - MonoBehaviourテンプレート
    await runTest('script_create (MonoBehaviour)', async () => {
        const result = await client.callTool('script_create', {
            fileName: 'TestPlayer',
            template: 'MonoBehaviour'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('TestPlayer.cs')) {
            throw new Error('MonoBehaviourスクリプトの作成に失敗');
        }
    });
    
    // スクリプト作成 - ScriptableObjectテンプレート
    await runTest('script_create (ScriptableObject)', async () => {
        const result = await client.callTool('script_create', {
            fileName: 'TestConfig',
            template: 'ScriptableObject',
            folder: 'Assets/ScriptableObjects'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('TestConfig.cs')) {
            throw new Error('ScriptableObjectスクリプトの作成に失敗');
        }
    });
    
    // スクリプト作成 - カスタムコンテンツ
    await runTest('script_create (Custom content)', async () => {
        const customContent = `using UnityEngine;
using System.Collections.Generic;

namespace TestNamespace
{
    public class TestCustomScript : MonoBehaviour
    {
        [SerializeField] private List<string> items = new List<string>();
        
        void Start()
        {
            Debug.Log("Custom script initialized");
        }
    }
}`;
        
        const result = await client.callTool('script_create', {
            fileName: 'TestCustomScript',
            content: customContent,
            folder: 'Assets/Scripts/Custom'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success')) {
            throw new Error('カスタムスクリプトの作成に失敗');
        }
    });
    
    // スクリプト読み取り
    await runTest('script_read', async () => {
        const result = await client.callTool('script_read', {
            path: 'Assets/Scripts/Player.cs'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('Content')) {
            throw new Error('スクリプトの読み取りに失敗');
        }
    });
    
    // スクリプト名前変更
    await runTest('script_rename', async () => {
        const result = await client.callTool('script_rename', {
            oldPath: 'Assets/Scripts/Enemy.cs',
            newName: 'EnemyAI'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('EnemyAI.cs')) {
            throw new Error('スクリプトの名前変更に失敗');
        }
    });
    
    // スクリプト削除
    await runTest('script_delete', async () => {
        const result = await client.callTool('script_delete', {
            path: 'Assets/Scripts/TestPlayer.cs'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('deleted')) {
            throw new Error('スクリプトの削除に失敗');
        }
    });
}

async function testFolderOperations(client) {
    console.log(colors.magenta('\n=== フォルダ操作テスト ==='));
    
    // フォルダ作成 - 単一
    await runTest('folder_create (single)', async () => {
        const result = await client.callTool('folder_create', {
            path: 'Assets/TestFolder'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('TestFolder')) {
            throw new Error('フォルダの作成に失敗');
        }
    });
    
    // フォルダ作成 - 再帰的
    await runTest('folder_create (recursive)', async () => {
        const result = await client.callTool('folder_create', {
            path: 'Assets/Deep/Nested/Folders',
            recursive: true
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success')) {
            throw new Error('再帰的フォルダの作成に失敗');
        }
    });
    
    // フォルダ一覧
    await runTest('folder_list', async () => {
        const result = await client.callTool('folder_list', {
            path: 'Assets'
        });
        
        const text = result.content[0].text;
        if (!text.includes('folders') || !text.includes('files')) {
            throw new Error('フォルダ一覧の取得に失敗');
        }
    });
    
    // フォルダ名前変更
    await runTest('folder_rename', async () => {
        const result = await client.callTool('folder_rename', {
            oldPath: 'Assets/TestFolder',
            newName: 'RenamedFolder'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('RenamedFolder')) {
            throw new Error('フォルダの名前変更に失敗');
        }
    });
    
    // フォルダ削除
    await runTest('folder_delete', async () => {
        const result = await client.callTool('folder_delete', {
            path: 'Assets/RenamedFolder'
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('deleted')) {
            throw new Error('フォルダの削除に失敗');
        }
    });
}

async function testDiffOperations(client) {
    console.log(colors.magenta('\n=== Diff操作テスト ==='));
    
    // 基本的なdiff適用
    await runTest('script_update_diff (basic)', async () => {
        const diff = `--- a/Player.cs
+++ b/Player.cs
@@ -1,5 +1,5 @@
 public class Player : MonoBehaviour
 {
-    private float speed = 5.0f;
+    private float speed = 10.0f;
     
     void Start()`;
        
        const result = await client.callTool('script_update_diff', {
            path: 'Assets/Scripts/Player.cs',
            diff: diff
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success') || !text.includes('applied')) {
            throw new Error('基本的なdiff適用に失敗');
        }
    });
    
    // ファジーマッチングを使用したdiff
    await runTest('script_update_diff (fuzzy)', async () => {
        const diff = `--- a/Enemy.cs
+++ b/Enemy.cs
@@ -10,7 +10,7 @@
     void Attack()
     {
         // Attack logic
-        Debug.Log("Enemy attacks!");
+        Debug.Log("Enemy attacks with damage: " + damage);
     }
 }`;
        
        const result = await client.callTool('script_update_diff', {
            path: 'Assets/Scripts/Enemy.cs',
            diff: diff,
            options: {
                fuzzy: 80,
                ignoreWhitespace: true
            }
        });
        
        const text = result.content[0].text;
        if (!text.includes('Success')) {
            throw new Error('ファジーマッチングdiffの適用に失敗');
        }
    });
    
    // ドライラン
    await runTest('script_update_diff (dry run)', async () => {
        const diff = `--- a/Player.cs
+++ b/Player.cs
@@ -5,6 +5,10 @@
     void Start()
     {
         Debug.Log("Player started");
+    }
+    
+    public void SetSpeed(float newSpeed)
+    {
+        speed = newSpeed;
     }
 }`;
        
        const result = await client.callTool('script_update_diff', {
            path: 'Assets/Scripts/Player.cs',
            diff: diff,
            options: {
                dryRun: true
            }
        });
        
        const text = result.content[0].text;
        if (!text.includes('Preview')) {
            throw new Error('ドライランの実行に失敗');
        }
    });
    
    // diff検証
    await runTest('script_validate_diff', async () => {
        const diff = `--- a/Player.cs
+++ b/Player.cs
@@ -1,3 +1,3 @@
-public class Player : MonoBehaviour
+public class PlayerController : MonoBehaviour
 {
     private float speed = 5.0f;`;
        
        const result = await client.callTool('script_validate_diff', {
            path: 'Assets/Scripts/Player.cs',
            diff: diff
        });
        
        const text = result.content[0].text;
        if (!text.includes('valid') && !text.includes('applicable')) {
            throw new Error('diff検証の実行に失敗');
        }
    });
    
    // diff作成
    await runTest('script_create_diff', async () => {
        const result = await client.callTool('script_create_diff', {
            original: 'public class Test\n{\n    int value = 10;\n}',
            modified: 'public class Test\n{\n    int value = 20;\n    string name = "test";\n}',
            options: {
                contextLines: 3
            }
        });
        
        const text = result.content[0].text;
        if (!text.includes('---') || !text.includes('+++') || !text.includes('@@')) {
            throw new Error('diff作成に失敗');
        }
    });
}

async function testErrorHandling(client) {
    console.log(colors.magenta('\n=== エラーハンドリングテスト ==='));
    
    // 存在しないファイルの読み取り
    await runTest('エラー: 存在しないファイル', async () => {
        try {
            await client.callTool('script_read', {
                path: 'Assets/Scripts/NonExistent.cs'
            });
            throw new Error('エラーが発生すべきでした');
        } catch (error) {
            if (!error.message.includes('not found')) {
                throw new Error('適切なエラーメッセージが返されませんでした');
            }
        }
    });
    
    // 無効なdiffフォーマット
    await runTest('エラー: 無効なdiff', async () => {
        try {
            await client.callTool('script_update_diff', {
                path: 'Assets/Scripts/Player.cs',
                diff: 'This is not a valid diff format'
            });
            throw new Error('エラーが発生すべきでした');
        } catch (error) {
            // エラーが発生すればOK
        }
    });
    
    // パラメータ不足
    await runTest('エラー: パラメータ不足', async () => {
        try {
            await client.callTool('script_create', {});
            throw new Error('エラーが発生すべきでした');
        } catch (error) {
            if (!error.message.includes('fileName')) {
                throw new Error('適切なエラーメッセージが返されませんでした');
            }
        }
    });
}

async function testPerformance(client) {
    console.log(colors.magenta('\n=== パフォーマンステスト ==='));
    
    // 大きなファイルの作成と読み取り
    await runTest('大きなファイル処理', async () => {
        // 1MBのコンテンツを生成
        const lines = [];
        for (let i = 0; i < 10000; i++) {
            lines.push(`    public void Method${i}() { Debug.Log("Method ${i}"); }`);
        }
        const largeContent = `using UnityEngine;\n\npublic class LargeScript : MonoBehaviour\n{\n${lines.join('\n')}\n}`;
        
        const startTime = Date.now();
        
        // 作成
        await client.callTool('script_create', {
            fileName: 'LargeScript',
            content: largeContent,
            folder: 'Assets/Scripts/Performance'
        });
        
        // 読み取り
        await client.callTool('script_read', {
            path: 'Assets/Scripts/Performance/LargeScript.cs'
        });
        
        const elapsed = Date.now() - startTime;
        console.log(colors.gray(`   処理時間: ${elapsed}ms`));
        
        if (elapsed > 5000) {
            throw new Error('パフォーマンスが期待値を下回っています');
        }
    });
    
    // 複数ファイルの並列処理
    await runTest('並列処理性能', async () => {
        const startTime = Date.now();
        
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(client.callTool('script_create', {
                fileName: `ParallelScript${i}`,
                template: 'MonoBehaviour',
                folder: 'Assets/Scripts/Parallel'
            }));
        }
        
        await Promise.all(promises);
        
        const elapsed = Date.now() - startTime;
        console.log(colors.gray(`   10ファイル並列作成時間: ${elapsed}ms`));
        
        if (elapsed > 3000) {
            throw new Error('並列処理のパフォーマンスが期待値を下回っています');
        }
    });
}

// 最終レポート
function printFinalReport() {
    console.log(colors.magenta('\n' + '='.repeat(60)));
    console.log(colors.magenta('📊 Unity MCP Bridge v3.0 テスト結果サマリー'));
    console.log(colors.magenta('='.repeat(60)));
    
    const passRate = testResults.total > 0 
        ? ((testResults.passed / testResults.total) * 100).toFixed(1) 
        : '0.0';
    
    console.log(colors.cyan(`総テスト数: ${testResults.total}`));
    console.log(colors.green(`成功: ${testResults.passed}`));
    console.log(colors.red(`失敗: ${testResults.failed}`));
    console.log(colors.yellow(`スキップ: ${testResults.skipped}`));
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
        console.log(colors.green('Unity MCP Bridge v3.0は期待通りに動作しています。'));
    } else {
        console.log(colors.red(`\n⚠️  ${testResults.failed}個のテストが失敗しました。`));
    }
}

// メインテスト実行
async function runAllTests() {
    console.log(colors.blue('🚀 Unity MCP Bridge v3.0 包括的テストを開始します\n'));
    console.log(colors.gray('テスト環境:'));
    console.log(colors.gray(`  - Node.js: ${process.version}`));
    console.log(colors.gray(`  - プロジェクトパス: ${TEST_PROJECT_PATH}`));
    console.log(colors.gray(`  - Unity Bridgeモック: 有効\n`));
    
    const client = new MCPTestClient();
    const bridgeMock = new UnityBridgeMock();
    
    try {
        // Unity Bridgeモックを起動
        await bridgeMock.start();
        
        // MCPサーバーを起動
        await client.start();
        
        // 各テストスイートを実行
        await testProjectManagement(client);
        await testBridgeOperations(client);
        await testScriptOperations(client);
        await testFolderOperations(client);
        await testDiffOperations(client);
        await testErrorHandling(client);
        await testPerformance(client);
        
        // 最終レポート
        printFinalReport();
        
    } catch (error) {
        console.error(colors.red('テスト実行中に致命的エラーが発生しました:'), error);
    } finally {
        // クリーンアップ
        await client.stop();
        await bridgeMock.stop();
    }
    
    // 終了コード
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// テスト実行
runAllTests().catch(console.error);