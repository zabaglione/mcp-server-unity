import { BaseService } from './base-service.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PackageInfo {
  name: string;
  displayName: string;
  version: string;
  description: string;
  category?: string;
}

export class PackageService extends BaseService {
  // Unity標準パッケージのリスト（よく使われるもの）
  private readonly standardPackages: PackageInfo[] = [
    // 2D
    { name: 'com.unity.2d.sprite', displayName: '2D Sprite', version: 'latest', description: '2D Sprite editor and management tools', category: '2D' },
    { name: 'com.unity.2d.tilemap', displayName: '2D Tilemap Editor', version: 'latest', description: 'Tools for creating 2D tile-based layouts', category: '2D' },
    { name: 'com.unity.2d.animation', displayName: '2D Animation', version: 'latest', description: '2D skeletal animation tools', category: '2D' },
    { name: 'com.unity.2d.pixel-perfect', displayName: '2D Pixel Perfect', version: 'latest', description: 'Pixel Perfect rendering for 2D games', category: '2D' },
    
    // AI & Navigation
    { name: 'com.unity.ai.navigation', displayName: 'AI Navigation', version: 'latest', description: 'NavMesh components for pathfinding', category: 'AI' },
    
    // Animation
    { name: 'com.unity.cinemachine', displayName: 'Cinemachine', version: 'latest', description: 'Advanced camera system for games and movies', category: 'Animation' },
    { name: 'com.unity.timeline', displayName: 'Timeline', version: 'latest', description: 'Sequencing tool for creating cinematic content', category: 'Animation' },
    
    // Audio
    { name: 'com.unity.audio.dspgraph', displayName: 'DSP Graph', version: 'latest', description: 'Audio DSP graph system', category: 'Audio' },
    
    // Graphics
    { name: 'com.unity.render-pipelines.universal', displayName: 'Universal Render Pipeline (URP)', version: 'latest', description: 'Scriptable render pipeline for broad platform support', category: 'Graphics' },
    { name: 'com.unity.render-pipelines.high-definition', displayName: 'High Definition Render Pipeline (HDRP)', version: 'latest', description: 'Scriptable render pipeline for high-end platforms', category: 'Graphics' },
    { name: 'com.unity.shadergraph', displayName: 'Shader Graph', version: 'latest', description: 'Visual shader creation tool', category: 'Graphics' },
    { name: 'com.unity.postprocessing', displayName: 'Post Processing', version: 'latest', description: 'Post-processing effects for Built-in Render Pipeline', category: 'Graphics' },
    { name: 'com.unity.visualeffectgraph', displayName: 'Visual Effect Graph', version: 'latest', description: 'Node-based VFX creation tool', category: 'Graphics' },
    
    // Input
    { name: 'com.unity.inputsystem', displayName: 'Input System', version: 'latest', description: 'New input system with device support', category: 'Input' },
    
    // Mobile
    { name: 'com.unity.mobile.notifications', displayName: 'Mobile Notifications', version: 'latest', description: 'Mobile push notifications support', category: 'Mobile' },
    { name: 'com.unity.adaptiveperformance', displayName: 'Adaptive Performance', version: 'latest', description: 'Adaptive performance for mobile platforms', category: 'Mobile' },
    
    // Networking
    { name: 'com.unity.netcode.gameobjects', displayName: 'Netcode for GameObjects', version: 'latest', description: 'High-level networking library', category: 'Networking' },
    { name: 'com.unity.multiplayer.tools', displayName: 'Multiplayer Tools', version: 'latest', description: 'Tools for multiplayer development', category: 'Networking' },
    
    // Physics
    { name: 'com.unity.physics', displayName: 'Unity Physics', version: 'latest', description: 'DOTS-based physics engine', category: 'Physics' },
    
    // ProBuilder
    { name: 'com.unity.probuilder', displayName: 'ProBuilder', version: 'latest', description: '3D modeling and level design tool', category: 'World Building' },
    { name: 'com.unity.polybrush', displayName: 'Polybrush', version: 'latest', description: 'Mesh painting and sculpting tool', category: 'World Building' },
    { name: 'com.unity.progrids', displayName: 'ProGrids', version: 'latest', description: 'Grid snapping tool', category: 'World Building' },
    
    // Testing
    { name: 'com.unity.test-framework', displayName: 'Test Framework', version: 'latest', description: 'Unit testing framework', category: 'Testing' },
    
    // TextMeshPro
    { name: 'com.unity.textmeshpro', displayName: 'TextMeshPro', version: 'latest', description: 'Advanced text rendering', category: 'UI' },
    { name: 'com.unity.ugui', displayName: 'Unity UI', version: 'latest', description: 'Built-in UI system', category: 'UI' },
    { name: 'com.unity.ui', displayName: 'UI Toolkit', version: 'latest', description: 'Modern UI framework', category: 'UI' },
    { name: 'com.unity.ui.builder', displayName: 'UI Builder', version: 'latest', description: 'Visual UI creation tool', category: 'UI' },
    
    // XR
    { name: 'com.unity.xr.interaction.toolkit', displayName: 'XR Interaction Toolkit', version: 'latest', description: 'Cross-platform XR interaction system', category: 'XR' },
    { name: 'com.unity.xr.arfoundation', displayName: 'AR Foundation', version: 'latest', description: 'Cross-platform AR development framework', category: 'XR' },
    { name: 'com.unity.xr.management', displayName: 'XR Plugin Management', version: 'latest', description: 'XR platform management', category: 'XR' },
    
    // Utilities
    { name: 'com.unity.addressables', displayName: 'Addressables', version: 'latest', description: 'Asset management and loading system', category: 'Utilities' },
    { name: 'com.unity.burst', displayName: 'Burst', version: 'latest', description: 'High-performance compiler', category: 'Utilities' },
    { name: 'com.unity.mathematics', displayName: 'Mathematics', version: 'latest', description: 'High-performance math library', category: 'Utilities' },
    { name: 'com.unity.collections', displayName: 'Collections', version: 'latest', description: 'High-performance data structures', category: 'Utilities' },
    { name: 'com.unity.jobs', displayName: 'Jobs', version: 'latest', description: 'Job system for multithreaded code', category: 'Utilities' },
    { name: 'com.unity.localization', displayName: 'Localization', version: 'latest', description: 'Localization tools', category: 'Utilities' },
    { name: 'com.unity.recorder', displayName: 'Recorder', version: 'latest', description: 'Record videos and animations', category: 'Utilities' },
  ];

