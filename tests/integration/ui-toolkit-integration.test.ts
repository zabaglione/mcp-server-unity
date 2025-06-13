import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnityMCPServer } from '../../src/index.js';
import { ConsoleLogger } from '../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Integration Tests: UI Toolkit', () => {
  let server: any;
  let tempDir: string;
  let projectPath: string;
  let mockLogger: ConsoleLogger;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `unity-mcp-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create mock Unity project structure
    projectPath = path.join(tempDir, 'TestProject');
    fs.mkdirSync(path.join(projectPath, 'Assets', 'Scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'ProjectSettings'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Packages'), { recursive: true });
    
    // Create manifest.json for URP
    const manifest = {
      dependencies: {
        "com.unity.render-pipelines.universal": "12.1.13"
      }
    };
    fs.writeFileSync(
      path.join(projectPath, 'Packages', 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    
    // Initialize server
    server = new UnityMCPServer(mockLogger);
    
    // Setup project
    await server.services.projectService.setProject(projectPath);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Complete UI Development Workflow', () => {
    it('should create a complete game HUD with multiple components', async () => {
      // Step 1: Create main HUD layout
      const hudResult = await server.services.uiToolkitService.createUXML('GameHUD', 'document');
      expect(hudResult.content[0].text).toContain('created successfully');

      // Step 2: Create theme
      const themeResult = await server.services.uiToolkitService.createUSS('GameTheme', 'theme');
      expect(themeResult.content[0].text).toContain('created successfully');

      // Step 3: Create HUD components
      const components = ['HealthBar', 'ManaBar', 'ScoreDisplay', 'MiniMap'];
      for (const component of components) {
        const result = await server.services.uiToolkitService.createUIComponent(component, 'panel');
        expect(result.content[0].text).toContain('created successfully');
      }

      // Step 4: Create ability buttons
      for (let i = 1; i <= 4; i++) {
        const result = await server.services.uiToolkitService.createUIComponent(`AbilityButton${i}`, 'button');
        expect(result.content[0].text).toContain('created successfully');
      }

      // Step 5: Update HUD with component references
      const hudContent = `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <Style src="project://database/Assets/UI/Styles/GameTheme.uss" />
    
    <ui:VisualElement name="hud-container" class="hud-container">
        <!-- Top HUD -->
        <ui:VisualElement name="top-hud" class="top-hud">
            <ui:Instance template="HealthBar" name="health-bar" />
            <ui:Instance template="ScoreDisplay" name="score-display" />
            <ui:Instance template="ManaBar" name="mana-bar" />
        </ui:VisualElement>
        
        <!-- Bottom HUD -->
        <ui:VisualElement name="bottom-hud" class="bottom-hud">
            <ui:Instance template="AbilityButton1" name="ability-1" />
            <ui:Instance template="AbilityButton2" name="ability-2" />
            <ui:Instance template="AbilityButton3" name="ability-3" />
            <ui:Instance template="AbilityButton4" name="ability-4" />
        </ui:VisualElement>
        
        <!-- Corner Elements -->
        <ui:Instance template="MiniMap" name="mini-map" class="mini-map-position" />
    </ui:VisualElement>
</ui:UXML>`;

      const updateResult = await server.services.uiToolkitService.updateUXML('GameHUD', hudContent);
      expect(updateResult.content[0].text).toContain('updated successfully');

      // Step 6: Verify all files created
      const listResult = await server.services.uiToolkitService.listUXMLFiles();
      const files = listResult.content[0].text.split('\n');
      
      expect(files).toContain('Assets/UI/GameHUD.uxml');
      components.forEach(component => {
        expect(files.join('\n')).toContain(`${component}.uxml`);
      });

      // Verify file structure
      const hudPath = path.join(projectPath, 'Assets', 'UI', 'GameHUD.uxml');
      expect(fs.existsSync(hudPath)).toBe(true);
      
      const hudContentOnDisk = fs.readFileSync(hudPath, 'utf-8');
      expect(hudContentOnDisk).toContain('health-bar');
      expect(hudContentOnDisk).toContain('mini-map');
    });

    it('should create an inventory system with list components', async () => {
      // Step 1: Create inventory panel
      const panelResult = await server.services.uiToolkitService.createUIComponent('InventoryPanel', 'panel');
      expect(panelResult.content[0].text).toContain('created successfully');

      // Step 2: Create item slot component
      const slotResult = await server.services.uiToolkitService.createUIComponent('ItemSlot', 'button');
      expect(slotResult.content[0].text).toContain('created successfully');

      // Step 3: Create item list
      const listResult = await server.services.uiToolkitService.createUIComponent('ItemList', 'list');
      expect(listResult.content[0].text).toContain('created successfully');

      // Step 4: Create item tooltip
      const tooltipResult = await server.services.uiToolkitService.createUIComponent('ItemTooltip', 'card');
      expect(tooltipResult.content[0].text).toContain('created successfully');

      // Step 5: Create inventory styles
      const inventoryStyles = `:root {
    --inventory-bg: rgba(20, 20, 20, 0.95);
    --slot-size: 64px;
    --slot-spacing: 8px;
}

.inventory-grid {
    display: flex;
    flex-wrap: wrap;
    padding: var(--slot-spacing);
    background-color: var(--inventory-bg);
    border-radius: 8px;
}

.item-slot {
    width: var(--slot-size);
    height: var(--slot-size);
    margin: calc(var(--slot-spacing) / 2);
    background-color: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    transition: all 0.2s;
}

.item-slot:hover {
    border-color: #FFD700;
    background-color: rgba(255, 215, 0, 0.1);
}

.item-slot.occupied {
    border-color: #4CAF50;
}

.item-tooltip {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.9);
    border: 1px solid #FFD700;
    border-radius: 4px;
    padding: 12px;
    pointer-events: none;
}`;

      const styleResult = await server.services.uiToolkitService.createUSS('InventoryStyles', 'custom', inventoryStyles);
      expect(styleResult.content[0].text).toContain('created successfully');

      // Verify integration
      const componentsPath = path.join(projectPath, 'Assets', 'UI', 'Components');
      expect(fs.existsSync(path.join(componentsPath, 'InventoryPanel'))).toBe(true);
      expect(fs.existsSync(path.join(componentsPath, 'ItemSlot'))).toBe(true);
      expect(fs.existsSync(path.join(componentsPath, 'ItemList'))).toBe(true);
      expect(fs.existsSync(path.join(componentsPath, 'ItemTooltip'))).toBe(true);
    });

    it('should create a settings menu with forms and modals', async () => {
      // Step 1: Create settings form
      const formResult = await server.services.uiToolkitService.createUIComponent('SettingsForm', 'form');
      expect(formResult.content[0].text).toContain('created successfully');

      // Step 2: Create confirmation modal
      const modalResult = await server.services.uiToolkitService.createUIComponent('ConfirmResetModal', 'modal');
      expect(modalResult.content[0].text).toContain('created successfully');

      // Step 3: Create tab components
      const tabs = ['GraphicsTab', 'AudioTab', 'ControlsTab', 'GameplayTab'];
      for (const tab of tabs) {
        const result = await server.services.uiToolkitService.createUIComponent(tab, 'panel');
        expect(result.content[0].text).toContain('created successfully');
      }

      // Step 4: Create main settings window
      const settingsWindow = `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <Style src="project://database/Assets/UI/Styles/SettingsStyles.uss" />
    
    <ui:VisualElement name="settings-window" class="window-container">
        <ui:Label text="Settings" class="window-title" />
        
        <ui:VisualElement name="tab-container" class="tab-container">
            <ui:Button text="Graphics" name="graphics-tab-btn" class="tab-button active" />
            <ui:Button text="Audio" name="audio-tab-btn" class="tab-button" />
            <ui:Button text="Controls" name="controls-tab-btn" class="tab-button" />
            <ui:Button text="Gameplay" name="gameplay-tab-btn" class="tab-button" />
        </ui:VisualElement>
        
        <ui:VisualElement name="content-container" class="content-container">
            <ui:Instance template="GraphicsTab" name="graphics-content" />
            <ui:Instance template="AudioTab" name="audio-content" style="display: none;" />
            <ui:Instance template="ControlsTab" name="controls-content" style="display: none;" />
            <ui:Instance template="GameplayTab" name="gameplay-content" style="display: none;" />
        </ui:VisualElement>
        
        <ui:VisualElement name="button-container" class="button-container">
            <ui:Button text="Apply" name="apply-button" class="button primary" />
            <ui:Button text="Reset" name="reset-button" class="button secondary" />
            <ui:Button text="Cancel" name="cancel-button" class="button secondary" />
        </ui:VisualElement>
    </ui:VisualElement>
    
    <!-- Modal overlay -->
    <ui:Instance template="ConfirmResetModal" name="confirm-modal" style="display: none;" />
