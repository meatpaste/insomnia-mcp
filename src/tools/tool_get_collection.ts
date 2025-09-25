import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getCollection } from "../storage.js";
import { collectionIdSchema } from "../schemas.js";

const getCollectionArgs = {
  collectionId: collectionIdSchema,
} as const;

export function registerGetCollectionTool(server: McpServer): void {
  server.tool(
    "get_collection",
    "Retrieve a collection by id (requires collectionId)",
    getCollectionArgs,
    async (args) => {
      const collection = await getCollection(args.collectionId);
      if (!collection) {
        throw new Error(`Collection ${args.collectionId} not found`);
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(collection, null, 2),
          },
        ],
      };
    }
  );
}
