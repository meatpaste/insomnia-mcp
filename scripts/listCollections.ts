import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./dist/index.js"],
    stderr: "pipe",
  });

  const stderr = transport.stderr;
  if (stderr) {
    stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
  }

  const client = new Client({
    name: "insomnia-mcp-cli",
    version: "0.1.0",
  }, {
    capabilities: {
      tools: {},
    },
  });

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "list_collections",
    });

    const textItems = (result.content ?? []).filter(
      (item): item is { type: "text"; text: string } => item.type === "text",
    );

    if (textItems.length === 0) {
      console.log("[]");
      return;
    }

    for (const item of textItems) {
      const trimmed = item.text.trim();
      try {
        const parsed = JSON.parse(trimmed);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(trimmed);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
