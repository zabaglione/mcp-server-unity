# Unity MCP Server - Regression Test Cases

This document outlines test cases for regression testing of the Unity MCP Server. Each test should be performed after making changes to ensure existing functionality remains intact.

## Test Environment Setup

1. **Prerequisites**
   - Node.js 18.x or higher installed
   - Unity 2021.3 LTS or newer installed
   - Claude Desktop configured with MCP server
   - A test Unity project with various assets

2. **Test Project Structure**
   ```
   TestUnityProject/
   ├── Assets/
   │   ├── Scripts/
   │   │   ├── Player/
   │   │   │   └── PlayerController.cs
   │   │   └── GameManager.cs
   │   ├── Materials/
   │   ├── Scenes/
   │   └── Shaders/
   ├── Packages/
   │   └── manifest.json
   └── ProjectSettings/
   ```

## 1. Project Management Tests

### TC-001: Set Valid Unity Project Path
**Steps:**
1. Send: "Set Unity project to /path/to/TestUnityProject"
2. Verify response confirms project was set
3. Check that Scripts folder was created if it didn't exist

**Expected:** Success message with project path confirmation

### TC-002: Set Invalid Unity Project Path
**Steps:**
1. Send: "Set Unity project to /invalid/path"
2. Verify error message

**Expected:** Error indicating path doesn't contain Assets and ProjectSettings

### TC-003: Get Project Information
**Steps:**
1. Set valid project path first
2. Send: "Show project information"
3. Verify Unity version, script count, and asset counts

**Expected:** Detailed project information displayed

## 2. Script Operations Tests

### TC-004: Create New Script
**Steps:**
1. Send: "Create a TestScript with basic MonoBehaviour template"
2. Check file exists at `Assets/Scripts/TestScript.cs`
3. Verify file content includes proper C# syntax

**Expected:** Script created successfully with correct content

### TC-005: Create Script in Subfolder
**Steps:**
1. Send: "Create EnemyAI script in Enemies folder"
2. Check file exists at `Assets/Scripts/Enemies/EnemyAI.cs`
3. Verify folder was created if it didn't exist

**Expected:** Script created in correct subfolder

### TC-006: Read Existing Script
**Steps:**
1. Send: "Show me the PlayerController script"
2. Verify content is displayed correctly

**Expected:** Full script content displayed

### TC-007: Read Non-existent Script
**Steps:**
1. Send: "Read NonExistentScript"
2. Verify appropriate error message

**Expected:** Error indicating script not found

### TC-008: List All Scripts
**Steps:**
1. Send: "List all scripts in the project"
2. Verify all .cs files are listed with relative paths

**Expected:** Complete list of scripts with paths

## 3. Asset Creation Tests

### TC-009: Create Scene
**Steps:**
1. Send: "Create a new scene called TestLevel"
2. Check file exists at `Assets/Scenes/TestLevel.unity`
3. Verify YAML content is valid Unity scene format

**Expected:** Scene created with proper Unity YAML structure

### TC-010: Create Material
**Steps:**
1. Send: "Create a material named TestMaterial"
2. Check file exists at `Assets/Materials/TestMaterial.mat`
3. Verify material uses Standard shader

**Expected:** Material created successfully

### TC-011: Create Built-in Shader
**Steps:**
1. Send: "Create a shader called TestShader"
2. Check file exists at `Assets/Shaders/TestShader.shader`
3. Verify shader syntax is valid

**Expected:** Shader created with correct syntax

### TC-012: Create URP Shader
**Steps:**
1. Send: "Create a URP shader called URPTestShader"
2. Check file exists and contains URP-specific code

**Expected:** URP shader created successfully

### TC-013: Create Shader Graph
**Steps:**
1. Send: "Create a Shader Graph for URP called TestGraph"
2. Check file exists at `Assets/Shaders/TestGraph.shadergraph`
3. Verify JSON structure is valid

**Expected:** Shader Graph asset created

## 4. Package Management Tests

### TC-014: Search Packages
**Steps:**
1. Send: "Search for ProBuilder packages"
2. Verify ProBuilder appears in results
3. Check categories are displayed

**Expected:** Relevant packages listed with descriptions

### TC-015: Install Single Package
**Steps:**
1. Send: "Install TextMeshPro"
2. Check manifest.json updated
3. Verify Unity refresh triggered

**Expected:** Package added to manifest.json

### TC-016: Install Package with Version
**Steps:**
1. Send: "Install Cinemachine version 2.8.9"
2. Check specific version in manifest.json

**Expected:** Package installed with correct version

