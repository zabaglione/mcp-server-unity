# Unity MCP Server API Reference

## Overview

Unity MCP Server provides a simple HTTP-based API for Unity Editor integration. All operations are performed through MCP tools that communicate with Unity via HTTP.

## MCP Tools

### Script Operations

#### `script_create`
Create a new C# script in the Unity project.

**Parameters:**
- `fileName` (string, required): Name of the script file (without .cs extension)
- `content` (string, optional): Script content. If not provided, creates an empty MonoBehaviour
- `folder` (string, optional): Target folder path. Defaults to "Assets/Scripts"

**Example:**
```json
{
  "fileName": "PlayerController",
  "content": "public class PlayerController : MonoBehaviour { }",
  "folder": "Assets/Scripts/Player"
}
```

#### `script_read`
Read the contents of an existing C# script.

**Parameters:**
- `path` (string, required): Path to the script file

**Example:**
```json
{
  "path": "Assets/Scripts/PlayerController.cs"
}
```

#### `script_delete`
Delete a C# script from the Unity project.

**Parameters:**
- `path` (string, required): Path to the script file

**Example:**
```json
{
  "path": "Assets/Scripts/PlayerController.cs"
}
```

### Shader Operations

#### `shader_create`
Create a new shader file in the Unity project.

**Parameters:**
- `name` (string, required): Name of the shader (without .shader extension)
- `content` (string, optional): Shader content. If not provided, creates a default shader
- `folder` (string, optional): Target folder path. Defaults to "Assets/Shaders"

**Example:**
```json
{
  "name": "CustomShader",
  "content": "Shader \"Custom/MyShader\" { SubShader { Pass { } } }",
  "folder": "Assets/Shaders/Custom"
}
```

#### `shader_read`
Read the contents of an existing shader file.

**Parameters:**
- `path` (string, required): Path to the shader file

**Example:**
```json
{
  "path": "Assets/Shaders/CustomShader.shader"
}
```

#### `shader_delete`
Delete a shader file from the Unity project.

**Parameters:**
- `path` (string, required): Path to the shader file

**Example:**
```json
{
  "path": "Assets/Shaders/CustomShader.shader"
}
```

### Project Operations

#### `project_info`
Get information about the current Unity project.

**Parameters:** None

**Returns:**
- `projectPath`: Path to the Unity project
- `unityVersion`: Version of Unity being used
- `platform`: Current build platform
- `isPlaying`: Whether Unity is in play mode

**Example Response:**
```json
{
  "projectPath": "/Users/user/MyUnityProject",
  "unityVersion": "2022.3.0f1",
  "platform": "StandaloneOSX",
  "isPlaying": false
}
```

#### `project_status`
Check the connection status between MCP server and Unity.

**Parameters:** None

**Returns:**
- Connection status message
- Project path (if connected)

## HTTP API (Unity Side)

The Unity HTTP server listens on port 3001 and provides the following endpoints:

### Base URL
```
http://localhost:3001
```

### Endpoints

#### `GET /ping`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-10T12:00:00Z"
}
```

#### `POST /script/create`
Create a new C# script.

**Request Body:**
```json
{
  "fileName": "string",
  "content": "string",
  "folder": "string"
}
```

#### `POST /script/read`
Read script contents.

**Request Body:**
```json
{
  "path": "string"
}
```

#### `POST /script/delete`
Delete a script.

**Request Body:**
```json
{
  "path": "string"
}
```

#### `POST /shader/create`
Create a new shader.

**Request Body:**
```json
{
  "name": "string",
  "content": "string",
  "folder": "string"
}
```

#### `POST /shader/read`
Read shader contents.

**Request Body:**
```json
{
  "path": "string"
}
```

#### `POST /shader/delete`
Delete a shader.

**Request Body:**
```json
{
  "path": "string"
}
```

#### `GET /project/info`
Get project information.

**Response:**
```json
{
  "projectPath": "string",
  "unityVersion": "string",
  "platform": "string",
  "isPlaying": boolean
}
```

## Error Handling

All errors are returned with appropriate HTTP status codes and error messages:

- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Unity operation failed

Error response format:
```json
{
  "error": "Error message describing what went wrong"
}
```

## Usage with Claude

When using with Claude Desktop, the tools are automatically available after configuration. You can use natural language to interact with Unity:

```
"Create a new PlayerController script in the Scripts folder"
"Read the contents of the GameManager script"
"Delete the old TestScript"
"Create a new water shader"
"Show me the project information"
```

Claude will translate these requests into the appropriate tool calls.