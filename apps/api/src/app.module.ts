import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { FamiliesModule } from "./families/families.module";
import { HouseholdItemsModule } from "./household-items/household-items.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductLinksModule } from "./product-links/product-links.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [PrismaModule, AuthModule, FamiliesModule, TemplatesModule, HouseholdItemsModule, ProductLinksModule],
  controllers: [HealthController],
})
export class AppModule {}
