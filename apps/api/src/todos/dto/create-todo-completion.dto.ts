import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateTodoCompletionDto {
  @IsUUID("4", { message: "완료 요청 정보를 다시 확인해 주세요." })
  requestId!: string;

  @IsOptional()
  @IsISO8601({}, { message: "완료 시간을 다시 확인해 주세요." })
  completedAt?: string;

  @IsOptional()
  @IsString({ message: "메모는 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  note?: string;
}
