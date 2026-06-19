import { IsUUID } from "class-validator";

export class ManualRelationParamDto {
  @IsUUID("4", { message: "매뉴얼 연결 정보를 다시 확인해 주세요." })
  relationId!: string;
}
