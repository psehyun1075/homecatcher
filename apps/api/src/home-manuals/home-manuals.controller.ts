import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateHomeManualDto } from "./dto/create-home-manual.dto";
import { CreateManualRelationDto } from "./dto/create-manual-relation.dto";
import { FamilyHomeManualsParamDto } from "./dto/family-home-manuals-param.dto";
import { HomeManualParamDto } from "./dto/home-manual-param.dto";
import { ListHomeManualsQueryDto } from "./dto/list-home-manuals-query.dto";
import { ManualRelationParamDto } from "./dto/manual-relation-param.dto";
import { ManualStepParamDto } from "./dto/manual-step-param.dto";
import { ManualStepDto } from "./dto/manual-step.dto";
import { ReorderManualStepsDto } from "./dto/reorder-manual-steps.dto";
import { UpdateHomeManualDto } from "./dto/update-home-manual.dto";
import { HomeManualsService } from "./home-manuals.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class HomeManualsController {
  constructor(@Inject(HomeManualsService) private readonly homeManualsService: HomeManualsService) {}

  @Get("families/:familyId/home-manuals")
  listManuals(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: FamilyHomeManualsParamDto,
    @Query() query: ListHomeManualsQueryDto,
  ) {
    return this.homeManualsService.listManuals(user, params.familyId, query);
  }

  @Post("families/:familyId/home-manuals")
  createManual(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: FamilyHomeManualsParamDto,
    @Body() dto: CreateHomeManualDto,
  ) {
    return this.homeManualsService.createManual(user, params.familyId, dto);
  }

  @Get("home-manuals/:manualId")
  getManual(@CurrentUser() user: CurrentUserPayload, @Param() params: HomeManualParamDto) {
    return this.homeManualsService.getManual(user, params.manualId);
  }

  @Patch("home-manuals/:manualId")
  updateManual(@CurrentUser() user: CurrentUserPayload, @Param() params: HomeManualParamDto, @Body() dto: UpdateHomeManualDto) {
    return this.homeManualsService.updateManual(user, params.manualId, dto);
  }

  @Delete("home-manuals/:manualId")
  deleteManual(@CurrentUser() user: CurrentUserPayload, @Param() params: HomeManualParamDto) {
    return this.homeManualsService.deleteManual(user, params.manualId);
  }

  @Get("home-manuals/:manualId/steps")
  listSteps(@CurrentUser() user: CurrentUserPayload, @Param() params: HomeManualParamDto) {
    return this.homeManualsService.listSteps(user, params.manualId);
  }

  @Post("home-manuals/:manualId/steps")
  createStep(@CurrentUser() user: CurrentUserPayload, @Param() params: HomeManualParamDto, @Body() dto: ManualStepDto) {
    return this.homeManualsService.createStep(user, params.manualId, dto);
  }

  @Patch("manual-steps/:stepId")
  updateStep(@CurrentUser() user: CurrentUserPayload, @Param() params: ManualStepParamDto, @Body() dto: ManualStepDto) {
    return this.homeManualsService.updateStep(user, params.stepId, dto);
  }

  @Delete("manual-steps/:stepId")
  deleteStep(@CurrentUser() user: CurrentUserPayload, @Param() params: ManualStepParamDto) {
    return this.homeManualsService.deleteStep(user, params.stepId);
  }

  @Put("home-manuals/:manualId/steps/reorder")
  reorderSteps(@CurrentUser() user: CurrentUserPayload, @Param() params: HomeManualParamDto, @Body() dto: ReorderManualStepsDto) {
    return this.homeManualsService.reorderSteps(user, params.manualId, dto);
  }

  @Post("home-manuals/:manualId/relations")
  createRelation(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: HomeManualParamDto,
    @Body() dto: CreateManualRelationDto,
  ) {
    return this.homeManualsService.createRelation(user, params.manualId, dto);
  }

  @Get("home-manuals/:manualId/relations")
  listRelations(@CurrentUser() user: CurrentUserPayload, @Param() params: HomeManualParamDto) {
    return this.homeManualsService.listRelations(user, params.manualId);
  }

  @Delete("manual-relations/:relationId")
  deleteRelation(@CurrentUser() user: CurrentUserPayload, @Param() params: ManualRelationParamDto) {
    return this.homeManualsService.deleteRelation(user, params.relationId);
  }
}
