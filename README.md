# Insomnia MCP Server

[![CI](https://github.com/yourusername/insomnia-mcp/workflows/CI/badge.svg)](https://github.com/yourusername/insomnia-mcp/actions)
[![npm version](https://img.shields.io/npm/v/insomnia-mcp.svg)](https://www.npmjs.com/package/insomnia-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Insomnia MCP Server** exposes Kong Insomnia-compatible collections, folders, requests, and environments through the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP). It lets MCP-enabled assistants (Claude Desktop, Windsurf, Cursor, etc.) create and manage Insomnia workspaces without touching the GUI.

## ✨ Features

- **Collection management** – List and create collections with auto-persisted metadata
- **Folder workflows** – Create nested folders (Insomnia request groups), move them around, and delete hierarchies safely
- **Request lifecycle** – Create, update, and delete HTTP requests with headers, bodies, descriptions, optional folder placement, and pre/post request scripts
- **Environment variables** – Manage per-collection environment variables
- **User-friendly responses** – Clear, formatted success messages with action summaries
- **Type-safe** – Full TypeScript support with comprehensive JSDoc documentation

## Quick Start - Update your MCP configuration

```json
{
  "mcpServers": {
    "insomnia": {
      "command": "npx",
      "args": ["insomnia-mcp@latest"]
    }
  }
}
```

Claude code install command

```bash
claude mcp add insomnia npx insomnia-mcp@latest
```

Once connected, explore available tools and resources:

### Collection Tools
- `list_collections` - List all collections
- `create_collection` - Create new collection
- `get_collection` - Get collection details

### Request Tools
- `create_request` - Create HTTP request
- `update_request` - Update existing request
- `delete_request` - Delete request
- `get_request` - Get request details

### Folder Tools
- `create_folder` - Create folder/group
- `update_folder` - Update folder
- `delete_folder` - Delete folder (cascades to children)
- `get_folder` - Get folder details

### Environment Tools
- `set_environment_variable` - Set variable
- `get_environment` - Get all variables
- `get_environment_variable` - Get specific variable

## 📚 Documentation

- **[Architecture Documentation](./docs/ARCHITECTURE.md)** - System design, data flow, and extension points
- **[Examples](./examples/README.md)** - Real-world usage examples and workflows
- **[Changelog](./CHANGELOG.md)** - Version history and release notes

## 🔧 Configuration

Configure via environment variables:

- `INSOMNIA_MCP_DISABLE_HTTP_SERVER=true` - Disable HTTP server (default: false)
- `INSOMNIA_MCP_HTTP_PORT=3848` - HTTP server port (default: 3847)
- `INSOMNIA_APP_DATA_DIR=/path/to/data` - Insomnia data directory (default: auto-detected)
- `INSOMNIA_MCP_PROJECT_ID=proj_custom` - Project ID override (default: auto-detected)
- `INSOMNIA_MCP_LOG_LEVEL=debug` - Log level: error, warn, info, debug (default: info)

### How It Works

```
MCP Tool Call (via Claude) → MCP Server updates collections
                                       ↓
                    Auto-imports via Insomnia's native import API
                                       ↓
                           ✅ UI updates automatically
```

### Recent Improvements (v0.0.3)

- **Switched to `import.uri()`** for better UI refresh behavior
- **Auto-imports on change** - no manual "Import from MCP" action needed
- **Graceful fallback** to `import.raw()` if URL import fails
- **Better notifications** showing success/failure status

## 🧪 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Build
npm run build

# Development mode (watch)
npm run dev
```

## 📝 Contributing

Contributions are welcome! Please see our [Architecture Documentation](./docs/ARCHITECTURE.md) for guidance on extending the project.

## 📄 License

[MIT](./LICENSE) – use, fork, and adapt as needed.

## 🙏 Acknowledgments

Built with:
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Zod](https://github.com/colinhacks/zod) for validation
- [Vitest](https://vitest.dev/) for testing
