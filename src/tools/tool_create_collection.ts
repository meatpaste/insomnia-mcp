import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { createCollection } from "../storage.js";
import { COLLECTIONS_RESOURCE_URI } from "../constants.js";

const createCollectionArgs = {
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
} as const;

export function registerCreateCollectionTool(server: McpServer): void {
  server.tool(
    "create_collection",
    "Create a new Insomnia collection",
    createCollectionArgs,
    async (args) => {
      const collection = await createCollection({
        name: args.name,
        description: args.description,
      });
      server.sendResourceListChanged();
      await server.server.sendResourceUpdated({ uri: COLLECTIONS_RESOURCE_URI });
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
