import { IsUUID } from "class-validator";

export class FamilyFeedParamDto {
  @IsUUID("4", { message: "가족 피드에 접근할 수 없어요." })
  familyId!: string;
}