  async searchPackages(query: string): Promise<{ content: { type: string; text: string }[] }> {
    this.ensureProjectSet();
    
    const lowerQuery = query.toLowerCase();
    const matches = this.standardPackages.filter(pkg => 
      pkg.name.toLowerCase().includes(lowerQuery) ||
      pkg.displayName.toLowerCase().includes(lowerQuery) ||
      pkg.description.toLowerCase().includes(lowerQuery) ||
      (pkg.category && pkg.category.toLowerCase().includes(lowerQuery))
    );

    if (matches.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No packages found matching "${query}". Try searching with different keywords like:\n` +
                `- Category names: 2D, Graphics, UI, XR, Physics, etc.\n` +
                `- Package names: ProBuilder, Cinemachine, TextMeshPro, etc.\n` +
                `- Features: render pipeline, animation, networking, etc.`
        }]
      };
    }

    // カテゴリ別にグループ化
    const grouped = matches.reduce((acc, pkg) => {
      const category = pkg.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(pkg);
      return acc;
    }, {} as Record<string, PackageInfo[]>);

    let text = `Found ${matches.length} package(s) matching "${query}":\n\n`;
    
    for (const [category, packages] of Object.entries(grouped)) {
      text += `## ${category}\n\n`;
      for (const pkg of packages) {
        text += `### ${pkg.displayName}\n`;
        text += `- Package: ${pkg.name}\n`;
        text += `- Description: ${pkg.description}\n\n`;
      }
    }

    text += '\nTo install a package, use:\n';
    text += '`package_install with packageName="<package-name>"`\n\n';
    text += 'To install a specific version:\n';
    text += '`package_install with packageName="<package-name>" version="<version>"`';

    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }

