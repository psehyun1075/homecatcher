import { Type } from "class-transformer";
import { ArrayUnique, IsArray, ValidateNested } from "class-validator";

import { FixedExpenseReminderDto } from "./fixed-expense-reminder.dto";

export class UpdateFixedExpenseRemindersDto {
  @IsArray({ message: "알림 규칙은 목록으로 입력해 주세요." })
  @ArrayUnique((reminder: FixedExpenseReminderDto) => reminder.daysBefore, { message: "같은 알림 날짜가 중복됐어요." })
  @ValidateNested({ each: true })
  @Type(() => FixedExpenseReminderDto)
  reminders!: FixedExpenseReminderDto[];
}
