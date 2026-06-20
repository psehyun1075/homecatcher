import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { NotificationParamDto } from "./dto/notification-param.dto";
import { ReadAllNotificationsDto } from "./dto/read-all-notifications.dto";
import { UnreadCountQueryDto } from "./dto/unread-count-query.dto";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Get("notifications")
  listNotifications(@CurrentUser() user: CurrentUserPayload, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.listNotifications(user, query);
  }

  @Get("notifications/unread-count")
  getUnreadCount(@CurrentUser() user: CurrentUserPayload, @Query() query: UnreadCountQueryDto) {
    return this.notificationsService.getUnreadCount(user, query.familyId);
  }

  @Get("notifications/:notificationId")
  getNotification(@CurrentUser() user: CurrentUserPayload, @Param() params: NotificationParamDto) {
    return this.notificationsService.getNotification(user, params.notificationId);
  }

  @Patch("notifications/:notificationId/read")
  markRead(@CurrentUser() user: CurrentUserPayload, @Param() params: NotificationParamDto) {
    return this.notificationsService.markRead(user, params.notificationId);
  }

  @Post("notifications/read-all")
  readAll(@CurrentUser() user: CurrentUserPayload, @Body() dto: ReadAllNotificationsDto) {
    return this.notificationsService.readAll(user, dto);
  }

  @Patch("notifications/:notificationId/archive")
  archive(@CurrentUser() user: CurrentUserPayload, @Param() params: NotificationParamDto) {
    return this.notificationsService.archive(user, params.notificationId);
  }
}
