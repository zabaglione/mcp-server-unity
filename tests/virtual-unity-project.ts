import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';

export interface VirtualProjectOptions {
  unityVersion?: string;
  scriptCount?: number;
  includePackages?: string[];
  includePrefabs?: boolean;
  includeScenes?: boolean;
  includeMaterials?: boolean;
  includeShaders?: boolean;
  projectName?: string;
}

export class VirtualUnityProject {
  private projectPath: string;
  private options: VirtualProjectOptions;
  private generatedFiles: string[] = [];

  constructor(basePath: string, options: VirtualProjectOptions = {}) {
    this.options = {
      unityVersion: '2022.3.10f1',
      scriptCount: 10,
      includePackages: ['com.unity.collab-proxy', 'com.unity.ide.visualstudio', 'com.unity.test-framework'],
      includePrefabs: true,
      includeScenes: true,
      includeMaterials: true,
      includeShaders: true,
      projectName: `TestProject_${randomBytes(4).toString('hex')}`,
      ...options
    };
    
    this.projectPath = path.join(basePath, this.options.projectName!);
  }

  /**
   * Generate a complete Unity project structure
   */
  async generate(): Promise<string> {
    console.log(`Generating virtual Unity project at: ${this.projectPath}`);
    
    // Create base structure
    await this.createProjectStructure();
    
    // Generate Unity-specific files
    await this.generateProjectSettings();
    await this.generateManifest();
    
    // Generate assets
    await this.generateScripts();
    
    if (this.options.includeScenes) {
      await this.generateScenes();
    }
    
    if (this.options.includeMaterials) {
      await this.generateMaterials();
    }
    
    if (this.options.includeShaders) {
      await this.generateShaders();
    }
    
    if (this.options.includePrefabs) {
      await this.generatePrefabs();
    }
    
    // Generate meta files
    await this.generateMetaFiles();
    
    console.log(`✅ Generated ${this.generatedFiles.length} files`);
    return this.projectPath;
  }

  /**
   * Create the basic Unity project folder structure
   */
  private async createProjectStructure(): Promise<void> {
    const directories = [
      'Assets',
      'Assets/Scripts',
      'Assets/Scripts/Player',
      'Assets/Scripts/Enemies',
      'Assets/Scripts/UI',
      'Assets/Materials',
      'Assets/Textures',
      'Assets/Prefabs',
      'Assets/Scenes',
      'Assets/Shaders',
      'Assets/Editor',
      'Assets/Editor/Windows',
      'Assets/Resources',
      'Assets/StreamingAssets',
      'ProjectSettings',
      'Packages',
      'Library',
      'Temp',
      'Logs',
      'UserSettings'
    ];
    
    for (const dir of directories) {
      await fs.mkdir(path.join(this.projectPath, dir), { recursive: true });
    }
  }

