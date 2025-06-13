import * as fs from 'fs/promises';
import * as path from 'path';
export class TestUtils {
    static async createTestProject(basePath) {
        const projectPath = path.join(basePath, 'TestUnityProject');
        // Create Unity project structure
        await fs.mkdir(path.join(projectPath, 'Assets', 'Scripts'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'Assets', 'Materials'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'Assets', 'Scenes'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'Assets', 'Shaders'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'ProjectSettings'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'Packages'), { recursive: true });
        // Create manifest.json
        const manifest = {
            dependencies: {
                "com.unity.collab-proxy": "2.0.4",
                "com.unity.ide.visualstudio": "2.0.18",
                "com.unity.test-framework": "1.1.33",
                "com.unity.textmeshpro": "3.0.6",
                "com.unity.timeline": "1.7.4",
                "com.unity.ugui": "1.0.0"
            }
        };
        await fs.writeFile(path.join(projectPath, 'Packages', 'manifest.json'), JSON.stringify(manifest, null, 2));
        // Create sample script
        const sampleScript = `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float speed = 5.0f;
    
    void Update()
    {
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        
        Vector3 movement = new Vector3(horizontal, 0, vertical);
        transform.Translate(movement * speed * Time.deltaTime);
    }
}`;
        await fs.writeFile(path.join(projectPath, 'Assets', 'Scripts', 'PlayerController.cs'), sampleScript);
        // Create ProjectVersion.txt
        await fs.writeFile(path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt'), 'm_EditorVersion: 2022.3.10f1');
        return projectPath;
    }
    static async cleanupTestProject(projectPath) {
        try {
            await fs.rm(projectPath, { recursive: true, force: true });
        }
        catch (error) {
            console.warn('Failed to cleanup test project:', error);
        }
    }
    static async runMCPCommand(_command, _args) {
        // This would integrate with the actual MCP server
        // For now, it's a placeholder
        return new Promise((resolve) => {
            // Simulate MCP command execution
            setTimeout(() => {
                resolve({
                    content: [{
                            type: 'text',
                            text: 'Command executed successfully'
                        }]
                });
            }, 100);
        });
    }
    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    static async readJSON(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    static async measureExecutionTime(fn) {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        return { result, duration };
    }
    static formatTestResults(results) {
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        let output = `\nTest Results: ${passed}/${total} passed\n`;
        output += '='.repeat(50) + '\n';
        for (const result of results) {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            output += `${status} | ${result.testCase} (${result.duration}ms)\n`;
            if (!result.passed) {
                output += `   └─ ${result.message}\n`;
            }
        }
        return output;
    }
}
//# sourceMappingURL=test-utils.js.map