import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class ListTodosQueryDto {
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

  @IsOptional()
  @IsString({ message: "카테고리는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "카테고리는 40자 이하로 입력해 주세요." })
  category?: string;

  @IsOptional()
  @IsUUID("4", { message: "담당자를 다시 확인해 주세요." })
  assigneeMemberId?: string;

  @IsOptional()
  @IsUUID("4", { message: "기획 담당자를 다시 확인해 주세요." })
  plannerMemberId?: string;

  @IsOptional()
  @IsISO8601({}, { message: "시작 예정일을 다시 확인해 주세요." })
  dueFrom?: string;

  @IsOptional()
  @IsISO8601({}, { message: "종료 예정일을 다시 확인해 주세요." })
  dueTo?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean({ message: "완료 여부를 다시 확인해 주세요." })
  completed?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean({ message: "삭제된 할 일 포함 여부를 다시 확인해 주세요." })
  includeDeleted?: boolean = false;
}
