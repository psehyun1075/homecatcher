import { IsString, MinLength } from "class-validator";

export class InviteCodeParamDto {
  @IsString({ message: "초대 코드를 입력해 주세요." })
  @MinLength(6, { message: "초대 코드가 올바르지 않아요." })
  inviteCode!: string;
}