  /**
   * Generate ProjectSettings files
   */
  private async generateProjectSettings(): Promise<void> {
    // ProjectVersion.txt
    const projectVersionPath = path.join(this.projectPath, 'ProjectSettings', 'ProjectVersion.txt');
    await fs.writeFile(projectVersionPath, `m_EditorVersion: ${this.options.unityVersion}`);
    this.generatedFiles.push(projectVersionPath);
    
    // ProjectSettings.asset (minimal)
    const projectSettingsPath = path.join(this.projectPath, 'ProjectSettings', 'ProjectSettings.asset');
    const projectSettings = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!129 &1
PlayerSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 23
  productGUID: ${randomBytes(16).toString('hex')}
  AndroidProfiler: 0
  AndroidFilterTouchesWhenObscured: 0
  AndroidEnableSustainedPerformanceMode: 0
  defaultScreenOrientation: 4
  targetDevice: 2
  useOnDemandResources: 0
  accelerometerFrequency: 60
  companyName: DefaultCompany
  productName: ${this.options.projectName}
  defaultCursor: {fileID: 0}
  cursorHotspot: {x: 0, y: 0}`;
    
    await fs.writeFile(projectSettingsPath, projectSettings);
    this.generatedFiles.push(projectSettingsPath);
    
    // EditorBuildSettings.asset
    const editorBuildSettingsPath = path.join(this.projectPath, 'ProjectSettings', 'EditorBuildSettings.asset');
    const editorBuildSettings = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1045 &1
EditorBuildSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_Scenes: []
  m_configObjects: {}`;
    
    await fs.writeFile(editorBuildSettingsPath, editorBuildSettings);
    this.generatedFiles.push(editorBuildSettingsPath);
    
    // GraphicsSettings.asset
    const graphicsSettingsPath = path.join(this.projectPath, 'ProjectSettings', 'GraphicsSettings.asset');
    const graphicsSettings = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!30 &1
GraphicsSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 13
  m_Deferred:
    m_Mode: 1
    m_Shader: {fileID: 69, guid: 0000000000000000f000000000000000, type: 0}
  m_DeferredReflections:
    m_Mode: 1
    m_Shader: {fileID: 74, guid: 0000000000000000f000000000000000, type: 0}
  m_ScreenSpaceShadows:
    m_Mode: 1
    m_Shader: {fileID: 64, guid: 0000000000000000f000000000000000, type: 0}
  m_LegacyDeferred:
    m_Mode: 1
    m_Shader: {fileID: 63, guid: 0000000000000000f000000000000000, type: 0}
  m_DepthNormals:
    m_Mode: 1
    m_Shader: {fileID: 62, guid: 0000000000000000f000000000000000, type: 0}
  m_MotionVectors:
    m_Mode: 1
    m_Shader: {fileID: 75, guid: 0000000000000000f000000000000000, type: 0}
  m_LightHalo:
    m_Mode: 1
    m_Shader: {fileID: 105, guid: 0000000000000000f000000000000000, type: 0}
  m_LensFlare:
    m_Mode: 1
    m_Shader: {fileID: 102, guid: 0000000000000000f000000000000000, type: 0}
  m_AlwaysIncludedShaders:
  - {fileID: 7, guid: 0000000000000000f000000000000000, type: 0}
  - {fileID: 15104, guid: 0000000000000000f000000000000000, type: 0}
  - {fileID: 15105, guid: 0000000000000000f000000000000000, type: 0}
  - {fileID: 15106, guid: 0000000000000000f000000000000000, type: 0}
  - {fileID: 10753, guid: 0000000000000000f000000000000000, type: 0}
  - {fileID: 10770, guid: 0000000000000000f000000000000000, type: 0}
  m_PreloadedShaders: []
  m_SpritesDefaultMaterial: {fileID: 10754, guid: 0000000000000000f000000000000000, type: 0}
  m_CustomRenderPipeline: {fileID: 0}
  m_TransparencySortMode: 0
  m_TransparencySortAxis: {x: 0, y: 0, z: 1}
  m_DefaultRenderingPath: 1
  m_DefaultMobileRenderingPath: 1
  m_TierSettings: []`;
    
    await fs.writeFile(graphicsSettingsPath, graphicsSettings);
    this.generatedFiles.push(graphicsSettingsPath);
  }

  /**
   * Generate package manifest
   */
  private async generateManifest(): Promise<void> {
    const manifestPath = path.join(this.projectPath, 'Packages', 'manifest.json');
    
    const dependencies: Record<string, string> = {};
    for (const pkg of this.options.includePackages!) {
      dependencies[pkg] = 'latest';
    }
    
    const manifest = {
      dependencies,
      scopedRegistries: [],
      testables: []
    };
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    this.generatedFiles.push(manifestPath);
    
    // packages-lock.json
    const lockPath = path.join(this.projectPath, 'Packages', 'packages-lock.json');
    const lockFile = {
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([name, version]) => [
          name,
          {
            version: version === 'latest' ? '1.0.0' : version,
            depth: 0,
            source: 'registry',
            dependencies: {},
            url: 'https://packages.unity.com'
          }
        ])
      )
    };
    
    await fs.writeFile(lockPath, JSON.stringify(lockFile, null, 2));
    this.generatedFiles.push(lockPath);
  }

  /**
   * Generate sample C# scripts
   */
  private async generateScripts(): Promise<void> {
    const scripts = [
      {
        name: 'PlayerController',
        folder: 'Player',
        content: `using UnityEngine;

namespace Game.Player
{
    public class PlayerController : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private float jumpForce = 10f;
        
        private Rigidbody rb;
        private bool isGrounded;
        
        void Start()
        {
            rb = GetComponent<Rigidbody>();
        }
        
        void Update()
        {
            HandleMovement();
            HandleJump();
        }
        
        private void HandleMovement()
        {
            float horizontal = Input.GetAxis("Horizontal");
            float vertical = Input.GetAxis("Vertical");
            
            Vector3 movement = new Vector3(horizontal, 0, vertical) * moveSpeed * Time.deltaTime;
            transform.Translate(movement);
        }
        
        private void HandleJump()
        {
            if (Input.GetKeyDown(KeyCode.Space) && isGrounded)
            {
                rb.AddForce(Vector3.up * jumpForce, ForceMode.Impulse);
            }
        }
        
        private void OnCollisionEnter(Collision collision)
        {
            if (collision.gameObject.CompareTag("Ground"))
            {
                isGrounded = true;
            }
        }
        
        private void OnCollisionExit(Collision collision)
        {
            if (collision.gameObject.CompareTag("Ground"))
            {
                isGrounded = false;
            }
        }
    }
}`
      },
      {
        name: 'PlayerHealth',
        folder: 'Player',
        content: `using UnityEngine;
using UnityEngine.Events;

namespace Game.Player
{
    public class PlayerHealth : MonoBehaviour
    {
        [SerializeField] private int maxHealth = 100;
        [SerializeField] private int currentHealth;
        
