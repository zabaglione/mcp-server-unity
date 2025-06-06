import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

interface MaterialData {
  Material: {
    serializedVersion: number;
    m_ObjectHideFlags: number;
    m_CorrespondingSourceObject: any;
    m_PrefabInstance: any;
    m_PrefabAsset: any;
    m_Name: string;
    m_Shader: {
      fileID: number;
      guid: string;
      type: number;
    };
    m_ShaderKeywords?: string;
    m_LightmapFlags?: number;
    m_EnableInstancingVariants?: number;
    m_DoubleSidedGI?: number;
    m_CustomRenderQueue?: number;
    stringTagMap?: any;
    disabledShaderPasses?: any[];
    m_SavedProperties: {
      serializedVersion: number;
      m_TexEnvs: any[];
      m_Floats: any[];
      m_Colors: any[];
    };
  };
}

export class MaterialService extends BaseService {
  // Common shader GUIDs
  private shaderGUIDs: Record<string, string> = {
    'Standard': '46933b9ed1c74c0c9a6a3e1d99f93274',
    'Universal Render Pipeline/Lit': '933532a4fcc9baf4fa0491de14d08ed7',
    'Universal Render Pipeline/Unlit': '650dd9526735d5b46b79224bc6e94025',
    'Universal Render Pipeline/Simple Lit': '8d2bb70cbf9db8d4da26e15b26e74248',
    'HDRP/Lit': 'b7e2b2b5c5f64c348b8b5f6c3d6e5a7f',
    'HDRP/Unlit': 'c4f7e2b5d6a74e349a8b7f8d9e6f5c8e',
    'Sprites/Default': '10753b9896e4e4b4e9a8e4e4e4e4e4e4',
    'UI/Default': '10770b9896e4e4b4e9a8e4e4e4e4e4e4',
    'Hidden/InternalErrorShader': '0000000000000000f000000000000000',
  };

  constructor(logger: Logger) {
    super(logger);
  }

  /**
   * Get appropriate default shader based on render pipeline
   */
  async getDefaultShaderForPipeline(): Promise<string> {
    // Detect render pipeline using the same logic as ProjectService
    try {
      const graphicsSettingsPath = path.join(
        this.unityProject!.projectPath,
        'ProjectSettings',
        'GraphicsSettings.asset'
      );
      
      const content = await fs.readFile(graphicsSettingsPath, 'utf-8');
      
      // Check if a custom render pipeline is set
      if (content.includes('m_CustomRenderPipeline:') && !content.includes('m_CustomRenderPipeline: {fileID: 0}')) {
        // Custom pipeline is set, determine which one
        
        // Check for URP in package cache
        const packageCachePath = path.join(this.unityProject!.projectPath, 'Library', 'PackageCache');
        try {
          const packages = await fs.readdir(packageCachePath);
          if (packages.some(pkg => pkg.includes('com.unity.render-pipelines.universal'))) {
            return 'Universal Render Pipeline/Lit';
          } else if (packages.some(pkg => pkg.includes('com.unity.render-pipelines.high-definition'))) {
            return 'HDRP/Lit';
          }
        } catch {
          // PackageCache might not exist
        }
        
        // Check for URP/HDRP assets in Settings folder
        const settingsPath = path.join(this.unityProject!.assetsPath, 'Settings');
        try {
          const files = await fs.readdir(settingsPath);
          if (files.some(file => file.includes('UniversalRP') || file.includes('URP'))) {
            return 'Universal Render Pipeline/Lit';
          } else if (files.some(file => file.includes('HDRenderPipeline') || file.includes('HDRP'))) {
            return 'HDRP/Lit';
          }
        } catch {
          // Settings folder might not exist
        }
        
        // If we found a custom pipeline but can't determine which, assume URP
        return 'Universal Render Pipeline/Lit';
      }
      
      return 'Standard';
    } catch {
      // Default to Standard if can't determine
      return 'Standard';
    }
  }

  /**
   * Preprocess Unity YAML to handle custom tags
   */
  private preprocessUnityYAML(content: string): string {
    // Remove Unity's custom tags that js-yaml can't handle
    // Replace !u!21 &2100000 with just the data
    return content.replace(/^---\s*!u!\d+\s*&\d+\s*$/gm, '---');
  }

