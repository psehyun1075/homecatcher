import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateManualRelationDto {
  @IsIn(["HOUSEHOLD_ITEM", "TODO"], { message: "매뉴얼 연결 대상을 다시 확인해 주세요." })
  targetType!: "HOUSEHOLD_ITEM" | "TODO";

  @IsOptional()
  @IsUUID("4", { message: "생필품 정보를 다시 확인해 주세요." })
  householdItemId?: string | null;

  @IsOptional()
  @IsUUID("4", { message: "할 일 정보를 다시 확인해 주세요." })
  todoTaskId?: string | null;

  @IsOptional()
  @IsString({ message: "메모는 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  note?: string | null;
}