        public UnityEvent<int> OnHealthChanged;
        public UnityEvent OnPlayerDeath;
        
        void Start()
        {
            currentHealth = maxHealth;
            OnHealthChanged?.Invoke(currentHealth);
        }
        
        public void TakeDamage(int damage)
        {
            currentHealth = Mathf.Max(0, currentHealth - damage);
            OnHealthChanged?.Invoke(currentHealth);
            
            if (currentHealth <= 0)
            {
                Die();
            }
        }
        
        public void Heal(int amount)
        {
            currentHealth = Mathf.Min(maxHealth, currentHealth + amount);
            OnHealthChanged?.Invoke(currentHealth);
        }
        
        private void Die()
        {
            OnPlayerDeath?.Invoke();
            gameObject.SetActive(false);
        }
    }
}`
      },
      {
        name: 'EnemyAI',
        folder: 'Enemies',
        content: `using UnityEngine;
using UnityEngine.AI;

namespace Game.Enemies
{
    public class EnemyAI : MonoBehaviour
    {
        [SerializeField] private float detectionRange = 10f;
        [SerializeField] private float attackRange = 2f;
        [SerializeField] private int damage = 10;
        
        private NavMeshAgent agent;
        private Transform player;
        private float lastAttackTime;
        
        void Start()
        {
            agent = GetComponent<NavMeshAgent>();
            player = GameObject.FindGameObjectWithTag("Player").transform;
        }
        
        void Update()
        {
            float distanceToPlayer = Vector3.Distance(transform.position, player.position);
            
            if (distanceToPlayer <= detectionRange)
            {
                agent.SetDestination(player.position);
                
                if (distanceToPlayer <= attackRange && Time.time - lastAttackTime > 1f)
                {
                    Attack();
                    lastAttackTime = Time.time;
                }
            }
        }
        
        private void Attack()
        {
            var playerHealth = player.GetComponent<PlayerHealth>();
            if (playerHealth != null)
            {
                playerHealth.TakeDamage(damage);
            }
        }
        
