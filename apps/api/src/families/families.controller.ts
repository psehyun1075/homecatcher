import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateFamilyDto } from "./dto/create-family.dto";
import { FamilyIdParamDto } from "./dto/family-id-param.dto";
import { InviteCodeParamDto } from "./dto/invite-code-param.dto";
import { FamiliesService } from "./families.service";

@Controller()
export class FamiliesController {
  constructor(@Inject(FamiliesService) private readonly familiesService: FamiliesService) {}

  @UseGuards(JwtAuthGuard)
  @Post("families")
  createFamily(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateFamilyDto) {
    return this.familiesService.createFamily(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("families")
  listFamilies(@CurrentUser() user: CurrentUserPayload) {
    return this.familiesService.listFamilies(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get("families/:familyId")
  getFamily(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyIdParamDto) {
    return this.familiesService.getFamily(user, params.familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("families/:familyId/members")
  listMembers(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyIdParamDto) {
    return this.familiesService.listMembers(user, params.familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("families/:familyId/invites")
  createInvite(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyIdParamDto) {
    return this.familiesService.createInvite(user, params.familyId);
  }

  @Get("invites/:inviteCode")
  getInvite(@Param() params: InviteCodeParamDto) {
    return this.familiesService.getInvite(params.inviteCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post("invites/:inviteCode/accept")
  acceptInvite(@CurrentUser() user: CurrentUserPayload, @Param() params: InviteCodeParamDto) {
    return this.familiesService.acceptInvite(user, params.inviteCode);
  }
}
