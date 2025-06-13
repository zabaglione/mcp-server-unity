export interface MockFileSystem {
    [path: string]: string | Buffer | MockDirectory;
}
export interface MockDirectory {
    type: 'directory';
    files?: MockFileSystem;
}
export declare class TestHelpers {
    /**
     * Create a mock file system structure
     */
    static setupMockFileSystem(structure: MockFileSystem): void;
    /**
     * Create a mock Unity project structure
     */
    static createMockUnityProject(projectPath: string): MockFileSystem;
    /**
     * Create a mock Unity project with URP
     */
    static createMockUnityProjectWithURP(projectPath: string): MockFileSystem;
    /**
     * Create a mock Unity project with HDRP
     */
    static createMockUnityProjectWithHDRP(projectPath: string): MockFileSystem;
    /**
     * Generate a consistent GUID for testing
     */
    static generateTestGUID(seed: string): string;
    /**
     * Create a mock logger
     */
    static createMockLogger(): {
        info: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        warn: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        error: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        debug: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    };
    /**
     * Wait for async operations
     */
    static waitForAsync(ms?: number): Promise<void>;
}
//# sourceMappingURL=test-helpers.d.ts.map