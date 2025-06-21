#!/usr/bin/env node

import { ServicesContainer } from './dist/services-container.js';
import { ConsoleLogger } from './dist/utils/logger.js';

async function testEnhancedCompilation() {
  const logger = new ConsoleLogger('[TEST]');
  
  // Test with regular compilation service
  console.log('\n=== Testing Regular Compilation Service ===');
  process.env.USE_ENHANCED_COMPILATION = 'false';
  const regularContainer = new ServicesContainer(logger, false);
  const regularServices = regularContainer.getServices();
  
  // Set project path (you'll need to update this)
  const projectPath = process.argv[2] || '/path/to/your/unity/project';
  await regularServices.projectService.setProject(projectPath);
  
  console.log('Getting compilation errors with regular service...');
  const regularResult = await regularServices.compilationService.getCompilationErrors(true);
  console.log('Regular result:', regularResult.content[0].text.substring(0, 200) + '...');
  
  // Test with enhanced compilation service
  console.log('\n=== Testing Enhanced Compilation Service ===');
  process.env.USE_ENHANCED_COMPILATION = 'true';
  const enhancedContainer = new ServicesContainer(logger, false);
  const enhancedServices = enhancedContainer.getServices();
  
  await enhancedServices.projectService.setProject(projectPath);
  
  console.log('Getting compilation errors with enhanced service...');
  const enhancedResult = await enhancedServices.compilationService.getCompilationErrors(true);
  console.log('Enhanced result:', enhancedResult.content[0].text.substring(0, 500) + '...');
  
  // Show sources used
  if (enhancedResult.content[0].text.includes('Sources:')) {
    const sourcesMatch = enhancedResult.content[0].text.match(/Sources: ([^\n]+)/);
    if (sourcesMatch) {
      console.log('\nError detection sources:', sourcesMatch[1]);
    }
  }
}

if (process.argv.length < 3) {
  console.error('Usage: node test-enhanced-compilation.js /path/to/unity/project');
  process.exit(1);
}

testEnhancedCompilation().catch(console.error);