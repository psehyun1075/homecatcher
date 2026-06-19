import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { HouseholdItemIdParamDto } from "../household-items/dto/household-item-id-param.dto";
import { CreateItemPurchaseDto } from "./dto/create-item-purchase.dto";
import { PurchaseIdParamDto } from "./dto/purchase-id-param.dto";
import { PurchasesService } from "./purchases.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchasesService: PurchasesService) {}

  @Post("household-items/:itemId/purchases")
  createPurchase(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: HouseholdItemIdParamDto,
    @Body() dto: CreateItemPurchaseDto,
  ) {
    return this.purchasesService.createPurchase(user, params.itemId, dto);
  }

  @Get("household-items/:itemId/purchases")
  listPurchases(@CurrentUser() user: CurrentUserPayload, @Param() params: HouseholdItemIdParamDto) {
    return this.purchasesService.listPurchases(user, params.itemId);
  }

  @Get("purchases/:purchaseId")
  getPurchase(@CurrentUser() user: CurrentUserPayload, @Param() params: PurchaseIdParamDto) {
    return this.purchasesService.getPurchase(user, params.purchaseId);
  }
}
