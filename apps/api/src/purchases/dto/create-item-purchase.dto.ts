import { IsBoolean, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateItemPurchaseDto {
  @IsUUID("4", { message: "구매 요청 정보를 다시 확인해 주세요." })
  requestId!: string;

  @IsOptional()
  @IsUUID("4", { message: "상품 URL 정보를 다시 확인해 주세요." })
  productLinkId?: string | null;

  @IsOptional()
  @IsNumber({}, { message: "수량을 확인해 주세요." })
  @Min(0.01, { message: "수량은 0보다 커야 해요." })
  quantity?: number;

  @IsOptional()
  @IsNumber({}, { message: "구매 금액을 확인해 주세요." })
  @Min(1, { message: "구매 금액을 확인해 주세요." })
  unitPrice?: number;

  @IsNumber({}, { message: "구매 금액을 확인해 주세요." })
  @Min(1, { message: "구매 금액을 확인해 주세요." })
  totalAmount!: number;

  @IsOptional()
  @IsString({ message: "통화는 문자로 입력해 주세요." })
  @MaxLength(3, { message: "통화는 3자 코드로 입력해 주세요." })
  currency?: string = "KRW";

  @IsOptional()
  @IsISO8601({}, { message: "구매일을 다시 확인해 주세요." })
  purchasedAt?: string;

  @IsOptional()
  @IsNumber({}, { message: "구매 후 재고를 숫자로 입력해 주세요." })
  @Min(0, { message: "구매 후 재고는 0 이상이어야 해요." })
  stockAfterPurchase?: number;

  @IsOptional()
  @IsString({ message: "메모를 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  note?: string;

  @IsOptional()
  @IsBoolean({ message: "가족 확인 여부를 다시 확인해 주세요." })
  confirmRuleOverride?: boolean = false;
}
