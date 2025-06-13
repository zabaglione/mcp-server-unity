export interface TestResult {
    testCase: string;
    passed: boolean;
    message: string;
    duration: number;
}
export declare class TestUtils {
    static createTestProject(basePath: string): Promise<string>;
    static cleanupTestProject(projectPath: string): Promise<void>;
    static runMCPCommand(_command: string, _args: any): Promise<any>;
    static fileExists(filePath: string): Promise<boolean>;
    static readJSON(filePath: string): Promise<any>;
    static measureExecutionTime<T>(fn: () => Promise<T>): Promise<{
        result: T;
        duration: number;
    }>;
    static formatTestResults(results: TestResult[]): string;
}
//# sourceMappingURL=test-utils.d.ts.map