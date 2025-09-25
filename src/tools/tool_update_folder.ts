import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { updateFolder } from "../storage.js";
import { collectionIdSchema, folderIdSchema } from "../schemas.js";

const updateFolderArgs = {
  collectionId: collectionIdSchema,
  folderId: folderIdSchema,
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  parentId: folderIdSchema.optional().nullable(),
} as const;

export function registerUpdateFolderTool(server: McpServer): void {
  server.tool(
    "update_folder",
    "Update an existing folder",
    updateFolderArgs,
    async (args) => {
      const folder = await updateFolder({
        collectionId: args.collectionId,
        folderId: args.folderId,
        name: args.name,
        description: args.description ?? undefined,
        parentId: args.parentId ?? undefined,
      });
      await server.server.sendResourceUpdated({
        uri: `insomnia://collection/${args.collectionId}`,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(folder, null, 2),
          },
        ],
      };
    }
  );
}