### TC-017: Install Multiple Packages
**Steps:**
1. Send: "Install ProBuilder, TextMeshPro, and Addressables"
2. Check all packages added to manifest.json
3. Verify single refresh triggered

**Expected:** All packages installed with one refresh

### TC-018: Remove Package
**Steps:**
1. Send: "Remove ProBuilder"
2. Check package removed from manifest.json
3. Verify Unity refresh triggered

**Expected:** Package removed successfully

### TC-019: List Installed Packages
**Steps:**
1. Send: "Show installed packages"
2. Verify all packages in manifest.json are listed
3. Check categorization is correct

**Expected:** Complete package list with categories

## 5. Editor Extension Tests

### TC-020: Create Editor Window
**Steps:**
1. Send: "Create a custom editor window called TestWindow"
2. Check file in `Assets/Editor/TestWindow.cs`
3. Verify EditorWindow class structure

**Expected:** Editor window script created

### TC-021: Create Custom Inspector
**Steps:**
1. Send: "Create custom inspector for PlayerController"
2. Check CustomEditor attribute targets correct class

**Expected:** Custom editor created for target class

### TC-022: Create Property Drawer
**Steps:**
1. Send: "Create property drawer for RangeAttribute"
2. Verify PropertyDrawer implementation

**Expected:** Property drawer created correctly

## 6. ProBuilder Tests

### TC-023: Create ProBuilder Script
**Steps:**
1. Send: "Create a ProBuilder shape generator"
2. Check ProBuilder using statements
3. Verify mesh creation code

**Expected:** ProBuilder script with shape generation

### TC-024: Create ProBuilder Prefab
**Steps:**
1. Send: "Create a ProBuilder cube prefab"
2. Check prefab file created
3. Verify ProBuilderMesh component

**Expected:** Prefab with ProBuilder mesh

## 7. Build Operations Tests

### TC-025: Build for Windows
**Steps:**
1. Send: "Build project for Windows to /path/to/builds"
2. Monitor build process
3. Check output directory

**Expected:** Build completes or appropriate error

### TC-026: Build for Invalid Platform
**Steps:**
1. Send: "Build for PlayStation5"
2. Verify error message

**Expected:** Error indicating unsupported platform

## 8. System Operations Tests

### TC-027: Setup Unity Refresh
**Steps:**
1. Send: "Setup Unity refresh"
2. Check UnityRefreshHandler.cs created in Editor folder
3. Verify FileSystemWatcher setup

**Expected:** Refresh handler installed

### TC-028: Manual Unity Refresh
**Steps:**
1. Send: "Refresh Unity"
2. Check .refresh file created and deleted
3. Verify no errors

**Expected:** Refresh triggered successfully

### TC-029: Batch Operations
**Steps:**
1. Send: "Start batch operations"
2. Create multiple scripts
3. Send: "End batch operations"
4. Verify single refresh triggered

**Expected:** All operations complete with one refresh

## 9. Error Handling Tests

### TC-030: Operations Without Project Set
**Steps:**
1. Restart MCP server
2. Try to create a script without setting project
3. Verify error message

**Expected:** Clear error about project not being set

### TC-031: Invalid Tool Parameters
**Steps:**
1. Send commands with missing required parameters
2. Verify appropriate error messages

**Expected:** Parameter validation errors

### TC-032: File Permission Issues
**Steps:**
1. Set read-only permissions on a folder
2. Try to create assets in that folder
3. Verify error handling

**Expected:** Permission error handled gracefully

## 10. Integration Tests

### TC-033: Full Workflow Test
**Steps:**
1. Set project path
2. Create multiple scripts in different folders
3. Install several packages
4. Create various asset types
5. List all assets
6. Build project

**Expected:** All operations complete successfully

### TC-034: Natural Language Understanding
**Steps:**
1. Test various phrasings:
   - "Make a new script called Test"
   - "I need a PlayerHealth script"
   - "Can you create a shader for water?"
2. Verify correct tool invocation

**Expected:** Natural language correctly interpreted

## Test Execution Checklist

- [ ] All test cases pass on Windows
- [ ] All test cases pass on macOS
- [ ] All test cases pass on Linux
- [ ] No memory leaks observed
- [ ] No orphaned processes
- [ ] Error messages are helpful
- [ ] Performance is acceptable

## Automated Testing

Consider implementing automated tests using:
- Jest for unit tests
- Integration test scripts
- Mock Unity project structure
- CI/CD pipeline validation

## Reporting Issues

When a test fails:
1. Document the exact steps
2. Include error messages
3. Note environment details
4. Check if it's reproducible
5. Create GitHub issue with test case reference