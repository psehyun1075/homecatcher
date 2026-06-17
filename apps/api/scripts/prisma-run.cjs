#!/usr/bin/env node

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { config } = require("dotenv");

const rootEnvPath = path.resolve(__dirname, "../../../.env");
config({ path: rootEnvPath, override: false });

const engineRoot = path.resolve(
  __dirname,
  "../../../node_modules/.pnpm/@prisma+engines@6.19.3/node_modules/@prisma/engines"
);

function resolveEngineFile(candidates) {
  for (const candidate of candidates) {
    const resolved = path.join(engineRoot, candidate);

    try {
      require("node:fs").accessSync(resolved);
      return resolved;
    } catch {
      continue;
    }
  }

  return path.join(engineRoot, candidates[0]);
}

const env = {
  ...process.env,
  XDG_CACHE_HOME: "/tmp",
  PRISMA_QUERY_ENGINE_LIBRARY: resolveEngineFile([
    "libquery_engine-rhel-openssl-3.0.x.so.node",
    "libquery_engine-debian-openssl-1.1.x.so.node",
  ]),
  PRISMA_SCHEMA_ENGINE_BINARY: resolveEngineFile([
    "schema-engine-rhel-openssl-3.0.x",
    "schema-engine-debian-openssl-1.1.x",
  ]),
};

const result = spawnSync("prisma", process.argv.slice(2), {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
