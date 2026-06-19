import { IsUUID } from "class-validator";

export class HomeManualParamDto {
  @IsUUID("4", { message: "우리집 매뉴얼 정보를 다시 확인해 주세요." })
  manualId!: string;
}
