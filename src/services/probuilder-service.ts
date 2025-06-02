import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { UnityProjectValidator } from '../validators/unity-project-validator.js';
import { ensureDirectory } from '../utils/file-utils.js';
import { getProBuilderShapeTemplate } from '../templates/probuilder-shape-template.js';
import { getProBuilderMeshEditorTemplate } from '../templates/probuilder-mesh-editor-template.js';
import { getProBuilderRuntimeTemplate } from '../templates/probuilder-runtime-template.js';
import { CONFIG } from '../config/index.js';

export type ProBuilderScriptType = 'shape' | 'meshEditor' | 'runtime';

export interface ProBuilderShape {
  type: 'cube' | 'cylinder' | 'sphere' | 'plane' | 'stairs' | 'arch' | 'torus' | 'custom';
  size?: { x: number; y: number; z: number };
  segments?: number;
  radius?: number;
  height?: number;
}

export class ProBuilderService extends BaseService {
  private validator: UnityProjectValidator;

  constructor(logger: Logger) {
    super(logger);
    this.validator = new UnityProjectValidator();
  }

  async createProBuilderScript(
    scriptName: string,
    scriptType: ProBuilderScriptType,
    customContent?: string
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const className = this.ensureValidClassName(scriptName);
    const fileName = this.validator.normalizeFileName(className, '.cs');

    // Create ProBuilder scripts folder
    const proBuilderPath = path.join(
      this.unityProject!.assetsPath,
      CONFIG.unity.defaultFolders.scripts,
      'ProBuilder'
    );
    await ensureDirectory(proBuilderPath);

    // Get the appropriate template
    let scriptContent: string;
    if (customContent) {
      scriptContent = customContent;
    } else {
      scriptContent = this.getProBuilderTemplate(className, scriptType);
    }

    // Write the script file
    const scriptPath = path.join(proBuilderPath, fileName);
    await fs.writeFile(scriptPath, scriptContent, 'utf-8');

    this.logger.info(`ProBuilder script created: ${scriptPath}`);

    return {
      content: [
        {
          type: 'text',
          text: `ProBuilder ${scriptType} script created: ${path.relative(
            this.unityProject!.projectPath,
            scriptPath
          )}`,
        },
      ],
    };
  }

  async createProBuilderPrefab(
    prefabName: string,
    shape: ProBuilderShape,
    includeScript: boolean = true
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Create Prefabs folder
    const prefabsPath = path.join(this.unityProject!.assetsPath, 'Prefabs', 'ProBuilder');
    await ensureDirectory(prefabsPath);

    // Generate prefab content
    const prefabContent = this.generateProBuilderPrefab(prefabName, shape);
    const prefabFileName = this.validator.normalizeFileName(prefabName, '.prefab');
    const prefabPath = path.join(prefabsPath, prefabFileName);

    await fs.writeFile(prefabPath, prefabContent, 'utf-8');

    // Create accompanying script if requested
    if (includeScript) {
      const scriptName = `${prefabName}Controller`;
      
      // Create a simple controller script for the prefab
      const scriptContent = this.generateControllerScript(scriptName, shape);
      const proBuilderPath = path.join(
        this.unityProject!.assetsPath,
        CONFIG.unity.defaultFolders.scripts,
        'ProBuilder'
      );
      await ensureDirectory(proBuilderPath);
      
      const scriptPath = path.join(proBuilderPath, `${scriptName}.cs`);
      await fs.writeFile(scriptPath, scriptContent, 'utf-8');
      
      this.logger.info(`ProBuilder script created: ${scriptPath}`);
    }

    this.logger.info(`ProBuilder prefab created: ${prefabPath}`);

    return {
      content: [
        {
          type: 'text',
          text: `ProBuilder prefab created: ${path.relative(
            this.unityProject!.projectPath,
            prefabPath
          )}${includeScript ? `\nController script also created: ${prefabName}Controller.cs` : ''}`,
        },
      ],
    };
  }

