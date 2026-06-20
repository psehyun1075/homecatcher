import { Module } from "@nestjs/common";

import { AccountbookModule } from "../accountbook/accountbook.module";
import { ActivityFeedModule } from "../activity-feed/activity-feed.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FixedExpensesController } from "./fixed-expenses.controller";
import { FixedExpensesService } from "./fixed-expenses.service";

@Module({
  imports: [PrismaModule, AccountbookModule, ActivityFeedModule],
  controllers: [FixedExpensesController],
  providers: [FixedExpensesService],
  exports: [FixedExpensesService],
})
export class FixedExpensesModule {}
