import { IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  @IsString({ message: "토큰을 입력해 주세요." })
  @MinLength(20, { message: "토큰 형식이 올바르지 않아요." })
  refreshToken!: string;
}
