import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getRequest } from "../storage.js";
import { collectionIdSchema, requestIdSchema } from "../schemas.js";

const getRequestArgs = {
  collectionId: collectionIdSchema,
  requestId: requestIdSchema,
} as const;

export function registerGetRequestTool(server: McpServer): void {
  server.tool(
    "get_request",
    "Retrieve a request by id (requires collectionId and requestId)",
    getRequestArgs,
    async (args) => {
      const request = await getRequest({
        collectionId: args.collectionId,
        requestId: args.requestId,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(request, null, 2),
          },
        ],
      };
    }
  );
}
