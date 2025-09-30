import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Read version from package.json to keep it in sync
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, "../package.json"), "utf-8")
);

export const COLLECTIONS_RESOURCE_URI = "insomnia://collections";

export const SERVER_INFO = {
  name: "insomnia-mcp",
  version: packageJson.version,
  description: "MCP server exposing Insomnia collections and actions",
} as const;

export const SERVER_INSTRUCTIONS =
  "Use the tools to manage collections, requests, and environment variables. Resources expose Insomnia-compatible JSON exports.";
