import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { deleteFolder } from "../storage.js";
import { collectionIdSchema, folderIdSchema } from "../schemas.js";

const deleteFolderArgs = {
  collectionId: collectionIdSchema,
  folderId: folderIdSchema,
} as const;

export function registerDeleteFolderTool(server: McpServer): void {
  server.tool(
    "delete_folder",
    "Delete a folder and its nested contents",
    deleteFolderArgs,
    async (args) => {
      await deleteFolder({
        collectionId: args.collectionId,
        folderId: args.folderId,
      });
      await server.server.sendResourceUpdated({
        uri: `insomnia://collection/${args.collectionId}`,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Deleted folder ${args.folderId} from collection ${args.collectionId}`,
          },
        ],
      };
    }
  );
}
