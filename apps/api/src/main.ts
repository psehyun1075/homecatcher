import "reflect-metadata";

import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { config as loadEnv } from "dotenv";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

function validateEnvironment() {
  const requiredVariables = ["DATABASE_URL", "REDIS_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  const missing = requiredVariables.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`필수 환경변수가 없어요: ${missing.join(", ")}`);
  }

  if (process.env.NODE_ENV === "production" && (process.env.CORS_ORIGINS ?? "").split(",").map((origin) => origin.trim()).includes("*")) {
    throw new Error("production에서는 CORS_ORIGINS에 *를 사용할 수 없어요.");
  }
}

function getAllowedCorsOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    return [
      ...configuredOrigins,
      "http://localhost:19006",
      "http://127.0.0.1:19006",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
    ];
  }

  return configuredOrigins;
}

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
  loadEnv({ path: ".env", override: false });
  validateEnvironment();

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
  const allowedCorsOrigins = getAllowedCorsOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin is not allowed"), false);
    },
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });
  app.enableShutdownHooks();

  const host = process.env.API_HOST ?? "0.0.0.0";
  const port = Number(process.env.API_PORT ?? "3000");

  await app.listen(port, host);
}

void bootstrap();
