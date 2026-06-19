import { IsUUID } from "class-validator";

export class PurchaseIdParamDto {
  @IsUUID("4", { message: "구매 기록을 다시 확인해 주세요." })
  purchaseId!: string;
}
