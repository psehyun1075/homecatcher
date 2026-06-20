import { IsUUID } from "class-validator";

export class NotificationParamDto {
  @IsUUID("4", { message: "이 알림에 접근할 수 없어요." })
  notificationId!: string;
}
