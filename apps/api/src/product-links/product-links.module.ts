import { Module } from "@nestjs/common";

import { HouseholdItemsModule } from "../household-items/household-items.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ProductLinksController } from "./product-links.controller";
import { ProductLinksService } from "./product-links.service";
import { ProductPreviewService } from "./product-preview.service";

@Module({
  imports: [PrismaModule, HouseholdItemsModule],
  controllers: [ProductLinksController],
  providers: [ProductLinksService, ProductPreviewService],
})
export class ProductLinksModule {}
