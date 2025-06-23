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
      }); // Timeout automatically determined by operation type

      // Check if read was successful
      if (result.success === false) {
        throw new Error(result.error || result.message || `Failed to read script: ${path}`);
      }

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
    
    // Log content size for debugging
    const contentSize = options.content ? options.content.length : 0;
    this.logger.info(`Script content size: ${contentSize} characters`);

    try {
      this.logger.info(`Sending Unity.Script.Create request with 360s timeout...`);
      const startTime = Date.now();
      
      const result = await this.bridge.sendRequest('Unity.Script.Create', {
        fileName: options.fileName,
        content: options.content,
        folder: options.folder || 'Assets/Scripts',
        template: options.template || 'MonoBehaviour',
        namespace: options.namespace,
        usings: options.usings || ['UnityEngine']
      }); // Timeout automatically determined by operation type

      const duration = Date.now() - startTime;
      this.logger.info(`Unity.Script.Create completed in ${duration}ms`);

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
      this.logger.info(`Sending Unity.Script.Delete request with 360s timeout...`);
      const startTime = Date.now();
      
      const result = await this.bridge.sendRequest('Unity.Script.Delete', {
        path
      }); // Timeout automatically determined by operation type

      const duration = Date.now() - startTime;
      this.logger.info(`Unity.Script.Delete completed in ${duration}ms`);

      // Check if deletion was successful
      if (result.success === false) {
        return {
          content: [{
            type: 'text',
            text: `Delete failed: ${path}\n` +
                  `Error: ${result.error || result.message || 'Unknown error'}\n` +
                  `Note: ${result.message || 'File may not exist'}`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Script deleted: ${path}\n` +
                `Meta file: Also removed\n` +
                `References: ${result.brokenReferences || 0} references may be broken\n` +
                `Deletion time: ${duration}ms`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Delete failed: ${errorMessage}`);
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
      }); // Timeout automatically determined by operation type

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