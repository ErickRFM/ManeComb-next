import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Load local secrets with node --env-file=.env.local; never rewrite the env file.
const uri = process.env.MONGODB_URI;
const authority = uri?.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/[^?]*)?(\?.*)?$/);
if (!authority || !process.env.REDIS_URL) throw new Error("MongoDB and Redis are required for local integration QA");
const database = "manecomb_qa_" + randomUUID().replaceAll("-", "").slice(0, 20);
const result = spawnSync(process.execPath, [fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url)), "run", "--config", "vitest.integration.config.ts"], {
  stdio: "inherit",
  env: { ...process.env, MONGODB_URI: authority[1] + "/" + database + (authority[2] || ""), AUTH_SECRET: process.env.AUTH_SECRET || randomUUID().repeat(2) }
});
process.exit(result.status ?? 1);
