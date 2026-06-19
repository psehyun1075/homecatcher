import { IsUUID } from "class-validator";

export class TodoParamDto {
  @IsUUID("4", { message: "할 일 정보를 다시 확인해 주세요." })
  todoId!: string;
}