        void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, detectionRange);
            
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, attackRange);
        }
    }
}`
      },
      {
        name: 'UIManager',
        folder: 'UI',
        content: `using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace Game.UI
{
    public class UIManager : MonoBehaviour
    {
        [Header("HUD Elements")]
        [SerializeField] private TextMeshProUGUI healthText;
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private Slider healthBar;
        
        [Header("Menu Panels")]
        [SerializeField] private GameObject pauseMenu;
        [SerializeField] private GameObject gameOverPanel;
        
        private int currentScore = 0;
        
        void Start()
        {
            UpdateScore(0);
            pauseMenu.SetActive(false);
            gameOverPanel.SetActive(false);
        }
        
        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                TogglePause();
            }
        }
        
        public void UpdateHealth(int health)
        {
            healthText.text = $"Health: {health}";
            healthBar.value = health / 100f;
        }
        
        public void UpdateScore(int points)
        {
            currentScore += points;
            scoreText.text = $"Score: {currentScore}";
        }
        
        public void TogglePause()
        {
            bool isPaused = !pauseMenu.activeSelf;
            pauseMenu.SetActive(isPaused);
            Time.timeScale = isPaused ? 0f : 1f;
        }
        
        public void ShowGameOver()
        {
            gameOverPanel.SetActive(true);
            Time.timeScale = 0f;
        }
    }
}`
      },
      {
        name: 'GameManager',
        folder: '',
        content: `using UnityEngine;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    private static GameManager instance;
    public static GameManager Instance => instance;
    
    [SerializeField] private int currentLevel = 1;
    [SerializeField] private int maxLives = 3;
    
    private int currentLives;
    
    void Awake()
    {
        if (instance != null && instance != this)
        {
            Destroy(gameObject);
            return;
        }
        
        instance = this;
        DontDestroyOnLoad(gameObject);
        
        currentLives = maxLives;
    }
    
    public void RestartLevel()
    {
        Time.timeScale = 1f;
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
    
    public void NextLevel()
    {
        currentLevel++;
        SceneManager.LoadScene("Level_" + currentLevel);
    }
    
    public void GameOver()
    {
        Debug.Log("Game Over!");
        // Implement game over logic
    }
}`
      }
    ];
    
    // Generate requested number of scripts
    for (let i = 0; i < Math.min(this.options.scriptCount!, scripts.length); i++) {
      const script = scripts[i];
      const scriptPath = path.join(
        this.projectPath,
        'Assets',
        'Scripts',
        script.folder,
        `${script.name}.cs`
      );
      
      await fs.writeFile(scriptPath, script.content);
      this.generatedFiles.push(scriptPath);
    }
    
    // Generate additional dummy scripts if needed
    const remainingScripts = this.options.scriptCount! - scripts.length;
    for (let i = 0; i < remainingScripts; i++) {
      const scriptName = `TestScript${i + 1}`;
      const scriptPath = path.join(this.projectPath, 'Assets', 'Scripts', `${scriptName}.cs`);
      const content = `using UnityEngine;

