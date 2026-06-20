import { Module } from "@nestjs/common";

import { ActivityFeedModule } from "../activity-feed/activity-feed.module";
import { PrismaModule } from "../prisma/prisma.module";
import { HomeManualsController } from "./home-manuals.controller";
import { HomeManualsService } from "./home-manuals.service";

@Module({
  imports: [PrismaModule, ActivityFeedModule],
  controllers: [HomeManualsController],
  providers: [HomeManualsService],
})
export class HomeManualsModule {}
