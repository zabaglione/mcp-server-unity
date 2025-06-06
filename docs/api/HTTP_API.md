# Unity MCP HTTP API Documentation

The Unity MCP Server now supports HTTP transport for streamable communication. This allows for real-time updates, batch operations, and integration with web-based tools.

## Starting the HTTP Server

```bash
npm run start:http
```

The server will start on port 3000 by default. You can change this with the PORT environment variable:

```bash
PORT=8080 npm run start:http
```

## Base URL

```
http://localhost:3000
```

## Endpoints

### Health Check

**GET** `/health`

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "service": "unity-mcp-server",
  "version": "2.0.0",
  "transport": "http"
}
```

### API Documentation

**GET** `/api-docs`

Get a list of all available endpoints.

### Project Management

#### Set Unity Project Path

**POST** `/api/project/setup`

Set the Unity project path for the server to work with.

**Request Body:**
```json
{
  "projectPath": "/path/to/unity/project"
}
```

#### Get Project Info

**GET** `/api/project/info`

Get information about the current Unity project.

#### Create Project Structure

**POST** `/api/project/create-structure`

Create a complete project structure based on project type.

**Request Body:**
```json
{
  "projectType": "2D_Platformer",
  "customStructure": {
    "folders": ["Scripts/Custom", "Materials/Special"]
  }
}
```

Project types: `2D_Platformer`, `3D_FPS`, `VR`, `Mobile`, `Custom`

#### Setup Architecture

**POST** `/api/project/setup-architecture`

Setup architecture pattern for the project.

**Request Body:**
```json
{
  "pattern": "MVC",
  "customConfig": {}
}
```

Patterns: `MVC`, `ECS`, `Observer`, `Custom`

### AI-Driven Development

#### Analyze Project Requirements

**POST** `/api/ai/analyze`

Analyze natural language requirements and generate project plan.

**Request Body:**
```json
{
  "description": "I want to create a 2D platformer game with inventory system, combat, and multiplayer support for mobile devices"
}
```

#### Execute Implementation Plan

**POST** `/api/ai/execute`

Execute an AI-generated implementation plan.

**Request Body:**
```json
{
  "requirements": {
    "description": "2D platformer with inventory",
    "projectType": "2D_Platformer",
    "features": ["inventory", "combat"]
  },
  "projectType": "2D_Platformer",
  "constraints": {},
  "autoExecute": true
}
```

### Game System Generation

#### Create Player Controller

**POST** `/api/system/player-controller`

Generate a complete player controller system.

**Request Body:**
```json
{
  "gameType": "platformer",
  "requirements": ["doubleJump", "wallJump", "dash"]
}
```

#### Create Camera System

**POST** `/api/system/camera`

Generate a camera system.

**Request Body:**
```json
{
  "cameraType": "follow",
  "specifications": {
    "smoothing": true,
    "bounds": true,
    "deadzone": true
  }
}
```

#### Create UI Framework

**POST** `/api/system/ui-framework`

Generate a complete UI framework.

**Request Body:**
```json
{
  "uiType": "mobile",
  "screens": ["mainMenu", "gameplay", "inventory", "settings"]
}
```

#### Create Audio Manager

**POST** `/api/system/audio-manager`

Generate an audio management system.

**Request Body:**
```json
{
  "requirements": ["3D", "pooling", "mixing", "dynamic"]
}
```

### Asset Management

#### Create Script

**POST** `/api/asset/create-script`

Create a new C# script.

**Request Body:**
```json
{
  "fileName": "PlayerHealth",
  "content": "public class PlayerHealth : MonoBehaviour { ... }",
  "folder": "Player"
}
```

#### List Scripts

**GET** `/api/asset/list-scripts`

Get a list of all scripts in the project.

### Diagnostics

#### Compile Scripts

**POST** `/api/diagnostics/compile`

Compile Unity scripts and get compilation results.

**Request Body:**
```json
{
  "forceRecompile": true
}
```

#### Get Diagnostics Summary

**GET** `/api/diagnostics/summary`

Get a comprehensive diagnostics summary for the project.

### Package Management

#### Search Packages

**POST** `/api/package/search`

Search for Unity packages.

**Request Body:**
```json
{
  "query": "input system"
}
```

#### Install Package

**POST** `/api/package/install`

Install a Unity package.

**Request Body:**
```json
{
  "packageName": "com.unity.inputsystem",
  "version": "1.7.0"
}
```

### Batch Operations

**POST** `/api/batch`

Execute multiple operations in a single request.

**Request Body:**
```json
{
  "operations": [
    {
      "action": "projectService.setProject",
      "params": ["/path/to/project"]
    },
    {
      "action": "scriptService.createScript",
      "params": ["PlayerController", "public class PlayerController...", "Player"]
    }
  ]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Usage Example

```javascript
// Set up project
const response = await fetch('http://localhost:3000/api/project/setup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectPath: '/Users/me/MyUnityProject' })
});

// Analyze requirements
const analysis = await fetch('http://localhost:3000/api/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    description: 'Create a 2D platformer with combat system' 
  })
});

// Create player controller
const controller = await fetch('http://localhost:3000/api/system/player-controller', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    gameType: 'platformer',
    requirements: ['doubleJump', 'combat']
  })
});
```

## WebSocket Support (Coming Soon)

The HTTP server will support WebSocket connections for real-time features:
- Live compilation errors
- Progress updates for long-running operations
- Real-time diagnostics
- Unity Editor event streaming

## Integration with Claude Desktop

While Claude Desktop primarily uses stdio transport, you can use the HTTP API for:
- External tool integration
- Web-based Unity project management
- CI/CD pipeline integration
- Remote Unity development

## Performance Considerations

- The server supports request payloads up to 50MB
- Batch operations are recommended for multiple related tasks
- Use specific folder refreshes instead of full project refreshes when possible

## Security

Currently, the server runs without authentication. For production use:
- Add API key authentication
- Implement rate limiting
- Use HTTPS for secure communication
- Restrict CORS origins as needed