  /**
   * Update the shader of an existing material
   */
  async updateMaterialShader(
    materialName: string,
    shaderName: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Ensure .mat extension
    if (!materialName.endsWith('.mat')) {
      materialName += '.mat';
    }

    // Find the material file
    const materialPath = await this.findMaterialFile(materialName);
    if (!materialPath) {
      throw new Error(`Material not found: ${materialName}`);
    }


    // Read material data
    const content = await fs.readFile(materialPath, 'utf-8');
    const processedContent = this.preprocessUnityYAML(content);
    const materialData = yaml.load(processedContent) as MaterialData;

    // Get shader GUID (use a placeholder if not in our list)
    const shaderGUID = this.shaderGUIDs[shaderName] || this.generateShaderGUID(shaderName);

    // Update shader reference
    materialData.Material.m_Shader = {
      fileID: 4800000,
      guid: shaderGUID,
      type: 3
    };

    // Clear shader keywords if changing to different pipeline
    if (this.isDifferentPipeline(materialData.Material.m_ShaderKeywords || '', shaderName)) {
      materialData.Material.m_ShaderKeywords = '';
    }

    // Write updated material
    const updatedContent = yaml.dump(materialData, {
      lineWidth: -1,
      noRefs: true,
      flowLevel: 3,
      styles: {
        '!!int': 'decimal',
        '!!float': 'decimal'
      }
    });

    // Ensure Unity YAML header and tags
    const finalContent = '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!21 &2100000\n' + updatedContent;
    await fs.writeFile(materialPath, finalContent, 'utf-8');

    this.logger.info(`Updated shader for material: ${materialName} to ${shaderName}`);

    return {
      content: [{
        type: 'text',
        text: `Successfully updated material shader:\n` +
              `Material: ${materialName}\n` +
              `New Shader: ${shaderName}\n` +
              `Path: ${path.relative(this.unityProject!.projectPath, materialPath)}\n\n` +
              `Note: Unity will need to refresh to apply the shader change.`
      }]
    };
  }

  /**
   * Update properties of an existing material
   */
  async updateMaterialProperties(
    materialName: string,
    properties: {
      colors?: Record<string, number[]>;
      floats?: Record<string, number>;
      textures?: Record<string, string>;
      vectors?: Record<string, number[]>;
    }
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Ensure .mat extension
    if (!materialName.endsWith('.mat')) {
      materialName += '.mat';
    }

    // Find the material file
    const materialPath = await this.findMaterialFile(materialName);
    if (!materialPath) {
      throw new Error(`Material not found: ${materialName}`);
    }


    // Read material data
    const content = await fs.readFile(materialPath, 'utf-8');
    const processedContent = this.preprocessUnityYAML(content);
    const materialData = yaml.load(processedContent) as MaterialData;

    const savedProps = materialData.Material.m_SavedProperties;

    // Update colors
    if (properties.colors) {
      for (const [propName, colorValue] of Object.entries(properties.colors)) {
        this.updateColorProperty(savedProps.m_Colors, propName, colorValue);
      }
    }

    // Update floats
    if (properties.floats) {
      for (const [propName, floatValue] of Object.entries(properties.floats)) {
        this.updateFloatProperty(savedProps.m_Floats, propName, floatValue);
      }
    }

    // Update textures
    if (properties.textures) {
      for (const [propName, texturePath] of Object.entries(properties.textures)) {
        await this.updateTextureProperty(savedProps.m_TexEnvs, propName, texturePath);
      }
    }

    // Update vectors (stored as colors in Unity)
    if (properties.vectors) {
      for (const [propName, vectorValue] of Object.entries(properties.vectors)) {
        this.updateColorProperty(savedProps.m_Colors, propName, vectorValue);
      }
    }

    // Write updated material
    const updatedContent = yaml.dump(materialData, {
      lineWidth: -1,
      noRefs: true,
      flowLevel: 3,
      styles: {
        '!!int': 'decimal',
        '!!float': 'decimal'
      }
    });

    const finalContent = '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!21 &2100000\n' + updatedContent;
    await fs.writeFile(materialPath, finalContent, 'utf-8');

    this.logger.info(`Updated properties for material: ${materialName}`);

    return {
      content: [{
        type: 'text',
        text: `Successfully updated material properties:\n` +
              `Material: ${materialName}\n` +
              `Updated Properties:\n` +
              (properties.colors ? `  Colors: ${Object.keys(properties.colors).join(', ')}\n` : '') +
              (properties.floats ? `  Floats: ${Object.keys(properties.floats).join(', ')}\n` : '') +
              (properties.textures ? `  Textures: ${Object.keys(properties.textures).join(', ')}\n` : '') +
              (properties.vectors ? `  Vectors: ${Object.keys(properties.vectors).join(', ')}\n` : '')
      }]
    };
  }

