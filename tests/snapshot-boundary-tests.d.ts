export declare class SnapshotBoundaryTests {
    private harness;
    private server;
    private virtualProject;
    private snapshotsDir;
    private results;
    constructor();
    /**
     * Initialize test environment
     */
    private setup;
    /**
     * Get snapshot tests
     */
    private getSnapshotTests;
    /**
     * Get boundary test cases
     */
    private getBoundaryTests;
    /**
     * Run snapshot test
     */
    private runSnapshotTest;
    /**
     * Normalize content for comparison (remove dynamic values)
     */
    private normalizeContent;
    /**
     * Run boundary test
     */
    private runBoundaryTest;
    /**
     * Run all tests
     */
    runAllTests(): Promise<void>;
    /**
     * Print test summary
     */
    private printSummary;
}
//# sourceMappingURL=snapshot-boundary-tests.d.ts.map