import { IsBoolean, IsInt, Matches, Max, Min } from "class-validator";

export class FixedExpenseReminderDto {
  @IsInt({ message: "알림 날짜를 다시 확인해 주세요." })
  @Min(0, { message: "알림 날짜는 0일 이상이어야 해요." })
  @Max(365, { message: "알림 날짜는 365일 이하로 입력해 주세요." })
  daysBefore!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "알림 시간은 HH:mm 형식으로 입력해 주세요." })
  remindTime!: string;

  @IsBoolean({ message: "알림 사용 여부를 다시 확인해 주세요." })
  enabled!: boolean;
}