public class ${scriptName} : MonoBehaviour
{
    void Start()
    {
        Debug.Log("${scriptName} initialized");
    }
}`;
      
      await fs.writeFile(scriptPath, content);
      this.generatedFiles.push(scriptPath);
    }
  }

  /**
   * Generate sample scenes
   */
  private async generateScenes(): Promise<void> {
    const scenes = ['MainMenu', 'Level_1', 'Level_2'];
    
    for (const sceneName of scenes) {
      const scenePath = path.join(this.projectPath, 'Assets', 'Scenes', `${sceneName}.unity`);
      const sceneContent = this.generateSceneYAML(sceneName);
      
      await fs.writeFile(scenePath, sceneContent);
      this.generatedFiles.push(scenePath);
    }
  }

  /**
   * Generate scene YAML content
   */
  private generateSceneYAML(_sceneName: string): string {
    return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!29 &1
OcclusionCullingSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_OcclusionBakeSettings:
    smallestOccluder: 5
    smallestHole: 0.25
    backfaceThreshold: 100
  m_SceneGUID: ${randomBytes(16).toString('hex')}
  m_OcclusionCullingData: {fileID: 0}
--- !u!104 &2
RenderSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 9
  m_Fog: 0
  m_FogColor: {r: 0.5, g: 0.5, b: 0.5, a: 1}
  m_FogMode: 3
  m_FogDensity: 0.01
  m_LinearFogStart: 0
  m_LinearFogEnd: 300
  m_AmbientSkyColor: {r: 0.212, g: 0.227, b: 0.259, a: 1}
  m_AmbientEquatorColor: {r: 0.114, g: 0.125, b: 0.133, a: 1}
  m_AmbientGroundColor: {r: 0.047, g: 0.043, b: 0.035, a: 1}
  m_AmbientIntensity: 1
  m_AmbientMode: 0
  m_SubtractiveShadowColor: {r: 0.42, g: 0.478, b: 0.627, a: 1}
  m_SkyboxMaterial: {fileID: 10304, guid: 0000000000000000f000000000000000, type: 0}
  m_HaloStrength: 0.5
  m_FlareStrength: 1
  m_FlareFadeSpeed: 3
  m_HaloTexture: {fileID: 0}
  m_SpotCookie: {fileID: 10001, guid: 0000000000000000e000000000000000, type: 0}
  m_DefaultReflectionMode: 0
  m_DefaultReflectionResolution: 128
  m_ReflectionBounces: 1
  m_ReflectionIntensity: 1
  m_CustomReflection: {fileID: 0}
  m_Sun: {fileID: 0}
  m_IndirectSpecularColor: {r: 0, g: 0, b: 0, a: 1}
  m_UseRadianceAmbientProbe: 0
--- !u!157 &3
LightmapSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 12
  m_GIWorkflowMode: 1
  m_GISettings:
    serializedVersion: 2
    m_BounceScale: 1
    m_IndirectOutputScale: 1
    m_AlbedoBoost: 1
    m_EnvironmentLightingMode: 0
    m_EnableBakedLightmaps: 1
    m_EnableRealtimeLightmaps: 0
--- !u!196 &4
NavMeshSettings:
  serializedVersion: 2
  m_ObjectHideFlags: 0
  m_BuildSettings:
    serializedVersion: 2
    agentTypeID: 0
    agentRadius: 0.5
    agentHeight: 2
    agentSlope: 45
    agentClimb: 0.4
    ledgeDropHeight: 0
    maxJumpAcrossDistance: 0
    minRegionArea: 2
    manualCellSize: 0
    cellSize: 0.16666667
    manualTileSize: 0
    tileSize: 256
    accuratePlacement: 0
    maxJobWorkers: 0
    preserveTilesOutsideBounds: 0
    debug:
      m_Flags: 0
  m_NavMeshData: {fileID: 0}`;
  }

  /**
   * Generate sample materials
   */
  private async generateMaterials(): Promise<void> {
    const materials = ['PlayerMaterial', 'EnemyMaterial', 'GroundMaterial'];
    
    for (const matName of materials) {
      const matPath = path.join(this.projectPath, 'Assets', 'Materials', `${matName}.mat`);
      const matContent = this.generateMaterialYAML(matName);
      
      await fs.writeFile(matPath, matContent);
      this.generatedFiles.push(matPath);
    }
  }

  /**
   * Generate material YAML content
   */
  private generateMaterialYAML(materialName: string): string {
    return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 8
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_Name: ${materialName}
  m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}
  m_ValidKeywords: []
  m_InvalidKeywords: []
  m_LightmapFlags: 4
  m_EnableInstancingVariants: 0
  m_DoubleSidedGI: 0
  m_CustomRenderQueue: -1
  stringTagMap: {}
  disabledShaderPasses: []
  m_SavedProperties:
    serializedVersion: 3
    m_TexEnvs:
    - _MainTex:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    m_Ints: []
    m_Floats:
    - _Glossiness: 0.5
    - _Metallic: 0
    m_Colors:
    - _Color: {r: 1, g: 1, b: 1, a: 1}`;
  }

  /**
   * Generate sample shaders
   */
  private async generateShaders(): Promise<void> {
    const shaderName = 'CustomUnlitShader';
    const shaderPath = path.join(this.projectPath, 'Assets', 'Shaders', `${shaderName}.shader`);
    const shaderContent = `Shader "Custom/${shaderName}"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            
            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                return o;
            }
            
            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = tex2D(_MainTex, i.uv) * _Color;
                return col;
            }
            ENDCG
        }
    }
}`;
    
    await fs.writeFile(shaderPath, shaderContent);
    this.generatedFiles.push(shaderPath);
  }

  /**
   * Generate sample prefabs
   */
  private async generatePrefabs(): Promise<void> {
    const prefabs = ['PlayerPrefab', 'EnemyPrefab', 'ItemPrefab'];
    
    for (const prefabName of prefabs) {
      const prefabPath = path.join(this.projectPath, 'Assets', 'Prefabs', `${prefabName}.prefab`);
      const prefabContent = this.generatePrefabYAML(prefabName);
      
      await fs.writeFile(prefabPath, prefabContent);
      this.generatedFiles.push(prefabPath);
    }
  }

  /**
   * Generate prefab YAML content
   */
  private generatePrefabYAML(prefabName: string): string {
    const fileID = Math.floor(Math.random() * 1000000);
    return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &${fileID}
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
  - component: {fileID: ${fileID + 1}}
  - component: {fileID: ${fileID + 2}}
  - component: {fileID: ${fileID + 3}}
  - component: {fileID: ${fileID + 4}}
  m_Layer: 0
  m_Name: ${prefabName}
  m_TagString: Untagged
  m_Icon: {fileID: 0}
  m_NavMeshLayer: 0
  m_StaticEditorFlags: 0
  m_IsActive: 1
--- !u!4 &${fileID + 1}
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}
  m_LocalPosition: {x: 0, y: 0, z: 0}
  m_LocalScale: {x: 1, y: 1, z: 1}
  m_ConstrainProportionsScale: 0
  m_Children: []
  m_Father: {fileID: 0}
  m_RootOrder: 0
  m_LocalEulerAnglesHint: {x: 0, y: 0, z: 0}`;
  }

  /**
   * Generate .meta files for all assets
   */
  private async generateMetaFiles(): Promise<void> {
    for (const filePath of this.generatedFiles) {
      if (filePath.includes('ProjectSettings') || filePath.includes('Packages')) {
        continue;
      }
      
      const metaPath = `${filePath}.meta`;
      const guid = randomBytes(16).toString('hex');
      
      let metaContent = `fileFormatVersion: 2
guid: ${guid}`;
      
      if (filePath.endsWith('.cs')) {
        metaContent += `
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
      } else if (filePath.endsWith('.mat')) {
        metaContent += `
NativeFormatImporter:
  externalObjects: {}
  mainObjectFileID: 2100000
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
      } else if (filePath.endsWith('.unity')) {
        metaContent += `
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
      }
      
      await fs.writeFile(metaPath, metaContent);
    }
  }

  /**
   * Clean up the generated project
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.projectPath, { recursive: true, force: true });
      console.log(`✅ Cleaned up virtual project: ${this.projectPath}`);
    } catch (error) {
      console.warn('Failed to cleanup virtual project:', error);
    }
  }

  /**
   * Get the project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Get list of all generated files
   */
  getGeneratedFiles(): string[] {
    return [...this.generatedFiles];
  }

  /**
   * Verify project structure is valid
   */
  async verify(): Promise<boolean> {
    try {
      // Check essential directories
      await fs.access(path.join(this.projectPath, 'Assets'));
      await fs.access(path.join(this.projectPath, 'ProjectSettings'));
      await fs.access(path.join(this.projectPath, 'Packages'));
      
      // Check essential files
      await fs.access(path.join(this.projectPath, 'ProjectSettings', 'ProjectVersion.txt'));
      await fs.access(path.join(this.projectPath, 'Packages', 'manifest.json'));
      
      return true;
    } catch (error) {
      return false;
    }
  }
}