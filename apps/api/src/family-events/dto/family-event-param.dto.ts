import { IsUUID } from "class-validator";

export class FamilyEventParamDto {
  @IsUUID("4", { message: "가족 일정을 다시 확인해 주세요." })
  eventId!: string;
}
