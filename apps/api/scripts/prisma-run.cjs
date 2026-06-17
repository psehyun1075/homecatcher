#!/usr/bin/env node

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { config } = require("dotenv");

const rootEnvPath = path.resolve(__dirname, "../../../.env");
config({ path: rootEnvPath });

const engineRoot = path.resolve(
  __dirname,
  "../../../node_modules/.pnpm/@prisma+engines@6.19.3/node_modules/@prisma/engines"
);

const env = {
  ...process.env,
  XDG_CACHE_HOME: "/tmp",
  PRISMA_QUERY_ENGINE_LIBRARY: path.join(
    engineRoot,
    "libquery_engine-rhel-openssl-3.0.x.so.node"
  ),
  PRISMA_SCHEMA_ENGINE_BINARY: path.join(engineRoot, "schema-engine-rhel-openssl-3.0.x"),
};

const result = spawnSync("prisma", process.argv.slice(2), {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
