import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { HomeManualsController } from "./home-manuals.controller";
import { HomeManualsService } from "./home-manuals.service";

@Module({
  imports: [PrismaModule],
  controllers: [HomeManualsController],
  providers: [HomeManualsService],
})
export class HomeManualsModule {}
