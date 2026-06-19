import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from "class-validator";

export class CreateFixedExpensePaymentDto {
  @IsUUID("4", { message: "요청 ID를 다시 확인해 주세요." })
  requestId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "납부 예정일을 다시 확인해 주세요." })
  dueDate!: string;

  @IsOptional()
  @IsISO8601({}, { message: "납부 시간을 다시 확인해 주세요." })
  paidAt?: string;

  @IsNumber({}, { message: "고정지출 금액을 확인해 주세요." })
  @Min(1, { message: "고정지출 금액을 확인해 주세요." })
  amount!: number;

  @IsOptional()
  @IsString({ message: "통화를 문자로 입력해 주세요." })
  @MaxLength(10, { message: "통화 코드가 너무 길어요." })
  currency?: string = "KRW";

  @IsOptional()
  @IsString({ message: "메모는 문자로 입력해 주세요." })
  @MaxLength(500, { message: "메모는 500자 이하로 입력해 주세요." })
  note?: string | null;
}