  private getProBuilderTemplate(className: string, scriptType: ProBuilderScriptType): string {
    switch (scriptType) {
      case 'shape':
        return getProBuilderShapeTemplate(className);
      case 'meshEditor':
        return getProBuilderMeshEditorTemplate(className);
      case 'runtime':
        return getProBuilderRuntimeTemplate(className);
      default:
        throw new Error(`Unknown ProBuilder script type: ${scriptType}`);
    }
  }

  private generateProBuilderPrefab(name: string, shape: ProBuilderShape): string {
    const guid = this.generateGUID();
    
    return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &1${guid}
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
  - component: {fileID: 4${guid}}
  - component: {fileID: 33${guid}}
  - component: {fileID: 23${guid}}
  - component: {fileID: 114${guid}}
  m_Layer: 0
  m_Name: ${name}
  m_TagString: Untagged
  m_Icon: {fileID: 0}
  m_NavMeshLayer: 0
  m_StaticEditorFlags: 0
  m_IsActive: 1
--- !u!4 &4${guid}
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: 1${guid}}
  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}
  m_LocalPosition: {x: 0, y: 0, z: 0}
  m_LocalScale: {x: ${shape.size?.x || 1}, y: ${shape.size?.y || 1}, z: ${shape.size?.z || 1}}
  m_Children: []
  m_Father: {fileID: 0}
  m_RootOrder: 0
  m_LocalEulerAnglesHint: {x: 0, y: 0, z: 0}
--- !u!33 &33${guid}
MeshFilter:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: 1${guid}}
  m_Mesh: {fileID: 0}
--- !u!23 &23${guid}
MeshRenderer:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: 1${guid}}
  m_Enabled: 1
  m_CastShadows: 1
  m_ReceiveShadows: 1
  m_DynamicOccludee: 1
  m_MotionVectors: 1
  m_LightProbeUsage: 1
  m_ReflectionProbeUsage: 1
  m_RayTracingMode: 2
  m_RenderingLayerMask: 1
  m_RendererPriority: 0
  m_Materials:
  - {fileID: 10303, guid: 0000000000000000f000000000000000, type: 0}
  m_StaticBatchInfo:
    firstSubMesh: 0
    subMeshCount: 0
  m_StaticBatchRoot: {fileID: 0}
  m_ProbeAnchor: {fileID: 0}
  m_LightProbeVolumeOverride: {fileID: 0}
  m_ScaleInLightmap: 1
  m_ReceiveGI: 1
  m_PreserveUVs: 0
  m_IgnoreNormalsForChartDetection: 0
  m_ImportantGI: 0
  m_StitchLightmapSeams: 1
  m_SelectedEditorRenderState: 3
  m_MinimumChartSize: 4
  m_AutoUVMaxDistance: 0.5
  m_AutoUVMaxAngle: 89
  m_LightmapParameters: {fileID: 0}
  m_SortingLayerID: 0
  m_SortingLayer: 0
  m_SortingOrder: 0
--- !u!114 &114${guid}
MonoBehaviour:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: 1${guid}}
  m_Enabled: 1
  m_EditorHideFlags: 0
  m_Script: {fileID: 11500000, guid: 8233d90336aea9f4cable29661ce55835, type: 3}
  m_Name: 
  m_EditorClassIdentifier: 
  m_MeshFormatVersion: 1
  m_Faces: []
  m_SharedVertices: []
  m_SharedTextures: []
  m_Positions: []
  m_Textures0: []
  m_Textures2: []
  m_Textures3: []
  m_Tangents: []
  m_Colors: []
  m_UnwrapParameters:
    m_HardAngle: 88
    m_PackMargin: 4
    m_AngleError: 8
    m_AreaError: 15
  m_PreserveMeshAssetOnDestroy: 0
  m_Mesh: {fileID: 0}
  m_IsSelectable: 1
  m_SelectedFaces: 
  m_SelectedEdges: 
  m_SelectedVertices:`;
  }

  private ensureValidClassName(name: string): string {
    let className = name.replace(/\.(cs|js)$/i, '');
    className = className.charAt(0).toUpperCase() + className.slice(1);
    className = className.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (/^\d/.test(className)) {
      className = '_' + className;
    }
    
    return className;
  }

  private generateGUID(): string {
    const hex = '0123456789';
    let guid = '';
    for (let i = 0; i < 8; i++) {
      guid += hex[Math.floor(Math.random() * 10)];
    }
    return guid;
  }

  private generateControllerScript(className: string, shape: ProBuilderShape): string {
    return `using UnityEngine;
