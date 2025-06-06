import path from 'path';
import { pathExists } from '../utils/file-utils.js';
import { InvalidUnityProjectError } from '../errors/index.js';

export class UnityProjectValidator {
  async validate(projectPath: string): Promise<void> {
    const assetsPath = path.join(projectPath, 'Assets');
    const projectSettingsPath = path.join(projectPath, 'ProjectSettings');

    const [assetsExists, settingsExists] = await Promise.all([
      pathExists(assetsPath),
      pathExists(projectSettingsPath),
    ]);

    if (!assetsExists || !settingsExists) {
      throw new InvalidUnityProjectError(
        'Invalid Unity project path. Assets and ProjectSettings folders not found.'
      );
    }
  }

  normalizeFileName(fileName: string, extension: string): string {
    if (!fileName || fileName.trim() === '') {
      throw new Error('File name cannot be empty');
    }
    return fileName.endsWith(extension) ? fileName : `${fileName}${extension}`;
  }

  validateBuildTarget(target: string): boolean {
    const validTargets = [
      'StandaloneWindows64',
      'StandaloneOSX',
      'StandaloneLinux64',
      'iOS',
      'Android',
      'WebGL'
    ];
    return validTargets.includes(target);
  }
}