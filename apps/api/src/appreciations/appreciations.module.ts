import { Module } from "@nestjs/common";

import { ActivityFeedModule } from "../activity-feed/activity-feed.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AppreciationsController } from "./appreciations.controller";
import { AppreciationsService } from "./appreciations.service";

@Module({
  imports: [PrismaModule, ActivityFeedModule],
  controllers: [AppreciationsController],
  providers: [AppreciationsService],
})
export class AppreciationsModule {}
