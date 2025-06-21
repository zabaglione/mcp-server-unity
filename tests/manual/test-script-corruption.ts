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

// Test content with various UTF-8 characters
const TEST_CONTENT = `using UnityEngine;

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
    
    void Update()
    {
        // Long line to test streaming
        ${' '.repeat(10000)}// End of long line
    }
}`;

async function testScriptUpdate() {
    const logger = new ConsoleLogger('[Test]');
    const projectService = new ProjectService(logger);
    const scriptService = new ScriptService(logger);
    const optimizedService = new OptimizedScriptService(logger);
    
    // Create test directory
    const testDir = path.join(__dirname, 'test-unity-project');
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
    
    console.log('\n=== Test 1: Normal Update ===');
    // Create initial file
    await fs.writeFile(testScriptPath, TEST_CONTENT, 'utf-8');
    console.log('Original size:', Buffer.byteLength(TEST_CONTENT, 'utf8'), 'bytes');
    
    // Update with modified content
    const updatedContent = TEST_CONTENT.replace('Hello, 世界!', 'こんにちは, World!');
    await scriptService.updateScript('TestScript.cs', updatedContent);
    
    // Verify
    const result1 = await fs.readFile(testScriptPath, 'utf-8');
    console.log('After update size:', Buffer.byteLength(result1, 'utf8'), 'bytes');
    console.log('Content matches:', result1 === updatedContent);
    console.log('Contains emoji:', result1.includes('😀🎮🚀'));
    console.log('Contains Japanese:', result1.includes('日本語コメント'));
    
    console.log('\n=== Test 2: Large File Update ===');
    // Create large file (15MB)
    const largeContent = TEST_CONTENT + '\n// Large content\n' + 'x'.repeat(15 * 1024 * 1024);
    await fs.writeFile(testScriptPath, largeContent, 'utf-8');
    console.log('Large file size:', Buffer.byteLength(largeContent, 'utf8'), 'bytes');
    
    // Update large file
    const largeUpdated = largeContent.replace('Hello, 世界!', 'Large file test!');
    await scriptService.updateScript('TestScript.cs', largeUpdated);
    
    // Verify
    const result2 = await fs.readFile(testScriptPath, 'utf-8');
    console.log('After large update size:', Buffer.byteLength(result2, 'utf8'), 'bytes');
    console.log('Size matches:', Buffer.byteLength(result2, 'utf8') === Buffer.byteLength(largeUpdated, 'utf8'));
    console.log('Contains update:', result2.includes('Large file test!'));
    
    console.log('\n=== Test 3: Partial Update (Optimized) ===');
    // Reset to original
    await fs.writeFile(testScriptPath, TEST_CONTENT, 'utf-8');
    
    // Try partial update with UTF-8 characters
    const searchStr = 'Hello, 世界!';
    const replaceStr = 'Partial update!';
    const startIndex = TEST_CONTENT.indexOf(searchStr);
    const endIndex = startIndex + searchStr.length;
    
    console.log('Search string byte length:', Buffer.byteLength(searchStr, 'utf8'));
    console.log('Character position:', startIndex, '-', endIndex);
    
    // This might fail if start/end are treated as byte positions
    try {
        await optimizedService.updateScriptPartial('TestScript.cs', [{
            start: startIndex,
            end: endIndex,
            replacement: replaceStr
        }]);
        
        const result3 = await fs.readFile(testScriptPath, 'utf-8');
        console.log('Partial update successful:', result3.includes(replaceStr));
        console.log('Original UTF-8 preserved:', result3.includes('日本語コメント'));
    } catch (error) {
        console.error('Partial update failed:', error);
    }
    
    console.log('\n=== Test 4: Stream Transform ===');
    // Reset to original
    await fs.writeFile(testScriptPath, TEST_CONTENT, 'utf-8');
    
    // Transform with streaming
    try {
        await optimizedService.transformScriptStreaming('TestScript.cs', (content) => {
            return content.replace(/Hello/g, 'Transformed');
        });
        
        const result4 = await fs.readFile(testScriptPath, 'utf-8');
        console.log('Transform successful:', result4.includes('Transformed'));
        console.log('UTF-8 preserved:', result4.includes('世界') && result4.includes('😀'));
    } catch (error) {
        console.error('Transform failed:', error);
    }
    
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('\n✅ Tests completed');
}

// Run tests
testScriptUpdate().catch(console.error);