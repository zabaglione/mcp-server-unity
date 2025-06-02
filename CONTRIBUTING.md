# Contributing to Unity MCP Server

Thank you for your interest in contributing to Unity MCP Server! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

1. Node.js 18.x or higher
2. npm or yarn
3. Git
4. A Unity installation (for testing)
5. Claude Desktop (for integration testing)

### Setting Up the Development Environment

1. Fork and clone the repository:
```bash
git clone https://github.com/zabaglione/mcp-server-unity.git
cd mcp-server-unity
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. For development with auto-rebuild:
```bash
npm run dev
```

## Code Style Guidelines

### TypeScript Conventions

- Use strict TypeScript settings (already configured in tsconfig.json)
- Always specify types explicitly for function parameters and return values
- Use interfaces for complex object types
- Prefer `const` over `let` when variables won't be reassigned

### Code Organization

- Keep related functionality together
- Each tool should have clear error handling
- Use descriptive variable and function names
- Add JSDoc comments for complex functions

### Error Handling

- Always validate inputs before processing
- Provide clear, actionable error messages
- Use MCP's error types appropriately
- Never expose sensitive file paths in error messages

## Testing

### Manual Testing

1. Configure Claude Desktop to use your development build
2. Test each tool with various inputs:
   - Valid inputs
   - Invalid inputs
   - Edge cases
   - Missing optional parameters

### Testing Checklist

- [ ] Set Unity project with valid path
- [ ] Set Unity project with invalid path
- [ ] Create scripts with various content
- [ ] Read existing and non-existing scripts
- [ ] List scripts in projects with 0, 1, and many scripts
- [ ] Create scenes and materials
- [ ] Test all asset type filters
- [ ] Test build command (if Unity is available)

## Pull Request Process

### Before Submitting

1. Ensure your code builds without errors:
```bash
npm run build
```

2. Test your changes thoroughly
3. Update documentation if needed
4. Add yourself to the contributors list (if first contribution)

### PR Guidelines

1. **Title**: Use a clear, descriptive title
   - Good: "Add support for prefab creation"
   - Bad: "Update code"

2. **Description**: Include:
   - What changes were made
   - Why the changes were necessary
   - Any breaking changes
   - Testing performed

3. **Scope**: Keep PRs focused
   - One feature or fix per PR
   - Separate refactoring from feature additions

### Review Process

- PRs require at least one review
- Address all feedback constructively
- Update based on feedback and re-request review
- Squash commits if requested

## Adding New Tools

When adding a new Unity-related tool:

1. Add tool definition in `setupHandlers()`
2. Implement the tool handler method
3. Add appropriate error handling
4. Update README.md with usage examples
5. Test thoroughly with Claude Desktop

### Tool Implementation Template

```typescript
private async toolName(param1: string, param2?: string): Promise<any> {
  // Validate Unity project is set
  if (!this.unityProject) {
    throw new Error('Unity project not set. Use set_unity_project first.');
  }

  // Validate inputs
  if (!param1) {
    throw new Error('param1 is required');
  }

  try {
    // Tool implementation
    
    return {
      content: [
        {
          type: 'text',
          text: `Success message with details`,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Tool operation failed: ${error}`);
  }
}
```

## Reporting Issues

### Bug Reports

Include:
- Unity version
- Node.js version
- OS and version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

### Feature Requests

Include:
- Use case description
- Proposed implementation (if any)
- Unity version compatibility requirements
- Potential impact on existing features

## Community

- Be respectful and constructive
- Help others when possible
- Share your Unity MCP use cases
- Suggest improvements

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release PR
4. After merge, tag release
5. Publish release notes

Thank you for contributing to Unity MCP Server!