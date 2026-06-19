import { IsUUID } from "class-validator";

export class FixedExpensesParamDto {
  @IsUUID("4", { message: "가족 정보를 다시 확인해 주세요." })
  familyId!: string;
}
