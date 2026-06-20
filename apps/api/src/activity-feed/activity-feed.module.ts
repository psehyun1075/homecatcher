import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { ActivityFeedController } from "./activity-feed.controller";
import { ActivityFeedService } from "./activity-feed.service";
import { ActivityWriterService } from "./activity-writer.service";

@Module({
  imports: [PrismaModule],
  controllers: [ActivityFeedController],
  providers: [ActivityFeedService, ActivityWriterService],
  exports: [ActivityWriterService],
})
export class ActivityFeedModule {}
