import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { AccountbookModule } from "./accountbook/accountbook.module";
import { HealthController } from "./health/health.controller";
import { FamiliesModule } from "./families/families.module";
import { HouseholdItemsModule } from "./household-items/household-items.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductLinksModule } from "./product-links/product-links.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FamiliesModule,
    TemplatesModule,
    HouseholdItemsModule,
    ProductLinksModule,
    AccountbookModule,
    PurchasesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
