import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Scenario Tests: Development Workflow', () => {
  let server: any;
  let tempDir: string;
  let projectPath: string;
  let mockLogger: ConsoleLogger;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `unity-mcp-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create mock Unity project structure
    projectPath = path.join(tempDir, 'TestProject');
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Materials'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Shaders'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Editor'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'ProjectSettings'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Packages'), { recursive: true });
    
    // Create manifest.json for URP
    const manifest = {
      dependencies: {
        "com.unity.render-pipelines.universal": "12.1.13"
      }
    };
    fs.writeFileSync(
      path.join(projectPath, 'Packages', 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    
    // Initialize server
    server = new UnityMCPServer(mockLogger);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Complete Feature Development', () => {
    it('should handle full feature development workflow', async () => {
      // Step 1: Setup project
      const setupResult = await server.services.projectService.setProject(projectPath);
      expect(setupResult.content[0].text).toContain('Unity project path set');

      // Step 2: Create player controller system
      const playerScript = `using UnityEngine;
using UnityEngine.InputSystem;

namespace GameCore.Player
{
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private float jumpForce = 10f;
        [SerializeField] private float gravity = -20f;
        
        private CharacterController controller;
        private Vector3 velocity;
        private bool isGrounded;
        
        void Start()
        {
            controller = GetComponent<CharacterController>();
        }
        
        void Update()
        {
            isGrounded = controller.isGrounded;
            if (isGrounded && velocity.y < 0)
            {
                velocity.y = -2f;
            }
            
            // Movement
            float horizontal = Input.GetAxis("Horizontal");
            float vertical = Input.GetAxis("Vertical");
            Vector3 move = transform.right * horizontal + transform.forward * vertical;
            controller.Move(move * moveSpeed * Time.deltaTime);
            
            // Jump
            if (Input.GetButtonDown("Jump") && isGrounded)
            {
                velocity.y = Mathf.Sqrt(jumpForce * -2f * gravity);
            }
            
            // Apply gravity
            velocity.y += gravity * Time.deltaTime;
            controller.Move(velocity * Time.deltaTime);
        }
    }
}`;

      // Create the player controller
      const playerResult = await server.services.scriptService.createScript(
        'PlayerController',
        playerScript,
        'Player'
      );
      expect(playerResult.content[0].text).toContain('created successfully');

      // Step 3: Create custom shader for the player
      const shaderResult = await server.services.shaderService.createShader(
        'PlayerShader',
        'urp',
        undefined
      );
      expect(shaderResult.content[0].text).toContain('created successfully');

      // Step 4: Create material using the shader
      const materialResult = await server.services.materialService.createMaterialWithShader(
        'PlayerMaterial',
        'PlayerShader'
      );
      expect(materialResult.content[0].text).toContain('created successfully');

      // Step 5: Update material properties
      const propUpdateResult = await server.services.materialService.updateMaterialProperties(
        'PlayerMaterial.mat',
        {
          colors: {
            '_BaseColor': [0.2, 0.5, 1.0, 1.0] // Blue tint
          },
          floats: {
            '_Metallic': 0.3,
            '_Smoothness': 0.8
          }
        }
      );
      expect(propUpdateResult.content[0].text).toContain('updated successfully');

      // Step 6: Create editor extension for player settings
      const editorResult = await server.services.editorScriptService.createEditorScript(
        'PlayerControllerEditor',
        'customEditor',
        {
          targetClass: 'PlayerController'
        }
      );
      expect(editorResult.content[0].text).toContain('created successfully');

      // Step 7: Add namespace to organize code
      const namespaceResult = await server.services.codeAnalysisService.applyNamespace(
        'PlayerController.cs',
        'GameCore.Player'
      );
      expect(namespaceResult.content[0].text).toContain('applied successfully');

      // Step 8: Verify all assets created
      const scriptsList = await server.services.scriptService.listScripts();
      expect(scriptsList.content[0].text).toContain('PlayerController.cs');

      const materialsList = await server.services.materialService.listMaterials();
      expect(materialsList.content[0].text).toContain('PlayerMaterial.mat');

      const shadersList = await server.services.shaderService.listShaders();
      expect(shadersList.content[0].text).toContain('PlayerShader.shader');

      const editorList = await server.services.editorScriptService.listEditorScripts();
      expect(editorList.content[0].text).toContain('PlayerControllerEditor.cs');
    });
  });

  describe('Refactoring Workflow', () => {
    it('should handle code refactoring scenario', async () => {
      await server.services.projectService.setProject(projectPath);

      // Step 1: Create initial messy scripts
      const scripts = [
        {
          name: 'GameManager',
          content: `using UnityEngine;

