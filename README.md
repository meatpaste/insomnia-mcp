# Insomnia MCP Server

**Insomnia MCP Server** exposes Kong Insomnia-compatible collections, folders, requests, and environments through the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP). It lets MCP-enabled assistants (Claude Desktop, Windsurf, Cursor, etc.) create and manage Insomnia workspaces without touching the GUI.

## Features

- **Collection management** – list and create collections with auto-persisted metadata.
- **Folder workflows** – create nested folders (Insomnia request groups), move them around, and delete hierarchies safely.
- **Request lifecycle** – create, update, and delete HTTP requests with headers, bodies, descriptions, optional folder placement, and pre/post request scripts.
- **Environment variables** – manage per-collection environments.

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

- `list_collections`
- `create_collection`
- `create_request`
- `update_request`
- `delete_request`
- `create_folder`
- `update_folder`
- `delete_folder`
- `set_environment_variable`

## License

[MIT](./LICENSE) – use, fork, and adapt as needed.
