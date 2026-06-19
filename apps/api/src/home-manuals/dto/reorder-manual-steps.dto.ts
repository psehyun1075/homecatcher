import { ArrayUnique, IsArray, IsUUID } from "class-validator";

export class ReorderManualStepsDto {
  @IsArray({ message: "매뉴얼 단계 순서를 확인해 주세요." })
  @ArrayUnique({ message: "매뉴얼 단계 순서를 확인해 주세요." })
  @IsUUID("4", { each: true, message: "매뉴얼 단계 순서를 확인해 주세요." })
  stepIds!: string[];
}
