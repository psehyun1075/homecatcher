import { IsUUID } from "class-validator";

export class ActivityParamDto {
  @IsUUID("4", { message: "이 활동을 찾을 수 없어요." })
  activityId!: string;
}
