import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { UnityBridgeClient } from '../../unity-bridge/unity-bridge-client.js';
import { Logger } from '../../types/index.js';

export interface FolderCreateOptions {
  path: string;
  recursive?: boolean;
}


/**
 * Unity 6 Folder API
 * Direct Unity Editor integration for folder operations
 */
export class FolderAPI {
  constructor(
    private bridge: UnityBridgeClient,
    private logger: Logger
  ) {}

  /**
   * Create folder using Unity 6 AssetDatabase
   */
  async create(options: FolderCreateOptions): Promise<CallToolResult> {
    this.logger.info(`Creating folder: ${options.path}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Folder.Create', {
        path: options.path,
        recursive: options.recursive !== false
      }, 360000); // 6 minutes timeout

      return {
        content: [{
          type: 'text',
          text: `Folder created: ${options.path}\n` +
                `GUID: ${result.guid}\n` +
                `Created directories: ${result.createdPaths.join(', ')}\n` +
                `Asset Database: Refreshed automatically`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create folder: ${errorMessage}`);
    }
  }

  /**
   * Delete folder using Unity 6 AssetDatabase
   */
  async delete(path: string): Promise<CallToolResult> {
    this.logger.info(`Deleting folder: ${path}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Folder.Delete', {
        path
      }, 360000); // 6 minutes timeout

      return {
        content: [{
          type: 'text',
          text: `Folder deleted: ${path}\n` +
                `Assets removed: ${result.deletedAssets}\n` +
                `Meta files: Cleaned automatically\n` +
                `Broken references: ${result.brokenReferences || 0}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete folder: ${errorMessage}`);
    }
  }

  /**
   * Rename folder using Unity 6 AssetDatabase
   */
  async rename(oldPath: string, newName: string): Promise<CallToolResult> {
    this.logger.info(`Renaming folder: ${oldPath} → ${newName}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Folder.Rename', {
        oldPath,
        newName
      }, 360000); // 6 minutes timeout

      return {
        content: [{
          type: 'text',
          text: `Folder renamed: ${oldPath} → ${result.newPath}\n` +
                `GUID: Preserved (${result.guid})\n` +
                `Asset references: ${result.referencesUpdated} updated\n` +
                `Namespace updates: ${result.namespaceUpdates} scripts updated`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to rename folder: ${errorMessage}`);
    }
  }


  /**
   * List folder contents with Unity metadata
   */
  async list(path: string): Promise<CallToolResult> {
    this.logger.info(`Listing folder contents: ${path}`);

    try {
      const result = await this.bridge.sendRequest('Unity.Folder.List', {
        path,
        includeMetadata: true,
        recursive: false
      }, 360000); // 6 minutes timeout for large folders

      const formatAssets = (assets: any[]) => {
        return assets.map(asset => {
          const icon = asset.type === 'folder' ? '[FOLDER]' : 
                      asset.type === 'script' ? '[SCRIPT]' :
                      asset.type === 'material' ? '[MATERIAL]' :
                      asset.type === 'texture' ? '[TEXTURE]' : '[FILE]';
          return `${icon} ${asset.name} (${asset.type})`;
        }).join('\n');
      };

      return {
        content: [{
          type: 'text',
          text: `Folder Contents: ${path}\n\n` +
                `Total items: ${result.assets.length}\n` +
                `Files: ${result.files}\n` +
                `Subfolders: ${result.folders}\n\n` +
                `Contents:\n${formatAssets(result.assets)}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list folder: ${errorMessage}`);
    }
  }

}