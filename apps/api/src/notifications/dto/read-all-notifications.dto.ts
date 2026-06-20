import { IsOptional, IsUUID } from "class-validator";

export class ReadAllNotificationsDto {
  @IsOptional()
  @IsUUID("4", { message: "가족 정보를 확인해 주세요." })
  familyId?: string;
}
