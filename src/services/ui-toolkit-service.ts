import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseService } from './base-service.js';
import { InvalidParameterError, FileOperationError } from '../errors/index.js';
import { generateGuid } from '../utils/guid.js';
import { 
  shouldUseStreaming, 
  readLargeFile, 
  writeLargeFile,
  FILE_SIZE_THRESHOLDS 
} from '../utils/stream-file-utils.js';

/**
 * Service for managing Unity UI Toolkit assets (UXML and USS files)
 */
export class UIToolkitService extends BaseService {
  /**
   * Write UI file with streaming support for large files
   */
  private async writeUIFile(filePath: string, content: string): Promise<void> {
    const contentSize = Buffer.byteLength(content, 'utf8');
    if (contentSize > FILE_SIZE_THRESHOLDS.STREAMING_THRESHOLD) {
      this.logger.info(`Writing large UI file (${Math.round(contentSize / 1024 / 1024)}MB) using streaming...`);
      await writeLargeFile(filePath, content);
    } else {
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }

  /**
   * Read UI file with streaming support for large files
   */
  private async readUIFile(filePath: string): Promise<string> {
    if (await shouldUseStreaming(filePath)) {
      const stats = await fs.stat(filePath);
      this.logger.info(`Reading large UI file (${Math.round(stats.size / 1024 / 1024)}MB) using streaming...`);
      return await readLargeFile(filePath);
    } else {
      return await fs.readFile(filePath, 'utf-8');
    }
  }
  /**
   * Create a new UXML file with basic structure
   */
  async createUXML(
    fileName: string,
    templateType: 'window' | 'document' | 'component' | 'custom' = 'document',
    customContent?: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    if (!fileName || typeof fileName !== 'string') {
      throw new InvalidParameterError('fileName must be a non-empty string');
    }

    // Remove .uxml extension if provided
    fileName = fileName.replace(/\.uxml$/i, '');

    try {
      const uiPath = path.join(this.unityProject!.projectPath, 'Assets', 'UI');
      await fs.mkdir(uiPath, { recursive: true });

      const filePath = path.join(uiPath, `${fileName}.uxml`);
      
      let content: string;
      if (customContent) {
        content = customContent;
      } else {
        content = this.generateUXMLTemplate(fileName, templateType);
      }

      await this.writeUIFile(filePath, content);

      // Create .meta file
      const metaContent = this.generateUIMetaFile('uxml');
      await fs.writeFile(`${filePath}.meta`, metaContent, 'utf-8');

      // Refresh Unity assets after file creation
      await this.refreshAfterFileOperation(filePath);

      this.logger.info(`Created UXML file: ${fileName}.uxml`);

      return {
        content: [{
          type: 'text',
          text: `UXML file "${fileName}.uxml" created successfully in Assets/UI/`
        }]
      };
    } catch (error) {
      this.logger.error(`Failed to create UXML file: ${fileName}`, error);
      throw new FileOperationError(`Failed to create UXML file: ${error}`);
    }
  }

  /**
   * Create a new USS file with basic styles
   */
  async createUSS(
    fileName: string,
    templateType: 'theme' | 'component' | 'utilities' | 'custom' = 'component',
    customContent?: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    if (!fileName || typeof fileName !== 'string') {
      throw new InvalidParameterError('fileName must be a non-empty string');
    }

    // Remove .uss extension if provided
    fileName = fileName.replace(/\.uss$/i, '');

    try {
      const stylesPath = path.join(this.unityProject!.projectPath, 'Assets', 'UI', 'Styles');
      await fs.mkdir(stylesPath, { recursive: true });

      const filePath = path.join(stylesPath, `${fileName}.uss`);
      
      let content: string;
      if (customContent) {
        content = customContent;
      } else {
        content = this.generateUSSTemplate(fileName, templateType);
      }

      await this.writeUIFile(filePath, content);

      // Create .meta file
      const metaContent = this.generateUIMetaFile('uss');
      await fs.writeFile(`${filePath}.meta`, metaContent, 'utf-8');

      // Refresh Unity assets after file creation
      await this.refreshAfterFileOperation(filePath);

      this.logger.info(`Created USS file: ${fileName}.uss`);

      return {
        content: [{
          type: 'text',
          text: `USS file "${fileName}.uss" created successfully in Assets/UI/Styles/`
        }]
      };
    } catch (error) {
      this.logger.error(`Failed to create USS file: ${fileName}`, error);
      throw new FileOperationError(`Failed to create USS file: ${error}`);
    }
  }

  /**
   * Update existing UXML file
   */
  async updateUXML(
    fileName: string,
    content: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    if (!fileName || !content) {
      throw new InvalidParameterError('fileName and content are required');
    }

    try {
      // Search for UXML file
      const uxmlPath = await this.findUIFile(fileName, 'uxml');
      
      if (!uxmlPath) {
        throw new FileOperationError(`UXML file not found: ${fileName}`);
      }

      // Preserve meta file GUID
      const metaPath = `${uxmlPath}.meta`;
      const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);
      let originalGuid: string | null = null;

      if (metaExists) {
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        const guidMatch = metaContent.match(/guid: ([a-f0-9]{32})/);
        if (guidMatch) {
          originalGuid = guidMatch[1];
        }
      }

      // Update UXML content
      await this.writeUIFile(uxmlPath, content);

      // Restore meta file with original GUID
      if (originalGuid) {
        const metaContent = this.generateUIMetaFile('uxml', originalGuid);
        await fs.writeFile(metaPath, metaContent, 'utf-8');
      }

      // Refresh Unity assets after file update
      await this.refreshAfterFileOperation(uxmlPath);

      this.logger.info(`Updated UXML file: ${uxmlPath}`);

      return {
        content: [{
          type: 'text',
          text: `UXML file "${fileName}" updated successfully`
        }]
      };
    } catch (error) {
      this.logger.error(`Failed to update UXML file: ${fileName}`, error);
      throw new FileOperationError(`Failed to update UXML file: ${error}`);
    }
  }

