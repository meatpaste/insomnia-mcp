# Insomnia MCP Examples

This directory contains example usage of the Insomnia MCP Server through AI assistants.

## Prerequisites

1. Install and configure the Insomnia MCP Server:
   ```bash
   npx insomnia-mcp@latest
   ```

2. Configure your MCP client (e.g., Claude Desktop) with:
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

## Examples

### Example 1: Basic API Collection Setup

**Goal**: Create a complete REST API collection with folders and environment variables.

**Conversation with AI**:

```
User: Create a new Insomnia collection called "GitHub API v3" for working with GitHub's REST API

AI: [Uses create_collection tool]
✅ Created collection "GitHub API v3"
Collection ID: wrk_abc123...

User: Add an environment variable for the base URL: https://api.github.com

AI: [Uses set_environment_variable tool]
✅ Set baseUrl = https://api.github.com in collection wrk_abc123

User: Create a folder called "Repositories" in this collection

AI: [Uses create_folder tool]
✅ Created folder "Repositories"
Folder ID: fld_xyz789...

User: Add a GET request to list user repositories. URL should be {{baseUrl}}/user/repos with an Authorization header

AI: [Uses create_request tool]
✅ Created request "List User Repos"
Method: GET
URL: {{baseUrl}}/user/repos
Headers: Authorization: Bearer {{token}}
```

### Example 2: Bulk Request Creation

**Goal**: Set up multiple CRUD endpoints for a resource.

**Conversation with AI**:

```
User: I need standard CRUD requests for a "users" endpoint at https://api.example.com/users

AI: I'll create a folder and all CRUD requests:

[Creates folder "Users"]
[Creates request "Get All Users" - GET /users]
[Creates request "Get User By ID" - GET /users/:id]
[Creates request "Create User" - POST /users]
[Creates request "Update User" - PUT /users/:id]
[Creates request "Delete User" - DELETE /users/:id]

All requests created in the "Users" folder!
```

### Example 3: Organizing Existing Collection

**Goal**: Restructure requests into logical folders.

**Conversation with AI**:

```
User: Show me all requests in my "E-commerce API" collection

AI: [Uses list_collections and get_collection tools]

Found 15 requests:
- GET /products
- POST /products
- GET /orders
- POST /orders
- GET /cart
- POST /cart/items
...

User: Create folders for Products, Orders, and Cart, then move the relevant requests

AI: [Uses create_folder multiple times, then update_request to move them]

✅ Organized into folders:
📁 Products (5 requests)
📁 Orders (4 requests)
📁 Cart (3 requests)
📁 Auth (3 requests)
```

### Example 4: Environment-Specific Configuration

**Goal**: Set up variables for different environments.

**Conversation with AI**:

```
User: I need to test my API in development, staging, and production. How do I handle this?

AI: Insomnia MCP currently supports one environment per collection. I recommend creating separate collections:

[Creates "My API - Development"]
[Creates "My API - Staging"]
[Creates "My API - Production"]

Each with appropriate baseUrl environment variables:
- Development: http://localhost:3000
- Staging: https://staging.api.example.com
- Production: https://api.example.com
```

### Example 5: Request Scripts

**Goal**: Add pre/post request scripts for authentication.

**Conversation with AI**:

```
User: Add a pre-request script to my login endpoint that logs the timestamp

AI: [Uses update_request tool]
✅ Updated request "Login"

Pre-request script:
console.log('Request started at:', new Date().toISOString());

You can also add post-response scripts to extract and save auth tokens!
```

## Tool Reference

Quick reference of available MCP tools:

### Collections
- `list_collections` - List all collections
- `create_collection` - Create new collection
- `get_collection` - Get collection details

### Requests
- `create_request` - Create HTTP request
- `update_request` - Update existing request
- `delete_request` - Delete request
- `get_request` - Get request details

### Folders
- `create_folder` - Create folder/group
- `update_folder` - Update folder
- `delete_folder` - Delete folder (cascades to children)
- `get_folder` - Get folder details

### Environments
- `set_environment_variable` - Set variable
- `get_environment` - Get all variables
- `get_environment_variable` - Get specific variable

## Tips & Tricks

### 1. Template Variables

Use `{{variableName}}` in URLs, headers, and bodies:
```
URL: {{baseUrl}}/api/{{version}}/users
Header: Authorization: Bearer {{authToken}}
```

### 2. Folder Hierarchy

Organize complex APIs with nested folders:
```
My API
├── Authentication
├── Users
│   ├── CRUD Operations
│   └── Permissions
└── Admin
    ├── Users
    └── Settings
```

### 3. Request Naming

Use descriptive names that include method and resource:
- ✅ "GET User By ID"
- ✅ "POST Create Order"
- ❌ "Request 1"
- ❌ "test"

### 4. Batch Operations

Ask AI to create multiple related requests at once:
```
"Create standard CRUD endpoints for products, categories, and tags"
```

### 5. Documentation

Include descriptions in requests and folders:
```
"Create a folder called 'Webhooks' with description 'Endpoints for webhook management and testing'"
```

## Common Workflows

### Setting Up a New API Project

1. Create collection with descriptive name
2. Set base URL environment variable
3. Create folder structure (Auth, Resources, Admin, etc.)
4. Add common headers (Content-Type, Authorization template)
5. Create requests for each endpoint
6. Add descriptions and example responses

### Migrating from Postman

1. Export Postman collection as JSON
2. Ask AI to analyze structure
3. Recreate collection structure in Insomnia
4. Adjust environment variables
5. Test requests

### Testing Workflow

1. Create collection for API under test
2. Add requests for all endpoints
3. Set up environment variables
4. Use pre-request scripts for setup
5. Use post-response scripts for assertions
6. Organize test requests in dedicated folders

## Troubleshooting

### "Collection not found"
Run `list_collections` to see available collection IDs

### "Folder not found"
Use `get_collection` to see folder structure and IDs

### Changes not appearing in Insomnia
Restart Insomnia or use the auto-refresh plugin

### Environment variables not working
Check syntax: `{{variableName}}` not `{variableName}` or `$variableName`

## Further Reading

- [Architecture Documentation](../docs/ARCHITECTURE.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Insomnia Documentation](https://docs.insomnia.rest/)