import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { FamiliesModule } from "./families/families.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule, FamiliesModule],
  controllers: [HealthController],
})
export class AppModule {}
