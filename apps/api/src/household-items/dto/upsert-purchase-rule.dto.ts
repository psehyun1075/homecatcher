import { SubstitutionPolicy } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpsertPurchaseRuleDto {
  @IsOptional()
  @IsBoolean({ message: "정확히 같은 상품만 살지 다시 확인해 주세요." })
  exactOnly?: boolean;

  @IsOptional()
  @IsEnum(SubstitutionPolicy, { message: "대체 구매 기준을 다시 확인해 주세요." })
  substitutionPolicy?: SubstitutionPolicy;

  @IsOptional()
  @IsNumber({}, { message: "구매 금액을 확인해 주세요." })
  @Min(1, { message: "구매 금액을 확인해 주세요." })
  priceLimit?: number;

  @IsOptional()
  @IsString({ message: "배송 조건은 문자로 입력해 주세요." })
  @MaxLength(200, { message: "배송 조건은 200자 이하로 입력해 주세요." })
  deliveryCondition?: string;

  @IsOptional()
  @IsInt({ message: "재주문 기준 재고는 숫자로 입력해 주세요." })
  @Min(0, { message: "재주문 기준 재고는 0 이상이어야 해요." })
  @Max(9999, { message: "재주문 기준 재고가 너무 커요." })
  reorderThreshold?: number;

  @IsOptional()
  @IsNumber({}, { message: "가족 확인 금액을 확인해 주세요." })
  @Min(1, { message: "가족 확인 금액을 확인해 주세요." })
  approvalRequiredAbove?: number;

  @IsOptional()
  @IsString({ message: "메모는 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  note?: string;
}
