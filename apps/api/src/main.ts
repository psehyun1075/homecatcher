import "reflect-metadata";

import { config as loadEnv } from "dotenv";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  loadEnv({ path: "../../.env" });

  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn"],
  });

  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();

  const host = process.env.API_HOST ?? "0.0.0.0";
  const port = Number(process.env.API_PORT ?? "3000");

  await app.listen(port, host);
}

void bootstrap();
