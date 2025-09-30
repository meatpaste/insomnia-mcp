# Architecture

## Overview

The Insomnia MCP Server bridges AI assistants with Kong Insomnia through the Model Context Protocol (MCP). It provides a clean, typed API for managing Insomnia collections directly from AI tools like Claude Desktop, Windsurf, and Cursor.

## High-Level Architecture

```
┌─────────────────┐
│  AI Assistant   │ (Claude Desktop, Windsurf, etc.)
│  (MCP Client)   │
└────────┬────────┘
         │ stdio (MCP Protocol)
         │
┌────────▼────────────────────────────────────────────┐
│              Insomnia MCP Server                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │     Tools    │  │  Resources   │  │   HTTP    │ │
│  │ (CRUD Ops)   │  │ (Read Views) │  │  Server   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │       │
│  ┌──────▼─────────────────▼─────────────────▼────┐  │
│  │           Storage Layer (src/storage/)        │  │
│  │  - Collections  - Requests  - Folders         │  │
│  │  - Environments - DB Utils  - Converters      │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │
              ┌───────────▼──────────┐
              │  Insomnia NDJSON DB  │
              │  (~/.config/Insomnia) │
              │  - Workspace.db      │
              │  - Request.db        │
              │  - RequestGroup.db   │
              │  - Environment.db    │
              └───────────┬──────────┘
                          │
                  ┌───────▼────────┐
                  │  Insomnia App  │
                  └────────────────┘
```

## Core Components

### 1. MCP Server (src/index.ts, src/server.ts)

**Responsibility**: Protocol handling and server lifecycle

- Initializes MCP server with stdio transport
- Registers tools and resources
- Manages server lifecycle (startup, shutdown)
- Optionally starts HTTP server for plugin integration

**Key Files**:
- `src/index.ts` - Main entry point
- `src/server.ts` - Server factory
- `src/constants.ts` - Server metadata and URIs

### 2. Tools Layer (src/tools/)

**Responsibility**: MCP tool implementations for CRUD operations

Each tool is self-contained in its own file:
- `tool_create_collection.ts` - Create new collections
- `tool_create_request.ts` - Create HTTP requests
- `tool_update_request.ts` - Update existing requests
- `tool_delete_request.ts` - Delete requests
- `tool_create_folder.ts` - Create folder hierarchies
- `tool_update_folder.ts` - Update folders
- `tool_delete_folder.ts` - Delete folders (cascading)
- `tool_set_environment_variable.ts` - Manage environment variables
- `tool_get_*.ts` - Getter tools for retrieving specific resources

**Pattern**: Each tool uses Zod for validation, calls storage layer, sends resource updates.

### 3. Resources Layer (src/resources.ts)

**Responsibility**: MCP resource providers for read-only views

- `insomnia://collections` - List all collections
- `insomnia://collection/{id}` - Individual collection details
- `insomnia://collection/{id}/environment` - Collection environment

**Pattern**: Resources are read-only, provide JSON representations.

### 4. Storage Layer (src/storage/)

**Responsibility**: Data access and business logic

Modular architecture (post-v0.2.0 refactor):

- **collections.ts**: Collection CRUD, workspace management
- **requests.ts**: Request CRUD, validation
- **folders.ts**: Folder CRUD, hierarchy management
- **environments.ts**: Environment variable management
- **db.ts**: Low-level NDJSON file I/O
- **converters.ts**: Transform between storage format and API format
- **folderTree.ts**: Folder hierarchy validation and traversal
- **types.ts**: TypeScript interfaces for stored data

**Key Patterns**:
- Direct file manipulation (no ORM/database layer)
- Atomic writes (read-modify-write pattern)
- Validation at boundaries (storage layer validates inputs)
- Type safety throughout (TypeScript + Zod)

### 5. HTTP Server (src/httpServer.ts)

**Responsibility**: HTTP API for Insomnia plugin integration

Endpoints:
- `GET /` - Health check
- `GET /collections` - List collections (JSON)
- `GET /collections/export` - Insomnia-compatible export format
- `GET /collections/hash` - Hash for change detection

**Why?**: Enables Insomnia plugin to auto-refresh collections without file watching.

### 6. Configuration (src/config.ts)

**Responsibility**: Centralized configuration management

Environment variables:
- `INSOMNIA_MCP_DISABLE_HTTP_SERVER` - Disable HTTP server
- `INSOMNIA_MCP_HTTP_PORT` - HTTP server port (default: 3847)
- `INSOMNIA_APP_DATA_DIR` - Insomnia data directory
- `INSOMNIA_MCP_PROJECT_ID` - Project ID override
- `INSOMNIA_MCP_LOG_LEVEL` - Logging level

### 7. Error Handling (src/errors.ts)

