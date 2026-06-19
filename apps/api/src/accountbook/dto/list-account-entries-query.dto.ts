import { AccountEntryType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsUUID, Matches, Max, Min } from "class-validator";

export class ListAccountEntriesQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "조회할 월은 YYYY-MM 형식으로 입력해 주세요." })
  month?: string;

  @IsOptional()
  @IsUUID("4", { message: "가계부 카테고리를 다시 확인해 주세요." })
  categoryId?: string;

  @IsOptional()
  @IsEnum(AccountEntryType, { message: "가계부 유형을 다시 확인해 주세요." })
  entryType?: AccountEntryType;

  @IsOptional()
  @IsInt({ message: "페이지는 숫자로 입력해 주세요." })
  @Min(1, { message: "페이지는 1 이상이어야 해요." })
  page?: number = 1;

  @IsOptional()
  @IsInt({ message: "목록 개수는 숫자로 입력해 주세요." })
  @Min(1, { message: "목록 개수는 1 이상이어야 해요." })
  @Max(100, { message: "목록은 한 번에 100개까지만 볼 수 있어요." })
  limit?: number = 20;
}
