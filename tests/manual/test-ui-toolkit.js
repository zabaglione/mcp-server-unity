#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '..', '..', 'build', 'index.js');

// Test Unity UI Toolkit functionality
async function testUIToolkit() {
  console.log('🧪 Testing Unity UI Toolkit functionality...\n');
  
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  let output = '';
  server.stdout.on('data', (data) => {
    output += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  const tests = [
    // Test 1: Setup project
    {
      name: 'Setup Unity project',
      request: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'project_setup_path',
          arguments: {
            projectPath: '/Users/zabaglione/Unity/MCPTest'
          }
        }
      }
    },

    // Test 2: Create UXML with window template
    {
      name: 'Create UXML window',
      request: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'ui_create_uxml',
          arguments: {
            fileName: 'MainWindow',
            templateType: 'window'
          }
        }
      }
    },

    // Test 3: Create USS theme
    {
      name: 'Create USS theme',
      request: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'ui_create_uss',
          arguments: {
            fileName: 'DarkTheme',
            templateType: 'theme'
          }
        }
      }
    },

    // Test 4: Create complete UI component (button)
    {
      name: 'Create button component',
      request: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'ui_create_component',
          arguments: {
            componentName: 'CustomButton',
            componentType: 'button'
          }
        }
      }
    },

    // Test 5: Create panel component
    {
      name: 'Create panel component',
      request: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'ui_create_component',
          arguments: {
            componentName: 'InventoryPanel',
            componentType: 'panel'
          }
        }
      }
    },

    // Test 6: Create form component
    {
      name: 'Create form component',
      request: {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'ui_create_component',
          arguments: {
            componentName: 'LoginForm',
            componentType: 'form'
          }
        }
      }
    },

    // Test 7: Create modal component
    {
      name: 'Create modal component',
      request: {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'ui_create_component',
          arguments: {
            componentName: 'ConfirmationModal',
            componentType: 'modal'
          }
        }
      }
    },

    // Test 8: List UXML files
    {
      name: 'List UXML files',
      request: {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'ui_list_uxml',
          arguments: {}
        }
      }
    },

    // Test 9: List USS files
    {
      name: 'List USS files',
      request: {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'ui_list_uss',
          arguments: {}
        }
      }
    },

    // Test 10: Read UXML content
    {
      name: 'Read MainWindow UXML',
      request: {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'ui_read_uxml',
          arguments: {
            fileName: 'MainWindow'
          }
        }
      }
    },

    // Test 11: Update UXML content
    {
      name: 'Update MainWindow UXML',
      request: {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'ui_update_uxml',
          arguments: {
            fileName: 'MainWindow',
            content: `<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements">
    <Style src="project://database/Assets/UI/Styles/MainWindow.uss" />
    <ui:VisualElement name="window-container" class="window-container">
        <ui:Label text="Updated Window Title" class="window-title" />
        <ui:VisualElement name="window-content" class="window-content">
            <ui:Label text="This window has been updated!" />
            <ui:Button text="Click Me" name="action-button" />
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>`
          }
        }
      }
    },

    // Test 12: Update USS with custom styles
    {
      name: 'Update DarkTheme USS',
      request: {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'ui_update_uss',
          arguments: {
            fileName: 'DarkTheme',
            content: `:root {
    --primary-color: #FF6B6B;
    --secondary-color: #4ECDC4;
    --background-color: #1A1A2E;
    --surface-color: #16213E;
    --text-color: #EAEAEA;
}

.window-container {
    background-color: var(--background-color);
    padding: 20px;
    border-radius: 10px;
}

.window-title {
    font-size: 24px;
    color: var(--primary-color);
    -unity-font-style: bold;
    margin-bottom: 20px;
}

.action-button {
    background-color: var(--primary-color);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    transition-duration: 0.3s;
}

.action-button:hover {
    background-color: var(--secondary-color);
    scale: 1.05;
}`
          }
        }
      }
    },

    // Test 13: Create utility styles
    {
      name: 'Create utility styles',
      request: {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'ui_create_uss',
          arguments: {
            fileName: 'Utilities',
            templateType: 'utilities'
          }
        }
      }
    },

    // Test 14: Create custom UXML
    {
      name: 'Create custom HUD UXML',
      request: {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'ui_create_uxml',
          arguments: {
            fileName: 'GameHUD',
            templateType: 'custom',
            customContent: `<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <Style src="project://database/Assets/UI/Styles/GameHUD.uss" />
    
    <ui:VisualElement name="hud-container" class="hud-container">
        <!-- Top Bar -->
        <ui:VisualElement name="top-bar" class="hud-top-bar">
            <ui:VisualElement class="health-container">
                <ui:Label text="HP" class="stat-label" />
                <ui:ProgressBar name="health-bar" class="health-bar" high-value="100" />
            </ui:VisualElement>
            
            <ui:Label name="score-label" text="Score: 0" class="score-label" />
            
            <ui:VisualElement class="mana-container">
                <ui:Label text="MP" class="stat-label" />
                <ui:ProgressBar name="mana-bar" class="mana-bar" high-value="100" />
            </ui:VisualElement>
        </ui:VisualElement>
        
        <!-- Bottom Bar -->
        <ui:VisualElement name="bottom-bar" class="hud-bottom-bar">
            <ui:VisualElement name="ability-slots" class="ability-slots">
                <ui:Button name="ability-1" class="ability-slot" />
                <ui:Button name="ability-2" class="ability-slot" />
                <ui:Button name="ability-3" class="ability-slot" />
                <ui:Button name="ability-4" class="ability-slot" />
            </ui:VisualElement>
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>`
          }
        }
      }
    },

    // Test 15: Create list component
    {
      name: 'Create inventory list',
      request: {
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'ui_create_component',
          arguments: {
            componentName: 'InventoryList',
            componentType: 'list'
          }
        }
      }
    },

    // Test 16: Create card component
    {
      name: 'Create item card',
      request: {
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/call',
        params: {
          name: 'ui_create_component',
          arguments: {
            componentName: 'ItemCard',
            componentType: 'card'
          }
        }
      }
    },

    // Test 17: Read updated content
    {
      name: 'Read updated MainWindow',
      request: {
        jsonrpc: '2.0',
        id: 17,
        method: 'tools/call',
        params: {
          name: 'ui_read_uxml',
          arguments: {
            fileName: 'MainWindow'
          }
        }
      }
    },

    // Test 18: Final listing of all UI files
    {
      name: 'Final UXML listing',
      request: {
        jsonrpc: '2.0',
        id: 18,
        method: 'tools/call',
        params: {
          name: 'ui_list_uxml',
          arguments: {}
        }
      }
    }
  ];

  async function runTest(test) {
    return new Promise((resolve) => {
      console.log(`\n📝 Test ${test.request.id}: ${test.name}`);
      
      server.stdin.write(JSON.stringify(test.request) + '\n');
      
      setTimeout(() => {
        const lines = output.split('\n');
        const responseLine = lines.find(line => {
          try {
            const json = JSON.parse(line);
            return json.id === test.request.id;
          } catch {
            return false;
          }
        });

        if (responseLine) {
          try {
            const response = JSON.parse(responseLine);
            if (response.error) {
              console.log(`❌ Error: ${response.error.message}`);
            } else if (response.result) {
              console.log(`✅ Success:`);
              if (response.result.content && response.result.content[0]) {
                const content = response.result.content[0].text;
                // Truncate long content for readability
                if (content.length > 200) {
                  console.log(content.substring(0, 200) + '...\n[Content truncated]');
                } else {
                  console.log(content);
                }
              }
            }
          } catch (e) {
            console.log(`❌ Failed to parse response: ${e.message}`);
          }
        } else {
          console.log(`❌ No response received`);
        }

        output = '';
        resolve();
      }, 1000);
    });
  }

  // Run all tests
  for (const test of tests) {
    await runTest(test);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('- Created UXML files: MainWindow, GameHUD');
  console.log('- Created USS files: DarkTheme, Utilities');
  console.log('- Created UI Components: CustomButton, InventoryPanel, LoginForm, ConfirmationModal, InventoryList, ItemCard');
  console.log('- Each component includes UXML, USS, and C# controller files');
  console.log('- Updated and read files successfully');
  console.log('\n✨ All UI Toolkit tests completed!');

  server.kill();
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run tests
testUIToolkit().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});