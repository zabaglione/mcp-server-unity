export declare class PerformanceBenchmark {
    private harness;
    private server;
    private virtualProject;
    private results;
    constructor();
    /**
     * Run a single benchmark
     */
    private runBenchmark;
    /**
     * Print benchmark result
     */
    private printBenchmarkResult;
    /**
     * Get benchmark suites
     */
    private getBenchmarkSuites;
    /**
     * Run all benchmarks
     */
    runAllBenchmarks(): Promise<void>;
    /**
     * Print benchmark summary
     */
    private printSummary;
    /**
     * Export benchmark results to JSON
     */
    private exportResults;
}
//# sourceMappingURL=performance-benchmark.d.ts.map