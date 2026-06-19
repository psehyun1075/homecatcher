import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateHouseholdItemDto } from "./dto/create-household-item.dto";
import { FamilyHouseholdItemsParamDto } from "./dto/family-household-items-param.dto";
import { HouseholdItemIdParamDto } from "./dto/household-item-id-param.dto";
import { UpdateHouseholdItemDto } from "./dto/update-household-item.dto";
import { HouseholdItemsService } from "./household-items.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class HouseholdItemsController {
  constructor(@Inject(HouseholdItemsService) private readonly householdItemsService: HouseholdItemsService) {}

  @Get("families/:familyId/household-items")
  listItems(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyHouseholdItemsParamDto) {
    return this.householdItemsService.listItems(user, params.familyId);
  }

  @Post("families/:familyId/household-items")
  createItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: FamilyHouseholdItemsParamDto,
    @Body() dto: CreateHouseholdItemDto,
  ) {
    return this.householdItemsService.createItem(user, params.familyId, dto);
  }

  @Get("household-items/:itemId")
  getItem(@CurrentUser() user: CurrentUserPayload, @Param() params: HouseholdItemIdParamDto) {
    return this.householdItemsService.getItem(user, params.itemId);
  }

  @Patch("household-items/:itemId")
  updateItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: HouseholdItemIdParamDto,
    @Body() dto: UpdateHouseholdItemDto,
  ) {
    return this.householdItemsService.updateItem(user, params.itemId, dto);
  }

  @Delete("household-items/:itemId")
  deleteItem(@CurrentUser() user: CurrentUserPayload, @Param() params: HouseholdItemIdParamDto) {
    return this.householdItemsService.deleteItem(user, params.itemId);
  }
}
