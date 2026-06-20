import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ActivityFeedService } from "./activity-feed.service";
import { ActivityParamDto } from "./dto/activity-param.dto";
import { FamilyFeedParamDto } from "./dto/family-feed-param.dto";
import { ListFeedQueryDto } from "./dto/list-feed-query.dto";

@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityFeedController {
  constructor(@Inject(ActivityFeedService) private readonly activityFeedService: ActivityFeedService) {}

  @Get("families/:familyId/feed")
  listFeed(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyFeedParamDto, @Query() query: ListFeedQueryDto) {
    return this.activityFeedService.listFeed(user, params.familyId, query);
  }

  @Get("activities/:activityId")
  getActivity(@CurrentUser() user: CurrentUserPayload, @Param() params: ActivityParamDto) {
    return this.activityFeedService.getActivity(user, params.activityId);
  }
}
