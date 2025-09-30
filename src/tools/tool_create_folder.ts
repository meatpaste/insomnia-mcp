import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { createFolder } from "../storage.js";
import { collectionIdSchema, folderIdSchema } from "../schemas.js";

const createFolderArgs = {
  collectionId: collectionIdSchema,
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  parentId: folderIdSchema.optional().nullable(),
} as const;

export function registerCreateFolderTool(server: McpServer): void {
  server.tool(
    "create_folder",
    "Create a folder within an Insomnia collection",
    createFolderArgs,
    async (args) => {
      const folder = await createFolder({
        collectionId: args.collectionId,
        name: args.name,
        description: args.description,
        parentId: args.parentId ?? undefined,
      });
      await server.server.sendResourceUpdated({
        uri: `insomnia://collection/${args.collectionId}`,
      });

      const parentInfo = folder.parentId ? `\nParent Folder: ${folder.parentId}` : '';
      const summary = `✅ Created folder "${folder.name}"

Folder ID: ${folder.id}
Collection: ${args.collectionId}${parentInfo}

Full details:
${JSON.stringify(folder, null, 2)}`;

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
