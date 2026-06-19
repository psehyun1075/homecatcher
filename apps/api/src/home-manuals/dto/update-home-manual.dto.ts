import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateHomeManualDto {
  @IsOptional()
  @IsString({ message: "우리집 매뉴얼 제목을 입력해 주세요." })
  @MinLength(1, { message: "우리집 매뉴얼 제목을 입력해 주세요." })
  @MaxLength(120, { message: "우리집 매뉴얼 제목은 120자 이하로 입력해 주세요." })
  title?: string;

  @IsOptional()
  @IsString({ message: "카테고리는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "카테고리는 40자 이하로 입력해 주세요." })
  category?: string;

  @IsOptional()
  @IsString({ message: "설명은 문자로 입력해 주세요." })
  @MaxLength(1000, { message: "설명은 1000자 이하로 입력해 주세요." })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: "고정 여부를 다시 확인해 주세요." })
  isPinned?: boolean;
}