</ui:UXML>`;

      const windowResult = await server.services.uiToolkitService.createUXML('SettingsWindow', 'custom', settingsWindow);
      expect(windowResult.content[0].text).toContain('created successfully');

      // Step 5: Create settings styles
      const settingsStyles = await server.services.uiToolkitService.createUSS('SettingsStyles', 'theme');
      expect(settingsStyles.content[0].text).toContain('created successfully');

      // Verify complete structure
      const settingsPath = path.join(projectPath, 'Assets', 'UI', 'SettingsWindow.uxml');
      const content = fs.readFileSync(settingsPath, 'utf-8');
      expect(content).toContain('graphics-tab-btn');
      expect(content).toContain('ConfirmResetModal');
    });
  });

  describe('Theme System Integration', () => {
    it('should create and apply multiple themes', async () => {
      // Create base theme with CSS variables
      const baseTheme = `:root {
    --primary-color: #2196F3;
    --secondary-color: #FFC107;
    --background-color: #121212;
    --surface-color: #1E1E1E;
    --text-color: #FFFFFF;
    --text-secondary: #B0B0B0;
    --error-color: #F44336;
    --success-color: #4CAF50;
}`;

      await server.services.uiToolkitService.createUSS('BaseTheme', 'custom', baseTheme);

      // Create light theme
      const lightTheme = `@import url("BaseTheme.uss");

