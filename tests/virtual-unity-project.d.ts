export interface VirtualProjectOptions {
    unityVersion?: string;
    scriptCount?: number;
    includePackages?: string[];
    includePrefabs?: boolean;
    includeScenes?: boolean;
    includeMaterials?: boolean;
    includeShaders?: boolean;
    projectName?: string;
}
export declare class VirtualUnityProject {
    private projectPath;
    private options;
    private generatedFiles;
    constructor(basePath: string, options?: VirtualProjectOptions);
    /**
     * Generate a complete Unity project structure
     */
    generate(): Promise<string>;
    /**
     * Create the basic Unity project folder structure
     */
    private createProjectStructure;
    /**
     * Generate ProjectSettings files
     */
    private generateProjectSettings;
    /**
     * Generate package manifest
     */
    private generateManifest;
    /**
     * Generate sample C# scripts
     */
    private generateScripts;
    /**
     * Generate sample scenes
     */
    private generateScenes;
    /**
     * Generate scene YAML content
     */
    private generateSceneYAML;
    /**
     * Generate sample materials
     */
    private generateMaterials;
    /**
     * Generate material YAML content
     */
    private generateMaterialYAML;
    /**
     * Generate sample shaders
     */
    private generateShaders;
    /**
     * Generate sample prefabs
     */
    private generatePrefabs;
    /**
     * Generate prefab YAML content
     */
    private generatePrefabYAML;
    /**
     * Generate .meta files for all assets
     */
    private generateMetaFiles;
    /**
     * Clean up the generated project
     */
    cleanup(): Promise<void>;
    /**
     * Get the project path
     */
    getProjectPath(): string;
    /**
     * Get list of all generated files
     */
    getGeneratedFiles(): string[];
    /**
     * Verify project structure is valid
     */
    verify(): Promise<boolean>;
}
//# sourceMappingURL=virtual-unity-project.d.ts.map