  async installPackage(packageName: string, version?: string, skipRefresh: boolean = false): Promise<{ content: { type: string; text: string }[] }> {
    this.ensureProjectSet();
    
    const manifestPath = path.join(this.unityProject!.projectPath, 'Packages', 'manifest.json');
    
    try {
      // manifest.jsonを読み込む
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      // すでにインストールされているかチェック
      if (manifest.dependencies && manifest.dependencies[packageName]) {
        return {
          content: [{
            type: 'text',
            text: `Package "${packageName}" is already installed with version: ${manifest.dependencies[packageName]}\n\n` +
                  `To update, you can remove it first with package_remove, then install again.`
          }]
        };
      }
      
      // パッケージを追加
      if (!manifest.dependencies) {
        manifest.dependencies = {};
      }
      
      const packageVersion = version || 'latest';
      manifest.dependencies[packageName] = packageVersion;
      
      // ソート（見やすさのため）
      const sortedDependencies = Object.keys(manifest.dependencies)
        .sort()
        .reduce((acc, key) => {
          acc[key] = manifest.dependencies[key];
          return acc;
        }, {} as Record<string, string>);
      
      manifest.dependencies = sortedDependencies;
      
      // manifest.jsonを書き戻す
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      
      // Unity refresh with specific options for package import
      let refreshMessage = '';
      if (!skipRefresh && this.refreshService) {
        this.logger.info(`Triggering Unity refresh for package installation: ${packageName}`);
        await this.refreshService.refreshUnityAssets({ 
          forceRecompile: false,  // Package import doesn't need full recompile
          recompileScripts: false,
          saveAssets: true        // Save assets to ensure package is properly imported
        });
        refreshMessage = `✅ Unity asset database has been refreshed automatically.\n\n`;
      } else if (skipRefresh) {
        refreshMessage = `⚠️  Auto-refresh skipped. Remember to refresh Unity manually or use system_refresh_assets.\n\n`;
      }
      
      const packageInfo = this.standardPackages.find(p => p.name === packageName);
      const displayName = packageInfo ? packageInfo.displayName : packageName;
      
      return {
        content: [{
          type: 'text',
          text: `Successfully added package "${displayName}" (${packageName}) version "${packageVersion}" to manifest.json\n\n` +
                refreshMessage +
                `Unity is now downloading and importing the package. This may take a few moments depending on the package size.\n\n` +
                `If Unity is not open, the package will be imported when you next open the project.`
        }]
      };
      
    } catch (error) {
      throw new Error(`Failed to install package: ${error}`);
    }
  }

  async removePackage(packageName: string): Promise<{ content: { type: string; text: string }[] }> {
    this.ensureProjectSet();
    
    const manifestPath = path.join(this.unityProject!.projectPath, 'Packages', 'manifest.json');
    
    try {
      // manifest.jsonを読み込む
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      // パッケージが存在するかチェック
      if (!manifest.dependencies || !manifest.dependencies[packageName]) {
        return {
          content: [{
            type: 'text',
            text: `Package "${packageName}" is not installed in this project.`
          }]
        };
      }
      
      // パッケージを削除
      const removedVersion = manifest.dependencies[packageName];
      delete manifest.dependencies[packageName];
      
      // manifest.jsonを書き戻す
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      
      // Unity refresh for package removal
      if (this.refreshService) {
        this.logger.info(`Triggering Unity refresh for package removal: ${packageName}`);
        await this.refreshService.refreshUnityAssets({ 
          forceRecompile: false,  // Package removal doesn't need full recompile
          recompileScripts: false,
          saveAssets: true        // Save assets to ensure package is properly removed
        });
      }
      
      const packageInfo = this.standardPackages.find(p => p.name === packageName);
      const displayName = packageInfo ? packageInfo.displayName : packageName;
      
      return {
        content: [{
          type: 'text',
          text: `Successfully removed package "${displayName}" (${packageName}) version "${removedVersion}" from manifest.json\n\n` +
                `✅ Unity asset database has been refreshed automatically.\n\n` +
                `Unity is now removing the package and its associated assets.\n\n` +
                `If Unity is not open, the package will be removed when you next open the project.`
        }]
      };
      
    } catch (error) {
      throw new Error(`Failed to remove package: ${error}`);
    }
  }