public class GameManager : MonoBehaviour {
    public static GameManager Instance;
    public int score;
    public float timeRemaining;
    
    void Awake() {
        Instance = this;
    }
    
    public void AddScore(int points) {
        score += points;
    }
}`
        },
        {
          name: 'PlayerHealth',
          content: `using UnityEngine;

public class PlayerHealth : MonoBehaviour {
    public int health = 100;
    public GameManager gameManager;
    
    void Start() {
        gameManager = GameManager.Instance;
    }
    
    public void TakeDamage(int damage) {
        health -= damage;
        if (health <= 0) {
            Die();
        }
    }
    
    void Die() {
        Debug.Log("Player died!");
    }
}`
        },
        {
          name: 'EnemyAI',
          content: `using UnityEngine;

public class EnemyAI : MonoBehaviour {
    public float speed = 3f;
    public int damage = 10;
    private Transform player;
    
    void Start() {
        player = GameObject.FindGameObjectWithTag("Player").transform;
    }
    
    void Update() {
        if (player != null) {
            transform.position = Vector3.MoveTowards(transform.position, player.position, speed * Time.deltaTime);
        }
    }
}`
        }
      ];

      // Create all scripts
      for (const script of scripts) {
        await server.services.scriptService.createScript(
          script.name,
          script.content,
          ''
        );
      }

      // Step 2: Detect any duplicate classes
      const duplicatesResult = await server.services.codeAnalysisService.detectClassDuplicates();
      expect(duplicatesResult.content[0].text).toBeDefined();

      // Step 3: Apply namespaces to organize code
      const namespacesToApply = [
        { file: 'GameManager.cs', namespace: 'GameCore.Management' },
        { file: 'PlayerHealth.cs', namespace: 'GameCore.Player' },
        { file: 'EnemyAI.cs', namespace: 'GameCore.AI' }
      ];

      for (const { file, namespace } of namespacesToApply) {
        const result = await server.services.codeAnalysisService.applyNamespace(file, namespace);
        expect(result.content[0].text).toContain('applied successfully');
      }

      // Step 4: Refactor GameManager to use proper singleton pattern
      const refactoredGameManager = `using UnityEngine;

namespace GameCore.Management
{
    public class GameManager : MonoBehaviour
    {
        private static GameManager _instance;
        public static GameManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = FindObjectOfType<GameManager>();
                    if (_instance == null)
                    {
                        GameObject go = new GameObject("GameManager");
                        _instance = go.AddComponent<GameManager>();
                    }
                }
                return _instance;
            }
        }
        
        [SerializeField] private int score;
        [SerializeField] private float timeRemaining;
        
        public int Score => score;
        public float TimeRemaining => timeRemaining;
        
        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;
            DontDestroyOnLoad(gameObject);
        }
        
        public void AddScore(int points)
        {
            if (points > 0)
            {
                score += points;
                OnScoreChanged?.Invoke(score);
            }
        }
        
        public event System.Action<int> OnScoreChanged;
    }
}`;

      // Get diff before applying
      const diffResult = await server.services.codeAnalysisService.getFileDiff(
        'GameManager.cs',
        refactoredGameManager
      );
      expect(diffResult.content[0].text).toContain('@@');

      // Apply the refactoring
      const updateResult = await server.services.scriptService.updateScript(
        'GameManager.cs',
        refactoredGameManager
      );
      expect(updateResult.content[0].text).toContain('updated successfully');

      // Step 5: Create interfaces for better architecture
      const healthInterface = `using UnityEngine;