:root {
    --background-color: #FFFFFF;
    --surface-color: #F5F5F5;
    --text-color: #212121;
    --text-secondary: #757575;
}

.light-theme .button {
    background-color: var(--surface-color);
    color: var(--text-color);
}`;

      await server.services.uiToolkitService.createUSS('LightTheme', 'custom', lightTheme);

      // Create dark theme
      const darkTheme = `@import url("BaseTheme.uss");

:root {
    --background-color: #000000;
    --surface-color: #121212;
    --text-color: #E0E0E0;
    --text-secondary: #9E9E9E;
}

.dark-theme .button {
    background-color: var(--surface-color);
    color: var(--text-color);
}`;

      await server.services.uiToolkitService.createUSS('DarkTheme', 'custom', darkTheme);

      // Create themed component
      const themedComponent = `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <Style src="project://database/Assets/UI/Styles/LightTheme.uss" />
    
    <ui:VisualElement name="app-root" class="light-theme">
        <ui:Label text="Themed Application" />
        <ui:Button text="Switch Theme" name="theme-toggle" />
    </ui:VisualElement>
</ui:UXML>`;

      await server.services.uiToolkitService.createUXML('ThemedApp', 'custom', themedComponent);

      // Verify theme files
      const stylesList = await server.services.uiToolkitService.listUSSFiles();
      expect(stylesList.content[0].text).toContain('BaseTheme.uss');
      expect(stylesList.content[0].text).toContain('LightTheme.uss');
      expect(stylesList.content[0].text).toContain('DarkTheme.uss');
    });
  });

  describe('Component Library Creation', () => {
    it('should create a reusable component library', async () => {
      // Define component library structure
      const componentLibrary = [
        { name: 'PrimaryButton', type: 'button' },
        { name: 'SecondaryButton', type: 'button' },
        { name: 'IconButton', type: 'button' },
        { name: 'TextField', type: 'form' },
        { name: 'Dropdown', type: 'list' },
        { name: 'Checkbox', type: 'form' },
        { name: 'RadioButton', type: 'form' },
        { name: 'Slider', type: 'form' },
        { name: 'ProgressBar', type: 'panel' },
        { name: 'Toast', type: 'card' },
        { name: 'Dialog', type: 'modal' },
        { name: 'Tabs', type: 'panel' },
      ];

      // Create all components
      for (const component of componentLibrary) {
        const result = await server.services.uiToolkitService.createUIComponent(
          component.name,
          component.type as any
        );
        expect(result.content[0].text).toContain('created successfully');
      }

      // Create component library showcase
      const showcase = `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <Style src="project://database/Assets/UI/Styles/ComponentLibrary.uss" />
    
    <ui:ScrollView name="component-showcase">
        <ui:Label text="Component Library" class="showcase-title" />
        
        <!-- Buttons -->
        <ui:VisualElement class="component-section">
            <ui:Label text="Buttons" class="section-title" />
            <ui:Instance template="PrimaryButton" />
            <ui:Instance template="SecondaryButton" />
            <ui:Instance template="IconButton" />
        </ui:VisualElement>
        
        <!-- Form Elements -->
        <ui:VisualElement class="component-section">
            <ui:Label text="Form Elements" class="section-title" />
            <ui:Instance template="TextField" />
            <ui:Instance template="Dropdown" />
            <ui:Instance template="Checkbox" />
            <ui:Instance template="RadioButton" />
            <ui:Instance template="Slider" />
        </ui:VisualElement>
        
        <!-- Feedback -->
        <ui:VisualElement class="component-section">
            <ui:Label text="Feedback" class="section-title" />
            <ui:Instance template="ProgressBar" />
            <ui:Instance template="Toast" />
        </ui:VisualElement>
        
        <!-- Navigation -->
        <ui:VisualElement class="component-section">
            <ui:Label text="Navigation" class="section-title" />
            <ui:Instance template="Tabs" />
        </ui:VisualElement>
    </ui:ScrollView>
