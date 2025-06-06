import { UnityMCPServer } from '../src/server.js';
import { ConsoleLogger } from '../src/utils/logger.js';
import { VirtualUnityProject } from './virtual-unity-project.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

export class PerformanceDirectTest {
  private services: any;
  private server: UnityMCPServer;
  private virtualProject: VirtualUnityProject | null = null;
  private projectPath: string = '';
  private results: BenchmarkResult[] = [];
  
  constructor() {
    const logger = new ConsoleLogger('[Perf]');
    this.server = new UnityMCPServer(logger);
    this.services = (this.server as any).services;
  }

  private async runBenchmark(
    name: string,
    operation: () => Promise<void>,
    iterations: number = 50,
    warmup: number = 5
  ): Promise<BenchmarkResult> {
    console.log(`\n📊 ${name}`);
    console.log(`   Iterations: ${iterations} (with ${warmup} warmup)`);
    
    // Warmup
    for (let i = 0; i < warmup; i++) {
      await operation();
    }
    
    // Run benchmark
    const times: number[] = [];
    process.stdout.write('   Progress: ');
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await operation();
      const end = process.hrtime.bigint();
      
      const duration = Number(end - start) / 1_000_000; // Convert to ms
      times.push(duration);
      
      if (i % Math.max(1, Math.floor(iterations / 10)) === 0) {
        process.stdout.write('.');
      }
    }
    console.log(' Done!');
    
    // Calculate statistics
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / averageTime;
    
    const result: BenchmarkResult = {
      operation: name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      opsPerSecond
    };
    
    console.log(`   ✅ Average: ${averageTime.toFixed(3)}ms`);
    console.log(`   ✅ Ops/sec: ${opsPerSecond.toFixed(2)}`);
    
    return result;
  }

  async runAllBenchmarks(): Promise<void> {
    console.log('Unity MCP Server - Performance Benchmark');
    console.log('=======================================');
    console.log(`Platform: ${os.platform()} ${os.arch()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB`);
    
    // Setup virtual project
    console.log('\nSetting up virtual Unity project...');
    const tempDir = path.join(os.tmpdir(), 'unity-mcp-perf');
    this.virtualProject = new VirtualUnityProject(tempDir, {
      scriptCount: 100,
      projectName: 'PerfTestProject'
    });
    
    this.projectPath = await this.virtualProject.generate();
    await this.services.projectService.setProject(this.projectPath);
    
    // Benchmarks
    console.log('\n🔥 Running Benchmarks...');
    
    // Script Operations
    this.results.push(await this.runBenchmark(
      'Create Single Script',
      async () => {
        const name = `PerfScript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.services.scriptService.createScript(name, 'public class Test {}');
      },
      30
    ));
    
    this.results.push(await this.runBenchmark(
      'Read Script',
      async () => {
        await this.services.scriptService.readScript('PlayerController');
      },
      100
    ));
    
    this.results.push(await this.runBenchmark(
      'List Scripts (100 files)',
      async () => {
        await this.services.scriptService.listScripts();
      },
      50
    ));
    
    // Asset Operations
    this.results.push(await this.runBenchmark(
      'Create Scene',
      async () => {
        const name = `Scene_${Date.now()}`;
        await this.services.assetService.createScene(name);
      },
      20
    ));
    
    this.results.push(await this.runBenchmark(
      'Create Material',
      async () => {
        const name = `Mat_${Date.now()}`;
        await this.services.assetService.createMaterial(name);
      },
      20
    ));
    
    // Batch Operations
    this.results.push(await this.runBenchmark(
      'Batch Create (5 scripts)',
      async () => {
        await this.services.refreshService.startBatchOperation();
        for (let i = 0; i < 5; i++) {
          await this.services.scriptService.createScript(
            `Batch_${Date.now()}_${i}`,
            'public class Test {}'
          );
        }
        await this.services.refreshService.endBatchOperation();
      },
      10
    ));
    
    // Package Operations
    this.results.push(await this.runBenchmark(
      'Search Packages',
      async () => {
        await this.services.packageService.searchPackages('2D');
      },
      20
    ));
    
    this.printSummary();
    
    // Cleanup
    if (this.virtualProject) {
      await this.virtualProject.cleanup();
    }
    
    // Export results
    await this.exportResults();
  }

  private printSummary(): void {
    console.log('\n\n' + '='.repeat(60));
    console.log('BENCHMARK SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n📊 Results:');
    this.results.forEach(r => {
      console.log(`\n${r.operation}:`);
      console.log(`  Average: ${r.averageTime.toFixed(3)}ms`);
      console.log(`  Min/Max: ${r.minTime.toFixed(3)}ms / ${r.maxTime.toFixed(3)}ms`);
      console.log(`  Ops/sec: ${r.opsPerSecond.toFixed(2)}`);
    });
    
    // Find fastest/slowest
    const fastest = [...this.results].sort((a, b) => b.opsPerSecond - a.opsPerSecond)[0];
    const slowest = [...this.results].sort((a, b) => a.opsPerSecond - b.opsPerSecond)[0];
    
    console.log('\n🚀 Fastest Operation:');
    console.log(`  ${fastest.operation}: ${fastest.opsPerSecond.toFixed(2)} ops/sec`);
    
    console.log('\n🐌 Slowest Operation:');
    console.log(`  ${slowest.operation}: ${slowest.opsPerSecond.toFixed(2)} ops/sec`);
  }

  private async exportResults(): Promise<void> {
    const exportPath = path.join(process.cwd(), 'benchmark-results.json');
    
    const exportData = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: os.totalmem()
      },
      results: this.results
    };
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`\n📄 Results exported to: ${exportPath}`);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new PerformanceDirectTest();
  test.runAllBenchmarks().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}