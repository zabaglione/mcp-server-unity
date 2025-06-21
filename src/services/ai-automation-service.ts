import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { AICore, ProjectRequirements } from '../ai/ai-core.js';
import { ensureDirectory } from '../utils/file-utils.js';
import { MetaFileManager } from '../utils/meta-file-manager.js';
import path from 'path';
import fs from 'fs/promises';

export class AIAutomationService extends BaseService {
  private aiCore: AICore;
  private metaFileManager: MetaFileManager;

  constructor(logger: Logger) {
    super(logger);
    this.aiCore = new AICore(logger);
    this.metaFileManager = new MetaFileManager(logger);
  }

  /**
   * Create complete project structure based on project type
   */
  async createProjectStructure(
    projectType: ProjectRequirements['projectType'],
    customStructure?: any
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const structure = customStructure || this.getDefaultStructure(projectType);
    const createdFolders: string[] = [];

    // Create folder structure
    for (const folder of structure.folders) {
      const folderPath = path.join(this.unityProject!.assetsPath, folder);
      await ensureDirectory(folderPath);
      createdFolders.push(folder);
    }

    // Create initial files based on project type
    await this.createInitialFiles(projectType);

    return {
      content: [{
        type: 'text',
        text: `Project structure created for ${projectType}:\n` +
              `Created ${createdFolders.length} folders\n` +
              `Structure:\n${createdFolders.map(f => `  - ${f}`).join('\n')}`
      }]
    };
  }

  /**
   * Setup architecture pattern for the project
   */
  async setupArchitecture(
    pattern: 'MVC' | 'ECS' | 'Observer' | 'Custom',
    _customConfig?: any
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const templates = await this.generateArchitectureTemplates(pattern);
    const createdFiles: string[] = [];

    // Create base architecture files
    for (const [fileName, content] of Object.entries(templates)) {
      const filePath = path.join(
        this.unityProject!.scriptsPath,
        'Architecture',
        fileName
      );
      await ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, content as string, 'utf-8');
      await this.metaFileManager.generateMetaFile(filePath);
      createdFiles.push(fileName);
    }

