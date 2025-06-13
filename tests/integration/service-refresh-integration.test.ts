import { ServiceFactory } from '../../src/services/service-factory.js';
import { Logger } from '../../src/types/index.js';
import * as path from 'path';

// Simple logger for testing
const testLogger: Logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
};

async function testServiceRefreshIntegration() {
  console.log('=== Unity MCP Server - Service Refresh Integration Test ===\n');

  // Create services
  const services = ServiceFactory.createServices(testLogger);
  ServiceFactory.connectServices(services);

  console.log('✅ Services created and connected\n');

  // Test 1: Verify RefreshService is set for all file operation services
  console.log('Test 1: Verifying RefreshService connections...');
  const fileOperationServices = [
    { name: 'ScriptService', service: services.scriptService },
    { name: 'ShaderService', service: services.shaderService },
    { name: 'MaterialService', service: services.materialService },
    { name: 'EditorScriptService', service: services.editorScriptService },
    { name: 'UIToolkitService', service: services.uiToolkitService },
    { name: 'GameSystemService', service: services.gameSystemService },
    { name: 'AIAutomationService', service: services.aiAutomationService },
  ];

  let allConnected = true;
  for (const { name, service } of fileOperationServices) {
    // Check if service has refreshService property set
    const hasRefreshService = (service as any).refreshService !== undefined;
    if (hasRefreshService) {
      console.log(`  ✅ ${name} - RefreshService connected`);
    } else {
      console.log(`  ❌ ${name} - RefreshService NOT connected`);
      allConnected = false;
    }
  }

  if (!allConnected) {
    console.error('\n❌ CRITICAL: Some services are missing RefreshService connection!');
    process.exit(1);
  }

  console.log('\n✅ All file operation services have RefreshService connected\n');

  // Test 2: Verify project propagation maintains RefreshService connections
  console.log('Test 2: Testing project setup maintains connections...');
  
  // Simulate setting a Unity project
  const testProjectPath = process.argv[2] || '/path/to/test/project';
  console.log(`  Setting project to: ${testProjectPath}`);
  
  try {
    await services.projectService.setProject(testProjectPath);
  } catch (error) {
    console.log(`  ⚠️  Project validation failed (expected for test path): ${error}`);
  }

  // Re-verify connections after project setup
  console.log('\n  Verifying connections after project setup...');
  allConnected = true;
  for (const { name, service } of fileOperationServices) {
    const hasRefreshService = (service as any).refreshService !== undefined;
    if (hasRefreshService) {
      console.log(`  ✅ ${name} - RefreshService still connected`);
    } else {
      console.log(`  ❌ ${name} - RefreshService lost after project setup`);
      allConnected = false;
    }
  }

  if (!allConnected) {
    console.error('\n❌ CRITICAL: RefreshService connections lost after project setup!');
    process.exit(1);
  }

  console.log('\n✅ RefreshService connections maintained after project setup\n');

  // Test 3: Verify BaseService refresh method exists
  console.log('Test 3: Verifying BaseService refresh capability...');
  
  // Test with UIToolkitService as example
  const uiService = services.uiToolkitService as any;
  if (typeof uiService.refreshAfterFileOperation === 'function') {
    console.log('  ✅ refreshAfterFileOperation method exists in service');
  } else {
    console.log('  ❌ refreshAfterFileOperation method missing!');
    process.exit(1);
  }

  console.log('\n=== All Tests Passed! ===');
  console.log('\nSummary:');
  console.log('- ✅ All file operation services have RefreshService connected');
  console.log('- ✅ Connections are maintained after project setup');
  console.log('- ✅ Services have refresh capability');
  console.log('\n🎉 Unity MCP Server is properly configured for automatic asset refresh!');
}

// Run the test
testServiceRefreshIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});