import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateProductLinkDto } from "./dto/create-product-link.dto";
import { HouseholdItemProductLinkParamDto } from "./dto/household-item-product-link-param.dto";
import { PreviewProductLinkDto } from "./dto/preview-product-link.dto";
import { ProductLinkIdParamDto } from "./dto/product-link-id-param.dto";
import { UpdateProductLinkDto } from "./dto/update-product-link.dto";
import { ProductLinksService } from "./product-links.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class ProductLinksController {
  constructor(@Inject(ProductLinksService) private readonly productLinksService: ProductLinksService) {}

  @Post("product-links/preview")
  preview(@Body() dto: PreviewProductLinkDto) {
    return this.productLinksService.preview(dto);
  }

  @Post("household-items/:itemId/product-links")
  createProductLink(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: HouseholdItemProductLinkParamDto,
    @Body() dto: CreateProductLinkDto,
  ) {
    return this.productLinksService.createProductLink(user, params.itemId, dto);
  }

  @Patch("product-links/:productLinkId")
  updateProductLink(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: ProductLinkIdParamDto,
    @Body() dto: UpdateProductLinkDto,
  ) {
    return this.productLinksService.updateProductLink(user, params.productLinkId, dto);
  }

  @Post("product-links/:productLinkId/refresh")
  refreshProductLink(@CurrentUser() user: CurrentUserPayload, @Param() params: ProductLinkIdParamDto) {
    return this.productLinksService.refreshProductLink(user, params.productLinkId);
  }

  @Get("household-items/:itemId/reorder-preview")
  getReorderPreview(@CurrentUser() user: CurrentUserPayload, @Param() params: HouseholdItemProductLinkParamDto) {
    return this.productLinksService.getReorderPreview(user, params.itemId);
  }
}
