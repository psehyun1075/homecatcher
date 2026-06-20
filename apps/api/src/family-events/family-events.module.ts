import { Module } from "@nestjs/common";

import { ActivityFeedModule } from "../activity-feed/activity-feed.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FamilyEventsController } from "./family-events.controller";
import { FamilyEventsService } from "./family-events.service";

@Module({
  imports: [PrismaModule, ActivityFeedModule],
  controllers: [FamilyEventsController],
  providers: [FamilyEventsService],
  exports: [FamilyEventsService],
})
export class FamilyEventsModule {}
