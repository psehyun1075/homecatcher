import { RecurrenceType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { FixedExpenseReminderDto } from "./fixed-expense-reminder.dto";

export class CreateFixedExpenseDto {
  @IsString({ message: "고정지출 이름을 입력해 주세요." })
  @MinLength(1, { message: "고정지출 이름을 입력해 주세요." })
  @MaxLength(100, { message: "고정지출 이름은 100자 이하로 입력해 주세요." })
  title!: string;

  @IsNumber({}, { message: "고정지출 금액을 확인해 주세요." })
  @Min(1, { message: "고정지출 금액을 확인해 주세요." })
  amount!: number;

  @IsOptional()
  @IsString({ message: "통화를 문자로 입력해 주세요." })
  @MaxLength(10, { message: "통화 코드가 너무 길어요." })
  currency?: string = "KRW";

  @IsOptional()
  @IsUUID("4", { message: "가계부 카테고리를 다시 확인해 주세요." })
  categoryId?: string | null;

  @IsEnum(RecurrenceType, { message: "고정지출 반복 날짜를 확인해 주세요." })
  recurrenceType!: RecurrenceType;

  @IsOptional()
  @IsInt({ message: "반복 날짜는 숫자로 입력해 주세요." })
  @Min(1, { message: "반복 날짜는 1 이상이어야 해요." })
  @Max(31, { message: "반복 날짜는 31 이하로 입력해 주세요." })
  dayOfMonth?: number | null;

  @IsOptional()
  @IsInt({ message: "반복 요일은 숫자로 입력해 주세요." })
  @Min(0, { message: "반복 요일은 0부터 6까지 입력해 주세요." })
  @Max(6, { message: "반복 요일은 0부터 6까지 입력해 주세요." })
  dayOfWeek?: number | null;

  @IsOptional()
  @IsInt({ message: "반복 간격은 숫자로 입력해 주세요." })
  @Min(1, { message: "반복 간격은 1 이상이어야 해요." })
  @Max(3650, { message: "반복 간격이 너무 길어요." })
  intervalValue?: number | null;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "시작일을 다시 확인해 주세요." })
  startDate!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "종료일을 다시 확인해 주세요." })
  endDate?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "납부 시간은 HH:mm 형식으로 입력해 주세요." })
  dueTime?: string = "09:00";

  @IsOptional()
  @IsString({ message: "시간대는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "시간대가 너무 길어요." })
  timezone?: string = "Asia/Seoul";

  @IsOptional()
  @IsString({ message: "메모는 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  memo?: string | null;

  @IsOptional()
  @IsArray({ message: "알림 규칙은 목록으로 입력해 주세요." })
  @ArrayUnique((reminder: FixedExpenseReminderDto) => reminder.daysBefore, { message: "같은 알림 날짜가 중복됐어요." })
  @ValidateNested({ each: true })
  @Type(() => FixedExpenseReminderDto)
  reminders?: FixedExpenseReminderDto[] = [];
}
