import { Module } from "@nestjs/common";

import { AccountbookModule } from "../accountbook/accountbook.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FixedExpensesController } from "./fixed-expenses.controller";
import { FixedExpensesService } from "./fixed-expenses.service";

@Module({
  imports: [PrismaModule, AccountbookModule],
  controllers: [FixedExpensesController],
  providers: [FixedExpensesService],
  exports: [FixedExpensesService],
})
export class FixedExpensesModule {}
