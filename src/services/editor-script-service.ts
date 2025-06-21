import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { ensureDirectory } from '../utils/file-utils.js';
import { getEditorWindowTemplate } from '../templates/editor-window-template.js';
import { getCustomEditorTemplate } from '../templates/custom-editor-template.js';
import { getPropertyDrawerTemplate } from '../templates/property-drawer-template.js';
import { getMenuItemsTemplate } from '../templates/menu-items-template.js';
import { getScriptableObjectEditorTemplate } from '../templates/scriptable-object-editor-template.js';
import { CONFIG } from '../config/index.js';
import { MetaFileManager } from '../utils/meta-file-manager.js';

export type EditorScriptType = 'editorWindow' | 'customEditor' | 'propertyDrawer' | 'menuItems' | 'scriptableObjectEditor';

export interface EditorScriptOptions {
  targetClass?: string;  // For CustomEditor
  attributeName?: string; // For PropertyDrawer
  customContent?: string; // For custom implementations
}

export class EditorScriptService extends BaseService {
  private validator: UnityProjectValidator;
  private metaFileManager: MetaFileManager;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
    this.metaFileManager = new MetaFileManager(logger);
  }

  async createEditorScript(
    scriptName: string,
    scriptType: EditorScriptType,
    options?: EditorScriptOptions
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const className = this.ensureValidClassName(scriptName);
    const fileName = this.validator.normalizeFileName(className, '.cs');

    // Determine the appropriate folder
    const targetFolder = await this.getEditorScriptFolder(scriptType);
    await ensureDirectory(targetFolder);

    // Get the appropriate template
    let scriptContent: string;
    if (options?.customContent) {
      scriptContent = options.customContent;
    } else {
      scriptContent = this.getEditorScriptTemplate(className, scriptType, options);
    }

    // Write the script file
    const scriptPath = path.join(targetFolder, fileName);
    await fs.writeFile(scriptPath, scriptContent, 'utf-8');

    this.logger.info(`Editor script created: ${scriptPath}`);

    // Generate meta file for the script
    const metaGenerated = await this.metaFileManager.generateMetaFile(scriptPath);
    if (!metaGenerated) {
      this.logger.warn(`Failed to generate meta file for: ${scriptPath}`);
    }

    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    const scriptTypeInfo = CONFIG.unity.editorScriptTypes[scriptType];
    return {
      content: [
        {
          type: 'text',
          text: `${scriptTypeInfo.name} created: ${path.relative(this.unityProject!.projectPath, scriptPath)}\n` +
                `Meta file generated: ${metaGenerated ? 'Yes' : 'No'}`,
        },
      ],
    };
  }

  private async getEditorScriptFolder(scriptType: EditorScriptType): Promise<string> {
    const editorPath = path.join(this.unityProject!.assetsPath, CONFIG.unity.defaultFolders.editor);
    
    // Some editor scripts may go in subfolders
    switch (scriptType) {
      case 'propertyDrawer':
        return path.join(editorPath, 'PropertyDrawers');
      case 'customEditor':
        return path.join(editorPath, 'Inspectors');
      case 'editorWindow':
        return path.join(editorPath, 'Windows');
      default:
        return editorPath;
    }
  }

  private getEditorScriptTemplate(
    className: string,
    scriptType: EditorScriptType,
    options?: EditorScriptOptions
  ): string {
    switch (scriptType) {
      case 'editorWindow':
        return getEditorWindowTemplate(className);
      
      case 'customEditor':
        if (!options?.targetClass) {
          throw new Error('targetClass is required for CustomEditor scripts');
        }
        return getCustomEditorTemplate(className, options.targetClass);
      
      case 'propertyDrawer':
        const attributeName = options?.attributeName || `${className}Attribute`;
        return getPropertyDrawerTemplate(className, attributeName);
      
      case 'menuItems':
        return getMenuItemsTemplate(className);
      
      case 'scriptableObjectEditor':
        return getScriptableObjectEditorTemplate(className);
      
      default:
        throw new Error(`Unknown editor script type: ${scriptType}`);
    }
  }

  private ensureValidClassName(name: string): string {
    // Remove file extension if present
    let className = name.replace(/\.(cs|js)$/i, '');
    
    // Ensure first character is uppercase
    className = className.charAt(0).toUpperCase() + className.slice(1);
    
    // Remove invalid characters
    className = className.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Ensure it doesn't start with a number
    if (/^\d/.test(className)) {
      className = '_' + className;
    }
    
    return className;
  }

  async listEditorScripts(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const editorPath = path.join(this.unityProject!.assetsPath, CONFIG.unity.defaultFolders.editor);
    const scripts: string[] = [];

    try {
      const exists = await fs.access(editorPath).then(() => true).catch(() => false);
      if (exists) {
        scripts.push(...await this.findEditorScripts(editorPath));
      }
    } catch (error) {
      this.logger.debug('Editor folder not found');
    }

    const relativePaths = scripts.map(script =>
      path.relative(this.unityProject!.projectPath, script)
    );

    return {
      content: [
        {
          type: 'text',
          text: scripts.length > 0
            ? `Found ${scripts.length} editor scripts:\n${relativePaths.join('\n')}`
            : 'No editor scripts found. Editor scripts should be placed in Assets/Editor/',
        },
      ],
    };
  }

  private async findEditorScripts(directory: string): Promise<string[]> {
    const scripts: string[] = [];

    async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.cs')) {
            scripts.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await scanDirectory(directory);
    return scripts;
  }

  async createEditorFolder(): Promise<void> {
    this.ensureProjectSet();
    const editorPath = path.join(this.unityProject!.assetsPath, CONFIG.unity.defaultFolders.editor);
    await ensureDirectory(editorPath);
  }
}