namespace GameCore.Interfaces
{
    public interface IDamageable
    {
        int Health { get; }
        void TakeDamage(int damage);
        void Die();
    }
}`;

      await server.services.scriptService.createScript(
        'IDamageable',
        healthInterface,
        'Interfaces'
      );

      // Step 6: Verify all refactoring completed
      const finalScripts = await server.services.scriptService.listScripts();
      expect(finalScripts.content[0].text).toContain('GameManager.cs');
      expect(finalScripts.content[0].text).toContain('PlayerHealth.cs');
      expect(finalScripts.content[0].text).toContain('EnemyAI.cs');
      expect(finalScripts.content[0].text).toContain('IDamageable.cs');
    });
  });

  describe('Asset Pipeline Workflow', () => {
    it('should handle complete asset conversion workflow', async () => {
      await server.services.projectService.setProject(projectPath);

      // Step 1: Create multiple shaders for different purposes
      const shaderTypes = [
        { name: 'StandardShader', type: 'builtin' },
        { name: 'URPShader', type: 'urp' },
        { name: 'ToonShader', type: 'urp' }
      ];

      for (const shader of shaderTypes) {
        await server.services.shaderService.createShader(
          shader.name,
          shader.type as any
        );
      }

      // Step 2: Create materials using different shaders
      const materials = [
        'CharacterMaterial',
        'EnvironmentMaterial',
        'PropsMaterial',
        'EffectsMaterial',
        'UIMaterial'
      ];

      for (const mat of materials) {
        await server.services.materialService.createMaterial(mat);
      }

      // Step 3: Batch convert materials to URP
      const batchResult = await server.services.materialService.batchConvertMaterials(
        materials.map(m => m + '.mat'),
        'Universal Render Pipeline/Lit',
        {
          '_Color': '_BaseColor',
          '_MainTex': '_BaseMap',
          '_Metallic': '_Metallic',
          '_Glossiness': '_Smoothness'
        }
      );
      expect(batchResult.content[0].text).toContain('Batch conversion completed');

      // Step 4: Update specific material properties
      for (const mat of materials.slice(0, 3)) {
        const color = [
          Math.random(),
          Math.random(),
          Math.random(),
          1.0
        ];

        await server.services.materialService.updateMaterialProperties(
          mat + '.mat',
          {
            colors: { '_BaseColor': color },
            floats: {
              '_Metallic': Math.random() * 0.5,
              '_Smoothness': 0.5 + Math.random() * 0.5
            }
          }
        );
      }

      // Step 5: Clone and modify materials for variants
      const variantResult = await server.services.materialService.cloneMaterial(
        'CharacterMaterial.mat',
        'CharacterMaterial_Damaged'
      );
      expect(variantResult.content[0].text).toContain('cloned successfully');

      // Update the variant
      await server.services.materialService.updateMaterialProperties(
        'CharacterMaterial_Damaged.mat',
        {
          colors: {
            '_BaseColor': [0.8, 0.2, 0.2, 1.0] // Red tint for damage
          },
          floats: {
            '_Metallic': 0.8,
            '_Smoothness': 0.2 // Rougher surface
          }
        }
      );

      // Step 6: Create custom shader and apply to material
      const customShaderContent = `Shader "Custom/URPGlowEffect"
{
    Properties
    {
        _BaseMap ("Texture", 2D) = "white" {}
        _BaseColor ("Color", Color) = (1,1,1,1)
        _GlowColor ("Glow Color", Color) = (1,0.5,0,1)
        _GlowIntensity ("Glow Intensity", Range(0,5)) = 1
    }
    
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            
            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };
            
            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };
            
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                half4 _BaseColor;
                half4 _GlowColor;
                half _GlowIntensity;
            CBUFFER_END
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }
            
            half4 frag(Varyings IN) : SV_Target
            {
                half4 baseColor = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv) * _BaseColor;
                half4 glow = _GlowColor * _GlowIntensity * sin(_Time.y * 3.0) * 0.5 + 0.5;
                return baseColor + glow;
            }
            ENDHLSL
        }
    }
}`;

      await server.services.shaderService.updateShader(
        'EffectsShader.shader',
        customShaderContent
      );

      // Apply custom shader to effect material
      await server.services.materialService.updateMaterialShader(
        'EffectsMaterial.mat',
        'Custom/URPGlowEffect'
      );

      // Step 7: Verify final asset state
      const finalMaterials = await server.services.materialService.listMaterials();
      const materialCount = finalMaterials.content[0].text.split('\n').filter(l => l.trim()).length;
      expect(materialCount).toBeGreaterThan(materials.length); // Original + cloned

      const finalShaders = await server.services.shaderService.listShaders();
      expect(finalShaders.content[0].text).toContain('EffectsShader.shader');
    });
  });

  describe('Build Preparation Workflow', () => {
    it('should handle pre-build validation and setup', async () => {
      await server.services.projectService.setProject(projectPath);

      // Step 1: Create build configuration script
      const buildConfig = `using UnityEngine;
using UnityEditor;
using System.Collections.Generic;

namespace GameCore.Build
{
    [CreateAssetMenu(fileName = "BuildConfiguration", menuName = "Build/Configuration")]
    public class BuildConfiguration : ScriptableObject
    {
        [Header("Build Settings")]
        public string productName = "MyGame";
        public string companyName = "MyCompany";
        public string version = "1.0.0";
        
        [Header("Scenes")]
        public List<SceneAsset> scenesToInclude = new List<SceneAsset>();
        
        [Header("Platform Settings")]
        public BuildTarget targetPlatform = BuildTarget.StandaloneWindows64;
        public bool developmentBuild = false;
        