  /**
   * Read material properties and current shader
   */
  async readMaterial(materialName: string): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Ensure .mat extension
    if (!materialName.endsWith('.mat')) {
      materialName += '.mat';
    }

    // Find the material file
    const materialPath = await this.findMaterialFile(materialName);
    if (!materialPath) {
      throw new Error(`Material not found: ${materialName}`);
    }

    // Read material data
    const content = await fs.readFile(materialPath, 'utf-8');
    const processedContent = this.preprocessUnityYAML(content);
    const materialData = yaml.load(processedContent) as MaterialData;

    // Extract shader name from GUID
    const shaderGUID = materialData.Material.m_Shader.guid;
    const shaderName = this.getShaderNameFromGUID(shaderGUID) || `Unknown (GUID: ${shaderGUID})`;

    // Extract properties
    const savedProps = materialData.Material.m_SavedProperties;
    const colors: Record<string, number[]> = {};
    const floats: Record<string, number> = {};
    const textures: Record<string, string> = {};

    // Parse colors
    for (const colorProp of savedProps.m_Colors || []) {
      const name = Object.keys(colorProp)[0];
      const value = colorProp[name];
      colors[name] = [value.r || 0, value.g || 0, value.b || 0, value.a || 1];
    }

    // Parse floats
    for (const floatProp of savedProps.m_Floats || []) {
      const name = Object.keys(floatProp)[0];
      floats[name] = floatProp[name];
    }

