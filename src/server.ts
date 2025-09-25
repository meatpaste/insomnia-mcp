import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { SERVER_INFO, SERVER_INSTRUCTIONS } from "./constants.js";

export function createServer(): McpServer {
  return new McpServer(SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS,
  });
}
