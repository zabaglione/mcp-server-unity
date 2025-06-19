import { Logger } from '../types/index.js';
import { ProjectService } from './project-service.js';
import { ScriptService } from './script-service.js';
import { OptimizedScriptService } from './optimized-script-service.js';
import { AssetService } from './asset-service.js';
import { BuildService } from './build-service.js';
import { ShaderService } from './shader-service.js';
import { EditorScriptService } from './editor-script-service.js';
import { UnityRefreshService } from './unity-refresh-service.js';
import { UnityDiagnosticsService } from './unity-diagnostics-service.js';
import { AIAutomationService } from './ai-automation-service.js';
import { GameSystemService } from './game-system-service.js';
import { MaterialService } from './material-service.js';
import { CodeAnalysisService } from './code-analysis-service.js';
import { CompilationService } from './compilation-service.js';
import { UIToolkitService } from './ui-toolkit-service.js';

export interface Services {
  projectService: ProjectService;
  scriptService: ScriptService;
  assetService: AssetService;
  buildService: BuildService;
  shaderService: ShaderService;
  editorScriptService: EditorScriptService;
  refreshService: UnityRefreshService;
  diagnosticsService: UnityDiagnosticsService;
  aiAutomationService: AIAutomationService;
  gameSystemService: GameSystemService;
  materialService: MaterialService;
  codeAnalysisService: CodeAnalysisService;
  compilationService: CompilationService;
  uiToolkitService: UIToolkitService;
}

export class ServiceFactory {
  static createServices(logger: Logger, useOptimized: boolean = false): Services {
    const projectService = new ProjectService(logger);
    const scriptService = useOptimized 
      ? new OptimizedScriptService(logger)
      : new ScriptService(logger);
    const assetService = new AssetService(logger);
    const buildService = new BuildService(logger);
    const shaderService = new ShaderService(logger);
    const editorScriptService = new EditorScriptService(logger);
    const refreshService = new UnityRefreshService(logger);
    const diagnosticsService = new UnityDiagnosticsService(logger);
    const aiAutomationService = new AIAutomationService(logger);
    const gameSystemService = new GameSystemService(logger);
    const materialService = new MaterialService(logger);
    const codeAnalysisService = new CodeAnalysisService(logger);
    const compilationService = new CompilationService(logger);
    const uiToolkitService = new UIToolkitService(logger);

    // Set cross-service dependencies
    materialService.setShaderService(shaderService);
    
    // CRITICAL: Set RefreshService for ALL services that perform file operations
    // This ensures Unity recognizes file changes immediately
    const fileOperationServices = [
      scriptService,
      shaderService,
      materialService,
      editorScriptService,
      uiToolkitService,
      gameSystemService,
      aiAutomationService
    ];
    
    for (const service of fileOperationServices) {
      service.setRefreshService(refreshService);
    }

    return {
      projectService,
      scriptService,
      assetService,
      buildService,
      shaderService,
      editorScriptService,
      refreshService,
      diagnosticsService,
      aiAutomationService,
      gameSystemService,
      materialService,
      codeAnalysisService,
      compilationService,
      uiToolkitService,
    };
  }

  static connectServices(services: Services): void {
    // When project is set, update all other services
    const originalSetProject = services.projectService.setProject.bind(services.projectService);
    
    services.projectService.setProject = async (projectPath: string) => {
      const result = await originalSetProject(projectPath);
      const project = services.projectService.getProject();
      
      if (project) {
        services.scriptService.setUnityProject(project);
        
        // Initialize cache for optimized script service
        if (services.scriptService instanceof OptimizedScriptService) {
          (services.scriptService as OptimizedScriptService).initializeForProject(project.projectPath);
        }
        services.assetService.setUnityProject(project);
        services.buildService.setUnityProject(project);
        services.shaderService.setUnityProject(project);
        services.editorScriptService.setUnityProject(project);
        services.refreshService.setUnityProject(project);
        services.diagnosticsService.setUnityProject(project);
        services.aiAutomationService.setUnityProject(project);
        services.gameSystemService.setUnityProject(project);
        services.materialService.setUnityProject(project);
        services.codeAnalysisService.setUnityProject(project);
        services.compilationService.setUnityProject(project);
        services.uiToolkitService.setUnityProject(project);
        
        // Re-set service dependencies after project update
        services.materialService.setShaderService(services.shaderService);
        
        // CRITICAL: Re-set RefreshService connections after project update
        const fileOperationServices = [
          services.scriptService,
          services.shaderService,
          services.materialService,
          services.editorScriptService,
          services.uiToolkitService,
          services.gameSystemService,
          services.aiAutomationService
        ];
        
        for (const service of fileOperationServices) {
          service.setRefreshService(services.refreshService);
        }
      }
      
      return result;
    };
  }
}