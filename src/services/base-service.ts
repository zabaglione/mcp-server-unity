import { UnityProject, Logger } from '../types/index.js';
import { UnityProjectNotSetError } from '../errors/index.js';

export abstract class BaseService {
  protected unityProject: UnityProject | null = null;
  protected logger: Logger;
  protected refreshService?: any; // Will be set by ServiceFactory

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setUnityProject(project: UnityProject): void {
    this.unityProject = project;
  }

  setRefreshService(refreshService: any): void {
    this.refreshService = refreshService;
  }

  protected ensureProjectSet(): void {
    if (!this.unityProject) {
      throw new UnityProjectNotSetError();
    }
  }
}