    // Create architecture documentation
    const docContent = this.generateArchitectureDocumentation(pattern);
    const docPath = path.join(
      this.unityProject!.projectPath,
      'Documentation',
      'Architecture.md'
    );
    await ensureDirectory(path.dirname(docPath));
    await fs.writeFile(docPath, docContent, 'utf-8');

    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Architecture pattern '${pattern}' setup complete.\n` +
              `Created ${createdFiles.length} architecture files:\n` +
              `${createdFiles.map(f => `  - ${f}`).join('\n')}\n\n` +
              `Documentation created at: Documentation/Architecture.md`
      }]
    };
  }

  /**
   * Configure project settings for target platform
   */
  async configureProjectSettings(
    platform: string,
    _buildSettings: any,
    _qualitySettings: any
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    // Generate settings script
    const settingsScript = this.generateSettingsScript(platform, _buildSettings, _qualitySettings);
    const scriptPath = path.join(
      this.unityProject!.assetsPath,
      'Editor',
      'ProjectConfigurator.cs'
    );

    await ensureDirectory(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, settingsScript, 'utf-8');
    await this.metaFileManager.generateMetaFile(scriptPath);

    // Trigger Unity refresh if available
    if (this.refreshService) {
      await this.refreshService.refreshUnityAssets();
    }

    return {
      content: [{
        type: 'text',
        text: `Project configured for ${platform}.\n` +
              `Build settings applied:\n` +
              `${JSON.stringify(_buildSettings, null, 2)}\n\n` +
              `Quality settings applied:\n` +
              `${JSON.stringify(_qualitySettings, null, 2)}\n\n` +
              `Run 'MCP/Configure Project' in Unity to apply settings.`
      }]
    };
  }

  /**
   * AI-driven requirement analysis and project planning
   */
  async analyzeAndPlanProject(description: string): Promise<CallToolResult> {
    const requirements = await this.aiCore.analyzeRequirements(description);
    const architecture = await this.aiCore.suggestArchitecture(
      requirements.projectType,
      requirements
    );
    const plan = await this.aiCore.generateImplementationPlan(
      architecture,
      requirements
    );

    return {
      content: [{
        type: 'text',
        text: `Project Analysis Complete\n` +
              `========================\n\n` +
              `Requirements:\n` +
              `- Type: ${requirements.projectType}\n` +
              `- Platform: ${requirements.platform || 'Not specified'}\n` +
              `- Features: ${requirements.features?.join(', ') || 'None'}\n\n` +
              `Architecture:\n` +
              `- Pattern: ${architecture.pattern}\n` +
              `- Systems: ${architecture.systems.map(s => s.name).join(', ')}\n\n` +
              `Implementation Plan:\n` +
              `- Steps: ${plan.steps.length}\n` +
              `- Estimated Time: ${Math.round(plan.estimatedTime / 60)} minutes\n` +
              `- Dependencies: ${plan.dependencies.join(', ') || 'None'}\n\n` +
              `Steps:\n${plan.steps.map((s, i) => 
                `${i + 1}. ${s.description} (${s.estimatedTime}s)`
              ).join('\n')}`
      }]
    };
  }

  /**
   * Execute AI-generated implementation plan
   */
  async executeImplementationPlan(
    requirements: string,
    projectType: ProjectRequirements['projectType'],
    constraints?: any,
    autoExecute: boolean = false
  ): Promise<CallToolResult> {
    const analyzed = await this.aiCore.analyzeRequirements(requirements);
    analyzed.projectType = projectType;
    if (constraints) analyzed.constraints = constraints;

    const architecture = await this.aiCore.suggestArchitecture(projectType, analyzed);
    const plan = await this.aiCore.generateImplementationPlan(architecture, analyzed);

    if (!autoExecute) {
      return {
        content: [{
          type: 'text',
          text: `Implementation plan ready. ${plan.steps.length} steps identified.\n` +
                `Execute with autoExecute: true to proceed.`
        }]
      };
    }

    // Execute the plan
    const result = await this.aiCore.executePlan(plan, !autoExecute);
    return result;
  }

  // Helper methods

  private getDefaultStructure(projectType: string): any {
    const base = {
      folders: [
        'Scripts/Core',
        'Scripts/Player',
        'Scripts/UI',
        'Scripts/Managers',
        'Scripts/Utils',
        'Prefabs',
        'Materials',
        'Textures',
        'Audio',
        'Scenes',
        'Resources',
        'Editor'
      ]
    };

    // Add type-specific folders
    switch (projectType) {
      case '2D_Platformer':
        base.folders.push(
          'Sprites/Characters',
          'Sprites/Environment',
          'Sprites/UI',
          'Animations/Player',
          'Animations/Enemy',
          'Tilemaps'
        );
        break;
      
      case '3D_FPS':
        base.folders.push(
          'Models/Characters',
          'Models/Weapons',
          'Models/Environment',
          'Animations/FirstPerson',
          'Animations/Weapons',
          'Shaders'
        );
        break;
      
      case 'VR':
        base.folders.push(
          'VR/Interactions',
          'VR/Teleportation',
          'VR/UI',
          'Models/Hands',
          'Haptics'
        );
        break;
      
      case 'Mobile':
        base.folders.push(
          'Touch/Controls',
          'UI/Mobile',
          'Optimization'
        );
        break;
    }

    return base;
  }

  private async createInitialFiles(projectType: string): Promise<void> {
    // Create README
    const readmeContent = `# ${projectType} Unity Project

This project was automatically generated by Unity MCP AI.

## Project Structure
- Scripts/ - All game scripts
- Prefabs/ - Reusable game objects
- Materials/ - Visual materials
- Scenes/ - Game scenes

## Getting Started
1. Open the project in Unity
2. Open the Main scene
3. Press Play to test

Generated by Unity MCP AI Automation`;

    const readmePath = path.join(this.unityProject!.assetsPath, 'README.md');
    await fs.writeFile(readmePath, readmeContent, 'utf-8');
    await this.metaFileManager.generateMetaFile(readmePath);

    // Create .gitignore
    const gitignoreContent = `# Unity generated
[Ll]ibrary/
[Tt]emp/
[Oo]bj/
[Bb]uild/
[Bb]uilds/
[Ll]ogs/
[Uu]ser[Ss]ettings/

# Never ignore Asset meta data
!/[Aa]ssets/**/*.meta

# Uncomment this line if you wish to ignore the asset store tools plugin
# /[Aa]ssets/AssetStoreTools*

# Visual Studio cache directory
.vs/

# Gradle cache directory
.gradle/

# Autogenerated VS/MD/Consulo solution and project files
ExportedObj/
.consulo/
*.csproj
*.unityproj
*.sln
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
*.svd
*.pdb
*.mdb
*.opendb
*.VC.db

# Unity3D generated meta files
*.pidb.meta
*.pdb.meta
*.mdb.meta

# Unity3D generated file on crash reports
sysinfo.txt

# Builds
*.apk
*.aab
*.unitypackage

# Crashlytics generated file
crashlytics-build.properties

# Packed Addressables
/[Aa]ssets/[Aa]ddressable[Aa]ssets[Dd]ata/*/*.bin*

# Temporary auto-generated Android Assets
/[Aa]ssets/[Ss]treamingAssets/aa.meta
/[Aa]ssets/[Ss]treamingAssets/aa/*`;

    await fs.writeFile(
      path.join(this.unityProject!.projectPath, '.gitignore'),
      gitignoreContent,
      'utf-8'
    );
  }

  private async generateArchitectureTemplates(pattern: string): Promise<Record<string, string>> {
    const templates: Record<string, string> = {};

    switch (pattern) {
      case 'MVC':
        templates['IModel.cs'] = `namespace Architecture.MVC
{
    public interface IModel
    {
        void Initialize();
        void Save();
        void Load();
    }
}`;

        templates['IView.cs'] = `namespace Architecture.MVC
{
    public interface IView
    {
        void Initialize();
        void UpdateView();
        void Show();
        void Hide();
    }
}`;

        templates['IController.cs'] = `namespace Architecture.MVC
{
    public interface IController
    {
        void Initialize();
        void Update();
        void HandleInput();
    }
}`;

        templates['BaseModel.cs'] = `using UnityEngine;

namespace Architecture.MVC
{
    public abstract class BaseModel : ScriptableObject, IModel
    {
        public abstract void Initialize();
        public abstract void Save();
        public abstract void Load();
    }
}`;

        templates['BaseView.cs'] = `using UnityEngine;

namespace Architecture.MVC
{
    public abstract class BaseView : MonoBehaviour, IView
    {
        public abstract void Initialize();
        public abstract void UpdateView();
        
        public virtual void Show()
        {
            gameObject.SetActive(true);
        }
        
        public virtual void Hide()
        {
            gameObject.SetActive(false);
        }
    }
}`;

        templates['BaseController.cs'] = `using UnityEngine;

namespace Architecture.MVC
{
    public abstract class BaseController : MonoBehaviour, IController
    {
        public abstract void Initialize();
        public abstract void Update();
        public abstract void HandleInput();
    }
}`;
        break;

      case 'ECS':
        templates['Entity.cs'] = `using System;
using System.Collections.Generic;

namespace Architecture.ECS
{
    public class Entity
    {
        public int Id { get; private set; }
        private Dictionary<Type, IComponent> components = new Dictionary<Type, IComponent>();
        
        public Entity(int id)
        {
            Id = id;
        }
        
        public void AddComponent<T>(T component) where T : IComponent
        {
            components[typeof(T)] = component;
        }
        
        public T GetComponent<T>() where T : IComponent
        {
            return components.TryGetValue(typeof(T), out var component) ? (T)component : default;
        }
        
        public bool HasComponent<T>() where T : IComponent
        {
            return components.ContainsKey(typeof(T));
        }
    }
}`;

        templates['IComponent.cs'] = `namespace Architecture.ECS
{
    public interface IComponent
    {
        
    }
}`;

        templates['ISystem.cs'] = `namespace Architecture.ECS
{
    public interface ISystem
    {
        void Initialize();
        void Update(float deltaTime);
    }
}`;

        templates['EntityManager.cs'] = `using System.Collections.Generic;
using UnityEngine;

namespace Architecture.ECS
{
    public class EntityManager : MonoBehaviour
    {
        private static EntityManager instance;
        public static EntityManager Instance => instance;
        
        private Dictionary<int, Entity> entities = new Dictionary<int, Entity>();
        private int nextEntityId = 0;
        
        private void Awake()
        {
            if (instance == null)
            {
                instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }
        
        public Entity CreateEntity()
        {
            var entity = new Entity(nextEntityId++);
            entities[entity.Id] = entity;
            return entity;
        }
        
        public void DestroyEntity(int entityId)
        {
            entities.Remove(entityId);
        }
        
        public Entity GetEntity(int entityId)
        {
            return entities.TryGetValue(entityId, out var entity) ? entity : null;
        }
    }
}`;
        break;

      case 'Observer':
        templates['IObserver.cs'] = `namespace Architecture.Observer
{
    public interface IObserver<T>
    {
        void OnNotify(T data);
    }
}`;

        templates['ISubject.cs'] = `namespace Architecture.Observer
{
    public interface ISubject<T>
    {
        void Subscribe(IObserver<T> observer);
        void Unsubscribe(IObserver<T> observer);
        void Notify(T data);
    }
}`;

        templates['EventSystem.cs'] = `using System;
using System.Collections.Generic;
using UnityEngine;

namespace Architecture.Observer
{
    public class EventSystem : MonoBehaviour
    {
        private static EventSystem instance;
        public static EventSystem Instance => instance;
        
        private Dictionary<Type, List<object>> observers = new Dictionary<Type, List<object>>();
        
        private void Awake()
        {
            if (instance == null)
            {
                instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }
        
        public void Subscribe<T>(IObserver<T> observer)
        {
            var type = typeof(T);
            if (!observers.ContainsKey(type))
            {
                observers[type] = new List<object>();
            }
            observers[type].Add(observer);
        }
        
        public void Unsubscribe<T>(IObserver<T> observer)
        {
            var type = typeof(T);
            if (observers.ContainsKey(type))
            {
                observers[type].Remove(observer);
            }
        }
        
        public void Notify<T>(T data)
        {
            var type = typeof(T);
            if (observers.ContainsKey(type))
            {
                foreach (var observer in observers[type])
                {
                    ((IObserver<T>)observer).OnNotify(data);
                }
            }
        }
    }
}`;
        break;
    }

    return templates;
  }

  private generateArchitectureDocumentation(pattern: string): string {
    const docs: Record<string, string> = {
      'MVC': `# MVC Architecture

## Overview
This project uses the Model-View-Controller (MVC) pattern.

## Structure
- **Models**: Data and business logic
- **Views**: UI and visual representation
- **Controllers**: Input handling and game flow

## Usage
1. Create models by extending BaseModel
2. Create views by extending BaseView
3. Create controllers by extending BaseController

## Example
\`\`\`csharp
public class PlayerModel : BaseModel
{
    public int health;
    public int score;
}

public class PlayerView : BaseView
{
    public void UpdateHealth(int health) { }
}

public class PlayerController : BaseController
{
    private PlayerModel model;
    private PlayerView view;
}
\`\`\``,

      'ECS': `# Entity Component System (ECS) Architecture

## Overview
This project uses the Entity Component System pattern.

## Structure
- **Entities**: Game objects (just IDs)
- **Components**: Data containers
- **Systems**: Logic processors

## Usage
1. Create entities using EntityManager
2. Add components to entities
3. Create systems to process components

## Example
\`\`\`csharp
// Create entity
var entity = EntityManager.Instance.CreateEntity();

// Add components
entity.AddComponent(new TransformComponent());
entity.AddComponent(new HealthComponent { MaxHealth = 100 });

// Create system
public class MovementSystem : ISystem
{
    public void Update(float deltaTime)
    {
        // Process all entities with movement components
    }
}
\`\`\``,

      'Observer': `# Observer Pattern Architecture

## Overview
This project uses the Observer pattern for event-driven architecture.

## Structure
- **Subjects**: Event emitters
- **Observers**: Event listeners
- **EventSystem**: Central event hub

## Usage
1. Create event data classes
2. Implement IObserver<T> for listeners
3. Use EventSystem to publish events

## Example
\`\`\`csharp
// Event data
public class PlayerDamagedEvent
{
    public int Damage { get; set; }
    public Vector3 Position { get; set; }
}

// Observer
public class UIManager : MonoBehaviour, IObserver<PlayerDamagedEvent>
{
    public void OnNotify(PlayerDamagedEvent data)
    {
        // Update health UI
    }
}

// Notify
EventSystem.Instance.Notify(new PlayerDamagedEvent { Damage = 10 });
\`\`\``
    };

    return docs[pattern] || '# Custom Architecture\n\nDocument your custom architecture here.';
  }

  private generateSettingsScript(
    platform: string,
    buildSettings: any,
    qualitySettings: any
  ): string {
    return `using UnityEngine;
using UnityEditor;

public static class ProjectConfigurator
{
    [MenuItem("MCP/Configure Project")]
    public static void ConfigureProject()
    {
        Debug.Log("Configuring project for ${platform}...");
        
        // Set build target
        ${this.getBuildTargetCode(platform)}
        
        // Apply build settings
        ${this.getBuildSettingsCode(buildSettings)}
        
        // Apply quality settings
        ${this.getQualitySettingsCode(qualitySettings)}
        
        Debug.Log("Project configuration complete!");
        EditorUtility.DisplayDialog("Configuration Complete", 
            "Project has been configured for ${platform}", "OK");
    }
    
    ${this.getBuildTargetCode(platform)}
    
    ${this.getBuildSettingsCode(buildSettings)}
    
    ${this.getQualitySettingsCode(qualitySettings)}
}`;
  }

  private getBuildTargetCode(platform: string): string {
    const targetMap: Record<string, string> = {
      'StandaloneWindows64': 'BuildTarget.StandaloneWindows64',
      'Android': 'BuildTarget.Android',
      'iOS': 'BuildTarget.iOS',
      'WebGL': 'BuildTarget.WebGL'
    };

    const target = targetMap[platform] || 'BuildTarget.StandaloneWindows64';
    return `EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Standalone, ${target});`;
  }

  private getBuildSettingsCode(settings: any): string {
    const lines: string[] = [];
    
    if (settings.companyName) {
      lines.push(`PlayerSettings.companyName = "${settings.companyName}";`);
    }
    
    if (settings.productName) {
      lines.push(`PlayerSettings.productName = "${settings.productName}";`);
    }
    
    if (settings.bundleIdentifier) {
      lines.push(`PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Standalone, "${settings.bundleIdentifier}");`);
    }
    
    return lines.join('\n        ');
  }

  private getQualitySettingsCode(settings: any): string {
    const lines: string[] = [];
    
    if (settings.vsync !== undefined) {
      lines.push(`QualitySettings.vSyncCount = ${settings.vsync};`);
    }
    
    if (settings.antiAliasing !== undefined) {
      lines.push(`QualitySettings.antiAliasing = ${settings.antiAliasing};`);
    }
    
    if (settings.shadowDistance !== undefined) {
      lines.push(`QualitySettings.shadowDistance = ${settings.shadowDistance}f;`);
    }
    
    return lines.join('\n        ');
  }
}