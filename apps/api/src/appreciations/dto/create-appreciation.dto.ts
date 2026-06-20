import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAppreciationDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "메시지를 확인해 주세요." })
  @MaxLength(200, { message: "메시지는 200자까지 입력할 수 있어요." })
  message?: string;
}
