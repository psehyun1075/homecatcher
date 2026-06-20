import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppreciationsService } from "./appreciations.service";
import { ActivityAppreciationParamDto } from "./dto/activity-appreciation-param.dto";
import { AppreciationParamDto } from "./dto/appreciation-param.dto";
import { CreateAppreciationDto } from "./dto/create-appreciation.dto";

@UseGuards(JwtAuthGuard)
@Controller()
export class AppreciationsController {
  constructor(@Inject(AppreciationsService) private readonly appreciationsService: AppreciationsService) {}

  @Post("activities/:activityId/appreciations")
  createAppreciation(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: ActivityAppreciationParamDto,
    @Body() dto: CreateAppreciationDto,
  ) {
    return this.appreciationsService.createAppreciation(user, params.activityId, dto);
  }

  @Get("activities/:activityId/appreciations")
  listAppreciations(@CurrentUser() user: CurrentUserPayload, @Param() params: ActivityAppreciationParamDto) {
    return this.appreciationsService.listAppreciations(user, params.activityId);
  }

  @Delete("appreciations/:appreciationId")
  deleteAppreciation(@CurrentUser() user: CurrentUserPayload, @Param() params: AppreciationParamDto) {
    return this.appreciationsService.deleteAppreciation(user, params.appreciationId);
  }
}
