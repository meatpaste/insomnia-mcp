# Agent Integration Guide

This document highlights key implementation details relevant to MCP-compatible agents interacting with `insomnia-mcp`.

## Server Overview
- **Entry point**: `src/index.ts` initializes the server, registers tools/resources, and starts the STDIO transport.
- **Server metadata**: Defined in `src/constants.ts` and consumed by `src/server.ts` via `createServer()`.
- **Data layer**: `src/storage.ts` handles collections, requests, folders (Insomnia request groups), and environments using Insomnia NDJSON files.

## Tool Registry
Tools are registered through `src/tools.ts`, which loads individual handlers from `src/tools/`.

Available tools and locations:
- `tool_list_collections.ts` — presents summary metadata for each collection.
- `tool_create_collection.ts` — creates a new collection and base environment.
- `tool_create_request.ts` — creates a request optionally nested in a folder.
- `tool_update_request.ts` — updates request metadata, URL, headers, body, or folder placement.
- `tool_delete_request.ts` — deletes a request after validation.
- `tool_create_folder.ts` — creates nested folders (Insomnia request groups).
- `tool_update_folder.ts` — updates folder name/description/parent with cycle protection.
- `tool_delete_folder.ts` — deletes a folder hierarchy and associated requests.
- `tool_set_environment_variable.ts` — sets environment variables on a collection’s base environment.

Shared schemas (e.g., `collectionIdSchema`, `folderIdSchema`) live in `src/schemas.ts` to keep validation consistent across tools.

## Resource Registry
`src/resources.ts` registers MCP resources:
- `collections` — JSON list of all collections.
- `collection` — details for a single collection, including folders, requests, and environment snapshot.
- `collection_environment` — JSON representation of collection environment variables.

All resources rely on `listCollections()`, `getCollection()`, and `getEnvironment()` from `src/storage.ts` and share helper logic to resolve template variables.

## Folder Support
- Folders are represented by Insomnia `RequestGroup` records and exposed as `StoredFolder` in `src/storage.ts`.
- Helper utilities manage hierarchy validation, descendant deletion, and request association.
- Tests in `tests/storage.test.ts` cover folder CRUD, request placement, and environment behavior.

## Testing & Builds
- Unit tests: `npm test` (Vitest) exercises storage behavior, including folders.
- Build: `npm run build` bundles `src/index.ts` via `tsup`; outputs go to `dist/`.

## Release Notes
- `README.md` documents features, including folder workflows and available tools.

Agents working with `insomnia-mcp` should use these references to call tools, consume resources, and understand storage semantics.
