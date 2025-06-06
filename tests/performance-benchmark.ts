import { UnityMCPServer } from '../src/server.js';
import { ConsoleLogger } from '../src/utils/logger.js';
import { MCPTestHarness } from './mcp-test-harness.js';
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
  standardDeviation: number;
  opsPerSecond: number;
  memoryUsage?: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

interface BenchmarkSuite {
  name: string;
  benchmarks: Array<{
    name: string;
    setup?: () => Promise<void>;
    operation: () => Promise<void>;
    teardown?: () => Promise<void>;
    iterations?: number;
    warmup?: number;
  }>;
}

export class PerformanceBenchmark {
  private harness: MCPTestHarness;
  private server: UnityMCPServer;
  private virtualProject: VirtualUnityProject | null = null;
  private results: BenchmarkResult[] = [];
  
  constructor() {
    const logger = new ConsoleLogger('[Benchmark]');
    this.server = new UnityMCPServer(logger);
    this.harness = new MCPTestHarness(this.server);
  }

  /**
   * Run a single benchmark
   */
  private async runBenchmark(
    name: string,
    operation: () => Promise<void>,
    iterations: number = 100,
    warmup: number = 10
  ): Promise<BenchmarkResult> {
    console.log(`\n📊 Benchmarking: ${name}`);
    console.log(`   Iterations: ${iterations} (with ${warmup} warmup)`);
    
    // Warmup
    console.log('   Warming up...');
    for (let i = 0; i < warmup; i++) {
      await operation();
    }
    
    // Measure memory before
    const memBefore = process.memoryUsage();
    
    // Run benchmark
    const times: number[] = [];
    console.log('   Running benchmark...');
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await operation();
      const end = process.hrtime.bigint();
      
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
      times.push(duration);
      
      // Progress indicator
      if (i % Math.floor(iterations / 10) === 0) {
        process.stdout.write('.');
      }
    }
    console.log(' Done!');
    
    // Measure memory after
    const memAfter = process.memoryUsage();
    
    // Calculate statistics
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Standard deviation
    const variance = times.reduce((sum, t) => sum + Math.pow(t - averageTime, 2), 0) / iterations;
    const standardDeviation = Math.sqrt(variance);
    
    // Operations per second
    const opsPerSecond = 1000 / averageTime;
    
    const result: BenchmarkResult = {
      operation: name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      opsPerSecond,
      memoryUsage: {
        before: memBefore,
        after: memAfter,
        delta: {
          rss: memAfter.rss - memBefore.rss,
          heapTotal: memAfter.heapTotal - memBefore.heapTotal,
          heapUsed: memAfter.heapUsed - memBefore.heapUsed
        }
      }
    };
    
