import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { config as loadEnv } from "dotenv";

import { AppModule } from "../src/app.module";
import { NotificationSyncService } from "../src/notifications/notification-sync.service";

function readNowArg() {
  const cliNow = process.argv.find((arg) => arg.startsWith("--now="))?.slice("--now=".length);
  const value = cliNow ?? process.env.NOTIFICATION_SYNC_NOW;
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("--now 값은 ISO 8601 날짜여야 합니다.");
  }
  return date;
}

async function main() {
  loadEnv({ path: "../../.env" });
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn", "log"] });
  const service = app.get(NotificationSyncService);
  const result = await service.sync({ now: readNowArg() });
  console.log(JSON.stringify({ plannedCount: result.plannedCount }, null, 2));
  await app.close();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
