import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { pathExists, ensureDirectory } from '../utils/file-utils.js';
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
   * Delete a folder with all its contents and .meta files
   */
  async deleteFolder(folderPath: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const absFolderPath = path.isAbsolute(folderPath) 
      ? folderPath 
      : path.join(this.unityProject!.projectPath, folderPath);

    // Check if folder exists
    const stats = await fs.stat(absFolderPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    // Check if it's within Assets folder
    if (!absFolderPath.includes(path.sep + 'Assets' + path.sep)) {
      throw new Error('Can only delete folders within the Assets folder');
    }

    // Delete the folder and all contents
    await this.deleteFolderRecursive(absFolderPath);

    // Delete the folder's .meta file
    const metaPath = `${absFolderPath}.meta`;
    if (await pathExists(metaPath)) {
      await fs.unlink(metaPath);
      this.logger.info(`Deleted folder meta file: ${metaPath}`);
    }

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
   * Delete folder recursively with all .meta files
   */
  private async deleteFolderRecursive(folderPath: string): Promise<void> {
    const items = await fs.readdir(folderPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(folderPath, item.name);

      if (item.isDirectory()) {
        // Delete directory's .meta file BEFORE deleting the directory
        const metaPath = `${itemPath}.meta`;
        try {
          if (await pathExists(metaPath)) {
            await fs.unlink(metaPath);
          }
        } catch (error) {
          // Log but continue if .meta file deletion fails
          this.logger.warn(`Failed to delete .meta file: ${metaPath} - ${error}`);
        }
        
        // Recursively delete subdirectory
        await this.deleteFolderRecursive(itemPath);
      } else {
        // Delete file's .meta file first
        const metaPath = `${itemPath}.meta`;
        try {
          if (await pathExists(metaPath)) {
            await fs.unlink(metaPath);
          }
        } catch (error) {
          // Log but continue if .meta file deletion fails
          this.logger.warn(`Failed to delete .meta file: ${metaPath} - ${error}`);
        }
        
        // Delete file
        await fs.unlink(itemPath);
      }
    }

    // Remove the directory itself
    await fs.rmdir(folderPath);
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