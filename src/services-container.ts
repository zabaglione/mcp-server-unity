import { ConsoleLogger } from './utils/logger.js';
import { ServiceFactory } from './services/service-factory.js';

export class ServicesContainer {
  public services: any;
  private logger: ConsoleLogger;

  constructor(logger?: ConsoleLogger) {
    this.logger = logger || new ConsoleLogger('[Unity MCP]');
    
    // Initialize services using factory
    this.services = ServiceFactory.createServices(this.logger);
    ServiceFactory.connectServices(this.services);
  }

  getServices() {
    return this.services;
  }
}