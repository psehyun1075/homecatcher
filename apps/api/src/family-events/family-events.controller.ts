import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateFamilyEventDto } from "./dto/create-family-event.dto";
import { FamilyEventParamDto } from "./dto/family-event-param.dto";
import { FamilyEventsParamDto } from "./dto/family-events-param.dto";
import { ListFamilyEventsQueryDto } from "./dto/list-family-events-query.dto";
import { UpdateFamilyEventDto } from "./dto/update-family-event.dto";
import { FamilyEventsService } from "./family-events.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class FamilyEventsController {
  constructor(@Inject(FamilyEventsService) private readonly familyEventsService: FamilyEventsService) {}

  @Get("families/:familyId/events")
  listEvents(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyEventsParamDto, @Query() query: ListFamilyEventsQueryDto) {
    return this.familyEventsService.listEvents(user, params.familyId, query);
  }

  @Post("families/:familyId/events")
  createEvent(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyEventsParamDto, @Body() dto: CreateFamilyEventDto) {
    return this.familyEventsService.createEvent(user, params.familyId, dto);
  }

  @Get("events/:eventId")
  getEvent(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyEventParamDto) {
    return this.familyEventsService.getEvent(user, params.eventId);
  }

  @Patch("events/:eventId")
  updateEvent(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyEventParamDto, @Body() dto: UpdateFamilyEventDto) {
    return this.familyEventsService.updateEvent(user, params.eventId, dto);
  }

  @Delete("events/:eventId")
  deleteEvent(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyEventParamDto) {
    return this.familyEventsService.deleteEvent(user, params.eventId);
  }
}