        [Header("Optimization")]
        public bool stripEngineCode = true;
        public ScriptingImplementation scriptingBackend = ScriptingImplementation.IL2CPP;
    }
}`;

      await server.services.scriptService.createScript(
        'BuildConfiguration',
        buildConfig,
        'Build'
      );

      // Step 2: Create build automation script
      const buildAutomation = `using UnityEngine;
using UnityEditor;
using UnityEditor.Build.Reporting;
using System;

namespace GameCore.Build
{
    public static class BuildAutomation
    {
        [MenuItem("Build/Build All Platforms")]
        public static void BuildAllPlatforms()
        {
            BuildForPlatform(BuildTarget.StandaloneWindows64);
            BuildForPlatform(BuildTarget.StandaloneOSX);
            BuildForPlatform(BuildTarget.StandaloneLinux64);
        }
        
        public static void BuildForPlatform(BuildTarget target)
        {
            string outputPath = $"Builds/{target}/{Application.productName}";
            
            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = GetScenePaths(),
                locationPathName = outputPath,
                target = target,
                options = BuildOptions.None
            };
            
            BuildReport report = BuildPipeline.BuildPlayer(options);
            
            if (report.summary.result == BuildResult.Succeeded)
            {
                Debug.Log($"Build succeeded for {target}: {report.summary.totalSize} bytes");
            }
            else
            {
                Debug.LogError($"Build failed for {target}");
            }
        }
        
        private static string[] GetScenePaths()
        {
            var scenes = new List<string>();
            foreach (var scene in EditorBuildSettings.scenes)
            {
                if (scene.enabled)
                {
                    scenes.Add(scene.path);
                }
            }
            return scenes.ToArray();
        }
    }
}`;

      await server.services.editorScriptService.createEditorScript(
        'BuildAutomation',
        'menuItems',
        {
          customContent: buildAutomation
        }
      );

      // Step 3: Create pre-build validation
      const preBuildValidation = `using UnityEngine;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using System.Collections.Generic;

namespace GameCore.Build
{
    public class PreBuildValidation : IPreprocessBuildWithReport
    {
        public int callbackOrder => 0;
        
        public void OnPreprocessBuild(BuildReport report)
        {
            Debug.Log("Starting pre-build validation...");
            
            var errors = new List<string>();
            
            // Check for missing references
            CheckMissingReferences(errors);
            
            // Validate shader variants
            ValidateShaders(errors);
            
            // Check texture import settings
            ValidateTextures(errors);
            
            // Verify required scenes
            ValidateScenes(errors);
            
            if (errors.Count > 0)
            {
                string errorMessage = string.Join("\\n", errors);
                throw new BuildFailedException($"Pre-build validation failed:\\n{errorMessage}");
            }
            
            Debug.Log("Pre-build validation passed!");
        }
        
        private void CheckMissingReferences(List<string> errors)
        {
            // Check for missing script references
            var allAssets = AssetDatabase.GetAllAssetPaths();
            foreach (var path in allAssets)
            {
                if (path.EndsWith(".prefab"))
                {
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                    if (prefab != null)
                    {
                        var components = prefab.GetComponentsInChildren<MonoBehaviour>(true);
                        foreach (var comp in components)
                        {
                            if (comp == null)
                            {
                                errors.Add($"Missing script on prefab: {path}");
                            }
                        }
                    }
                }
            }
        }
        
        private void ValidateShaders(List<string> errors)
        {
            // Validate shader compilation
            var shaders = Resources.FindObjectsOfTypeAll<Shader>();
            foreach (var shader in shaders)
            {
                if (!shader.isSupported)
                {
                    errors.Add($"Unsupported shader: {shader.name}");
                }
            }
        }
        
        private void ValidateTextures(List<string> errors)
        {
            // Check texture compression settings
            // Implementation would check texture import settings
        }
        
        private void ValidateScenes(List<string> errors)
        {
            if (EditorBuildSettings.scenes.Length == 0)
            {
                errors.Add("No scenes in build settings!");
            }
        }
    }
}`;

      await server.services.scriptService.createScript(
        'PreBuildValidation',
        preBuildValidation,
        'Build/Editor'
      );

      // Step 4: Setup build process would happen here
      // In real scenario, this would trigger Unity build
      
      // Verify all build scripts created
      const buildScripts = await server.services.scriptService.listScripts();
      expect(buildScripts.content[0].text).toContain('BuildConfiguration.cs');
      expect(buildScripts.content[0].text).toContain('BuildAutomation.cs');
      expect(buildScripts.content[0].text).toContain('PreBuildValidation.cs');
    });
  });
});