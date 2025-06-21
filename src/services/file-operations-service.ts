import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { pathExists, ensureDirectory } from '../utils/file-utils.js';
import { writeFileAtomic } from '../utils/atomic-write.js';
import { FileNotFoundError } from '../errors/index.js';

/**
 * Service for handling Unity file and folder operations with proper .meta file management
 */
export class FileOperationsService extends BaseService {
  constructor(logger: Logger) {
    super(logger);
  }

  /**
   * Move a file with its .meta file
   */
  async moveFile(sourcePath: string, destinationPath: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Resolve absolute paths
    const absSourcePath = path.isAbsolute(sourcePath) 
      ? sourcePath 
      : path.join(this.unityProject!.projectPath, sourcePath);
    const absDestPath = path.isAbsolute(destinationPath) 
      ? destinationPath 
      : path.join(this.unityProject!.projectPath, destinationPath);

    // Check if source exists
    if (!await pathExists(absSourcePath)) {
      throw new FileNotFoundError(sourcePath, 'File');
    }

    // Check if it's within Assets folder
    if (!absSourcePath.includes(path.sep + 'Assets' + path.sep)) {
      throw new Error('Can only move files within the Assets folder');
    }

    // Ensure destination directory exists
    await ensureDirectory(path.dirname(absDestPath));

    // Move the file
    await fs.rename(absSourcePath, absDestPath);
    this.logger.info(`Moved file: ${absSourcePath} -> ${absDestPath}`);

    // Move the .meta file if it exists
    const sourceMetaPath = `${absSourcePath}.meta`;
    const destMetaPath = `${absDestPath}.meta`;
    
    if (await pathExists(sourceMetaPath)) {
      await fs.rename(sourceMetaPath, destMetaPath);
      this.logger.info(`Moved meta file: ${sourceMetaPath} -> ${destMetaPath}`);
    } else {
      this.logger.warn(`No .meta file found for: ${absSourcePath}`);
    }

    // Trigger Unity refresh
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Successfully moved file:\n` +
              `From: ${path.relative(this.unityProject!.projectPath, absSourcePath)}\n` +
              `To: ${path.relative(this.unityProject!.projectPath, absDestPath)}\n` +
              `Meta file: ${await pathExists(destMetaPath) ? 'Moved' : 'Not found'}`
      }]
    };
  }

  /**
   * Delete a file with its .meta file
   */
  async deleteFile(filePath: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const absFilePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.unityProject!.projectPath, filePath);

    // Check if file exists
    if (!await pathExists(absFilePath)) {
      throw new FileNotFoundError(filePath, 'File');
    }

    // Check if it's within Assets folder
    if (!absFilePath.includes(path.sep + 'Assets' + path.sep)) {
      throw new Error('Can only delete files within the Assets folder');
    }

    // Delete the file
    await fs.unlink(absFilePath);
    this.logger.info(`Deleted file: ${absFilePath}`);

    // Delete the .meta file if it exists
    const metaPath = `${absFilePath}.meta`;
    if (await pathExists(metaPath)) {
      await fs.unlink(metaPath);
      this.logger.info(`Deleted meta file: ${metaPath}`);
    }

    // Trigger Unity refresh
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Successfully deleted file: ${path.relative(this.unityProject!.projectPath, absFilePath)}`
      }]
    };
  }

  /**
   * Move a folder with all its contents and .meta files
   */
  async moveFolder(sourcePath: string, destinationPath: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const absSourcePath = path.isAbsolute(sourcePath) 
      ? sourcePath 
      : path.join(this.unityProject!.projectPath, sourcePath);
    const absDestPath = path.isAbsolute(destinationPath) 
      ? destinationPath 
      : path.join(this.unityProject!.projectPath, destinationPath);

    // Check if source exists
    const sourceStats = await fs.stat(absSourcePath).catch(() => null);
    if (!sourceStats || !sourceStats.isDirectory()) {
      throw new Error(`Source folder not found: ${sourcePath}`);
    }

    // Check if it's within Assets folder
    if (!absSourcePath.includes(path.sep + 'Assets' + path.sep)) {
      throw new Error('Can only move folders within the Assets folder');
    }

    // Check if destination already exists
    if (await pathExists(absDestPath)) {
      throw new Error(`Destination folder already exists: ${destinationPath}`);
    }

    // Ensure parent directory exists
    await ensureDirectory(path.dirname(absDestPath));

    // Move the folder
    await this.moveFolderRecursive(absSourcePath, absDestPath);

    // Move the folder's .meta file
    const sourceMetaPath = `${absSourcePath}.meta`;
    const destMetaPath = `${absDestPath}.meta`;
    
    if (await pathExists(sourceMetaPath)) {
      await fs.rename(sourceMetaPath, destMetaPath);
      this.logger.info(`Moved folder meta file: ${sourceMetaPath} -> ${destMetaPath}`);
    }

    // Trigger Unity refresh
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Successfully moved folder:\n` +
              `From: ${path.relative(this.unityProject!.projectPath, absSourcePath)}\n` +
              `To: ${path.relative(this.unityProject!.projectPath, absDestPath)}`
      }]
    };
  }

  /**
   * Rename a folder (special case of move)
   */
  async renameFolder(oldName: string, newName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const absOldPath = path.isAbsolute(oldName) 
      ? oldName 
      : path.join(this.unityProject!.projectPath, oldName);
    
    const parentDir = path.dirname(absOldPath);
    const absNewPath = path.join(parentDir, path.basename(newName));

    return await this.moveFolder(absOldPath, absNewPath);
  }

  /**
   * Delete a folder with all its contents and .meta files using Unity-proper method
   */
  async deleteFolder(folderPath: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Convert to Unity project-relative path
    let relativePath: string;
    if (path.isAbsolute(folderPath)) {
      relativePath = path.relative(this.unityProject!.projectPath, folderPath);
    } else {
      relativePath = folderPath;
    }

    // Normalize path separators for Unity
    relativePath = relativePath.replace(/\\/g, '/');

    // Ensure path is within Assets folder
    if (!relativePath.startsWith('Assets/')) {
      throw new Error('Can only delete folders within the Assets folder');
    }

    const absFolderPath = path.join(this.unityProject!.projectPath, relativePath);

    // Check if folder exists
    const stats = await fs.stat(absFolderPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    try {
      // Method 1: Try Unity AssetDatabase approach first (preferred)
      const success = await this.deleteAssetViaUnity(relativePath);
      
      if (success) {
        this.logger.info(`Successfully deleted folder via Unity AssetDatabase: ${relativePath}`);
        return {
          content: [{
            type: 'text',
            text: `Successfully deleted folder via Unity AssetDatabase: ${relativePath}`
          }]
        };
      }
    } catch (error) {
      this.logger.warn(`Unity AssetDatabase deletion failed, falling back to manual deletion: ${error}`);
    }

    // Method 2: Fallback to manual deletion with proper meta file handling
    await this.deleteFolderRecursiveWithProperMetaHandling(absFolderPath);

    // Trigger Unity refresh
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Successfully deleted folder: ${path.relative(this.unityProject!.projectPath, absFolderPath)}`
      }]
    };
  }

  /**
   * Move folder recursively with all .meta files
   */
  private async moveFolderRecursive(source: string, dest: string): Promise<void> {
    // Create destination directory
    await ensureDirectory(dest);

    // Get all items in source directory
    const items = await fs.readdir(source, { withFileTypes: true });

    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const destPath = path.join(dest, item.name);

      if (item.isDirectory()) {
        // Move directory's .meta file BEFORE moving the directory itself
        const sourceMetaPath = `${sourcePath}.meta`;
        const destMetaPath = `${destPath}.meta`;
        if (await pathExists(sourceMetaPath)) {
          await fs.rename(sourceMetaPath, destMetaPath);
        }
        
        // Recursively move subdirectory
        await this.moveFolderRecursive(sourcePath, destPath);
      } else {
        // Move file
        await fs.rename(sourcePath, destPath);
        
        // Move file's .meta file
        const sourceMetaPath = `${sourcePath}.meta`;
        const destMetaPath = `${destPath}.meta`;
        if (await pathExists(sourceMetaPath)) {
          await fs.rename(sourceMetaPath, destMetaPath);
        }
      }
    }

    // Remove source directory (should be empty now)
    await fs.rmdir(source);
  }


  /**
   * Delete folder recursively with proper Unity-aware meta file handling
   */
  private async deleteFolderRecursiveWithProperMetaHandling(folderPath: string): Promise<void> {
    const items = await fs.readdir(folderPath, { withFileTypes: true });

    // Phase 1: Delete all files and their meta files
    for (const item of items) {
      const itemPath = path.join(folderPath, item.name);

      if (!item.isDirectory()) {
        // Delete file's .meta file first
        const metaPath = `${itemPath}.meta`;
        try {
          if (await pathExists(metaPath)) {
            await fs.unlink(metaPath);
            this.logger.debug(`Deleted file meta: ${metaPath}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to delete file meta: ${metaPath} - ${error}`);
        }
        
        // Then delete the file itself
        await fs.unlink(itemPath);
        this.logger.debug(`Deleted file: ${itemPath}`);
      }
    }

    // Phase 2: Recursively delete subdirectories and their meta files
    for (const item of items) {
      const itemPath = path.join(folderPath, item.name);

      if (item.isDirectory()) {
        // Recursively delete subdirectory contents first
        await this.deleteFolderRecursiveWithProperMetaHandling(itemPath);
        
        // Then delete directory's .meta file AFTER directory is empty
        const metaPath = `${itemPath}.meta`;
        try {
          if (await pathExists(metaPath)) {
            await fs.unlink(metaPath);
            this.logger.debug(`Deleted directory meta: ${metaPath}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to delete directory meta: ${metaPath} - ${error}`);
        }
      }
    }

    // Phase 3: Remove the directory itself (should be empty now)
    await fs.rmdir(folderPath);
    this.logger.debug(`Deleted directory: ${folderPath}`);
  }

  /**
   * Delete asset using Unity's AssetDatabase API via generated C# script
   */
  private async deleteAssetViaUnity(assetPath: string): Promise<boolean> {
    if (!this.unityProject) {
      throw new Error('Unity project not set');
    }

    // Create a temporary C# script that calls AssetDatabase.DeleteAsset
    const tempScriptPath = path.join(this.unityProject.projectPath, 'Assets', 'Editor', 'MCP', 'TempAssetDeleter.cs');
    
    const scriptContent = `using UnityEngine;
using UnityEditor;
using System.IO;

namespace MCP.TempOperations
{
    public static class TempAssetDeleter
    {
        [MenuItem("MCP/Internal/Delete Asset")]
        public static void DeleteAsset()
        {
            string assetPath = "${assetPath.replace(/\\/g, '/')}";
            
            if (AssetDatabase.LoadAssetAtPath<Object>(assetPath) != null)
            {
                bool success = AssetDatabase.DeleteAsset(assetPath);
                
                // Write result to temp file
                string resultPath = Path.Combine(Application.dataPath, "..", "Temp", "mcp_delete_result.txt");
                File.WriteAllText(resultPath, success ? "SUCCESS" : "FAILED");
                
                if (success)
                {
                    Debug.Log($"MCP: Successfully deleted asset via AssetDatabase: {assetPath}");
                    AssetDatabase.Refresh();
                }
                else
                {
                    Debug.LogError($"MCP: Failed to delete asset via AssetDatabase: {assetPath}");
                }
            }
            else
            {
                // Asset doesn't exist or is already deleted
                string resultPath = Path.Combine(Application.dataPath, "..", "Temp", "mcp_delete_result.txt");
                File.WriteAllText(resultPath, "NOT_FOUND");
                Debug.LogWarning($"MCP: Asset not found for deletion: {assetPath}");
            }
        }
    }
}`;

    try {
      // Ensure the Editor/MCP directory exists
      const editorMcpPath = path.join(this.unityProject.projectPath, 'Assets', 'Editor', 'MCP');
      await ensureDirectory(editorMcpPath);

      // Write the temporary script
      await writeFileAtomic(tempScriptPath, scriptContent);

      // Wait for Unity to compile the script
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Trigger the deletion via Unity menu
      const resultPath = path.join(this.unityProject.projectPath, 'Temp', 'mcp_delete_result.txt');
      
      // Remove any previous result file
      if (await pathExists(resultPath)) {
        await fs.unlink(resultPath);
      }

      // Note: In a real implementation, we would need a way to trigger Unity's menu item
      // For now, we'll return false to indicate we should fall back to manual deletion
      return false;

    } catch (error) {
      this.logger.error(`Error in Unity AssetDatabase deletion: ${error}`);
      return false;
    } finally {
      // Clean up the temporary script
      try {
        if (await pathExists(tempScriptPath)) {
          await fs.unlink(tempScriptPath);
          const metaPath = `${tempScriptPath}.meta`;
          if (await pathExists(metaPath)) {
            await fs.unlink(metaPath);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to clean up temporary script: ${error}`);
      }
    }
  }

  /**
   * Batch file operations
   */
  async batchFileOperations(operations: Array<{
    type: 'move' | 'delete' | 'rename';
    source: string;
    destination?: string;
  }>): Promise<CallToolResult> {
    this.ensureProjectSet();

    const results: string[] = [];
    const errors: string[] = [];

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'move':
            if (!op.destination) {
              throw new Error('Destination required for move operation');
            }
            await this.moveFile(op.source, op.destination);
            results.push(`Moved: ${op.source} -> ${op.destination}`);
            break;
          
          case 'delete':
            await this.deleteFile(op.source);
            results.push(`Deleted: ${op.source}`);
            break;
          
          case 'rename':
            if (!op.destination) {
              throw new Error('New name required for rename operation');
            }
            const dir = path.dirname(op.source);
            const newPath = path.join(dir, op.destination);
            await this.moveFile(op.source, newPath);
            results.push(`Renamed: ${op.source} -> ${op.destination}`);
            break;
        }
      } catch (error) {
        errors.push(`Failed ${op.type} ${op.source}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Single Unity refresh after all operations
    if (this.refreshService && results.length > 0) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Batch file operations completed:\n` +
              `Successful: ${results.length}\n` +
              `Failed: ${errors.length}\n\n` +
              `Results:\n${results.join('\n')}\n\n` +
              (errors.length > 0 ? `Errors:\n${errors.join('\n')}` : '')
      }]
    };
  }
}