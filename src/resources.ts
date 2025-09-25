import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";

import { COLLECTIONS_RESOURCE_URI } from "./constants.js";
import { getCollection, getEnvironment, listCollections } from "./storage.js";

function resolveVariable(variables: Variables | undefined, key: string, fallback: string): string {
  if (!variables) {
    return fallback;
  }
  const value = variables[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

export function registerResources(server: McpServer): void {
  server.resource(
    "collections",
    COLLECTIONS_RESOURCE_URI,
    {
      description: "All Insomnia MCP collections in JSON format",
      mimeType: "application/json",
    },
    async (uri) => {
      const collections = await listCollections();
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(collections, null, 2),
          },
        ],
      };
    }
  );

  const collectionTemplate = new ResourceTemplate("insomnia://collection/{collectionId}", {
    list: async () => {
      const collections = await listCollections();
      return {
        resources: collections.map((collection) => ({
          name: `collection:${collection.id}`,
          uri: `insomnia://collection/${collection.id}`,
          description: collection.description ?? undefined,
          mimeType: "application/json",
        })),
      };
    },
  });

  server.resource(
    "collection",
    collectionTemplate,
    {
      description: "Individual collection details including requests and environments",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const collectionId = resolveVariable(
        variables,
        "collectionId",
        uri.pathname.replace(/^\//, "")
      );
      const collection = await getCollection(collectionId);
      if (!collection) {
        throw new Error(`Collection ${collectionId} not found`);
      }
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(collection, null, 2),
          },
        ],
      };
    }
  );

  const collectionEnvironmentTemplate = new ResourceTemplate(
    "insomnia://collection/{collectionId}/environment",
    {
      list: async () => {
        const collections = await listCollections();
        return {
          resources: collections.map((collection) => ({
            name: `environment:${collection.id}`,
            uri: `insomnia://collection/${collection.id}/environment`,
            description: `Environment variables for ${collection.name}`,
            mimeType: "application/json",
          })),
        };
      },
    }
  );

  server.resource(
    "collection_environment",
    collectionEnvironmentTemplate,
    {
      description: "Environment variables for a specific collection",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const collectionId = resolveVariable(
        variables,
        "collectionId",
        uri.pathname.split("/").filter(Boolean)[1]
      );
      const environment = await getEnvironment(collectionId);
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(environment, null, 2),
          },
        ],
      };
    }
  );
}
