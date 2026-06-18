import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { FamiliesModule } from "./families/families.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [PrismaModule, AuthModule, FamiliesModule, TemplatesModule],
  controllers: [HealthController],
})
export class AppModule {}
