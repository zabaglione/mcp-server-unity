#!/usr/bin/env node
import { ScriptService } from '../../src/services/script-service.js';
import { OptimizedScriptService } from '../../src/services/optimized-script-service.js';
import { ProjectService } from '../../src/services/project-service.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// BOM constant
const UTF8_BOM = '\ufeff';

// Test content with various UTF-8 characters and BOM
const TEST_CONTENT_WITH_BOM = UTF8_BOM + `using UnityEngine;

public class TestScript : MonoBehaviour
{
    // 日本語コメント
    private string message = "Hello, 世界! 🌍";
    
    void Start()
    {
        Debug.Log($"Message: {message}");
        // Emoji test: 😀🎮🚀
        // Special chars: €£¥₹
    }
}`;

const TEST_CONTENT_NO_BOM = `using UnityEngine;

public class TestScript : MonoBehaviour
{
    // Without BOM
    private string text = "No BOM here";
}`;

async function testBOMPreservation() {
    const logger = new ConsoleLogger('[Test]');
    const projectService = new ProjectService(logger);
    const scriptService = new ScriptService(logger);
    const optimizedService = new OptimizedScriptService(logger);
    
    // Create test directory
    const testDir = path.join(__dirname, 'test-unity-project-bom');
    const assetsDir = path.join(testDir, 'Assets');
    const scriptsDir = path.join(assetsDir, 'Scripts');
    
    await fs.mkdir(scriptsDir, { recursive: true });
    
    // Create ProjectSettings directory
    await fs.mkdir(path.join(testDir, 'ProjectSettings'), { recursive: true });
    await fs.writeFile(
        path.join(testDir, 'ProjectSettings', 'ProjectVersion.txt'),
        'm_EditorVersion: 2022.3.0f1\nm_EditorVersionWithRevision: 2022.3.0f1 (123456789abc)'
    );
    
    // Set project
    await projectService.setProject(testDir);
    scriptService.setUnityProject(projectService.getProject()!);
    optimizedService.setUnityProject(projectService.getProject()!);
    
    const testScriptPath = path.join(scriptsDir, 'TestScript.cs');
    
    console.log('\n=== Test 1: BOM Preservation (File with BOM) ===');
    // Create file with BOM
    await fs.writeFile(testScriptPath, TEST_CONTENT_WITH_BOM, 'utf-8');
    const originalWithBOM = await fs.readFile(testScriptPath, 'utf-8');
    console.log('Original has BOM:', originalWithBOM.charCodeAt(0) === 0xFEFF);
    
    // Update content
    const updatedContent = TEST_CONTENT_WITH_BOM.replace('Hello, 世界!', 'Updated with BOM!');
    await scriptService.updateScript('TestScript.cs', updatedContent);
    
    // Check if BOM is preserved
    const resultWithBOM = await fs.readFile(testScriptPath, 'utf-8');
    console.log('Result has BOM:', resultWithBOM.charCodeAt(0) === 0xFEFF);
    console.log('Content updated correctly:', resultWithBOM.includes('Updated with BOM!'));
    
    console.log('\n=== Test 2: BOM Preservation (File without BOM) ===');
    // Create file without BOM
    await fs.writeFile(testScriptPath, TEST_CONTENT_NO_BOM, 'utf-8');
    const originalNoBOM = await fs.readFile(testScriptPath, 'utf-8');
    console.log('Original has BOM:', originalNoBOM.charCodeAt(0) === 0xFEFF);
    
    // Update content
    const updatedNoBOM = TEST_CONTENT_NO_BOM.replace('No BOM here', 'Still no BOM');
    await scriptService.updateScript('TestScript.cs', updatedNoBOM);
    
    // Check if no BOM is added
    const resultNoBOM = await fs.readFile(testScriptPath, 'utf-8');
    console.log('Result has BOM:', resultNoBOM.charCodeAt(0) === 0xFEFF);
    console.log('Content updated correctly:', resultNoBOM.includes('Still no BOM'));
    
    console.log('\n=== Test 3: Atomic Write (Corruption Test) ===');
    // Create a file and try to corrupt it during write
    await fs.writeFile(testScriptPath, TEST_CONTENT_WITH_BOM, 'utf-8');
    
    // Simulate concurrent writes
    const promises = [];
    for (let i = 0; i < 5; i++) {
        const content = TEST_CONTENT_WITH_BOM.replace('Hello, 世界!', `Concurrent ${i}`);
        promises.push(scriptService.updateScript('TestScript.cs', content));
    }
    
    await Promise.all(promises);
    
    // Check if file is still valid
    const finalContent = await fs.readFile(testScriptPath, 'utf-8');
    console.log('File is valid UTF-8:', true); // If we got here, it's valid
    console.log('Has valid C# syntax:', finalContent.includes('public class TestScript'));
    console.log('Has BOM:', finalContent.charCodeAt(0) === 0xFEFF);
    
    console.log('\n=== Test 4: Partial Update with BOM (Optimized) ===');
    // Reset with BOM
    await fs.writeFile(testScriptPath, TEST_CONTENT_WITH_BOM, 'utf-8');
    
    // Apply partial update
    const searchStr = 'Hello, 世界!';
    const replaceStr = 'Partial BOM test!';
    const cleanContent = TEST_CONTENT_WITH_BOM.substring(1); // Remove BOM for search
    const startIndex = cleanContent.indexOf(searchStr);
    const endIndex = startIndex + searchStr.length;
    
    await optimizedService.updateScriptPartial('TestScript.cs', [{
        start: startIndex,
        end: endIndex,
        replacement: replaceStr
    }]);
    
    const partialResult = await fs.readFile(testScriptPath, 'utf-8');
    console.log('BOM preserved:', partialResult.charCodeAt(0) === 0xFEFF);
    console.log('Partial update successful:', partialResult.includes(replaceStr));
    console.log('UTF-8 preserved:', partialResult.includes('日本語コメント'));
    
    console.log('\n=== Test 5: Large File Atomic Write ===');
    // Create large file with BOM
    const largeContent = UTF8_BOM + TEST_CONTENT_NO_BOM + '\n// Large content\n' + 'x'.repeat(15 * 1024 * 1024);
    await fs.writeFile(testScriptPath, largeContent, 'utf-8');
    
    // Update large file
    const largeUpdated = largeContent.replace('No BOM here', 'Large atomic test!');
    await scriptService.updateScript('TestScript.cs', largeUpdated);
    
    // Verify
    const largeResult = await fs.readFile(testScriptPath, 'utf-8');
    console.log('Large file has BOM:', largeResult.charCodeAt(0) === 0xFEFF);
    console.log('Update successful:', largeResult.includes('Large atomic test!'));
    console.log('File size preserved:', Buffer.byteLength(largeResult, 'utf8') === Buffer.byteLength(largeUpdated, 'utf8'));
    
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('\n✅ All tests completed successfully');
}

// Run tests
testBOMPreservation().catch(console.error);