    // Parse textures
    for (const texProp of savedProps.m_TexEnvs || []) {
      const name = Object.keys(texProp)[0];
      const value = texProp[name];
      if (value.m_Texture && value.m_Texture.guid) {
        textures[name] = value.m_Texture.guid;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `Material: ${materialName}\n` +
              `Shader: ${shaderName}\n` +
              `Keywords: ${materialData.Material.m_ShaderKeywords || 'None'}\n\n` +
              `Properties:\n` +
              `Colors:\n${Object.entries(colors).map(([k, v]) => `  ${k}: [${v.join(', ')}]`).join('\n')}\n\n` +
              `Floats:\n${Object.entries(floats).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n\n` +
              `Textures:\n${Object.entries(textures).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`
      }]
    };
  }

  /**
   * Batch convert materials to a specified shader
   */
  async batchConvertMaterials(
    materials: string[],
    targetShader: string,
    propertyMapping?: Record<string, string>
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const results: string[] = [];
    const errors: string[] = [];

    for (const materialName of materials) {
      try {
        // First update shader
        await this.updateMaterialShader(materialName, targetShader);

        // If property mapping provided, remap properties
        if (propertyMapping) {
          const materialPath = await this.findMaterialFile(
            materialName.endsWith('.mat') ? materialName : materialName + '.mat'
          );
          
          if (materialPath) {
            await this.remapMaterialProperties(materialPath, propertyMapping);
          }
        }

        results.push(`✓ ${materialName}`);
      } catch (error) {
        errors.push(`✗ ${materialName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      content: [{
        type: 'text',
        text: `Batch material conversion completed:\n` +
              `Target Shader: ${targetShader}\n` +
              `Total: ${materials.length}\n` +
              `Successful: ${results.length}\n` +
              `Failed: ${errors.length}\n\n` +
              `Results:\n${results.join('\n')}\n` +
              (errors.length > 0 ? `\nErrors:\n${errors.join('\n')}` : '')
      }]
    };
  }

  // Helper methods

  private async findMaterialFile(materialName: string): Promise<string | null> {
    const materialsPath = path.join(this.unityProject!.assetsPath, 'Materials');
    
    // First check in Materials folder
    let materialPath = path.join(materialsPath, materialName);
    if (await this.fileExists(materialPath)) {
      return materialPath;
    }

    // Search recursively in Assets
    const { glob } = await import('glob');
    const files = await glob(`**/${materialName}`, {
      cwd: this.unityProject!.assetsPath,
      absolute: true,
    });

    return files.length > 0 ? files[0] : null;
  }


  private generateShaderGUID(shaderName: string): string {
    // Generate a deterministic GUID based on shader name
    let hash = 0;
    for (let i = 0; i < shaderName.length; i++) {
      const char = shaderName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).padStart(32, '0');
  }

  private isDifferentPipeline(keywords: string, shaderName: string): boolean {
    const isURP = shaderName.includes('Universal Render Pipeline');
    const isHDRP = shaderName.includes('HDRP');
    const hasURPKeywords = keywords.includes('_UNIVERSAL');
    const hasHDRPKeywords = keywords.includes('_HDRP');

    return (isURP && hasHDRPKeywords) || (isHDRP && hasURPKeywords) || 
           (!isURP && !isHDRP && (hasURPKeywords || hasHDRPKeywords));
  }

  private getShaderNameFromGUID(guid: string): string | null {
    for (const [name, shaderGuid] of Object.entries(this.shaderGUIDs)) {
      if (shaderGuid === guid) {
        return name;
      }
    }
    return null;
  }

  private updateColorProperty(colors: any[], propName: string, value: number[]): void {
    // Remove existing property if exists
    const existingIndex = colors.findIndex(c => Object.keys(c)[0] === propName);
    if (existingIndex >= 0) {
      colors.splice(existingIndex, 1);
    }

    // Add new property
    colors.push({
      [propName]: {
        r: value[0] || 0,
        g: value[1] || 0,
        b: value[2] || 0,
        a: value[3] || 1
      }
    });
  }

  private updateFloatProperty(floats: any[], propName: string, value: number): void {
    // Remove existing property if exists
    const existingIndex = floats.findIndex(f => Object.keys(f)[0] === propName);
    if (existingIndex >= 0) {
      floats.splice(existingIndex, 1);
    }

    // Add new property
    floats.push({ [propName]: value });
  }

  private async updateTextureProperty(texEnvs: any[], propName: string, texturePath: string): Promise<void> {
    // Remove existing property if exists
    const existingIndex = texEnvs.findIndex(t => Object.keys(t)[0] === propName);
    if (existingIndex >= 0) {
      texEnvs.splice(existingIndex, 1);
    }

    // For now, we'll use the path as a placeholder for GUID
    // In a real implementation, we'd need to find the texture's GUID
    texEnvs.push({
      [propName]: {
        m_Texture: {
          fileID: 2800000,
          guid: this.generateShaderGUID(texturePath), // Placeholder
          type: 3
        },
        m_Scale: { x: 1, y: 1 },
        m_Offset: { x: 0, y: 0 }
      }
    });
  }

  private async remapMaterialProperties(materialPath: string, propertyMapping: Record<string, string>): Promise<void> {
    const content = await fs.readFile(materialPath, 'utf-8');
    const processedContent = this.preprocessUnityYAML(content);
    const materialData = yaml.load(processedContent) as MaterialData;
    const savedProps = materialData.Material.m_SavedProperties;

    // Remap colors
    const newColors: any[] = [];
    for (const colorProp of savedProps.m_Colors || []) {
      const oldName = Object.keys(colorProp)[0];
      const newName = propertyMapping[oldName] || oldName;
      newColors.push({ [newName]: colorProp[oldName] });
    }
    savedProps.m_Colors = newColors;

    // Remap floats
    const newFloats: any[] = [];
    for (const floatProp of savedProps.m_Floats || []) {
      const oldName = Object.keys(floatProp)[0];
      const newName = propertyMapping[oldName] || oldName;
      newFloats.push({ [newName]: floatProp[oldName] });
    }
    savedProps.m_Floats = newFloats;

    // Remap textures
    const newTexEnvs: any[] = [];
    for (const texProp of savedProps.m_TexEnvs || []) {
      const oldName = Object.keys(texProp)[0];
      const newName = propertyMapping[oldName] || oldName;
      newTexEnvs.push({ [newName]: texProp[oldName] });
    }
    savedProps.m_TexEnvs = newTexEnvs;

    // Write updated material
    const updatedContent = yaml.dump(materialData, {
      lineWidth: -1,
      noRefs: true,
      flowLevel: 3,
      styles: {
        '!!int': 'decimal',
        '!!float': 'decimal'
      }
    });

    const finalContent = '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!21 &2100000\n' + updatedContent;
    await fs.writeFile(materialPath, finalContent, 'utf-8');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}