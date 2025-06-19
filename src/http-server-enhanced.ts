import express from 'express';
import cors from 'cors';
import { ServicesContainer } from './services-container.js';
import { ConsoleLogger } from './utils/logger.js';
import { OptimizedScriptService } from './services/optimized-script-service.js';
import { warmUpCache } from './utils/optimized-file-utils.js';

interface TimeoutConfig {
  [key: string]: number;
}

/**
 * Enhanced HTTP server with improved timeout handling and streaming support
 */
export class EnhancedUnityMCPHttpServer {
  private app: express.Application;
  private servicesContainer: ServicesContainer;
  private logger: ConsoleLogger;
  private port: number;
  private services: any;
  private server: any;
  
  // Configurable timeouts for different operations
  private timeouts: TimeoutConfig = {
    '/api/asset/update-script': 5 * 60 * 1000,     // 5 minutes
    '/api/asset/update-script-partial': 30 * 1000, // 30 seconds
    '/api/asset/list-scripts': 2 * 60 * 1000,      // 2 minutes
    '/api/asset/read-script': 60 * 1000,           // 1 minute
    '/api/batch': 10 * 60 * 1000,                  // 10 minutes
    'default': 30 * 1000                           // 30 seconds
  };

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.logger = new ConsoleLogger('[Unity MCP HTTP Enhanced]');
    this.servicesContainer = new ServicesContainer(this.logger);
    this.services = this.servicesContainer.getServices();

    // Replace standard ScriptService with optimized version
    this.services.scriptService = new OptimizedScriptService(this.logger);

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    
    // Dynamic timeout middleware
    this.app.use((req, res, next) => {
      const timeout = this.getTimeoutForRoute(req.path);
      req.setTimeout(timeout);
      res.setTimeout(timeout);
      
      // Add timeout header for client awareness
      res.setHeader('X-Timeout-Ms', timeout.toString());
      
      next();
    });
    
    // Increase limit to 1GB for large file operations
    this.app.use(express.json({ limit: '1gb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1gb' }));

    // Request logging with detailed timing
    this.app.use((req, res, next) => {
      const start = process.hrtime.bigint();
      
      res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        
        if (duration > 1000) {
          this.logger.warn(`Slow request: ${req.method} ${req.path} - ${res.statusCode} (${duration.toFixed(2)}ms)`);
        } else {
          this.logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration.toFixed(2)}ms)`);
        }
      });
      
      next();
    });
  }

  private getTimeoutForRoute(path: string): number {
    for (const [route, timeout] of Object.entries(this.timeouts)) {
      if (path.startsWith(route)) {
        return timeout;
      }
    }
    return this.timeouts.default;
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cacheStats: this.services.scriptService.getCacheStats?.() || {}
      });
    });

    // Project initialization with cache warmup
    this.app.post('/api/project/set', async (req, res) => {
      try {
        const { projectPath } = req.body;
        const result = await this.services.projectService.setProject(projectPath);
        
        // Warm up cache in background
        warmUpCache(projectPath, this.logger).catch(err => 
          this.logger.error('Cache warmup failed:', err)
        );
        
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Optimized script routes
    this.app.get('/api/asset/read-script/:fileName', async (req, res) => {
      try {
        const { fileName } = req.params;
        const result = await this.services.scriptService.readScript(fileName);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.post('/api/asset/update-script', async (req, res) => {
      try {
        const { fileName, content } = req.body;
        
        // For very large files, process in background
        if (Buffer.byteLength(content, 'utf8') > 10 * 1024 * 1024) {
          res.json({ 
            content: [{ 
              type: 'text', 
              text: 'Large file update started in background. Check status with /api/status/:taskId' 
            }],
            taskId: this.startBackgroundTask(fileName, content)
          });
        } else {
          const result = await this.services.scriptService.updateScript(fileName, content);
          res.json(result);
        }
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // New partial update endpoint
    this.app.patch('/api/asset/update-script-partial', async (req, res) => {
      try {
        const { fileName, patches } = req.body;
        
        if (this.services.scriptService.updateScriptPartial) {
          const result = await this.services.scriptService.updateScriptPartial(fileName, patches);
          res.json(result);
        } else {
          res.status(501).json({ error: 'Partial updates not supported' });
        }
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Batch operations with streaming response
    this.app.post('/api/batch/update-scripts', async (req, res) => {
      try {
        const { updates } = req.body;
        
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        for (const update of updates) {
          try {
            const result = await this.services.scriptService.updateScript(
              update.fileName, 
              update.content
            );
            res.write(JSON.stringify({ success: true, fileName: update.fileName, result }) + '\n');
          } catch (error) {
            res.write(JSON.stringify({ 
              success: false, 
              fileName: update.fileName, 
              error: error.message 
            }) + '\n');
          }
        }
        
        res.end();
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Cache statistics endpoint
    this.app.get('/api/stats/cache', (_req, res) => {
      const stats = this.services.scriptService.getCacheStats?.() || { message: 'Cache stats not available' };
      res.json(stats);
    });

    // Clear cache endpoint
    this.app.post('/api/cache/clear', (_req, res) => {
      if (this.services.scriptService.clearCache) {
        this.services.scriptService.clearCache();
        res.json({ message: 'Cache cleared' });
      } else {
        res.status(501).json({ error: 'Cache management not supported' });
      }
    });

    // All other existing routes...
    this.setupExistingRoutes();
  }

  private setupExistingRoutes(): void {
    // Copy existing routes from original http-server
    // This is a placeholder - in real implementation, include all existing routes
  }

  private startBackgroundTask(fileName: string, content: string): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Process in background
    setImmediate(async () => {
      try {
        await this.services.scriptService.updateScript(fileName, content);
        this.logger.info(`Background task ${taskId} completed for ${fileName}`);
      } catch (error) {
        this.logger.error(`Background task ${taskId} failed:`, error instanceof Error ? error.message : String(error));
      }
    });
    
    return taskId;
  }

  private handleError(error: unknown, res: express.Response): void {
    this.logger.error('Request error:', error);
    
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : 'Internal server error';
    const stack = error instanceof Error ? error.stack : undefined;
    
    res.status(statusCode).json({
      error: message,
      details: process.env.NODE_ENV === 'development' ? stack : undefined
    });
  }

  async start(): Promise<void> {
    this.server = this.app.listen(this.port, () => {
      this.logger.info(`Unity MCP HTTP server (enhanced) listening on port ${this.port}`);
      this.logger.info('Endpoints:');
      this.logger.info('  GET  /health - Health check');
      this.logger.info('  POST /api/project/set - Set Unity project');
      this.logger.info('  GET  /api/asset/read-script/:fileName - Read script');
      this.logger.info('  POST /api/asset/update-script - Update script');
      this.logger.info('  PATCH /api/asset/update-script-partial - Partial update');
      this.logger.info('  POST /api/batch/update-scripts - Batch update (streaming)');
      this.logger.info('  GET  /api/stats/cache - Cache statistics');
    });

    // Set server-level timeout
    this.server.timeout = 10 * 60 * 1000; // 10 minutes max
    this.server.keepAliveTimeout = 65 * 1000; // 65 seconds
    this.server.headersTimeout = 66 * 1000; // 66 seconds
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('HTTP server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}