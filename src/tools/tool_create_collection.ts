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
      const startTime = Date.now();
      console.error("\n┌─────────────────────────────────────────────────");
      console.error("│ 🔧 MCP TOOL: create_collection");
      console.error("├─────────────────────────────────────────────────");
      console.error("│ Input:", JSON.stringify(args, null, 2));
      console.error("└─────────────────────────────────────────────────");

      const collection = await createCollection({
        name: args.name,
        description: args.description,
      });

      const duration = Date.now() - startTime;

      console.error("\n┌─────────────────────────────────────────────────");
      console.error("│ ✅ COLLECTION CREATED");
      console.error("├─────────────────────────────────────────────────");
      console.error("│ ID:", collection.id);
      console.error("│ Name:", collection.name);
      console.error("│ Duration:", duration + "ms");
      console.error("│ Timestamp:", new Date().toISOString());
      console.error("└─────────────────────────────────────────────────");
      console.error("📤 Sending notifications to plugin...");

      server.sendResourceListChanged();
      await server.server.sendResourceUpdated({ uri: COLLECTIONS_RESOURCE_URI });

      console.error("✅ Notifications sent\n");

      const summary = `✅ Created collection "${collection.name}"

Collection ID: ${collection.id}
Description: ${collection.description || "(none)"}
Created: ${new Date(collection.createdAt).toLocaleString()}
Duration: ${duration}ms

🔔 IMPORTANT: Check Insomnia plugin for sync notification
   The plugin should detect this change within 5 seconds

Full details:
${JSON.stringify(collection, null, 2)}`;

      return {
        content: [
          {
            type: "text" as const,
            text: summary,
          },
        ],
      };
    }
  );
}
