import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerListCollectionsTool } from "./tools/tool_list_collections.js";
import { registerCreateCollectionTool } from "./tools/tool_create_collection.js";
import { registerCreateRequestTool } from "./tools/tool_create_request.js";
import { registerUpdateRequestTool } from "./tools/tool_update_request.js";
import { registerDeleteRequestTool } from "./tools/tool_delete_request.js";
import { registerCreateFolderTool } from "./tools/tool_create_folder.js";
import { registerUpdateFolderTool } from "./tools/tool_update_folder.js";
import { registerDeleteFolderTool } from "./tools/tool_delete_folder.js";
import { registerSetEnvironmentVariableTool } from "./tools/tool_set_environment_variable.js";
import { registerGetCollectionTool } from "./tools/tool_get_collection.js";
import { registerGetRequestTool } from "./tools/tool_get_request.js";
import { registerGetFolderTool } from "./tools/tool_get_folder.js";
import { registerGetEnvironmentTool } from "./tools/tool_get_environment.js";
import { registerGetEnvironmentVariableTool } from "./tools/tool_get_environment_variable.js";

/**
 * Register all MCP tools with the server
 *
 * This function registers all available tools for managing Insomnia collections,
 * including CRUD operations for collections, requests, folders, and environments.
 *
 * @param server - The MCP server instance to register tools with
 */
export function registerTools(server: McpServer): void {
  registerListCollectionsTool(server);
  registerCreateCollectionTool(server);
  registerCreateRequestTool(server);
  registerUpdateRequestTool(server);
  registerDeleteRequestTool(server);
  registerGetRequestTool(server);
  registerCreateFolderTool(server);
  registerUpdateFolderTool(server);
  registerDeleteFolderTool(server);
  registerGetFolderTool(server);
  registerSetEnvironmentVariableTool(server);
  registerGetEnvironmentTool(server);
  registerGetEnvironmentVariableTool(server);
  registerGetCollectionTool(server);
}
