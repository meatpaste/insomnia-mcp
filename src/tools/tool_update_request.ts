import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { updateRequest } from "../storage.js";
import {
  collectionIdSchema,
  requestIdSchema,
  folderIdSchema,
  requestHeadersSchema,
  requestBodySchema,
  requestScriptSchema,
  requestUrlSchema,
} from "../schemas.js";

const updateRequestArgs = {
  collectionId: collectionIdSchema,
  requestId: requestIdSchema,
  name: z.string().optional(),
  method: z.string().optional(),
  url: requestUrlSchema.optional(),
  headers: requestHeadersSchema,
  body: requestBodySchema,
  description: z.string().nullable().optional(),
  folderId: folderIdSchema.optional().nullable(),
  preRequestScript: requestScriptSchema.nullable(),
  afterResponseScript: requestScriptSchema.nullable(),
} as const;

export function registerUpdateRequestTool(server: McpServer): void {
  server.tool(
    "update_request",
    "Update an existing request",
    updateRequestArgs,
    async (args) => {
      const request = await updateRequest({
        collectionId: args.collectionId,
        requestId: args.requestId,
        name: args.name,
        method: args.method,
        url: args.url,
        headers: args.headers,
        body: args.body,
        description: args.description ?? undefined,
        folderId: args.folderId ?? undefined,
        preRequestScript:
          args.preRequestScript === undefined ? undefined : args.preRequestScript,
        afterResponseScript:
          args.afterResponseScript === undefined ? undefined : args.afterResponseScript,
      });
      await server.server.sendResourceUpdated({
        uri: `insomnia://collection/${args.collectionId}`,
      });

      const summary = `✅ Updated request "${request.name}"

Request ID: ${request.id}
Collection: ${args.collectionId}

Updated details:
${JSON.stringify(request, null, 2)}`;

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
