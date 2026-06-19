import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class UpdateTodoDto {
  @IsOptional()
  @IsString({ message: "할 일 이름을 입력해 주세요." })
  @MinLength(1, { message: "할 일 이름을 입력해 주세요." })
  @MaxLength(100, { message: "할 일 이름은 100자 이하로 입력해 주세요." })
  title?: string;

  @IsOptional()
  @IsString({ message: "설명은 문자로 입력해 주세요." })
  @MaxLength(1000, { message: "설명은 1000자 이하로 입력해 주세요." })
  description?: string;

  @IsOptional()
  @IsString({ message: "카테고리는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "카테고리는 40자 이하로 입력해 주세요." })
  category?: string;

  @IsOptional()
  @IsInt({ message: "우선순위는 숫자로 입력해 주세요." })
  @Min(1, { message: "우선순위는 1 이상이어야 해요." })
  @Max(5, { message: "우선순위는 5 이하로 입력해 주세요." })
  priority?: number;

  @IsOptional()
  @IsInt({ message: "예상 소요시간은 숫자로 입력해 주세요." })
  @Min(1, { message: "예상 소요시간은 1분 이상이어야 해요." })
  @Max(1440, { message: "예상 소요시간이 너무 길어요." })
  estimatedMinutes?: number;

  @IsOptional()
  @IsUUID("4", { message: "기획 담당자를 다시 확인해 주세요." })
  plannerMemberId?: string | null;

  @IsOptional()
  @IsUUID("4", { message: "담당자는 우리 가족 구성원만 선택할 수 있어요." })
  assigneeMemberId?: string | null;
}
