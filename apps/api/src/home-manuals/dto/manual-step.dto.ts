import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class ManualStepDto {
  @IsString({ message: "단계 제목을 입력해 주세요." })
  @MinLength(1, { message: "단계 제목을 입력해 주세요." })
  @MaxLength(200, { message: "단계 제목은 200자 이하로 입력해 주세요." })
  title!: string;

  @IsOptional()
  @IsString({ message: "단계 설명은 문자로 입력해 주세요." })
  @MaxLength(1000, { message: "단계 설명은 1000자 이하로 입력해 주세요." })
  description?: string | null;

  @IsOptional()
  @IsString({ message: "주의사항은 문자로 입력해 주세요." })
  @MaxLength(500, { message: "주의사항은 500자 이하로 입력해 주세요." })
  warning?: string | null;

  @IsOptional()
  @IsString({ message: "미디어 URL은 문자로 입력해 주세요." })
  @MaxLength(1000, { message: "미디어 URL은 1000자 이하로 입력해 주세요." })
  mediaUrl?: string | null;

  @IsOptional()
  @IsInt({ message: "단계 순서는 숫자로 입력해 주세요." })
  @Min(1, { message: "단계 순서는 1 이상이어야 해요." })
  @Max(9999, { message: "단계 순서가 너무 커요." })
  sortOrder?: number;
}
