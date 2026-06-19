import { IsUUID } from "class-validator";

export class FixedExpenseParamDto {
  @IsUUID("4", { message: "고정지출 정보를 다시 확인해 주세요." })
  fixedExpenseId!: string;
}
