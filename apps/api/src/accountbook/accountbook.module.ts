import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { AccountbookController } from "./accountbook.controller";
import { AccountbookService } from "./accountbook.service";

@Module({
  imports: [PrismaModule],
  controllers: [AccountbookController],
  providers: [AccountbookService],
  exports: [AccountbookService],
})
export class AccountbookModule {}
