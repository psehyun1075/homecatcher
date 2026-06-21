import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListFixedExpensesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "페이지는 숫자로 입력해 주세요." })
  @Min(1, { message: "페이지는 1 이상이어야 해요." })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "목록 개수는 숫자로 입력해 주세요." })
  @Min(1, { message: "목록 개수는 1 이상이어야 해요." })
  @Max(100, { message: "목록은 한 번에 100개까지만 볼 수 있어요." })
  limit?: number = 20;
}
