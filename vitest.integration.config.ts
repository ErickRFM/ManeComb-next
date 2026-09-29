import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve:{alias:{"@":fileURLToPath(new URL(".",import.meta.url))}},
  test:{
    environment:"node",
    include:["test/integration/**/*.integration.ts"],
    fileParallelism:false,
    testTimeout:20_000,
    hookTimeout:20_000
  }
});
