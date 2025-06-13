# UI Toolkit Integration Issues and Solutions

## Problem
When using prompts like "UI Toolkitを使って体力バー、スコア表示、ミニマップを含むゲームHUDを作成", Claude Desktop (Sonnet 4) only creates C# scripts instead of using the UI Toolkit tools to create UXML and USS files.

## Root Causes

1. **Tool Description Clarity**: The tool descriptions may not be explicit enough for the AI to understand when to use UI Toolkit tools
2. **Keyword Recognition**: The AI might not recognize "UI Toolkit" as requiring specific tools
3. **Tool Priority**: The AI defaults to script creation as it's a more common pattern

## Solutions Implemented

### 1. Enhanced Tool Descriptions
Updated tool descriptions to be more explicit:
- `ui_create_uxml`: Added "Use this when creating UI interfaces, HUDs, menus, or any visual interface elements in Unity"
- `ui_create_uss`: Added clarification about CSS-like styling
- `ui_create_component`: Made it very explicit with "USE THIS when asked to create UI, HUD, health bars, score displays, menus, or any game interface with UI Toolkit"

### 2. Recommended Prompt Patterns

#### Japanese Prompts
```
「UI Toolkitでゲームの体力バーHUDコンポーネントを作成してください」
「UI Toolkit用のHUD.uxmlとHUD.ussとHUDController.csを作成」
「UI Toolkitコンポーネントとして設定メニューを作成」
```

#### English Prompts
```
"Create a game HUD component using UI Toolkit with health bar"
"Create HUD.uxml, HUD.uss, and HUDController.cs for UI Toolkit"
"Create a settings menu as a UI Toolkit component"
```

### 3. Explicit Keywords
Use these keywords to trigger UI Toolkit tools:
- "UI Toolkit component"
- "UXML"
- "USS"
- "UI Toolkit HUD"
- "UI Toolkit menu"

## Testing Recommendations

### Test Prompts
1. Explicit: "Create a UI Toolkit component named GameHUD with health bar"
2. With file types: "Create GameHUD.uxml, GameHUD.uss, and GameHUDController.cs"
3. Component type: "Create a panel component named GameHUD using UI Toolkit"

### Expected Behavior
When properly triggered, the system should:
1. Call `ui_create_component` with appropriate parameters
2. Create three files:
   - `Assets/UI/Components/GameHUD/GameHUD.uxml` (layout)
   - `Assets/UI/Components/GameHUD/GameHUD.uss` (styles)
   - `Assets/UI/Components/GameHUD/GameHUD.cs` (controller)

## Alternative Approaches

If the automatic detection still fails:

### 1. Multiple Tool Calls
Request each file explicitly:
```
"1. Create GameHUD.uxml for UI Toolkit
2. Create GameHUD.uss for styling
3. Create GameHUDController.cs"
```

### 2. Use Component Type
Specify the component type explicitly:
```
"Create a 'panel' type UI Toolkit component named GameHUD"
```

### 3. Reference Templates
```
"Create a UI Toolkit HUD using the 'panel' template"
```

## Future Improvements

1. **AI Prompt Analysis**: Add a service that detects UI-related keywords and suggests appropriate tools
2. **Tool Chaining**: Automatically trigger USS and C# creation when UXML is created
3. **Prompt Templates**: Provide pre-built prompt templates in the documentation
4. **Tool Aliases**: Add alternative tool names that are more discoverable

## Workaround for Current Version

Until the AI recognition improves, users can:
1. Use more explicit prompts mentioning "UI Toolkit component"
2. Request files by their extension (UXML, USS)
3. Use the component type parameter explicitly
4. Break down the request into multiple steps