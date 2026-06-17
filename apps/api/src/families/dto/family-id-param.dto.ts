import { IsUUID } from "class-validator";

export class FamilyIdParamDto {
  @IsUUID("4", { message: "가족 정보가 올바르지 않아요." })
  familyId!: string;
}
