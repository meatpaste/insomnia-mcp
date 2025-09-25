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

export function registerTools(server: McpServer): void {
  registerListCollectionsTool(server);
  registerCreateCollectionTool(server);
  registerCreateRequestTool(server);
  registerUpdateRequestTool(server);
  registerDeleteRequestTool(server);
  registerCreateFolderTool(server);
  registerUpdateFolderTool(server);
  registerDeleteFolderTool(server);
  registerSetEnvironmentVariableTool(server);
}
