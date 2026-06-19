import { IsUUID } from "class-validator";

export class FixedExpensePaymentParamDto {
  @IsUUID("4", { message: "납부 기록을 다시 확인해 주세요." })
  paymentId!: string;
}
