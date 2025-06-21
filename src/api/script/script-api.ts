import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { UnityBridgeClient } from '../../unity-bridge/unity-bridge-client.js';
import { Logger } from '../../types/index.js';

export interface ScriptCreateOptions {
  fileName: string;
  content?: string;
  folder?: string;
  template?: 'MonoBehaviour' | 'ScriptableObject' | 'Editor' | 'Custom';
  namespace?: string;
  usings?: string[];
}


/**
 * Unity 6 Script API
 * Direct Unity Editor integration for script operations
 */
export class ScriptAPI {
  constructor(
    private bridge: UnityBridgeClient,
    private logger: Logger
  ) {}

  /**
   * Read script content from Unity project
   */
  async read(path: string): Promise<CallToolResult> {
    this.logger.info(`Reading script: ${path}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Script.Read', {
        path
      });

      return {
        content: [{
          type: 'text',
          text: `Script content: ${path}\n\n${result.content}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read script: ${errorMessage}`);
    }
  }

  /**
   * Create a new C# script using Unity 6 API
   */
  async create(options: ScriptCreateOptions): Promise<CallToolResult> {
    this.logger.info(`Creating script: ${options.fileName}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Script.Create', {
        fileName: options.fileName,
        content: options.content,
        folder: options.folder || 'Assets/Scripts',
        template: options.template || 'MonoBehaviour',
        namespace: options.namespace,
        usings: options.usings || ['UnityEngine']
      });

      return {
        content: [{
          type: 'text',
          text: `Script created: ${result.path}\n` +
                `GUID: ${result.guid}\n` +
                `Template: ${options.template || 'MonoBehaviour'}\n` +
                `Location: ${result.folder}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create script: ${errorMessage}`);
    }
  }



  /**
   * Delete script using Unity 6 AssetDatabase
   */
  async delete(path: string): Promise<CallToolResult> {
    this.logger.info(`Deleting script: ${path}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Script.Delete', {
        path
      });

      return {
        content: [{
          type: 'text',
          text: `Script deleted: ${path}\n` +
                `Meta file: Also removed\n` +
                `References: ${result.brokenReferences || 0} references may be broken`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete script: ${errorMessage}`);
    }
  }

  /**
   * Rename script using Unity 6 AssetDatabase
   */
  async rename(oldPath: string, newName: string): Promise<CallToolResult> {
    this.logger.info(`Renaming script: ${oldPath} → ${newName}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Script.Rename', {
        oldPath,
        newName
      });

      return {
        content: [{
          type: 'text',
          text: `Script renamed: ${oldPath} → ${result.newPath}\n` +
                `GUID: Preserved (${result.guid})\n` +
                `Class name: ${result.classRenamed ? 'Updated automatically' : 'Manual update required'}\n` +
                `References: ${result.referencesUpdated} updated`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to rename script: ${errorMessage}`);
    }
  }


}