</ui:UXML>`;

      await server.services.uiToolkitService.createUXML('ComponentShowcase', 'custom', showcase);

      // Create library styles
      await server.services.uiToolkitService.createUSS('ComponentLibrary', 'utilities');

      // Verify component count
      const componentsList = await server.services.uiToolkitService.listUXMLFiles();
      const componentFiles = componentsList.content[0].text.split('\n').filter(f => f.includes('Components'));
      expect(componentFiles.length).toBeGreaterThanOrEqual(componentLibrary.length);
    });
  });

  describe('Meta File Integration', () => {
    it('should preserve GUIDs across multiple updates', async () => {
      // Create initial file
      await server.services.uiToolkitService.createUXML('GuidTest', 'document');
      
      // Read initial meta file
      const metaPath = path.join(projectPath, 'Assets', 'UI', 'GuidTest.uxml.meta');
      const initialMeta = fs.readFileSync(metaPath, 'utf-8');
      const guidMatch = initialMeta.match(/guid: ([a-f0-9]{32})/);
      expect(guidMatch).toBeTruthy();
      const originalGuid = guidMatch![1];

      // Update file multiple times
      for (let i = 0; i < 5; i++) {
        await server.services.uiToolkitService.updateUXML(
          'GuidTest',
          `<ui:UXML>Update ${i}</ui:UXML>`
        );
        
        // Check GUID is preserved
        const updatedMeta = fs.readFileSync(metaPath, 'utf-8');
        expect(updatedMeta).toContain(`guid: ${originalGuid}`);
      }
    });

    it('should generate unique GUIDs for each file', async () => {
      const guids = new Set<string>();
      
      // Create multiple files
      for (let i = 0; i < 10; i++) {
        await server.services.uiToolkitService.createUXML(`Unique${i}`, 'document');
        
        const metaPath = path.join(projectPath, 'Assets', 'UI', `Unique${i}.uxml.meta`);
        const meta = fs.readFileSync(metaPath, 'utf-8');
        const guidMatch = meta.match(/guid: ([a-f0-9]{32})/);
        
        expect(guidMatch).toBeTruthy();
        guids.add(guidMatch![1]);
      }
      
      // All GUIDs should be unique
      expect(guids.size).toBe(10);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from partial component creation failure', async () => {
      // Simulate partial failure by creating conflicting files
      const componentPath = path.join(projectPath, 'Assets', 'UI', 'Components', 'PartialComponent');
      fs.mkdirSync(componentPath, { recursive: true });
      
      // Create only UXML file
      fs.writeFileSync(
        path.join(componentPath, 'PartialComponent.uxml'),
        '<ui:UXML>Existing</ui:UXML>'
      );
      
      // Try to create complete component
      const result = await server.services.uiToolkitService.createUIComponent('PartialComponent', 'panel');
      
      // Should complete successfully
      expect(result.content[0].text).toContain('created successfully');
      
      // Verify all files exist
      expect(fs.existsSync(path.join(componentPath, 'PartialComponent.uxml'))).toBe(true);
      expect(fs.existsSync(path.join(componentPath, 'PartialComponent.uss'))).toBe(true);
      expect(fs.existsSync(path.join(componentPath, 'PartialComponent.cs'))).toBe(true);
    });
  });
});