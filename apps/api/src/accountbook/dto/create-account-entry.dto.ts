import { AccountEntryType } from "@prisma/client";
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateAccountEntryDto {
  @IsUUID("4", { message: "가계부 카테고리를 다시 확인해 주세요." })
  categoryId!: string;

  @IsEnum(AccountEntryType, { message: "가계부 유형을 다시 확인해 주세요." })
  entryType!: AccountEntryType;

  @IsNumber({}, { message: "구매 금액을 확인해 주세요." })
  @Min(1, { message: "구매 금액을 확인해 주세요." })
  amount!: number;

  @IsOptional()
  @IsString({ message: "통화는 문자로 입력해 주세요." })
  @MaxLength(3, { message: "통화는 3자 코드로 입력해 주세요." })
  currency?: string = "KRW";

  @IsISO8601({}, { message: "지출일을 다시 확인해 주세요." })
  occurredAt!: string;

  @IsString({ message: "제목을 입력해 주세요." })
  @MaxLength(80, { message: "제목은 80자 이하로 입력해 주세요." })
  title!: string;

  @IsOptional()
  @IsString({ message: "메모를 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  memo?: string;
}
