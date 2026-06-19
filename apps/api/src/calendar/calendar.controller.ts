import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CalendarService } from "./calendar.service";
import { CalendarDayQueryDto } from "./dto/calendar-day-query.dto";
import { CalendarMonthQueryDto } from "./dto/calendar-month-query.dto";
import { CalendarParamDto } from "./dto/calendar-param.dto";

@UseGuards(JwtAuthGuard)
@Controller()
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendarService: CalendarService) {}

  @Get("families/:familyId/calendar/month")
  getMonth(@CurrentUser() user: CurrentUserPayload, @Param() params: CalendarParamDto, @Query() query: CalendarMonthQueryDto) {
    return this.calendarService.getMonth(user, params.familyId, query);
  }

  @Get("families/:familyId/calendar/day")
  getDay(@CurrentUser() user: CurrentUserPayload, @Param() params: CalendarParamDto, @Query() query: CalendarDayQueryDto) {
    return this.calendarService.getDay(user, params.familyId, query);
  }
}
