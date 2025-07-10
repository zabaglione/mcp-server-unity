const fs = require('fs').promises;
const path = require('path');

async function generateEmbeddedScripts() {
  const scriptsDir = path.join(__dirname, 'src', 'unity-scripts');
  const outputPath = path.join(__dirname, 'src', 'embedded-scripts.ts');
  
  try {
    console.log('Generating embedded-scripts.ts from Unity source files...');
    
    // Define scripts to embed
    const scriptsToEmbed = [
      {
        fileName: 'UnityHttpServer.cs',
        version: '1.1.0',
        sourcePath: path.join(scriptsDir, 'UnityHttpServer.cs')
      },
      {
        fileName: 'UnityMCPServerWindow.cs', 
        version: '1.0.0',
        sourcePath: path.join(scriptsDir, 'UnityMCPServerWindow.cs')
      }
    ];
    
    // Read all script contents
    const embeddedScripts = [];
    
    for (const script of scriptsToEmbed) {
      try {
        const content = await fs.readFile(script.sourcePath, 'utf-8');
        
        // Escape content for JavaScript template literal
        const escapedContent = content
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\$\{/g, '\\${');
        
        embeddedScripts.push({
          fileName: script.fileName,
          version: script.version,
          content: escapedContent
        });
        
        console.log(`✓ Embedded ${script.fileName} (${content.length} chars)`);
      } catch (error) {
        console.error(`✗ Failed to read ${script.fileName}: ${error.message}`);
        throw error;
      }
    }
    
    // Generate TypeScript content
    const tsContent = `import * as fs from 'fs/promises';
import * as path from 'path';

export interface EmbeddedScript {
  fileName: string;
  content: string;
  version: string;
}

/**
 * Static embedded scripts provider
 * Generated at build time from Unity source files
 */
export class EmbeddedScriptsProvider {
  private scripts: Map<string, EmbeddedScript> = new Map();

  constructor() {
    this.initializeScripts();
  }

  private initializeScripts() {
${embeddedScripts.map(script => `    // ${script.fileName} content
    this.scripts.set('${script.fileName}', {
      fileName: '${script.fileName}',
      version: '${script.version}',
      content: \`${script.content}\`
    });`).join('\n\n')}
  }

  /**
   * Get script by filename
   */
  async getScript(fileName: string): Promise<EmbeddedScript | null> {
    return this.scripts.get(fileName) || null;
  }

  /**
   * Get script synchronously
   */
  getScriptSync(fileName: string): EmbeddedScript | null {
    return this.scripts.get(fileName) || null;
  }

  /**
   * Write script to file with proper UTF-8 BOM for Unity compatibility
   */
  async writeScriptToFile(fileName: string, targetPath: string): Promise<void> {
    const script = await this.getScript(fileName);
    if (!script) {
      throw new Error(\`Script not found: \${fileName}\`);
    }

    // Ensure target directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    
    // Write with UTF-8 BOM for Unity compatibility
    const utf8BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
    const contentBuffer = Buffer.from(script.content, 'utf8');
    const finalBuffer = Buffer.concat([utf8BOM, contentBuffer]);
    
    await fs.writeFile(targetPath, finalBuffer);
  }

  /**
   * Get all available script names
   */
  getAvailableScripts(): string[] {
    return Array.from(this.scripts.keys());
  }

  /**
   * Get script version
   */
  getScriptVersion(fileName: string): string | null {
    const script = this.scripts.get(fileName);
    return script?.version || null;
  }
}`;

    // Write the generated file
    await fs.writeFile(outputPath, tsContent, 'utf-8');
    
    console.log(`✓ Generated embedded-scripts.ts with ${embeddedScripts.length} scripts`);
    console.log(`  Output: ${outputPath}`);
    
  } catch (error) {
    console.error('Failed to generate embedded scripts:', error.message);
    process.exit(1);
  }
}

generateEmbeddedScripts();