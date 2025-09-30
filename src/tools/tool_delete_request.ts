import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { deleteRequest } from "../storage.js";
import { collectionIdSchema, requestIdSchema } from "../schemas.js";

const deleteRequestArgs = {
  collectionId: collectionIdSchema,
  requestId: requestIdSchema,
} as const;

export function registerDeleteRequestTool(server: McpServer): void {
  server.tool(
    "delete_request",
    "Delete a request from a collection",
    deleteRequestArgs,
    async (args) => {
      await deleteRequest({
        collectionId: args.collectionId,
        requestId: args.requestId,
      });
      await server.server.sendResourceUpdated({
        uri: `insomnia://collection/${args.collectionId}`,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Deleted request ${args.requestId} from collection ${args.collectionId}`,
          },
        ],
      };
    }
  );
}