  async listInstalledPackages(): Promise<{ content: { type: string; text: string }[] }> {
    this.ensureProjectSet();
    
    const manifestPath = path.join(this.unityProject!.projectPath, 'Packages', 'manifest.json');
    
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      if (!manifest.dependencies || Object.keys(manifest.dependencies).length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No packages are currently installed in the project manifest.'
          }]
        };
      }
      
      let text = `Installed packages (${Object.keys(manifest.dependencies).length}):\n\n`;
      
      // カテゴリ別にグループ化
      const categorized: Record<string, Array<{ name: string; version: string; info?: PackageInfo }>> = {};
      
      for (const [pkgName, pkgVersion] of Object.entries(manifest.dependencies)) {
        const info = this.standardPackages.find(p => p.name === pkgName);
        const category = info?.category || 'Other/Custom';
        
        if (!categorized[category]) {
          categorized[category] = [];
        }
        
        categorized[category].push({
          name: pkgName,
          version: pkgVersion as string,
          info
        });
      }
      
      // カテゴリ別に表示
      for (const [category, packages] of Object.entries(categorized)) {
        text += `## ${category}\n\n`;
        for (const pkg of packages) {
          if (pkg.info) {
            text += `- **${pkg.info.displayName}** (${pkg.name}): ${pkg.version}\n`;
            text += `  ${pkg.info.description}\n`;
          } else {
            text += `- ${pkg.name}: ${pkg.version}\n`;
          }
        }
        text += '\n';
      }
      
      return {
        content: [{
          type: 'text',
          text
        }]
      };
      
    } catch (error) {
      throw new Error(`Failed to list packages: ${error}`);
    }
  }

  async installMultiplePackages(packages: Array<{ name: string; version?: string }>): Promise<{ content: { type: string; text: string }[] }> {
    this.ensureProjectSet();
    
    const results: string[] = [];
    const failed: string[] = [];
    
    // Install all packages without refresh
    for (const pkg of packages) {
      try {
        const result = await this.installPackage(pkg.name, pkg.version, true); // Skip individual refresh
        const lines = result.content[0].text.split('\n');
        results.push(`✅ ${lines[0]}`); // First line contains success message
      } catch (error) {
        failed.push(`❌ ${pkg.name}: ${error}`);
      }
    }
    
    // Single refresh after all packages
    if (this.refreshService && results.length > 0) {
      this.logger.info(`Triggering Unity refresh after installing ${results.length} packages`);
      await this.refreshService.refreshUnityAssets({ 
        forceRecompile: false,
        recompileScripts: false,
        saveAssets: true
      });
    }
    
    let text = `Batch package installation completed:\n\n`;
    
    if (results.length > 0) {
      text += `Successfully installed ${results.length} package(s):\n`;
      text += results.join('\n') + '\n\n';
    }
    
    if (failed.length > 0) {
      text += `Failed to install ${failed.length} package(s):\n`;
      text += failed.join('\n') + '\n\n';
    }
    
    if (results.length > 0) {
      text += `✅ Unity asset database refreshed once for all packages.\n\n`;
      text += `Unity is now importing all packages. This may take several moments.`;
    }
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }
}