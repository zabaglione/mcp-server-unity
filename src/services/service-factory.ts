import { Logger } from '../types/index.js';
import { ProjectService } from './project-service.js';
import { ScriptService } from './script-service.js';
import { AssetService } from './asset-service.js';
import { BuildService } from './build-service.js';
import { ShaderService } from './shader-service.js';
import { EditorScriptService } from './editor-script-service.js';
import { ProBuilderService } from './probuilder-service.js';
import { UnityRefreshService } from './unity-refresh-service.js';
import { PackageService } from './package-service.js';

export interface Services {
  projectService: ProjectService;
  scriptService: ScriptService;
  assetService: AssetService;
  buildService: BuildService;
  shaderService: ShaderService;
  editorScriptService: EditorScriptService;
  proBuilderService: ProBuilderService;
  refreshService: UnityRefreshService;
  packageService: PackageService;
}

export class ServiceFactory {
  static createServices(logger: Logger): Services {
    const projectService = new ProjectService(logger);
    const scriptService = new ScriptService(logger);
    const assetService = new AssetService(logger);
    const buildService = new BuildService(logger);
    const shaderService = new ShaderService(logger);
    const editorScriptService = new EditorScriptService(logger);
    const proBuilderService = new ProBuilderService(logger);
    const refreshService = new UnityRefreshService(logger);
    const packageService = new PackageService(logger);

    return {
      projectService,
      scriptService,
      assetService,
      buildService,
      shaderService,
      editorScriptService,
      proBuilderService,
      refreshService,
      packageService,
    };
  }

  static connectServices(services: Services): void {
    // Connect refresh service to package service
    services.packageService.setRefreshService(services.refreshService);
    
    // When project is set, update all other services
    const originalSetProject = services.projectService.setProject.bind(services.projectService);
    
    services.projectService.setProject = async (projectPath: string) => {
      const result = await originalSetProject(projectPath);
      const project = services.projectService.getProject();
      
      if (project) {
        services.scriptService.setUnityProject(project);
        services.assetService.setUnityProject(project);
        services.buildService.setUnityProject(project);
        services.shaderService.setUnityProject(project);
        services.editorScriptService.setUnityProject(project);
        services.proBuilderService.setUnityProject(project);
        services.refreshService.setUnityProject(project);
        services.packageService.setUnityProject(project);
      }
      
      return result;
    };
  }
}