**Responsibility**: Structured error types

Custom error classes:
- `InsomniaError` - Base error
- `CollectionNotFoundError`
- `RequestNotFoundError`
- `FolderNotFoundError`
- `EnvironmentNotFoundError`
- `ValidationError`
- `FileSystemError`

## Data Flow Examples

### Creating a Request

```
1. AI Assistant calls create_request tool via MCP
   ↓
2. MCP Server receives tool call, validates with Zod
   ↓
3. tool_create_request.ts calls storage.createRequest()
   ↓
4. storage/requests.ts:
   - Validates folder exists (if provided)
   - Creates RequestRecord with unique ID
   - Reads existing requests from Request.db
   - Appends new request
   - Writes back to Request.db
   ↓
5. Tool sends resource update notification
   ↓
6. Returns formatted success message to AI
   ↓
7. Insomnia (re)loads Request.db and shows new request
```

### Deleting a Folder (Cascading)

```
1. AI Assistant calls delete_folder tool
   ↓
2. storage/folders.ts:
   - Finds all descendant folders recursively
   - Finds all requests in folder tree
   - Deletes all requests
   - Deletes all folders
   - Writes updated files atomically
   ↓
3. Insomnia reloads and reflects changes
```

## Design Decisions

### Why Direct File Manipulation?

**Pros**:
- No database server required
- Works with Insomnia's existing data format
- Changes are immediately visible in Insomnia
- Simple deployment (no migrations, schemas)

**Cons**:
- Race conditions if Insomnia writes simultaneously
- No transactions
- Manual integrity management

**Mitigation**:
- Atomic read-modify-write operations
- Validation before writes
- Idempotent operations where possible

### Why NDJSON?

Insomnia uses NDJSON (newline-delimited JSON) for its database:
- Each line is a complete JSON object
- Easy to append
- Easy to parse line-by-line
- Human-readable for debugging

### Why Separate HTTP Server?

The HTTP server solves a specific problem:
- Insomnia plugin can't directly access MCP server (stdio)
- File watching is unreliable across platforms
- HTTP polling is simple and reliable
- Port 3847 = "MCP-I" (MCP-Insomnia)

### Why Modular Storage?

Original storage.ts was 500+ lines. v0.2.0 refactor split into:
- Single Responsibility Principle
- Easier testing and maintenance
- Clear boundaries between concerns
- Better code navigation

## Testing Strategy

### Unit Tests (tests/)

- **constants.test.ts**: Configuration validation
- **db.test.ts**: Low-level file I/O
- **converters.test.ts**: Format conversions
- **folderTree.test.ts**: Hierarchy logic
- **schemas.test.ts**: Zod validation
- **storage.test.ts**: Integration tests for storage layer
- **tools.test.ts**: Tool registration and schemas
- **tools-unit.test.ts**: Tool behavior validation

### Test Patterns

- Isolated test data directory (`tests/__fixtures__`)
- beforeEach/afterEach cleanup
- Mocked MCP server for tool tests
- Environment variable isolation

## Extension Points

### Adding a New Tool

1. Create `src/tools/tool_<name>.ts`
2. Define Zod schema for arguments
3. Implement tool handler calling storage layer
4. Register in `src/tools.ts`
5. Add tests in `tests/tools.test.ts`

### Adding a New Storage Operation

1. Add function to appropriate `src/storage/*.ts` file
2. Define input/output types
3. Implement with validation
4. Add tests in `tests/storage.test.ts`
5. Export from `src/storage/index.ts`

### Adding a New Resource

1. Add resource handler to `src/resources.ts`
2. Define URI pattern
3. Implement read logic using storage layer
4. Update resource list in `constants.ts`

## Security Considerations

- **No authentication**: Assumes trusted local environment
- **File system access**: Limited to Insomnia data directory
- **Input validation**: Zod schemas prevent injection
- **No network access**: MCP is stdio-only (except opt-in HTTP server)

## Performance Characteristics

- **File I/O**: O(n) where n = number of records in file
- **Collection listing**: O(c * r * f) where c=collections, r=requests, f=folders
- **Request creation**: O(r) read + O(1) append + O(r) write
- **Folder deletion**: O(f + r) where f=folders in tree, r=requests in tree

**Optimization Opportunities**:
- Add caching layer (currently no caching)
- Add indexing (currently linear scans)
- Batch operations (currently single operations)

## Future Enhancements

- **Bulk operations**: Create multiple requests/folders at once
- **WebSocket server**: Real-time updates instead of polling
- **Import/export**: Convert from Postman, OpenAPI, etc.
- **Request execution**: Actually run requests, not just manage them
- **Collaboration**: Multi-user support with conflict resolution
- **Plugins**: Extensibility system for custom tools/resources