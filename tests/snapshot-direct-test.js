import { UnityMCPServer } from '../src/server.js';
import { ConsoleLogger } from '../src/utils/logger.js';
import { VirtualUnityProject } from './virtual-unity-project.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
export class SnapshotDirectTest {
    constructor() {
        this.virtualProject = null;
        this.projectPath = '';
        this.results = [];
        const logger = new ConsoleLogger('[Snapshot]');
        this.server = new UnityMCPServer(logger);
        this.services = this.server.services;
        this.snapshotsDir = path.join(process.cwd(), 'tests', 'snapshots');
    }
    async setup() {
        await fs.mkdir(this.snapshotsDir, { recursive: true });
        const tempDir = path.join(os.tmpdir(), 'unity-mcp-snapshot');
        this.virtualProject = new VirtualUnityProject(tempDir);
        this.projectPath = await this.virtualProject.generate();
        await this.services.projectService.setProject(this.projectPath);
    }
    getSnapshotTests() {
        return [
            {
                name: 'C# Script Content',
                operation: async () => {
                    await this.services.scriptService.createScript('SnapshotScript', `using UnityEngine;

public class SnapshotScript : MonoBehaviour
{
    [SerializeField] private float speed = 5f;
    
    void Update()
    {
        transform.Translate(Vector3.forward * speed * Time.deltaTime);
    }
}`);
                    const filePath = path.join(this.projectPath, 'Assets', 'Scripts', 'SnapshotScript.cs');
                    return await fs.readFile(filePath, 'utf-8');
                }
            },
            {
                name: 'Scene YAML Structure',
                operation: async () => {
                    await this.services.assetService.createScene('SnapshotScene');
                    const filePath = path.join(this.projectPath, 'Assets', 'Scenes', 'SnapshotScene.unity');
                    return await fs.readFile(filePath, 'utf-8');
                }
            },
            {
                name: 'Material YAML',
                operation: async () => {
                    await this.services.assetService.createMaterial('SnapshotMaterial');
                    const filePath = path.join(this.projectPath, 'Assets', 'Materials', 'SnapshotMaterial.mat');
                    return await fs.readFile(filePath, 'utf-8');
                }
            },
            {
                name: 'Shader Content',
                operation: async () => {
                    await this.services.shaderService.createShader('SnapshotShader', 'builtin');
                    const filePath = path.join(this.projectPath, 'Assets', 'Shaders', 'SnapshotShader.shader');
                    return await fs.readFile(filePath, 'utf-8');
                }
            }
        ];
    }
    getBoundaryTests() {
        return [
            {
                name: 'Long File Name (250 chars)',
                description: 'Testing maximum file name length',
                test: async () => {
                    const longName = 'A'.repeat(250);
                    await this.services.scriptService.createScript(longName, 'public class Test {}');
                },
                expectedBehavior: 'success'
            },
            {
                name: 'Empty File Name',
                description: 'Testing empty file name handling',
                test: async () => {
                    try {
                        await this.services.scriptService.createScript('', 'public class Test {}');
                        throw new Error('Should have failed');
                    }
                    catch (error) {
                        if (!error.message.includes('File name cannot be empty')) {
                            throw error;
                        }
                    }
                },
                expectedBehavior: 'error'
            },
            {
                name: 'Path Traversal Attempt',
                description: 'Security test for path traversal',
                test: async () => {
                    try {
                        await this.services.scriptService.createScript('../../../etc/passwd', 'malicious');
                        throw new Error('Should have failed');
                    }
                    catch (error) {
                        // Expected error
                    }
                },
                expectedBehavior: 'error'
            },
            {
                name: 'Special Characters',
                description: 'Testing special characters in file names',
                test: async () => {
                    const specialNames = ['Script<Name>', 'Script|Name', 'Script:Name'];
                    for (const name of specialNames) {
                        try {
                            await this.services.scriptService.createScript(name, 'public class Test {}');
                            throw new Error(`Should have failed for: ${name}`);
                        }
                        catch (error) {
                            // Expected error
                        }
                    }
                },
                expectedBehavior: 'error'
            },
            {
                name: 'Unicode File Names',
                description: 'Testing international characters',
                test: async () => {
                    const unicodeNames = ['テストスクリプト', 'TestScript测试', 'СкриптТест'];
                    for (const name of unicodeNames) {
                        await this.services.scriptService.createScript(name, `public class ${name.replace(/[^\w]/g, '')} {}`);
                    }
                },
                expectedBehavior: 'success'
            },
            {
                name: 'Deep Folder Hierarchy',
                description: 'Testing deeply nested folders',
                test: async () => {
                    const deepPath = 'Level1/Level2/Level3/Level4/Level5';
                    await this.services.scriptService.createScript('DeepScript', 'public class DeepScript {}', deepPath);
                },
                expectedBehavior: 'success'
            }
        ];
    }
    async runSnapshotTest(test) {
        console.log(`  📸 ${test.name}`);
        try {
            const content = await test.operation();
            const snapshotFile = `${test.name.toLowerCase().replace(/\s+/g, '-')}.snap`;
            const snapshotPath = path.join(this.snapshotsDir, snapshotFile);
            let existingSnapshot = null;
            try {
                existingSnapshot = await fs.readFile(snapshotPath, 'utf-8');
            }
            catch {
                // New snapshot
            }
            if (existingSnapshot) {
                if (this.normalizeContent(content) === this.normalizeContent(existingSnapshot)) {
                    console.log('     ✅ Matches snapshot');
                    this.results.push({ type: 'snapshot', name: test.name, status: 'pass' });
                }
                else {
                    console.log('     ❌ Does not match snapshot');
                    this.results.push({ type: 'snapshot', name: test.name, status: 'fail', message: 'Mismatch' });
                }
            }
            else {
                await fs.writeFile(snapshotPath, content);
                console.log('     📝 Created new snapshot');
                this.results.push({ type: 'snapshot', name: test.name, status: 'pass', message: 'New' });
            }
        }
        catch (error) {
            console.log(`     ❌ Error: ${error}`);
            this.results.push({
                type: 'snapshot',
                name: test.name,
                status: 'fail',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }
    normalizeContent(content) {
        return content
            .replace(/\r\n/g, '\n')
            .replace(/guid: [a-f0-9]{32}/g, 'guid: [GUID]')
            .replace(/fileID: \d+/g, 'fileID: [ID]')
            .trim();
    }
    async runBoundaryTest(test) {
        console.log(`  🔍 ${test.name}`);
        console.log(`     ${test.description}`);
        try {
            await test.test();
            console.log(`     ✅ Handled correctly (${test.expectedBehavior})`);
            this.results.push({ type: 'boundary', name: test.name, status: 'pass' });
        }
        catch (error) {
            console.log(`     ❌ Failed: ${error}`);
            this.results.push({
                type: 'boundary',
                name: test.name,
                status: 'fail',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async runAllTests() {
        console.log('Unity MCP Server - Snapshot & Boundary Tests');
        console.log('===========================================');
        await this.setup();
        console.log('\n📸 Snapshot Tests');
        console.log('─'.repeat(40));
        for (const test of this.getSnapshotTests()) {
            await this.runSnapshotTest(test);
        }
        console.log('\n\n🔍 Boundary Value Tests');
        console.log('─'.repeat(40));
        for (const test of this.getBoundaryTests()) {
            await this.runBoundaryTest(test);
        }
        this.printSummary();
        if (this.virtualProject) {
            await this.virtualProject.cleanup();
        }
        const hasFailures = this.results.some(r => r.status === 'fail');
        process.exit(hasFailures ? 1 : 0);
    }
    printSummary() {
        console.log('\n\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        const snapshotResults = this.results.filter(r => r.type === 'snapshot');
        const boundaryResults = this.results.filter(r => r.type === 'boundary');
        const snapshotPassed = snapshotResults.filter(r => r.status === 'pass').length;
        const boundaryPassed = boundaryResults.filter(r => r.status === 'pass').length;
        console.log(`\n📸 Snapshot Tests: ${snapshotPassed}/${snapshotResults.length} passed`);
        console.log(`🔍 Boundary Tests: ${boundaryPassed}/${boundaryResults.length} passed`);
        const totalPassed = snapshotPassed + boundaryPassed;
        const total = this.results.length;
        console.log(`\n✅ Total: ${totalPassed}/${total} passed (${((totalPassed / total) * 100).toFixed(1)}%)`);
        const failures = this.results.filter(r => r.status === 'fail');
        if (failures.length > 0) {
            console.log('\n❌ Failed Tests:');
            failures.forEach(r => console.log(`- ${r.name}: ${r.message || 'Unknown error'}`));
        }
    }
}
// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new SnapshotDirectTest();
    test.runAllTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=snapshot-direct-test.js.map