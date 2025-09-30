import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json"],
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.config.ts",
        "**/types.ts",
        "src/index.ts", // Entry point, hard to test
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
    },
    // Prevent test isolation issues
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
