import { Module } from "@nestjs/common";

import { ActivityFeedModule } from "../activity-feed/activity-feed.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationSyncService } from "./notification-sync.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule, ActivityFeedModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSyncService],
  exports: [NotificationSyncService],
})
export class NotificationsModule {}
