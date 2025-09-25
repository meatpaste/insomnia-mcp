import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ensureSampleData } from "./storage.js";
import { createServer } from "./server.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";

async function main(): Promise<void> {
  await ensureSampleData();

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
