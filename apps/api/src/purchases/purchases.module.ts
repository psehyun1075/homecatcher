import { Module } from "@nestjs/common";

import { AccountbookModule } from "../accountbook/accountbook.module";
import { HouseholdItemsModule } from "../household-items/household-items.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchasesController } from "./purchases.controller";
import { PurchasesService } from "./purchases.service";

@Module({
  imports: [PrismaModule, HouseholdItemsModule, AccountbookModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
