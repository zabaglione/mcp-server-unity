# UI Toolkit Development

Unity UI Toolkit is the modern UI system for Unity, replacing the older IMGUI and uGUI systems. The Unity MCP Server provides comprehensive support for creating and managing UI Toolkit assets.

## Overview

UI Toolkit uses three main file types:
- **UXML**: XML-based layout files defining UI structure
- **USS**: Unity Style Sheets for styling (similar to CSS)
- **C#**: Controller scripts for UI logic

## Features

### UXML File Management

#### Create UXML Files
```bash
# Create with templates
ui_create_uxml fileName:"MainMenu" templateType:"window"
ui_create_uxml fileName:"GameHUD" templateType:"document"
ui_create_uxml fileName:"InventoryItem" templateType:"component"

# Create with custom content
ui_create_uxml fileName:"Custom" templateType:"custom" customContent:"<ui:UXML>...</ui:UXML>"
```

Template types:
- `window`: Editor window with title, content, and footer
- `document`: Basic document structure for runtime UI
- `component`: Reusable component template
- `custom`: Empty template for custom content

#### Read and Update UXML
```bash
# Read UXML content
ui_read_uxml fileName:"MainMenu"

# Update UXML content
ui_update_uxml fileName:"MainMenu" content:"<ui:UXML>...</ui:UXML>"

# List all UXML files
ui_list_uxml
```

### USS File Management

#### Create USS Files
```bash
# Create with templates
ui_create_uss fileName:"DarkTheme" templateType:"theme"
ui_create_uss fileName:"ButtonStyles" templateType:"component"
ui_create_uss fileName:"Helpers" templateType:"utilities"

# Create with custom content
ui_create_uss fileName:"Custom" templateType:"custom" customContent:".class { }"
```

Template types:
- `theme`: Complete theme with CSS variables and base styles
- `component`: Component-specific styles
- `utilities`: Utility classes for spacing, typography, etc.
- `custom`: Empty template for custom styles

#### Read and Update USS
```bash
# Read USS content
ui_read_uss fileName:"DarkTheme"

# Update USS content
ui_update_uss fileName:"DarkTheme" content:":root { --primary-color: #FF6B6B; }"

# List all USS files
ui_list_uss
```

### UI Component Creation

Create complete UI components with UXML, USS, and C# controller:

```bash
# Create different component types
ui_create_component componentName:"CustomButton" componentType:"button"
ui_create_component componentName:"PlayerPanel" componentType:"panel"
ui_create_component componentName:"ItemList" componentType:"list"
ui_create_component componentName:"SettingsForm" componentType:"form"
ui_create_component componentName:"CharacterCard" componentType:"card"
ui_create_component componentName:"ConfirmDialog" componentType:"modal"
```

Component types:
- `button`: Styled button with icon and label
- `panel`: Container with header and content
- `list`: Searchable list with items
- `form`: Form with fields and validation
- `card`: Card layout with image and content
- `modal`: Modal dialog with overlay

Each component includes:
- UXML file with structure
- USS file with styles
- C# controller with event handling

## File Organization

Files are organized in a standard structure:
```
Assets/
├── UI/
│   ├── Components/
│   │   ├── CustomButton/
│   │   │   ├── CustomButton.uxml
│   │   │   ├── CustomButton.uss
│   │   │   └── CustomButton.cs
│   │   └── ...
│   ├── Styles/
│   │   ├── DarkTheme.uss
│   │   └── Utilities.uss
│   ├── MainWindow.uxml
│   └── GameHUD.uxml
```

## Example Workflows

### Creating a Game HUD
```bash
# 1. Create the main HUD layout
ui_create_uxml fileName:"GameHUD" templateType:"document"

# 2. Create theme styles
ui_create_uss fileName:"GameTheme" templateType:"theme"

# 3. Create HUD components
ui_create_component componentName:"HealthBar" componentType:"panel"
ui_create_component componentName:"ScoreDisplay" componentType:"panel"
ui_create_component componentName:"AbilityButton" componentType:"button"

# 4. Update HUD with component references
ui_update_uxml fileName:"GameHUD" content:"<ui:UXML>...</ui:UXML>"
```

### Creating an Inventory System
```bash
# 1. Create inventory panel
ui_create_component componentName:"InventoryPanel" componentType:"panel"

# 2. Create item components
ui_create_component componentName:"ItemSlot" componentType:"button"
ui_create_component componentName:"ItemTooltip" componentType:"card"

# 3. Create list for items
ui_create_component componentName:"ItemList" componentType:"list"

# 4. Style the inventory
ui_create_uss fileName:"InventoryStyles" templateType:"component"
```

### Creating a Settings Menu
```bash
# 1. Create settings form
ui_create_component componentName:"SettingsMenu" componentType:"form"

# 2. Create modal for confirmation
ui_create_component componentName:"ConfirmReset" componentType:"modal"

# 3. Add utility styles
ui_create_uss fileName:"Utilities" templateType:"utilities"
```

## Unity UI Builder Integration

All generated UXML and USS files are fully compatible with Unity's UI Builder:

1. Files are created in standard Unity locations
2. Proper .meta files ensure Unity recognition
3. USS links use `project://database/` URLs
4. Can switch between code editing and visual editing

### Workflow with UI Builder
1. Use MCP Server to create initial templates
2. Open in UI Builder for visual adjustments
3. Use MCP Server for batch updates or refactoring
4. UI Builder auto-reloads changed files

## Best Practices

### Naming Conventions
- UXML files: PascalCase (e.g., `MainMenu.uxml`)
- USS files: PascalCase (e.g., `DarkTheme.uss`)
- CSS classes: kebab-case (e.g., `.button-primary`)
- Element names: kebab-case (e.g., `name="submit-button"`)

### Style Organization
- Use CSS variables for theming
- Keep component styles isolated
- Use utility classes for common patterns
- Avoid inline styles in UXML

### Performance Tips
- Minimize selector complexity
- Use class selectors over type selectors
- Batch UI updates when possible
- Reuse components instead of duplicating

## Troubleshooting

### Common Issues

**Files not appearing in Unity:**
- Ensure Unity project is open
- Trigger asset refresh: `system_refresh_assets`
- Check .meta files are created

**Styles not applying:**
- Verify USS file path in UXML
- Check selector specificity
- Ensure element has correct classes

**UI Builder not updating:**
- Save all files in UI Builder
- Reimport assets in Unity
- Check for syntax errors in UXML/USS

## Advanced Usage

### Custom Templates
Create your own templates by providing custom content:

```bash
# Custom UXML template
ui_create_uxml fileName:"Custom" templateType:"custom" customContent:"
<ui:UXML xmlns:ui='UnityEngine.UIElements'>
    <ui:Template name='CustomTemplate' src='CustomTemplate.uxml' />
    <ui:Style src='CustomStyles.uss' />
    <!-- Your custom structure -->
</ui:UXML>"

# Custom USS template
ui_create_uss fileName:"Custom" templateType:"custom" customContent:"
.custom-container {
    background-color: rgba(0, 0, 0, 0.8);
    border-radius: 10px;
}"
```

### Dynamic UI Generation
Use the API to generate UI based on data:

```javascript
// Generate UI for each item in inventory
for (const item of inventory) {
  await createComponent(`Item_${item.id}`, 'card');
  await updateUXML(`Item_${item.id}`, generateItemUI(item));
}
```

## Future Enhancements

- Visual preview generation
- UXML validation
- USS property autocomplete
- Component library system
- UI animation support