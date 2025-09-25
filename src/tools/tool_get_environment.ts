import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getEnvironment } from "../storage.js";
import { collectionIdSchema } from "../schemas.js";

const getEnvironmentArgs = {
  collectionId: collectionIdSchema,
} as const;

export function registerGetEnvironmentTool(server: McpServer): void {
  server.tool(
    "get_environment",
    "Retrieve a collection environment (requires collectionId)",
    getEnvironmentArgs,
    async (args) => {
      const environment = await getEnvironment(args.collectionId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(environment, null, 2),
          },
        ],
      };
    }
  );
}
