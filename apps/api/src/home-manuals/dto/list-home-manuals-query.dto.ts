import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ListHomeManualsQueryDto {
  @IsOptional()
  @IsString({ message: "카테고리는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "카테고리는 40자 이하로 입력해 주세요." })
  category?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean({ message: "고정 여부를 다시 확인해 주세요." })
  isPinned?: boolean;

  @IsOptional()
  @IsString({ message: "검색어는 문자로 입력해 주세요." })
  @MaxLength(80, { message: "검색어는 80자 이하로 입력해 주세요." })
  search?: string;

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
