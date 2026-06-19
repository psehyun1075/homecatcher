import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { HouseholdItemsController } from "./household-items.controller";
import { HouseholdItemsService } from "./household-items.service";

@Module({
  imports: [PrismaModule],
  controllers: [HouseholdItemsController],
  providers: [HouseholdItemsService],
  exports: [HouseholdItemsService],
})
export class HouseholdItemsModule {}
