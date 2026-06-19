import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateHouseholdItemDto {
  @IsString({ message: "생필품 이름을 입력해 주세요." })
  @MinLength(1, { message: "생필품 이름을 입력해 주세요." })
  @MaxLength(80, { message: "생필품 이름은 80자 이하로 입력해 주세요." })
  name!: string;

  @IsOptional()
  @IsString({ message: "카테고리를 문자로 입력해 주세요." })
  @MaxLength(40, { message: "카테고리는 40자 이하로 입력해 주세요." })
  category?: string;

  @IsOptional()
  @IsString({ message: "단위를 문자로 입력해 주세요." })
  @MaxLength(20, { message: "단위는 20자 이하로 입력해 주세요." })
  unit?: string;

  @IsOptional()
  @IsInt({ message: "최소 재고는 숫자로 입력해 주세요." })
  @Min(0, { message: "최소 재고는 0 이상이어야 해요." })
  @Max(9999, { message: "최소 재고가 너무 커요." })
  minStock?: number;

  @IsOptional()
  @IsInt({ message: "예상 사용 주기는 숫자로 입력해 주세요." })
  @Min(1, { message: "예상 사용 주기는 1일 이상이어야 해요." })
  @Max(3650, { message: "예상 사용 주기가 너무 길어요." })
  cycleDays?: number;

  @IsOptional()
  @IsString({ message: "메모를 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  memo?: string;
}
