import { IsUUID } from "class-validator";

export class ProductLinkIdParamDto {
  @IsUUID("4", { message: "상품 URL 정보를 다시 확인해 주세요." })
  productLinkId!: string;
}
