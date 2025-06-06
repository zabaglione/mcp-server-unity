import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import { diffLines } from 'diff';

interface ClassInfo {
  className: string;
  namespace?: string;
  filePath: string;
  lineNumber: number;
}

export class CodeAnalysisService extends BaseService {
  constructor(logger: Logger) {
    super(logger);
  }

  /**
   * Get detailed diff between two file contents
   */
  async getFileDiff(
    fileName: string,
    newContent: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Find the script file
    const scriptFiles = await glob(`**/${fileName}${fileName.endsWith('.cs') ? '' : '.cs'}`, {
      cwd: this.unityProject!.assetsPath,
      absolute: true,
    });

    if (scriptFiles.length === 0) {
      throw new Error(`Script not found: ${fileName}`);
    }

    const scriptPath = scriptFiles[0];
    const currentContent = await fs.readFile(scriptPath, 'utf-8');

    // Get line-by-line diff
    const diff = diffLines(currentContent, newContent);
    const changes: string[] = [];
    let addedLines = 0;
    let removedLines = 0;
    let lineNumber = 1;

    for (const part of diff) {
      if (part.added) {
        const lines = part.value.split('\n').filter(line => line);
        addedLines += lines.length;
        lines.forEach(line => {
          changes.push(`+ ${line}`);
        });
      } else if (part.removed) {
        const lines = part.value.split('\n').filter(line => line);
        removedLines += lines.length;
        lines.forEach(line => {
          changes.push(`- ${line} (line ${lineNumber})`);
          lineNumber++;
        });
      } else {
        lineNumber += part.value.split('\n').length - 1;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `File Diff for ${fileName}:\n` +
              `Lines added: ${addedLines}\n` +
              `Lines removed: ${removedLines}\n` +
              `Total changes: ${changes.length}\n\n` +
              `Detailed changes:\n${changes.join('\n')}`
      }]
    };
  }

  /**
   * Detect class name duplicates across the project
   */
  async detectClassDuplicates(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const csFiles = await glob('**/*.cs', {
      cwd: this.unityProject!.assetsPath,
      absolute: true,
      ignore: ['**/Packages/**', '**/Library/**', '**/Temp/**']
    });

    const classMap = new Map<string, ClassInfo[]>();

    // Parse each file for class definitions
    for (const filePath of csFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const classes = await this.extractClassInfo(content, filePath);
      
      for (const classInfo of classes) {
        const key = classInfo.namespace 
          ? `${classInfo.namespace}.${classInfo.className}`
          : classInfo.className;
        
        if (!classMap.has(key)) {
          classMap.set(key, []);
        }
        classMap.get(key)!.push(classInfo);
      }
    }

    // Find duplicates
    const duplicates: string[] = [];
    const suggestions: string[] = [];

    for (const [fullName, instances] of classMap.entries()) {
      if (instances.length > 1) {
        duplicates.push(`\nClass: ${fullName}`);
        duplicates.push(`Found in ${instances.length} files:`);
        
        instances.forEach((info, index) => {
          const relativePath = path.relative(this.unityProject!.projectPath, info.filePath);
          duplicates.push(`  ${index + 1}. ${relativePath}:${info.lineNumber}`);
        });

        // Generate namespace suggestion if no namespace
        if (!instances[0].namespace) {
          const suggestedNamespaces = instances.map(info => {
            const relativePath = path.relative(this.unityProject!.assetsPath, path.dirname(info.filePath));
            return relativePath.replace(/\//g, '.').replace(/\\/g, '.');
          });
          
          suggestions.push(`\nSuggested fix for ${instances[0].className}:`);
          instances.forEach((info, index) => {
            suggestions.push(`  In ${path.basename(info.filePath)}: namespace ${suggestedNamespaces[index]} { ... }`);
          });
        }
      }
    }

    const totalClasses = classMap.size;
    const duplicateCount = Array.from(classMap.values()).filter(instances => instances.length > 1).length;

    return {
      content: [{
        type: 'text',
        text: `Class Duplicate Detection Results:\n` +
              `Total unique classes: ${totalClasses}\n` +
              `Duplicate classes found: ${duplicateCount}\n` +
              (duplicates.length > 0 ? `\nDuplicates:\n${duplicates.join('\n')}` : '\nNo duplicates found!') +
              (suggestions.length > 0 ? `\n\nNamespace Suggestions:\n${suggestions.join('\n')}` : '')
      }]
    };
  }

  /**
   * Suggest namespace based on file location
   */
  async suggestNamespace(fileName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Find the script file
    const scriptFiles = await glob(`**/${fileName}${fileName.endsWith('.cs') ? '' : '.cs'}`, {
      cwd: this.unityProject!.assetsPath,
      absolute: true,
    });

    if (scriptFiles.length === 0) {
      throw new Error(`Script not found: ${fileName}`);
    }

    const scriptPath = scriptFiles[0];
    const relativePath = path.relative(this.unityProject!.assetsPath, path.dirname(scriptPath));
    
    // Convert path to namespace format
    let namespace = relativePath
      .replace(/\//g, '.')
      .replace(/\\/g, '.')
      .replace(/\s+/g, '')
      .split('.')
      .filter(part => part && part !== 'Scripts') // Remove common folder names
      .map(part => part.charAt(0).toUpperCase() + part.slice(1)) // Capitalize
      .join('.');

    // If empty, use project name
    if (!namespace) {
      namespace = path.basename(this.unityProject!.projectPath).replace(/\s+/g, '');
    }

    // Read current file content
    const content = await fs.readFile(scriptPath, 'utf-8');
    const hasNamespace = /namespace\s+[\w.]+\s*{/.test(content);

    return {
      content: [{
        type: 'text',
        text: `Namespace Suggestion for ${fileName}:\n` +
              `Suggested namespace: ${namespace}\n` +
              `Current status: ${hasNamespace ? 'Already has namespace' : 'No namespace'}\n\n` +
              `Example usage:\n` +
              `namespace ${namespace}\n{\n    public class YourClass : MonoBehaviour\n    {\n        // Your code here\n    }\n}`
      }]
    };
  }

  /**
   * Apply namespace to a script file
   */
  async applyNamespace(
    fileName: string,
    namespace?: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Find the script file
    const scriptFiles = await glob(`**/${fileName}${fileName.endsWith('.cs') ? '' : '.cs'}`, {
      cwd: this.unityProject!.assetsPath,
      absolute: true,
    });

    if (scriptFiles.length === 0) {
      throw new Error(`Script not found: ${fileName}`);
    }

    const scriptPath = scriptFiles[0];
    let content = await fs.readFile(scriptPath, 'utf-8');

    // Generate namespace if not provided
    if (!namespace) {
      const relativePath = path.relative(this.unityProject!.assetsPath, path.dirname(scriptPath));
      namespace = relativePath
        .replace(/\//g, '.')
        .replace(/\\/g, '.')
        .replace(/\s+/g, '')
        .split('.')
        .filter(part => part && part !== 'Scripts')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('.');
    }

    // Check if already has namespace
    if (/namespace\s+[\w.]+\s*{/.test(content)) {
      throw new Error('File already has a namespace. Use update_script to modify it.');
    }

    // Find using statements
    const usingMatches = content.match(/^using\s+.+;$/gm) || [];
    const lastUsingIndex = usingMatches.length > 0 
      ? content.lastIndexOf(usingMatches[usingMatches.length - 1]) + usingMatches[usingMatches.length - 1].length
      : 0;

    // Insert namespace
    const beforeUsing = lastUsingIndex > 0 ? content.substring(0, lastUsingIndex) : '';
    const afterUsing = lastUsingIndex > 0 ? content.substring(lastUsingIndex) : content;
    
    // Add proper indentation to the content
    const indentedContent = afterUsing
      .trim()
      .split('\n')
      .map(line => line.trim() ? `    ${line}` : line)
      .join('\n');

    const newContent = beforeUsing + 
      (beforeUsing ? '\n\n' : '') +
      `namespace ${namespace}\n{\n${indentedContent}\n}`;

    await fs.writeFile(scriptPath, newContent, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: `Successfully applied namespace to ${fileName}:\n` +
              `Namespace: ${namespace}\n` +
              `Path: ${path.relative(this.unityProject!.projectPath, scriptPath)}`
      }]
    };
  }

  // Helper methods

  private async extractClassInfo(content: string, filePath: string): Promise<ClassInfo[]> {
    const classes: ClassInfo[] = [];
    const lines = content.split('\n');
    
    let currentNamespace: string | undefined;
    let braceDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Track namespace
      const namespaceMatch = line.match(/namespace\s+([\w.]+)/);
      if (namespaceMatch) {
        currentNamespace = namespaceMatch[1];
      }
      
      // Track brace depth to exit namespace
      if (line.includes('{')) braceDepth++;
      if (line.includes('}')) {
        braceDepth--;
        if (braceDepth === 0) currentNamespace = undefined;
      }
      
      // Find class definitions
      const classMatch = line.match(/(?:public|private|internal|protected)?\s*(?:abstract|sealed|static)?\s*(?:partial\s+)?class\s+(\w+)/);
      if (classMatch) {
        classes.push({
          className: classMatch[1],
          namespace: currentNamespace,
          filePath,
          lineNumber: i + 1
        });
      }
    }
    
    return classes;
  }
}