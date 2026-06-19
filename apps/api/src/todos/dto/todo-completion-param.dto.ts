import { IsUUID } from "class-validator";

export class TodoCompletionParamDto {
  @IsUUID("4", { message: "완료 기록을 다시 확인해 주세요." })
  completionId!: string;
}