    this.printBenchmarkResult(result);
    return result;
  }

  /**
   * Print benchmark result
   */
  private printBenchmarkResult(result: BenchmarkResult): void {
    console.log(`   ✅ Completed: ${result.operation}`);
    console.log(`      Average: ${result.averageTime.toFixed(3)}ms`);
    console.log(`      Min/Max: ${result.minTime.toFixed(3)}ms / ${result.maxTime.toFixed(3)}ms`);
    console.log(`      Std Dev: ${result.standardDeviation.toFixed(3)}ms`);
    console.log(`      Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
    
    if (result.memoryUsage) {
      const heapDelta = result.memoryUsage.delta.heapUsed / 1024 / 1024;
      console.log(`      Memory Δ: ${heapDelta.toFixed(2)}MB heap`);
    }
  }

  /**
   * Get benchmark suites
   */
  private getBenchmarkSuites(): BenchmarkSuite[] {
    return [
      {
        name: 'Script Operations',
        benchmarks: [
          {
            name: 'Create Single Script',
            operation: async () => {
              const uniqueName = `BenchScript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await this.harness.simulateToolCall('asset_create_script', {
                fileName: uniqueName,
                content: 'public class Test : MonoBehaviour {}'
              });
            },
            iterations: 50,
            warmup: 5
          },
          {
            name: 'Read Script',
            setup: async () => {
              // Create a script to read
              await this.harness.simulateToolCall('asset_create_script', {
                fileName: 'BenchmarkReadTest',
                content: 'public class BenchmarkReadTest : MonoBehaviour { /* Long content */ }'
              });
            },
            operation: async () => {
              await this.harness.simulateToolCall('asset_read_script', {
                fileName: 'BenchmarkReadTest'
              });
            },
            iterations: 100
          },
          {
            name: 'List Scripts (Small Project)',
            operation: async () => {
              await this.harness.simulateToolCall('asset_list_scripts', {});
            },
            iterations: 100
          }
        ]
      },
      {
        name: 'Large Scale Operations',
        benchmarks: [
          {
            name: 'List Scripts (1000+ files)',
            setup: async () => {
              console.log('   Creating large project with 1000+ scripts...');
              // Create a large number of scripts
              const batchSize = 100;
              const totalScripts = 1000;
              
              for (let batch = 0; batch < totalScripts / batchSize; batch++) {
                await this.harness.simulateToolCall('system_batch_start', {});
                
                for (let i = 0; i < batchSize; i++) {
                  const index = batch * batchSize + i;
                  await this.harness.simulateToolCall('asset_create_script', {
                    fileName: `LargeScaleTest/Script${index}`,
                    content: `public class Script${index} : MonoBehaviour {}`
                  });
                }
                
                await this.harness.simulateToolCall('system_batch_end', {});
                process.stdout.write('.');
              }
              console.log(' Done!');
            },
            operation: async () => {
              await this.harness.simulateToolCall('asset_list_scripts', {});
            },
            iterations: 20,
            warmup: 2
          },
          {
            name: 'Deep Folder Hierarchy',
            setup: async () => {
              // Create deep folder structure
              const deepPath = 'Level1/Level2/Level3/Level4/Level5/Level6/Level7/Level8';
              await this.harness.simulateToolCall('asset_create_script', {
                fileName: 'DeepScript',
                content: 'public class DeepScript {}',
                folder: deepPath
              });
            },
            operation: async () => {
              await this.harness.simulateToolCall('asset_read_script', {
                fileName: 'DeepScript'
              });
            },
            iterations: 50
          }
        ]
      },
      {
        name: 'Asset Creation',
        benchmarks: [
          {
            name: 'Create Scene',
            operation: async () => {
              const uniqueName = `Scene_${Date.now()}`;
              await this.harness.simulateToolCall('asset_create_scene', {
                sceneName: uniqueName
              });
            },
            iterations: 30
          },
          {
            name: 'Create Material',
            operation: async () => {
              const uniqueName = `Mat_${Date.now()}`;
              await this.harness.simulateToolCall('asset_create_material', {
                materialName: uniqueName
              });
            },
            iterations: 30
          },
          {
            name: 'Create Shader',
            operation: async () => {
              const uniqueName = `Shader_${Date.now()}`;
              await this.harness.simulateToolCall('shader_create', {
                shaderName: uniqueName,
                shaderType: 'builtin'
              });
            },
            iterations: 30
          },
          {
            name: 'Create Shader Graph',
            operation: async () => {
              const uniqueName = `Graph_${Date.now()}`;
              await this.harness.simulateToolCall('shader_create', {
                shaderName: uniqueName,
                shaderType: 'urpGraph'
              });
            },
            iterations: 20
          }
        ]
      },
      {
        name: 'Batch Operations',
        benchmarks: [
          {
            name: 'Batch Create (10 scripts)',
            operation: async () => {
              await this.harness.simulateToolCall('system_batch_start', {});
              
              for (let i = 0; i < 10; i++) {
                await this.harness.simulateToolCall('asset_create_script', {
                  fileName: `BatchScript${i}_${Date.now()}`,
                  content: `public class BatchScript${i} {}`
                });
              }
              
              await this.harness.simulateToolCall('system_batch_end', {});
            },
            iterations: 20
          },
          {
            name: 'Individual Create (10 scripts)',
            operation: async () => {
              for (let i = 0; i < 10; i++) {
                await this.harness.simulateToolCall('asset_create_script', {
                  fileName: `IndividualScript${i}_${Date.now()}`,
                  content: `public class IndividualScript${i} {}`
                });
              }
            },
            iterations: 20
          }
        ]
      },
      {
        name: 'Concurrent Operations',
        benchmarks: [
          {
            name: 'Parallel List Operations',
            operation: async () => {
              const calls = [
                { toolName: 'asset_list_scripts', args: {} },
                { toolName: 'shader_list', args: {} },
                { toolName: 'editor_list_scripts', args: {} },
                { toolName: 'package_list_installed', args: {} }
              ];
              
              await this.harness.testConcurrency(calls);
            },
            iterations: 50
          },
          {
            name: 'Sequential List Operations',
            operation: async () => {
              await this.harness.simulateToolCall('asset_list_scripts', {});
              await this.harness.simulateToolCall('shader_list', {});
              await this.harness.simulateToolCall('editor_list_scripts', {});
              await this.harness.simulateToolCall('package_list_installed', {});
            },
            iterations: 50
          }
        ]
      },
      {
        name: 'Memory Intensive',
        benchmarks: [
          {
            name: 'Large File Creation',
            operation: async () => {
              const largeContent = 'public class LargeClass : MonoBehaviour {\n' +
                '    // Large content\n' +
                `    private string data = "${'x'.repeat(10000)}";\n` +
                '}\n';
              
              await this.harness.simulateToolCall('asset_create_script', {
                fileName: `LargeFile_${Date.now()}`,
                content: largeContent
              });
            },
            iterations: 20
          },
          {
            name: 'Project Info (Large Project)',
            operation: async () => {
              await this.harness.simulateToolCall('project_info', {});
            },
            iterations: 100
          }
        ]
      },
      {
        name: 'Package Operations',
        benchmarks: [
          {
            name: 'Search Packages',
            operation: async () => {
              await this.harness.simulateToolCall('package_search', {
                query: '2D'
              });
            },
            iterations: 30
          },
          {
            name: 'List Installed Packages',
            operation: async () => {
              await this.harness.simulateToolCall('package_list_installed', {});
            },
            iterations: 50
          }
        ]
      }
    ];
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks(): Promise<void> {
    console.log('Unity MCP Server - Performance Benchmark');
    console.log('=======================================');
    console.log(`Platform: ${os.platform()} ${os.arch()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`CPU: ${os.cpus()[0].model}`);
    console.log(`Cores: ${os.cpus().length}`);
    console.log(`Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB`);
    console.log();
    
    // Setup virtual project
    console.log('Setting up virtual Unity project...');
    const tempDir = path.join(os.tmpdir(), 'unity-mcp-benchmark');
    this.virtualProject = new VirtualUnityProject(tempDir, {
      scriptCount: 50,
      projectName: 'BenchmarkProject'
    });
    
    const projectPath = await this.virtualProject.generate();
    await this.harness.setupMockProject(projectPath);
    
    // Run benchmark suites
    const suites = this.getBenchmarkSuites();
    
    for (const suite of suites) {
      console.log(`\n\n🔥 Benchmark Suite: ${suite.name}`);
      console.log('═'.repeat(50));
      
      for (const benchmark of suite.benchmarks) {
        try {
          // Setup
          if (benchmark.setup) {
            console.log('   Setting up...');
            await benchmark.setup();
          }
          
          // Run benchmark
          const result = await this.runBenchmark(
            benchmark.name,
            benchmark.operation,
            benchmark.iterations,
            benchmark.warmup
          );
          
          this.results.push(result);
          
          // Teardown
          if (benchmark.teardown) {
            await benchmark.teardown();
          }
          
          // Small delay between benchmarks
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`   ❌ Benchmark failed: ${error}`);
        }
      }
    }
    
    // Print summary
    this.printSummary();
    
    // Cleanup
    if (this.virtualProject) {
      await this.virtualProject.cleanup();
    }
  }

  /**
   * Print benchmark summary
   */
  private printSummary(): void {
    console.log('\n\n' + '='.repeat(60));
    console.log('BENCHMARK SUMMARY');
    console.log('='.repeat(60));
    
    // Overall statistics
    const totalOps = this.results.reduce((sum, r) => sum + r.iterations, 0);
    const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
    
    console.log(`\nTotal operations: ${totalOps}`);
    console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Overall throughput: ${(totalOps / (totalTime / 1000)).toFixed(2)} ops/sec`);
    
    // Fastest operations
    console.log('\n🚀 Fastest Operations:');
    const fastest = [...this.results].sort((a, b) => b.opsPerSecond - a.opsPerSecond).slice(0, 5);
    fastest.forEach(r => {
      console.log(`   ${r.operation}: ${r.opsPerSecond.toFixed(2)} ops/sec (${r.averageTime.toFixed(3)}ms avg)`);
    });
    
    // Slowest operations
    console.log('\n🐌 Slowest Operations:');
    const slowest = [...this.results].sort((a, b) => a.opsPerSecond - b.opsPerSecond).slice(0, 5);
    slowest.forEach(r => {
      console.log(`   ${r.operation}: ${r.opsPerSecond.toFixed(2)} ops/sec (${r.averageTime.toFixed(3)}ms avg)`);
    });
    
    // Memory usage
    console.log('\n💾 Memory Impact:');
    const memoryIntensive = [...this.results]
      .filter(r => r.memoryUsage)
      .sort((a, b) => (b.memoryUsage!.delta.heapUsed - a.memoryUsage!.delta.heapUsed))
      .slice(0, 5);
    
    memoryIntensive.forEach(r => {
      const heapDelta = r.memoryUsage!.delta.heapUsed / 1024 / 1024;
      console.log(`   ${r.operation}: ${heapDelta.toFixed(2)}MB heap increase`);
    });
    
    // Comparison: Batch vs Individual
    const batchCreate = this.results.find(r => r.operation.includes('Batch Create'));
    const individualCreate = this.results.find(r => r.operation.includes('Individual Create'));
    
    if (batchCreate && individualCreate) {
      console.log('\n📊 Batch vs Individual Operations:');
      console.log(`   Batch: ${batchCreate.averageTime.toFixed(3)}ms for 10 scripts`);
      console.log(`   Individual: ${individualCreate.averageTime.toFixed(3)}ms for 10 scripts`);
      const improvement = ((individualCreate.averageTime - batchCreate.averageTime) / individualCreate.averageTime * 100);
      console.log(`   Batch is ${improvement.toFixed(1)}% faster`);
    }
    
    // Comparison: Parallel vs Sequential
    const parallel = this.results.find(r => r.operation.includes('Parallel List'));
    const sequential = this.results.find(r => r.operation.includes('Sequential List'));
    
    if (parallel && sequential) {
      console.log('\n🔄 Parallel vs Sequential Operations:');
      console.log(`   Parallel: ${parallel.averageTime.toFixed(3)}ms`);
      console.log(`   Sequential: ${sequential.averageTime.toFixed(3)}ms`);
      const improvement = ((sequential.averageTime - parallel.averageTime) / sequential.averageTime * 100);
      console.log(`   Parallel is ${improvement.toFixed(1)}% faster`);
    }
    
    // Export results
    this.exportResults();
  }

  /**
   * Export benchmark results to JSON
   */
  private async exportResults(): Promise<void> {
    const exportPath = path.join(process.cwd(), 'benchmark-results.json');
    
    const exportData = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpu: os.cpus()[0].model,
        cores: os.cpus().length,
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
  const benchmark = new PerformanceBenchmark();
  benchmark.runAllBenchmarks().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}