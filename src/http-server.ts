import express from 'express';
import cors from 'cors';
import { ServicesContainer } from './services-container.js';
import { ConsoleLogger } from './utils/logger.js';

export class UnityMCPHttpServer {
  private app: express.Application;
  private servicesContainer: ServicesContainer;
  private logger: ConsoleLogger;
  private port: number;
  private services: any;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.logger = new ConsoleLogger('[Unity MCP HTTP]');
    this.servicesContainer = new ServicesContainer(this.logger);
    this.services = this.servicesContainer.getServices();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    // Increase limit to 1GB for large file operations
    this.app.use(express.json({ limit: '1gb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1gb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      this.logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'unity-mcp-server',
        version: '2.0.0',
        transport: 'http'
      });
    });

    // Project management routes
    this.app.post('/api/project/setup', async (req, res) => {
      try {
        const result = await this.services.projectService.setProject(req.body.projectPath);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.get('/api/project/info', async (_req, res) => {
      try {
        const result = await this.services.projectService.getProjectInfo();
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // AI automation routes
    this.app.post('/api/ai/analyze', async (req, res) => {
      try {
        const result = await this.services.aiAutomationService.analyzeAndPlanProject(
          req.body.description
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/ai/execute', async (req, res) => {
      try {
        const { requirements, projectType, constraints, autoExecute } = req.body;
        const result = await this.services.aiAutomationService.executeImplementationPlan(
          requirements,
          projectType,
          constraints,
          autoExecute
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/project/create-structure', async (req, res) => {
      try {
        const { projectType, customStructure } = req.body;
        const result = await this.services.aiAutomationService.createProjectStructure(
          projectType,
          customStructure
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/project/setup-architecture', async (req, res) => {
      try {
        const { pattern, customConfig } = req.body;
        const result = await this.services.aiAutomationService.setupArchitecture(
          pattern,
          customConfig
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Game system routes
    this.app.post('/api/system/player-controller', async (req, res) => {
      try {
        const { gameType, requirements } = req.body;
        const result = await this.services.gameSystemService.createPlayerController(
          gameType,
          requirements
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/system/camera', async (req, res) => {
      try {
        const { cameraType, specifications } = req.body;
        const result = await this.services.gameSystemService.createCameraSystem(
          cameraType,
          specifications
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/system/ui-framework', async (req, res) => {
      try {
        const { uiType, screens } = req.body;
        const result = await this.services.gameSystemService.createUIFramework(
          uiType,
          screens
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/system/audio-manager', async (req, res) => {
      try {
        const { requirements } = req.body;
        const result = await this.services.gameSystemService.createAudioManager(
          requirements
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Asset management routes
    this.app.post('/api/asset/create-script', async (req, res) => {
      try {
        const { fileName, content, folder } = req.body;
        const result = await this.services.scriptService.createScript(
          fileName,
          content,
          folder
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.get('/api/asset/list-scripts', async (_req, res) => {
      try {
        const result = await this.services.scriptService.listScripts();
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.put('/api/asset/update-script', async (req, res) => {
      try {
        const { fileName, content } = req.body;
        const result = await this.services.scriptService.updateScript(
          fileName,
          content
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/asset/create-material', async (req, res) => {
      try {
        const { materialName } = req.body;
        const result = await this.services.assetService.createMaterial(materialName);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Material management routes
    this.app.put('/api/material/shader', async (req, res) => {
      try {
        const { materialName, shaderName } = req.body;
        const result = await this.services.materialService.updateMaterialShader(
          materialName,
          shaderName
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.put('/api/material/properties', async (req, res) => {
      try {
        const { materialName, properties } = req.body;
        const result = await this.services.materialService.updateMaterialProperties(
          materialName,
          properties
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.get('/api/material/:materialName', async (req, res) => {
      try {
        const { materialName } = req.params;
        const result = await this.services.materialService.readMaterial(materialName);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/material/batch-convert', async (req, res) => {
      try {
        const { materials, targetShader, propertyMapping } = req.body;
        const result = await this.services.materialService.batchConvertMaterials(
          materials,
          targetShader,
          propertyMapping
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Diagnostics routes
    this.app.post('/api/diagnostics/compile', async (req, res) => {
      try {
        const result = await this.services.diagnosticsService.compileScripts(
          req.body.forceRecompile
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.get('/api/diagnostics/summary', async (_req, res) => {
      try {
        const result = await this.services.diagnosticsService.getDiagnosticsSummary();
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Code Analysis routes
    this.app.post('/api/code/analyze-diff', async (req, res) => {
      try {
        const { fileName, newContent } = req.body;
        const result = await this.services.codeAnalysisService.getFileDiff(
          fileName,
          newContent
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.get('/api/code/detect-duplicates', async (_req, res) => {
      try {
        const result = await this.services.codeAnalysisService.detectClassDuplicates();
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.get('/api/code/suggest-namespace/:fileName', async (req, res) => {
      try {
        const { fileName } = req.params;
        const result = await this.services.codeAnalysisService.suggestNamespace(fileName);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/code/apply-namespace', async (req, res) => {
      try {
        const { fileName, namespace } = req.body;
        const result = await this.services.codeAnalysisService.applyNamespace(
          fileName,
          namespace
        );
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Compilation routes
    this.app.get('/api/compile/errors', async (req, res) => {
      try {
        const forceCompile = req.query.forceCompile === 'true';
        const result = await this.services.compilationService.getCompilationErrors(forceCompile);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.get('/api/compile/status', async (_req, res) => {
      try {
        const result = await this.services.compilationService.getCompilationStatus();
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/compile/install-helper', async (_req, res) => {
      try {
        const result = await this.services.compilationService.installCompilationHelper();
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Batch operations
    this.app.post('/api/batch', async (req, res) => {
      try {
        const { operations } = req.body;
        const results = [];

        for (const op of operations) {
          try {
            const result = await this.executeOperation(op);
            results.push({ success: true, result });
          } catch (error) {
            results.push({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }

        res.json({ results });
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }

  private async executeOperation(op: any): Promise<any> {
    const [service, method] = op.action.split('.');
    const serviceInstance = this.services[service];
    
    if (!serviceInstance || !serviceInstance[method]) {
      throw new Error(`Unknown action: ${op.action}`);
    }

    return await serviceInstance[method](...(op.params || []));
  }

  private handleError(error: any, res: express.Response): void {
    this.logger.error('Request error:', error);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    
    res.status(statusCode).json({
      error: true,
      message,
      code: error.code || 'INTERNAL_ERROR'
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      this.logger.info(`Unity MCP HTTP Server running on http://localhost:${this.port}`);
      this.logger.info(`API Documentation: http://localhost:${this.port}/api-docs`);
    });

    // Add API documentation route
    this.app.get('/api-docs', (_req, res) => {
      res.json({
        version: '2.0.0',
        endpoints: {
          project: [
            'POST /api/project/setup',
            'GET /api/project/info',
            'POST /api/project/create-structure',
            'POST /api/project/setup-architecture'
          ],
          ai: [
            'POST /api/ai/analyze',
            'POST /api/ai/execute'
          ],
          system: [
            'POST /api/system/player-controller',
            'POST /api/system/camera',
            'POST /api/system/ui-framework',
            'POST /api/system/audio-manager'
          ],
          asset: [
            'POST /api/asset/create-script',
            'GET /api/asset/list-scripts'
          ],
          diagnostics: [
            'POST /api/diagnostics/compile',
            'GET /api/diagnostics/summary'
          ],
          batch: [
            'POST /api/batch'
          ]
        }
      });
    });
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3000', 10);
  const server = new UnityMCPHttpServer(port);
  server.start();
}