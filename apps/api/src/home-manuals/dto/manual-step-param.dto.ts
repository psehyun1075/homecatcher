import { IsUUID } from "class-validator";

export class ManualStepParamDto {
  @IsUUID("4", { message: "매뉴얼 단계를 다시 확인해 주세요." })
  stepId!: string;
}
