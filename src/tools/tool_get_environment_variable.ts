import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getEnvironmentVariable } from "../storage.js";
import { collectionIdSchema } from "../schemas.js";
import { z } from "zod";

const getEnvironmentVariableArgs = {
  collectionId: collectionIdSchema,
  key: z.string().min(1, "key is required"),
} as const;

export function registerGetEnvironmentVariableTool(server: McpServer): void {
  server.tool(
    "get_environment_variable",
    "Retrieve a single environment variable value (requires collectionId and key)",
    getEnvironmentVariableArgs,
    async (args) => {
      const value = await getEnvironmentVariable(args.collectionId, args.key);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ key: args.key, value }, null, 2),
          },
        ],
      };
    }
  );
}