  /**
   * Update existing USS file
   */
  async updateUSS(
    fileName: string,
    content: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    if (!fileName || !content) {
      throw new InvalidParameterError('fileName and content are required');
    }

    try {
      // Search for USS file
      const ussPath = await this.findUIFile(fileName, 'uss');
      
      if (!ussPath) {
        throw new FileOperationError(`USS file not found: ${fileName}`);
      }

      // Preserve meta file GUID
      const metaPath = `${ussPath}.meta`;
      const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);
      let originalGuid: string | null = null;

      if (metaExists) {
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        const guidMatch = metaContent.match(/guid: ([a-f0-9]{32})/);
        if (guidMatch) {
          originalGuid = guidMatch[1];
        }
      }

      // Update USS content
      await this.writeUIFile(ussPath, content);

      // Restore meta file with original GUID
      if (originalGuid) {
        const metaContent = this.generateUIMetaFile('uss', originalGuid);
        await fs.writeFile(metaPath, metaContent, 'utf-8');
      }

      // Refresh Unity assets after file update
      await this.refreshAfterFileOperation(ussPath);

      this.logger.info(`Updated USS file: ${ussPath}`);

      return {
        content: [{
          type: 'text',
          text: `USS file "${fileName}" updated successfully`
        }]
      };
    } catch (error) {
      this.logger.error(`Failed to update USS file: ${fileName}`, error);
      throw new FileOperationError(`Failed to update USS file: ${error}`);
    }
  }

  /**
   * Read UXML file content
   */
  async readUXML(fileName: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    try {
      const uxmlPath = await this.findUIFile(fileName, 'uxml');
      
      if (!uxmlPath) {
        throw new FileOperationError(`UXML file not found: ${fileName}`);
      }

      const content = await this.readUIFile(uxmlPath);

      return {
        content: [{
          type: 'text',
          text: content
        }]
      };
    } catch (error) {
      this.logger.error(`Failed to read UXML file: ${fileName}`, error);
      throw new FileOperationError(`Failed to read UXML file: ${error}`);
    }
  }

  /**
   * Read USS file content
   */
  async readUSS(fileName: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    try {
      const ussPath = await this.findUIFile(fileName, 'uss');
      
      if (!ussPath) {
        throw new FileOperationError(`USS file not found: ${fileName}`);
      }

      const content = await this.readUIFile(ussPath);

      return {
        content: [{
          type: 'text',
          text: content
        }]
      };
    } catch (error) {
      this.logger.error(`Failed to read USS file: ${fileName}`, error);
      throw new FileOperationError(`Failed to read USS file: ${error}`);
    }
  }

  /**
   * List all UXML files in the project
   */
  async listUXMLFiles(): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    try {
      const uxmlFiles: string[] = [];
      await this.findUIFilesRecursive(path.join(this.unityProject!.projectPath, 'Assets'), 'uxml', uxmlFiles);

      // Convert absolute paths to relative paths for display
      const relativePaths = uxmlFiles.map(file => 
        path.relative(this.unityProject!.projectPath, file).replace(/\\/g, '/')
      );

      const fileList = relativePaths.length > 0 
        ? relativePaths.join('\n')
        : 'No UXML files found in the project';

      return {
        content: [{
          type: 'text',
          text: fileList
        }]
      };
    } catch (error) {
      this.logger.error('Failed to list UXML files', error);
      throw new FileOperationError(`Failed to list UXML files: ${error}`);
    }
  }

  /**
   * List all USS files in the project
   */
  async listUSSFiles(): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    try {
      const ussFiles: string[] = [];
      await this.findUIFilesRecursive(path.join(this.unityProject!.projectPath, 'Assets'), 'uss', ussFiles);

      // Convert absolute paths to relative paths for display
      const relativePaths = ussFiles.map(file => 
        path.relative(this.unityProject!.projectPath, file).replace(/\\/g, '/')
      );

      const fileList = relativePaths.length > 0 
        ? relativePaths.join('\n')
        : 'No USS files found in the project';

      return {
        content: [{
          type: 'text',
          text: fileList
        }]
      };
    } catch (error) {
      this.logger.error('Failed to list USS files', error);
      throw new FileOperationError(`Failed to list USS files: ${error}`);
    }
  }

  /**
   * Create a complete UI component with both UXML and USS
   */
  async createUIComponent(
    componentName: string,
    componentType: 'button' | 'panel' | 'list' | 'form' | 'card' | 'modal' = 'panel'
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.ensureProjectSet();

    try {
      // Create component directory
      const componentPath = path.join(this.unityProject!.projectPath, 'Assets', 'UI', 'Components', componentName);
      await fs.mkdir(componentPath, { recursive: true });

      // Generate UXML
      const uxmlContent = this.generateComponentUXML(componentName, componentType);
      const uxmlPath = path.join(componentPath, `${componentName}.uxml`);
      await this.writeUIFile(uxmlPath, uxmlContent);
      await fs.writeFile(`${uxmlPath}.meta`, this.generateUIMetaFile('uxml'), 'utf-8');

      // Generate USS
      const ussContent = this.generateComponentUSS(componentName, componentType);
      const ussPath = path.join(componentPath, `${componentName}.uss`);
      await this.writeUIFile(ussPath, ussContent);
      await fs.writeFile(`${ussPath}.meta`, this.generateUIMetaFile('uss'), 'utf-8');

      // Generate C# controller (optional)
      const controllerContent = this.generateComponentController(componentName, componentType);
      const controllerPath = path.join(componentPath, `${componentName}.cs`);
      await this.writeUIFile(controllerPath, controllerContent);
      await fs.writeFile(`${controllerPath}.meta`, this.generateScriptMetaFile(), 'utf-8');

      // Refresh Unity assets after creating all component files
      await this.refreshAfterFileOperation(componentPath);

      return {
        content: [{
          type: 'text',
          text: `UI component "${componentName}" created successfully with:\n` +
                `- UXML: ${componentName}.uxml\n` +
                `- USS: ${componentName}.uss\n` +
                `- Controller: ${componentName}.cs`
        }]
      };
    } catch (error) {
      this.logger.error(`Failed to create UI component: ${componentName}`, error);
      throw new FileOperationError(`Failed to create UI component: ${error}`);
    }
  }

  // Private helper methods

  private generateUXMLTemplate(name: string, templateType: string): string {
    const templates: Record<string, string> = {
      window: `<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" xsi="http://www.w3.org/2001/XMLSchema-instance" engine="UnityEngine.UIElements" editor="UnityEditor.UIElements" noNamespaceSchemaLocation="../../UIElementsSchema/UIElements.xsd" editor-extension-mode="True">
    <Style src="project://database/Assets/UI/Styles/${name}.uss" />
    <ui:VisualElement name="window-container" class="window-container">
        <ui:Label text="Window Title" display-tooltip-when-elided="true" name="window-title" class="window-title" />
        <ui:VisualElement name="window-content" class="window-content">
            <!-- Window content goes here -->
        </ui:VisualElement>
        <ui:VisualElement name="window-footer" class="window-footer">
            <ui:Button text="OK" display-tooltip-when-elided="true" name="ok-button" class="button primary-button" />
            <ui:Button text="Cancel" display-tooltip-when-elided="true" name="cancel-button" class="button secondary-button" />
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>`,

      document: `<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" xsi="http://www.w3.org/2001/XMLSchema-instance" engine="UnityEngine.UIElements" editor="UnityEditor.UIElements" noNamespaceSchemaLocation="../../UIElementsSchema/UIElements.xsd" editor-extension-mode="False">
    <Style src="project://database/Assets/UI/Styles/${name}.uss" />
    <ui:VisualElement name="root" class="root-container">
        <!-- Document content goes here -->
    </ui:VisualElement>
</ui:UXML>`,

      component: `<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" xsi="http://www.w3.org/2001/XMLSchema-instance" engine="UnityEngine.UIElements" editor="UnityEditor.UIElements" noNamespaceSchemaLocation="../../UIElementsSchema/UIElements.xsd" editor-extension-mode="False">
    <ui:VisualElement name="${name}-component" class="component-container">
        <!-- Component content goes here -->
    </ui:VisualElement>
</ui:UXML>`,

      custom: `<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements">
    <!-- Custom UXML template -->
</ui:UXML>`
    };

    return templates[templateType] || templates.document;
  }

  private generateUSSTemplate(name: string, templateType: string): string {
    const templates: Record<string, string> = {
      theme: `/* ${name} Theme Styles */

:root {
    --primary-color: #2196F3;
    --secondary-color: #FFC107;
    --background-color: #1E1E1E;
    --surface-color: #2D2D2D;
    --text-color: #FFFFFF;
    --text-secondary-color: #B0B0B0;
    --border-color: #424242;
    --error-color: #F44336;
    --success-color: #4CAF50;
    --warning-color: #FF9800;
    --info-color: #2196F3;
}

.root-container {
    background-color: var(--background-color);
    color: var(--text-color);
    flex-grow: 1;
    padding: 20px;
}

.button {
    background-color: var(--surface-color);
    border-color: var(--border-color);
    border-width: 1px;
    border-radius: 4px;
    color: var(--text-color);
    padding: 8px 16px;
    margin: 4px;
    transition-duration: 0.2s;
}

.button:hover {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
}

.button:active {
    scale: 0.98;
}

.primary-button {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
}

.secondary-button {
    background-color: transparent;
    border-color: var(--primary-color);
    color: var(--primary-color);
}`,

      component: `/* ${name} Component Styles */

.component-container {
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.1);
    padding: 16px;
    margin: 8px;
}

.component-header {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
    color: #FFFFFF;
}

.component-content {
    flex-grow: 1;
}

.component-footer {
    margin-top: 16px;
    flex-direction: row;
    justify-content: flex-end;
}`,

      utilities: `/* Utility Classes */

/* Layout */
.flex-row {
    flex-direction: row;
}

.flex-column {
    flex-direction: column;
}

.flex-grow {
    flex-grow: 1;
}

.flex-center {
    align-items: center;
    justify-content: center;
}

/* Spacing */
.m-0 { margin: 0px; }
.m-1 { margin: 4px; }
.m-2 { margin: 8px; }
.m-3 { margin: 12px; }
.m-4 { margin: 16px; }
.m-5 { margin: 20px; }

.p-0 { padding: 0px; }
.p-1 { padding: 4px; }
.p-2 { padding: 8px; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.p-5 { padding: 20px; }

/* Typography */
.text-small { font-size: 12px; }
.text-normal { font-size: 14px; }
.text-large { font-size: 18px; }
.text-xl { font-size: 24px; }

.text-bold { -unity-font-style: bold; }
.text-italic { -unity-font-style: italic; }

/* Colors */
.text-primary { color: #2196F3; }
.text-secondary { color: #B0B0B0; }
.text-error { color: #F44336; }
.text-success { color: #4CAF50; }
.text-warning { color: #FF9800; }

/* Display */
.hidden { display: none; }
.visible { display: flex; }

/* Borders */
.border-none { border-width: 0; }
.border-thin { border-width: 1px; }
.border-thick { border-width: 2px; }

.rounded-none { border-radius: 0; }
.rounded-small { border-radius: 4px; }
.rounded-medium { border-radius: 8px; }
.rounded-large { border-radius: 16px; }
.rounded-full { border-radius: 9999px; }`,

      custom: `/* ${name} Styles */

.container {
    /* Add your custom styles here */
}`
    };

    return templates[templateType] || templates.component;
  }

  private generateComponentUXML(name: string, componentType: string): string {
    const templates: Record<string, string> = {
      button: `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:Template name="${name}" src="${name}.uxml" />
    <ui:Style src="${name}.uss" />
    
    <ui:Button name="${name.toLowerCase()}-button" class="custom-button">
        <ui:VisualElement class="button-icon" />
        <ui:Label text="Button Text" class="button-label" />
    </ui:Button>
</ui:UXML>`,

      panel: `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:Style src="${name}.uss" />
    
    <ui:VisualElement name="${name.toLowerCase()}-panel" class="panel-container">
        <ui:VisualElement class="panel-header">
            <ui:Label text="Panel Title" class="panel-title" />
            <ui:Button name="close-button" class="panel-close-button" text="×" />
        </ui:VisualElement>
        <ui:ScrollView class="panel-content">
            <!-- Panel content goes here -->
        </ui:ScrollView>
    </ui:VisualElement>
</ui:UXML>`,

      list: `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:Style src="${name}.uss" />
    
    <ui:VisualElement name="${name.toLowerCase()}-list" class="list-container">
        <ui:TextField name="search-field" class="list-search" />
        <ui:ScrollView name="list-scroll-view" class="list-content">
            <ui:VisualElement name="list-items" class="list-items-container">
                <!-- List items will be dynamically added here -->
            </ui:VisualElement>
        </ui:ScrollView>
    </ui:VisualElement>
</ui:UXML>`,

      form: `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:Style src="${name}.uss" />
    
    <ui:VisualElement name="${name.toLowerCase()}-form" class="form-container">
        <ui:Label text="Form Title" class="form-title" />
        
        <ui:VisualElement class="form-field">
            <ui:Label text="Field Label" class="field-label" />
            <ui:TextField name="text-field" class="field-input" />
        </ui:VisualElement>
        
        <ui:VisualElement class="form-field">
            <ui:Label text="Toggle Option" class="field-label" />
            <ui:Toggle name="toggle-field" class="field-toggle" />
        </ui:VisualElement>
        
        <ui:VisualElement class="form-actions">
            <ui:Button text="Submit" name="submit-button" class="button primary-button" />
            <ui:Button text="Cancel" name="cancel-button" class="button secondary-button" />
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>`,

      card: `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:Style src="${name}.uss" />
    
    <ui:VisualElement name="${name.toLowerCase()}-card" class="card-container">
        <ui:VisualElement class="card-image" />
        <ui:VisualElement class="card-content">
            <ui:Label text="Card Title" class="card-title" />
            <ui:Label text="Card description goes here" class="card-description" />
        </ui:VisualElement>
        <ui:VisualElement class="card-actions">
            <ui:Button text="Action" name="action-button" class="card-button" />
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>`,

      modal: `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:Style src="${name}.uss" />
    
    <ui:VisualElement name="${name.toLowerCase()}-modal" class="modal-overlay">
        <ui:VisualElement class="modal-container">
            <ui:VisualElement class="modal-header">
                <ui:Label text="Modal Title" class="modal-title" />
                <ui:Button text="×" name="close-button" class="modal-close" />
            </ui:VisualElement>
            <ui:VisualElement class="modal-content">
                <!-- Modal content goes here -->
            </ui:VisualElement>
            <ui:VisualElement class="modal-footer">
                <ui:Button text="Confirm" name="confirm-button" class="button primary-button" />
                <ui:Button text="Cancel" name="cancel-button" class="button secondary-button" />
            </ui:VisualElement>
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>`
    };

    return templates[componentType] || templates.panel;
  }

  private generateComponentUSS(name: string, componentType: string): string {
    const baseStyles = `/* ${name} Component Styles */

`;

    const componentStyles: Record<string, string> = {
      button: `.custom-button {
    background-color: #2196F3;
    border-radius: 4px;
    border-width: 0;
    color: white;
    padding: 12px 24px;
    font-size: 14px;
    flex-direction: row;
    align-items: center;
    transition-duration: 0.2s;
}

.custom-button:hover {
    background-color: #1976D2;
    scale: 1.05;
}

.custom-button:active {
    scale: 0.95;
}

.button-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    background-image: url('project://database/Assets/UI/Icons/button-icon.png');
}

.button-label {
    -unity-font-style: bold;
}`,

      panel: `.panel-container {
    background-color: rgba(30, 30, 30, 0.95);
    border-radius: 8px;
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.1);
    min-width: 300px;
    min-height: 200px;
}

.panel-header {
    background-color: rgba(255, 255, 255, 0.05);
    padding: 12px 16px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}

.panel-title {
    font-size: 16px;
    -unity-font-style: bold;
    color: white;
}

.panel-close-button {
    width: 24px;
    height: 24px;
    font-size: 18px;
    background-color: transparent;
    border-width: 0;
    color: rgba(255, 255, 255, 0.6);
}

.panel-close-button:hover {
    color: white;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

.panel-content {
    flex-grow: 1;
    padding: 16px;
}`,

      list: `.list-container {
    background-color: rgba(30, 30, 30, 0.95);
    border-radius: 8px;
    padding: 16px;
    min-height: 300px;
}

.list-search {
    margin-bottom: 12px;
    padding: 8px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.1);
}

.list-content {
    flex-grow: 1;
}

.list-items-container {
    padding: 4px;
}

.list-item {
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 8px;
    transition-duration: 0.2s;
}

.list-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.list-item.selected {
    background-color: rgba(33, 150, 243, 0.3);
    border-width: 1px;
    border-color: #2196F3;
}`,

      form: `.form-container {
    background-color: rgba(30, 30, 30, 0.95);
    border-radius: 8px;
    padding: 24px;
    min-width: 400px;
}

.form-title {
    font-size: 20px;
    -unity-font-style: bold;
    margin-bottom: 20px;
    color: white;
}

.form-field {
    margin-bottom: 16px;
}

.field-label {
    font-size: 14px;
    margin-bottom: 6px;
    color: rgba(255, 255, 255, 0.8);
}

.field-input {
    padding: 8px 12px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
}

.field-input:focus {
    border-color: #2196F3;
    background-color: rgba(255, 255, 255, 0.08);
}

.field-toggle {
    margin-top: 4px;
}

.form-actions {
    margin-top: 24px;
    flex-direction: row;
    justify-content: flex-end;
}

.form-actions > .button {
    margin-left: 8px;
}`,

      card: `.card-container {
    background-color: rgba(30, 30, 30, 0.95);
    border-radius: 8px;
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.1);
    overflow: hidden;
    width: 300px;
    transition-duration: 0.2s;
}

.card-container:hover {
    border-color: rgba(255, 255, 255, 0.2);
    translate: 0 -2px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-image {
    height: 150px;
    background-color: rgba(255, 255, 255, 0.05);
    background-image: url('project://database/Assets/UI/Images/placeholder.png');
    -unity-background-scale-mode: scale-and-crop;
}

.card-content {
    padding: 16px;
}

.card-title {
    font-size: 18px;
    -unity-font-style: bold;
    margin-bottom: 8px;
    color: white;
}

.card-description {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 12px;
}

.card-actions {
    padding: 0 16px 16px 16px;
    flex-direction: row;
    justify-content: flex-end;
}

.card-button {
    background-color: transparent;
    border-width: 1px;
    border-color: #2196F3;
    color: #2196F3;
    padding: 6px 16px;
    border-radius: 4px;
}

.card-button:hover {
    background-color: #2196F3;
    color: white;
}`,

      modal: `.modal-overlay {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    align-items: center;
    justify-content: center;
}

.modal-container {
    background-color: #1E1E1E;
    border-radius: 8px;
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.2);
    min-width: 400px;
    max-width: 600px;
    max-height: 80%;
}

.modal-header {
    background-color: rgba(255, 255, 255, 0.05);
    padding: 16px 20px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}

.modal-title {
    font-size: 18px;
    -unity-font-style: bold;
    color: white;
}

.modal-close {
    width: 32px;
    height: 32px;
    font-size: 24px;
    background-color: transparent;
    border-width: 0;
    color: rgba(255, 255, 255, 0.6);
    border-radius: 4px;
}

.modal-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
}

.modal-content {
    padding: 20px;
    max-height: 400px;
}

.modal-footer {
    padding: 16px 20px;
    flex-direction: row;
    justify-content: flex-end;
    background-color: rgba(255, 255, 255, 0.02);
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
}

.modal-footer > .button {
    margin-left: 8px;
}`
    };

    return baseStyles + (componentStyles[componentType] || componentStyles.panel);
  }

  private generateComponentController(name: string, componentType: string): string {
    return `using UnityEngine;
using UnityEngine.UIElements;

namespace UI.Components
{
    public class ${name} : MonoBehaviour
    {
        private UIDocument uiDocument;
        private VisualElement root;
        
        void OnEnable()
        {
            uiDocument = GetComponent<UIDocument>();
            if (uiDocument == null)
            {
                Debug.LogError($"UIDocument component not found on {gameObject.name}");
                return;
            }
            
            root = uiDocument.rootVisualElement;
            SetupUI();
        }
        
        void SetupUI()
        {
            // Setup UI element references
            ${this.generateControllerSetup(componentType)}
        }
        
        void OnDisable()
        {
            // Cleanup event handlers
            ${this.generateControllerCleanup(componentType)}
        }
    }
}`;
  }

  private generateControllerSetup(componentType: string): string {
    const setups: Record<string, string> = {
      button: `var button = root.Q<Button>("${componentType}-button");
            if (button != null)
            {
                button.clicked += OnButtonClicked;
            }`,
      
      panel: `var closeButton = root.Q<Button>("close-button");
            if (closeButton != null)
            {
                closeButton.clicked += OnCloseClicked;
            }`,
      
      list: `var searchField = root.Q<TextField>("search-field");
            if (searchField != null)
            {
                searchField.RegisterValueChangedCallback(OnSearchChanged);
            }`,
      
      form: `var submitButton = root.Q<Button>("submit-button");
            var cancelButton = root.Q<Button>("cancel-button");
            
            if (submitButton != null)
                submitButton.clicked += OnSubmitClicked;
                
            if (cancelButton != null)
                cancelButton.clicked += OnCancelClicked;`,
      
      card: `var actionButton = root.Q<Button>("action-button");
            if (actionButton != null)
            {
                actionButton.clicked += OnActionClicked;
            }`,
      
      modal: `var confirmButton = root.Q<Button>("confirm-button");
            var cancelButton = root.Q<Button>("cancel-button");
            var closeButton = root.Q<Button>("close-button");
            
            if (confirmButton != null)
                confirmButton.clicked += OnConfirmClicked;
                
            if (cancelButton != null)
                cancelButton.clicked += OnCancelClicked;
                
            if (closeButton != null)
                closeButton.clicked += OnCloseClicked;`
    };

    return setups[componentType] || '';
  }

  private generateControllerCleanup(componentType: string): string {
    const cleanups: Record<string, string> = {
      button: `var button = root.Q<Button>("${componentType}-button");
            if (button != null)
            {
                button.clicked -= OnButtonClicked;
            }`,
      
      panel: `var closeButton = root.Q<Button>("close-button");
            if (closeButton != null)
            {
                closeButton.clicked -= OnCloseClicked;
            }`,
      
      list: `var searchField = root.Q<TextField>("search-field");
            if (searchField != null)
            {
                searchField.UnregisterValueChangedCallback(OnSearchChanged);
            }`,
      
      form: `var submitButton = root.Q<Button>("submit-button");
            var cancelButton = root.Q<Button>("cancel-button");
            
            if (submitButton != null)
                submitButton.clicked -= OnSubmitClicked;
                
            if (cancelButton != null)
                cancelButton.clicked -= OnCancelClicked;`,
      
      card: `var actionButton = root.Q<Button>("action-button");
            if (actionButton != null)
            {
                actionButton.clicked -= OnActionClicked;
            }`,
      
      modal: `var confirmButton = root.Q<Button>("confirm-button");
            var cancelButton = root.Q<Button>("cancel-button");
            var closeButton = root.Q<Button>("close-button");
            
            if (confirmButton != null)
                confirmButton.clicked -= OnConfirmClicked;
                
            if (cancelButton != null)
                cancelButton.clicked -= OnCancelClicked;
                
            if (closeButton != null)
                closeButton.clicked -= OnCloseClicked;`
    };

    return cleanups[componentType] || '';
  }

  private async findUIFile(fileName: string, extension: 'uxml' | 'uss'): Promise<string | null> {
    if (!fileName.endsWith(`.${extension}`)) {
      fileName = `${fileName}.${extension}`;
    }

    const searchPaths = [
      path.join(this.unityProject!.projectPath, 'Assets', 'UI'),
      path.join(this.unityProject!.projectPath, 'Assets', 'UI', 'Styles'),
      path.join(this.unityProject!.projectPath, 'Assets', 'UI', 'Components'),
      path.join(this.unityProject!.projectPath, 'Assets'),
    ];

    for (const searchPath of searchPaths) {
      const files: string[] = [];
      await this.findUIFilesRecursive(searchPath, extension, files);
      
      const found = files.find(f => f.endsWith(fileName));
      if (found) {
        return found;
      }
    }

    return null;
  }

  private async findUIFilesRecursive(dir: string, extension: string, results: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await this.findUIFilesRecursive(fullPath, extension, results);
        } else if (entry.isFile() && entry.name.endsWith(`.${extension}`)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      this.logger.debug(`Could not read directory: ${dir}`);
    }
  }

  private generateUIMetaFile(type: 'uxml' | 'uss', guid?: string): string {
    const actualGuid = guid || generateGuid();
    
    if (type === 'uxml') {
      return `fileFormatVersion: 2
guid: ${actualGuid}
ScriptedImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 2
  userData: 
  assetBundleName: 
  assetBundleVariant: 
  script: {fileID: 13804, guid: 0000000000000000e000000000000000, type: 0}`;
    } else {
      return `fileFormatVersion: 2
guid: ${actualGuid}
ScriptedImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 2
  userData: 
  assetBundleName: 
  assetBundleVariant: 
  script: {fileID: 12385, guid: 0000000000000000e000000000000000, type: 0}`;
    }
  }

  private generateScriptMetaFile(): string {
    return `fileFormatVersion: 2
guid: ${generateGuid()}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: `;
  }
}