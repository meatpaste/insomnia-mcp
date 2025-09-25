import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { createRequest } from "../storage.js";
import {
  collectionIdSchema,
  folderIdSchema,
  requestHeadersSchema,
  requestBodySchema,
  requestScriptSchema,
  requestUrlSchema,
} from "../schemas.js";

const createRequestArgs = {
  collectionId: collectionIdSchema,
  folderId: folderIdSchema.optional().nullable(),
  name: z.string().min(1, "name is required"),
  method: z.string().min(1, "method is required"),
  url: requestUrlSchema,
  headers: requestHeadersSchema,
  body: requestBodySchema,
  description: z.string().optional(),
  preRequestScript: requestScriptSchema,
  afterResponseScript: requestScriptSchema,
} as const;

export function registerCreateRequestTool(server: McpServer): void {
  server.tool(
    "create_request",
    "Create a request in a collection",
    createRequestArgs,
    async (args) => {
      const request = await createRequest({
        collectionId: args.collectionId,
        name: args.name,
        method: args.method,
        url: args.url,
        headers: args.headers,
        body: args.body,
        description: args.description,
        folderId: args.folderId ?? undefined,
        preRequestScript: args.preRequestScript,
        afterResponseScript: args.afterResponseScript,
      });
      await server.server.sendResourceUpdated({
        uri: `insomnia://collection/${args.collectionId}`,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(request, null, 2),
          },
        ],
      };
    }
  );
}
