import "reflect-metadata";

import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { config as loadEnv } from "dotenv";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

function extractValidationMessage(errors: Array<{ constraints?: Record<string, string>; children?: unknown[] }>): string {
  for (const error of errors) {
    if (error.constraints) {
      const messages = Object.values(error.constraints);

      if (messages.length > 0) {
        return messages[0];
      }
    }
  }

  return "입력값을 다시 확인해 주세요.";
}

async function bootstrap() {
  loadEnv({ path: "../../.env" });

  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: extractValidationMessage(errors),
        }),
    }),
  );
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();

  const host = process.env.API_HOST ?? "0.0.0.0";
  const port = Number(process.env.API_PORT ?? "3000");

  await app.listen(port, host);
}

void bootstrap();