using UnityEngine.ProBuilder;
using System.Collections.Generic;

/// <summary>
/// Simple ProBuilder controller for creating ${shape.type} shapes
/// This controller demonstrates basic ProBuilder mesh creation
/// </summary>
public class ${className} : MonoBehaviour
{
    [Header("Cube Settings")]
    public Vector3 cubeSize = new Vector3(${shape.size?.x || 1}, ${shape.size?.y || 1}, ${shape.size?.z || 1});
    
    [Header("Material")]
    public Material defaultMaterial;
    
    private ProBuilderMesh currentMesh;
    
    void Start()
    {
        CreateCube();
    }
    
    public ProBuilderMesh CreateCube()
    {
        // Create a simple ProBuilder cube manually
        ProBuilderMesh mesh = ProBuilderMesh.Create();
        mesh.name = "ProBuilder ${shape.type}";
        mesh.transform.position = transform.position;
        
        // Define cube vertices
        var positions = new Vector3[]
        {
            new Vector3(-0.5f, -0.5f, -0.5f),
            new Vector3( 0.5f, -0.5f, -0.5f),
            new Vector3( 0.5f,  0.5f, -0.5f),
            new Vector3(-0.5f,  0.5f, -0.5f),
            new Vector3(-0.5f, -0.5f,  0.5f),
            new Vector3( 0.5f, -0.5f,  0.5f),
            new Vector3( 0.5f,  0.5f,  0.5f),
            new Vector3(-0.5f,  0.5f,  0.5f),
        };
        
        // Scale positions by cube size
        for (int i = 0; i < positions.Length; i++)
        {
            positions[i] = Vector3.Scale(positions[i], cubeSize);
        }
        
        // Define cube faces (each face is a quad with 4 vertices)
        var faces = new Face[]
        {
            new Face(new int[] { 0, 1, 2, 3 }), // Front
            new Face(new int[] { 5, 4, 7, 6 }), // Back
            new Face(new int[] { 4, 0, 3, 7 }), // Left
            new Face(new int[] { 1, 5, 6, 2 }), // Right
            new Face(new int[] { 3, 2, 6, 7 }), // Top
            new Face(new int[] { 4, 5, 1, 0 })  // Bottom
        };
        
        // Build the mesh
        mesh.RebuildWithPositionsAndFaces(positions, faces);
        
        // Apply material if set
        if (defaultMaterial != null)
        {
            var renderer = mesh.GetComponent<MeshRenderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = defaultMaterial;
            }
        }
        
        // Store reference
        currentMesh = mesh;
        
        return mesh;
    }
    
    void OnDestroy()
    {
        if (currentMesh != null)
        {
            DestroyImmediate(currentMesh.gameObject);
        }
    }
}`;
  }

  async listProBuilderScripts(): Promise<CallToolResult> {
    this.ensureProjectSet();

    const proBuilderPath = path.join(
      this.unityProject!.assetsPath,
      CONFIG.unity.defaultFolders.scripts,
      'ProBuilder'
    );

    const scripts: string[] = [];

    try {
      const exists = await fs.access(proBuilderPath).then(() => true).catch(() => false);
      if (exists) {
        scripts.push(...await this.findProBuilderScripts(proBuilderPath));
      }
    } catch (error) {
      this.logger.debug('ProBuilder folder not found');
    }

    const relativePaths = scripts.map(script =>
      path.relative(this.unityProject!.projectPath, script)
    );

    return {
      content: [
        {
          type: 'text',
          text: scripts.length > 0
            ? `Found ${scripts.length} ProBuilder scripts:\n${relativePaths.join('\n')}`
            : 'No ProBuilder scripts found. ProBuilder scripts are stored in Assets/Scripts/ProBuilder/',
        },
      ],
    };
  }

  private async findProBuilderScripts(directory: string): Promise<string[]> {
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
}