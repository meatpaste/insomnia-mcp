/**
 * Insomnia MCP Server
 *
 * This server provides Model Context Protocol (MCP) tools for managing
 * Insomnia collections, requests, folders, and environment variables.
 *
 * The server reads and writes directly to Insomnia's NDJSON database files,
 * allowing AI agents to create and modify API collections.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ensureSampleData } from "./storage.js";
import { createServer } from "./server.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { startHttpServer } from "./httpServer.js";

/**
 * Main server entry point
 */
async function main(): Promise<void> {
  await ensureSampleData();

  // Start HTTP server for Insomnia plugin integration
  await startHttpServer();

  const server = createServer();
  registerTools(server);
  registerResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
