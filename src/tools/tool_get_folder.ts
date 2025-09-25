import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getFolder } from "../storage.js";
import { collectionIdSchema, folderIdSchema } from "../schemas.js";

const getFolderArgs = {
  collectionId: collectionIdSchema,
  folderId: folderIdSchema,
} as const;

export function registerGetFolderTool(server: McpServer): void {
  server.tool(
    "get_folder",
    "Retrieve a folder by id (requires collectionId and folderId)",
    getFolderArgs,
    async (args) => {
      const folder = await getFolder({
        collectionId: args.collectionId,
        folderId: args.folderId,
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
