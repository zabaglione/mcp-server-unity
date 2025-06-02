import path from 'path';
import fs from 'fs/promises';
import { Logger, AssetType } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { findFiles, ensureDirectory } from '../utils/file-utils.js';
import { getSceneTemplate } from '../templates/scene-template.js';
import { getMaterialTemplate } from '../templates/material-template.js';

export class AssetService extends BaseService {
  private validator: UnityProjectValidator;
  private assetTypes: Map<string, AssetType>;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
    this.assetTypes = new Map([
      ['scenes', { name: 'scenes', extensions: ['.unity'] }],
      ['materials', { name: 'materials', extensions: ['.mat'] }],
      ['scripts', { name: 'scripts', extensions: ['.cs'] }],
      ['shaders', { name: 'shaders', extensions: ['.shader', '.shadergraph'] }],
      ['all', { name: 'all', extensions: ['.unity', '.mat', '.cs', '.prefab', '.asset', '.shader', '.shadergraph'] }],
    ]);
  }

  async createScene(sceneName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const scenesPath = path.join(this.unityProject!.assetsPath, 'Scenes');
    await ensureDirectory(scenesPath);

    const sceneFileName = this.validator.normalizeFileName(sceneName, '.unity');
    const scenePath = path.join(scenesPath, sceneFileName);
    const sceneTemplate = getSceneTemplate();

    await fs.writeFile(scenePath, sceneTemplate, 'utf-8');

    this.logger.info(`Scene created: ${scenePath}`);

    return {
      content: [
        {
          type: 'text',
          text: `Scene created: ${path.relative(this.unityProject!.projectPath, scenePath)}`,
        },
      ],
    };
  }

  async createMaterial(materialName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    const materialsPath = path.join(this.unityProject!.assetsPath, 'Materials');
    await ensureDirectory(materialsPath);

    const materialFileName = this.validator.normalizeFileName(materialName, '.mat');
    const materialPath = path.join(materialsPath, materialFileName);
    const materialTemplate = getMaterialTemplate(materialName);

    await fs.writeFile(materialPath, materialTemplate, 'utf-8');

    this.logger.info(`Material created: ${materialPath}`);

    return {
      content: [
        {
          type: 'text',
          text: `Material created: ${path.relative(this.unityProject!.projectPath, materialPath)}`,
        },
      ],
    };
  }

  async listAssets(assetType: string = 'all'): Promise<CallToolResult> {
    this.ensureProjectSet();

    const assetTypeConfig = this.assetTypes.get(assetType) || this.assetTypes.get('all')!;
    const assets: string[] = [];

    for (const ext of assetTypeConfig.extensions) {
      const files = await findFiles({
        directory: this.unityProject!.assetsPath,
        extension: ext
      });
      assets.push(...files);
    }

    const relativePaths = assets.map(asset =>
      path.relative(this.unityProject!.projectPath, asset)
    );

    return {
      content: [
        {
          type: 'text',
          text: `Found ${assets.length} ${assetType} assets:\n${relativePaths.join('\n')}`,
        },
      ],
    };
  }

  async getAssetCounts(): Promise<{ scripts: number; scenes: number; materials: number }> {
    this.ensureProjectSet();

    const [scripts, scenes, materials] = await Promise.all([
      findFiles({ directory: this.unityProject!.assetsPath, extension: '.cs' }),
      findFiles({ directory: this.unityProject!.assetsPath, extension: '.unity' }),
      findFiles({ directory: this.unityProject!.assetsPath, extension: '.mat' }),
    ]);

    return {
      scripts: scripts.length,
      scenes: scenes.length,
      materials: materials.length,
    };
  }
}