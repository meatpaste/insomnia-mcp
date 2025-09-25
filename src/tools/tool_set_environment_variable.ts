import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { setEnvironmentVariable } from "../storage.js";
import { collectionIdSchema } from "../schemas.js";

const setEnvironmentArgs = {
  collectionId: collectionIdSchema,
  key: z.string().min(1, "key is required"),
  value: z.any(),
} as const;

export function registerSetEnvironmentVariableTool(server: McpServer): void {
  server.tool(
    "set_environment_variable",
    "Set an environment variable for a collection",
    setEnvironmentArgs,
    async (args) => {
      const environment = await setEnvironmentVariable({
        collectionId: args.collectionId,
        key: args.key,
        value: args.value,
      });
      await server.server.sendResourceUpdated({
        uri: `insomnia://collection/${args.collectionId}/environment`,
      });
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
