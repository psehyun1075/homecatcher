import { Module } from "@nestjs/common";

import { ActivityFeedModule } from "../activity-feed/activity-feed.module";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TemplatesController } from "./templates.controller";
import { TemplatesService } from "./templates.service";

@Module({
  imports: [PrismaModule, AuthModule, ActivityFeedModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
