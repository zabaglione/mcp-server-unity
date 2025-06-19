import express from 'express';
import cors from 'cors';
import { ServicesContainer } from './services-container.js';
import { ConsoleLogger } from './utils/logger.js';
import timeout from 'connect-timeout';
import { warmUpFileCache } from './utils/optimized-file-utils.js';

export class OptimizedUnityMCPHttpServer {
  private app: express.Application;
  private servicesContainer: ServicesContainer;
  private logger: ConsoleLogger;
  private port: number;
  private services: any;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.logger = new ConsoleLogger('[Unity MCP HTTP Optimized]');
    this.servicesContainer = new ServicesContainer(this.logger);
    this.services = this.servicesContainer.getServices();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    
    // Different timeout settings for different operations
    this.app.use('/api/asset/update-script', timeout('5m')); // 5 minutes for script updates
    this.app.use('/api/asset/list-scripts', timeout('2m')); // 2 minutes for listing
    this.app.use('/api/batch', timeout('10m')); // 10 minutes for batch operations
    this.app.use(timeout('30s')); // 30 seconds default
    
    // Increase limit to 1GB for large file operations
    this.app.use(express.json({ limit: '1gb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1gb' }));

    // Handle timeout errors
    this.app.use((req, res, next) => {
      if (!req.timedout) next();
    });

    // Request logging with timing
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'unity-mcp-server-optimized',
        version: '2.1.0',
        transport: 'http',
        optimizations: {
          fileCache: true,
          streaming: true,
          timeout: true
        }
      });
    });

    // Project management routes
    this.app.post('/api/project/setup', async (req, res) => {
      try {
        const result = await this.services.projectService.setProject(req.body.projectPath);
        
        // Warm up file cache after project setup
        if (result.content[0].text.includes('Project set successfully')) {
          this.logger.info('Warming up file cache...');
          warmUpFileCache(req.body.projectPath).catch(err => {
            this.logger.error('Failed to warm up cache:', err);
          });
        }
        
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Optimized script update endpoint
    this.app.put('/api/asset/update-script', async (req, res) => {
      try {
        if (req.timedout) {
          return res.status(408).json({
            error: true,
            message: 'Request timeout - file operation took too long',
            code: 'TIMEOUT'
          });
        }

        const { fileName, content } = req.body;
        
        // Send early response for large files
        const contentSize = Buffer.byteLength(content || '', 'utf8');
        if (contentSize > 10 * 1024 * 1024) { // 10MB
          res.status(202).json({
            message: 'Large file update initiated',
            size: `${Math.round(contentSize / 1024 / 1024)}MB`,
            status: 'processing'
          });
          
          // Continue processing in background
          this.services.scriptService.updateScript(fileName, content)
            .then(() => {
              this.logger.info(`Large script update completed: ${fileName}`);
            })
            .catch((err: any) => {
              this.logger.error(`Large script update failed: ${fileName}`, err);
            });
          
          return;
        }
        
        // Normal synchronous processing for smaller files
        const result = await this.services.scriptService.updateScript(fileName, content);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Partial update endpoint for minor changes
    this.app.patch('/api/asset/update-script-partial', async (req, res) => {
      try {
        const { fileName, patches } = req.body;
        
        // Use optimized partial update if available
        if (this.services.scriptService.updateScriptPartial) {
          const result = await this.services.scriptService.updateScriptPartial(fileName, patches);
          res.json(result);
        } else {
          res.status(501).json({
            error: true,
            message: 'Partial update not supported',
            code: 'NOT_IMPLEMENTED'
          });
        }
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Batch operations with progress reporting
    this.app.post('/api/batch', async (req, res) => {
      try {
        const { operations } = req.body;
        const results = [];
        const totalOps = operations.length;

        // Send initial response with operation ID
        const operationId = `batch_${Date.now()}`;
        res.setHeader('X-Operation-ID', operationId);
        
        // For large batches, use streaming response
        if (totalOps > 10) {
          res.setHeader('Content-Type', 'application/x-ndjson');
          res.setHeader('Transfer-Encoding', 'chunked');
          
          for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            
            try {
              const result = await this.executeOperation(op);
              const response = {
                index: i,
                success: true,
                result,
                progress: Math.round((i + 1) / totalOps * 100)
              };
              
              res.write(JSON.stringify(response) + '\n');
            } catch (error) {
              const response = {
                index: i,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                progress: Math.round((i + 1) / totalOps * 100)
              };
              
              res.write(JSON.stringify(response) + '\n');
            }
          }
          
          res.end();
        } else {
          // For small batches, use regular response
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
        }
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Cache statistics endpoint
    this.app.get('/api/stats/cache', (_req, res) => {
      try {
        const { fileSystemCache } = require('./utils/file-cache.js');
        const stats = fileSystemCache.getStats();
        res.json({
          cache: stats,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // All other routes from original implementation...
    this.setupOriginalRoutes();
  }

  private setupOriginalRoutes(): void {
    // Copy all other routes from the original http-server.ts
    // This is a placeholder - in practice, you would include all the other routes
    
    this.app.get('/api/project/info', async (_req, res) => {
      try {
        const result = await this.services.projectService.getProjectInfo();
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

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
    // Don't send response if already sent (e.g., for streaming responses)
    if (res.headersSent) {
      this.logger.error('Error after response sent:', error);
      return;
    }
    
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
    const server = this.app.listen(this.port, () => {
      this.logger.info(`Optimized Unity MCP HTTP Server running on http://localhost:${this.port}`);
      this.logger.info(`Performance optimizations enabled: file caching, streaming, timeouts`);
    });

    // Set server timeout to 10 minutes
    server.timeout = 10 * 60 * 1000;
    
    // Handle server errors
    server.on('error', (error: any) => {
      this.logger.error('Server error:', error);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      this.logger.info('Shutting down server...');
      server.close(() => {
        this.logger.info('Server shut down');
        process.exit(0);
      });
    });
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3000', 10);
  const server = new OptimizedUnityMCPHttpServer(port);
  server.start();
}